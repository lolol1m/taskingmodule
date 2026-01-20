"""
Script to delete all Keycloak-related data:
1. Keycloak server data directory (realms, users, clients, etc.)
2. Database user_cache table (Keycloak user IDs)
3. Clear Keycloak user ID references from tasks and images (set to NULL)
"""
import sys
import os
import shutil

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'xbi_tasking_backend'))

from main_classes import ConfigClass, Database

def delete_keycloak_data():
    print("=" * 60)
    print("Delete All Keycloak Data")
    print("=" * 60)
    print()
    print("This will:")
    print("  1. Delete Keycloak data directory (realms, users, clients)")
    print("  2. Clear user_cache table (Keycloak user IDs)")
    print("  3. Clear Keycloak user ID references from tasks and images")
    print()
    print("WARNING: This will DELETE ALL Keycloak data!")
    print()
    
    confirm = input("Are you sure you want to delete all Keycloak data? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Operation cancelled.")
        return
    
    # Step 1: Delete Keycloak data directory
    print("\n" + "=" * 60)
    print("Step 1: Deleting Keycloak data directory...")
    print("=" * 60)
    
    keycloak_dir = r"C:\Users\theol\Downloads\keycloak-26.4.7\keycloak-26.4.7"
    data_dir = os.path.join(keycloak_dir, "data")
    
    if os.path.exists(data_dir):
        try:
            shutil.rmtree(data_dir)
            print(f"✅ Deleted: {data_dir}")
        except Exception as e:
            print(f"⚠️ Error deleting Keycloak data directory: {e}")
            print("   You may need to stop Keycloak first and try again.")
    else:
        print(f"ℹ️  Keycloak data directory doesn't exist: {data_dir}")
    
    # Step 2: Clear database Keycloak references
    print("\n" + "=" * 60)
    print("Step 2: Clearing Keycloak data from database...")
    print("=" * 60)
    
    config_path = sys.argv[1] if len(sys.argv) > 1 else "xbi_tasking_backend/dev_server.config"
    ConfigClass(config_path)
    db = Database()
    
    try:
        db.openCursor()
        
        # Clear user_cache table
        print("\n2.1. Clearing user_cache table...")
        db.cursor.execute("DELETE FROM user_cache")
        deleted_cache = db.cursor.rowcount
        print(f"   ✅ Deleted {deleted_cache} entries from user_cache")
        
        # Clear Keycloak user IDs from tasks (set to NULL)
        print("\n2.2. Clearing Keycloak user IDs from tasks...")
        db.cursor.execute("UPDATE task SET assignee_keycloak_id = NULL WHERE assignee_keycloak_id IS NOT NULL")
        cleared_tasks = db.cursor.rowcount
        print(f"   ✅ Cleared Keycloak user IDs from {cleared_tasks} tasks")
        
        # Clear Keycloak user IDs from images (set to NULL)
        print("\n2.3. Clearing Keycloak user IDs from images...")
        db.cursor.execute("UPDATE image SET vetter_keycloak_id = NULL WHERE vetter_keycloak_id IS NOT NULL")
        cleared_images = db.cursor.rowcount
        print(f"   ✅ Cleared Keycloak user IDs from {cleared_images} images")
        
        # Commit changes
        db.conn.commit()
        print("\n✅ Database changes committed")
        
        # Verify
        print("\n2.4. Verifying cleanup...")
        db.cursor.execute("SELECT COUNT(*) FROM user_cache")
        cache_count = db.cursor.fetchone()[0]
        db.cursor.execute("SELECT COUNT(*) FROM task WHERE assignee_keycloak_id IS NOT NULL")
        task_count = db.cursor.fetchone()[0]
        db.cursor.execute("SELECT COUNT(*) FROM image WHERE vetter_keycloak_id IS NOT NULL")
        image_count = db.cursor.fetchone()[0]
        
        print(f"   user_cache entries: {cache_count}")
        print(f"   tasks with Keycloak IDs: {task_count}")
        print(f"   images with Keycloak IDs: {image_count}")
        
        if cache_count == 0 and task_count == 0 and image_count == 0:
            print("   ✅ All Keycloak data cleared from database")
        else:
            print("   ⚠️  Some Keycloak data may still exist")
        
    except Exception as e:
        db.conn.rollback()
        print(f"\n❌ Error clearing database: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.closeCursor()
    
    print("\n" + "=" * 60)
    print("✅ All Keycloak data deletion complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  1. Restart Keycloak using start_keycloak.bat")
    print("  2. Go to http://localhost:8080/admin")
    print("  3. Create admin user (first time only)")
    print("  4. Follow KEYCLOAK_SETUP.md to configure:")
    print("     - Realm: xbi-tasking")
    print("     - Client: xbi-tasking-backend")
    print("     - Roles: II, Senior II, IA")
    print("     - Users with roles")
    print("  5. Update dev_server.config with new client_secret")
    print("  6. Restart backend server")

if __name__ == "__main__":
    delete_keycloak_data()


