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
from config import load_config
from main_classes.Database import Database
import sys

def migrate_to_keycloak_users():
    """
    Migrates the database from using users.id to Keycloak user IDs
    """
    print("Starting migration to Keycloak user IDs...")
    
    # Initialize config and database
    config_path = sys.argv[1] if len(sys.argv) > 1 else "dev_server.config"
    config = load_config(config_path)
    db = Database(config=config)
    
    with db._get_cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'users'
            )
        """)
        users_table_exists = cursor.fetchone()[0]
    if not users_table_exists:
        print("Legacy users table removed; migration not required.")
        return
    raise RuntimeError("Legacy users table still exists. Migration script needs an update before use.")

if __name__ == "__main__":
    migrate_to_keycloak_users()

