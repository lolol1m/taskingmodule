"""
Migration script to convert from database users table to Keycloak user IDs

This script:
1. Migrates task.assignee_id (INTEGER) -> task.assignee_keycloak_id (VARCHAR)
2. Migrates image.vetter_id (INTEGER) -> image.vetter_keycloak_id (VARCHAR)
3. Populates user_cache with existing user data
4. Maps old database user IDs to Keycloak user IDs

Run this script ONCE after updating the schema.
"""

import psycopg2
from main_classes import ConfigClass, Database
import sys

def migrate_to_keycloak_users():
    """
    Migrates the database from using users.id to Keycloak user IDs
    """
    print("Starting migration to Keycloak user IDs...")
    
    # Initialize config and database
    config_path = sys.argv[1] if len(sys.argv) > 1 else "dev_server.config"
    ConfigClass(config_path)
    db = Database()
    
    try:
        db.openCursor()
        
        # Step 1: Add new columns if they don't exist
        print("Step 1: Adding new columns...")
        try:
            db.cursor.execute("ALTER TABLE task ADD COLUMN IF NOT EXISTS assignee_keycloak_id VARCHAR(255)")
            db.cursor.execute("ALTER TABLE image ADD COLUMN IF NOT EXISTS vetter_keycloak_id VARCHAR(255)")
            print("✅ New columns added")
        except Exception as e:
            print(f"⚠️  Warning adding columns: {e}")
        
        # Step 2: Create user_cache table if it doesn't exist (only for is_present state)
        print("Step 2: Creating user_cache table...")
        db.cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_cache (
                keycloak_user_id VARCHAR(255) PRIMARY KEY,
                is_present BOOLEAN DEFAULT FALSE
            )
        """)
        print("✅ user_cache table created")
        
        # Step 3: Populate user_cache from existing users table (migrate is_present state)
        print("Step 3: Populating user_cache from users table...")
        # Check if users table has is_present column
        db.cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'is_present'
        """)
        has_is_present = db.cursor.fetchone() is not None
        
        if has_is_present:
            db.cursor.execute("""
                INSERT INTO user_cache (keycloak_user_id, is_present)
                SELECT id, is_present
                FROM users
                ON CONFLICT (keycloak_user_id) DO UPDATE
                SET is_present = EXCLUDED.is_present
            """)
        else:
            # users table doesn't have is_present, use default FALSE
            db.cursor.execute("""
                INSERT INTO user_cache (keycloak_user_id, is_present)
                SELECT id, FALSE
                FROM users
                ON CONFLICT (keycloak_user_id) DO NOTHING
            """)
        print("✅ user_cache populated (is_present state migrated)")
        
        # Step 4: Migrate task.assignee_id to assignee_keycloak_id
        print("Step 4: Migrating task assignments...")
        # Check if assignee_id is INTEGER or VARCHAR
        db.cursor.execute("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'task' AND column_name = 'assignee_id'
        """)
        assignee_id_type = db.cursor.fetchone()[0] if db.cursor.rowcount > 0 else None
        
        if assignee_id_type == 'integer':
            # Old schema: INTEGER foreign key
            # Need to map integer IDs to Keycloak user IDs
            # Check if users.id is INTEGER or VARCHAR
            db.cursor.execute("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'id'
            """)
            users_id_type = db.cursor.fetchone()[0] if db.cursor.rowcount > 0 else None
            
            if users_id_type == 'integer':
                # Both are integers, direct match
                db.cursor.execute("""
                    UPDATE task t
                    SET assignee_keycloak_id = CAST(u.id AS VARCHAR)
                    FROM users u
                    WHERE t.assignee_id = u.id
                    AND t.assignee_keycloak_id IS NULL
                """)
            else:
                # users.id is VARCHAR, convert assignee_id to VARCHAR for comparison
                db.cursor.execute("""
                    UPDATE task t
                    SET assignee_keycloak_id = u.id
                    FROM users u
                    WHERE CAST(t.assignee_id AS VARCHAR) = u.id
                    AND t.assignee_keycloak_id IS NULL
                """)
        else:
            # New schema: VARCHAR (already Keycloak IDs)
            db.cursor.execute("""
                UPDATE task t
                SET assignee_keycloak_id = t.assignee_id
                WHERE t.assignee_keycloak_id IS NULL
                AND t.assignee_id IS NOT NULL
            """)
        migrated_tasks = db.cursor.rowcount
        print(f"✅ Migrated {migrated_tasks} task assignments")
        
        # Step 5: Migrate image.vetter_id to vetter_keycloak_id
        print("Step 5: Migrating image vetters...")
        # Check if vetter_id is INTEGER or VARCHAR
        db.cursor.execute("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'image' AND column_name = 'vetter_id'
        """)
        vetter_id_type = db.cursor.fetchone()[0] if db.cursor.rowcount > 0 else None
        
        if vetter_id_type == 'integer':
            # Old schema: INTEGER foreign key
            # Need to map integer IDs to Keycloak user IDs
            # Check if users.id is INTEGER or VARCHAR (reuse from above)
            if users_id_type == 'integer':
                # Both are integers, direct match
                db.cursor.execute("""
                    UPDATE image i
                    SET vetter_keycloak_id = CAST(u.id AS VARCHAR)
                    FROM users u
                    WHERE i.vetter_id = u.id
                    AND i.vetter_keycloak_id IS NULL
                """)
            else:
                # users.id is VARCHAR, convert vetter_id to VARCHAR for comparison
                db.cursor.execute("""
                    UPDATE image i
                    SET vetter_keycloak_id = u.id
                    FROM users u
                    WHERE CAST(i.vetter_id AS VARCHAR) = u.id
                    AND i.vetter_keycloak_id IS NULL
                """)
        else:
            # New schema: VARCHAR (already Keycloak IDs)
            db.cursor.execute("""
                UPDATE image i
                SET vetter_keycloak_id = i.vetter_id
                WHERE i.vetter_keycloak_id IS NULL
                AND i.vetter_id IS NOT NULL
            """)
        migrated_images = db.cursor.rowcount
        print(f"✅ Migrated {migrated_images} image vetters")
        
        # Commit changes
        db.conn.commit()
        print("\n✅ Migration completed successfully!")
        print("\n⚠️  NOTE: Old columns (assignee_id, vetter_id) are still present.")
        print("   You can drop them after verifying the migration worked correctly:")
        print("   ALTER TABLE task DROP COLUMN IF EXISTS assignee_id;")
        print("   ALTER TABLE image DROP COLUMN IF EXISTS vetter_id;")
        
    except Exception as e:
        db.conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        db.closeCursor()

if __name__ == "__main__":
    migrate_to_keycloak_users()

