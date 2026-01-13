"""
Verify database migration was successful
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'xbi_tasking_backend'))

from main_classes import ConfigClass, Database

def verify_migration():
    print("=" * 60)
    print("Database Migration Verification")
    print("=" * 60)
    
    config_path = sys.argv[1] if len(sys.argv) > 1 else "xbi_tasking_backend/dev_server.config"
    ConfigClass(config_path)
    db = Database()
    
    try:
        db.openCursor()
        
        # Check user_cache table
        print("\n1. Checking user_cache table...")
        db.cursor.execute("SELECT COUNT(*) FROM user_cache")
        cache_count = db.cursor.fetchone()[0]
        print(f"   ✅ user_cache has {cache_count} entries")
        
        # Check task table columns
        print("\n2. Checking task table...")
        db.cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'task' AND column_name = 'assignee_keycloak_id'
        """)
        if db.cursor.fetchone():
            print("   ✅ assignee_keycloak_id column exists")
            db.cursor.execute("SELECT COUNT(*) FROM task WHERE assignee_keycloak_id IS NOT NULL")
            migrated_tasks = db.cursor.fetchone()[0]
            print(f"   ✅ {migrated_tasks} tasks have Keycloak user IDs")
        else:
            print("   ❌ assignee_keycloak_id column missing")
        
        # Check image table columns
        print("\n3. Checking image table...")
        db.cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'image' AND column_name = 'vetter_keycloak_id'
        """)
        if db.cursor.fetchone():
            print("   ✅ vetter_keycloak_id column exists")
            db.cursor.execute("SELECT COUNT(*) FROM image WHERE vetter_keycloak_id IS NOT NULL")
            migrated_images = db.cursor.fetchone()[0]
            print(f"   ✅ {migrated_images} images have Keycloak user IDs")
        else:
            print("   ❌ vetter_keycloak_id column missing")
        
        # Show sample data
        print("\n4. Sample user_cache data:")
        db.cursor.execute("SELECT keycloak_user_id, display_name, is_present FROM user_cache LIMIT 5")
        for row in db.cursor.fetchall():
            print(f"   - {row[0]}: {row[1]} (present: {row[2]})")
        
        print("\n" + "=" * 60)
        print("✅ Migration verification complete!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise
    finally:
        db.closeCursor()

if __name__ == "__main__":
    verify_migration()

