"""
Insert dummy data for testing the application
"""
import sys
import os
from datetime import datetime, timedelta
import random

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'xbi_tasking_backend'))

from main_classes import ConfigClass, Database

def insert_dummy_data():
    print("=" * 60)
    print("Inserting Dummy Data")
    print("=" * 60)
    
    config_path = sys.argv[1] if len(sys.argv) > 1 else "xbi_tasking_backend/dev_server.config"
    ConfigClass(config_path)
    db = Database()
    
    try:
        db.openCursor()
        
        # Get existing lookup data
        db.cursor.execute("SELECT id FROM priority WHERE id > 0 ORDER BY id")
        priorities = [row[0] for row in db.cursor.fetchall()]
        if not priorities:
            priorities = [1, 2, 3]  # Low, Medium, High
        
        db.cursor.execute("SELECT id FROM sensor ORDER BY id LIMIT 5")
        sensors = [row[0] for row in db.cursor.fetchall()]
        if not sensors:
            # Create a dummy sensor if none exist
            db.cursor.execute("INSERT INTO sensor (name) VALUES ('Dummy Sensor') ON CONFLICT DO NOTHING RETURNING id")
            result = db.cursor.fetchone()
            if result:
                sensors = [result[0]]
            else:
                db.cursor.execute("SELECT id FROM sensor LIMIT 1")
                sensors = [db.cursor.fetchone()[0]] if db.cursor.rowcount > 0 else [1]
        
        db.cursor.execute("SELECT id FROM image_category WHERE id > 0 ORDER BY id")
        categories = [row[0] for row in db.cursor.fetchall()]
        if not categories:
            categories = [1, 2, 3, 4]  # Detection, Classification, Identification, Recognition
        
        db.cursor.execute("SELECT id FROM report ORDER BY id")
        reports = [row[0] for row in db.cursor.fetchall()]
        if not reports:
            reports = [1, 2, 3]
        
        db.cursor.execute("SELECT id FROM task_status ORDER BY id")
        task_statuses = [row[0] for row in db.cursor.fetchall()]
        if not task_statuses:
            task_statuses = [1, 2, 3, 4]  # Incomplete, In Progress, Verifying, Completed
        
        # Get or create areas
        db.cursor.execute("SELECT scvu_area_id FROM area WHERE scvu_area_id > 0 ORDER BY scvu_area_id")
        areas = [row[0] for row in db.cursor.fetchall()]
        if not areas:
            # Create some dummy areas
            area_names = ['Area Alpha', 'Area Beta', 'Area Gamma', 'Area Delta', 'Area Echo']
            for name in area_names:
                db.cursor.execute(
                    "INSERT INTO area (area_name, v10, opsv) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING RETURNING scvu_area_id",
                    (name, random.choice([True, False]), random.choice([True, False]))
                )
            db.cursor.execute("SELECT scvu_area_id FROM area WHERE scvu_area_id > 0 ORDER BY scvu_area_id")
            areas = [row[0] for row in db.cursor.fetchall()]
        
        # Get user cache entries for assignments
        db.cursor.execute("SELECT keycloak_user_id FROM user_cache LIMIT 5")
        user_ids = [row[0] for row in db.cursor.fetchall()]
        if not user_ids:
            # Create dummy user cache entries
            dummy_users = [
                ('dummy-user-1', 'Test User 1'),
                ('dummy-user-2', 'Test User 2'),
                ('dummy-user-3', 'Test User 3'),
            ]
            for user_id, display_name in dummy_users:
                db.cursor.execute(
                    "INSERT INTO user_cache (keycloak_user_id, display_name, is_present) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                    (user_id, display_name, True)
                )
            user_ids = [u[0] for u in dummy_users]
        
        print(f"\n✅ Found {len(priorities)} priorities, {len(sensors)} sensors, {len(areas)} areas, {len(user_ids)} users")
        
        # Generate dates spread over the last 3 months
        today = datetime.now()
        dates = []
        for i in range(90):  # Last 90 days
            date = today - timedelta(days=i)
            if random.random() < 0.3:  # 30% chance of having an image on this day
                dates.append(date)
        
        print(f"\n📅 Generating {len(dates)} images across the last 3 months...")
        
        # Insert dummy images
        image_ids = []
        for i, upload_date in enumerate(dates[:30]):  # Limit to 30 images
            image_id = 10000 + i
            image_datetime = upload_date + timedelta(hours=random.randint(0, 23))
            
            # Some images are completed
            completed = random.random() < 0.3  # 30% completed
            completed_date = None
            vetter_id = None
            if completed:
                completed_date = upload_date + timedelta(days=random.randint(1, 5))
                vetter_id = random.choice(user_ids) if user_ids else None
            
            db.cursor.execute("""
                INSERT INTO image (
                    image_id, image_file_name, sensor_id, upload_date, image_datetime,
                    completed_date, priority_id, report_id, image_category_id, vetter_keycloak_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (image_id) DO UPDATE SET
                    image_file_name = EXCLUDED.image_file_name,
                    upload_date = EXCLUDED.upload_date
                RETURNING scvu_image_id
            """, (
                image_id,
                f"IMG_{image_id:05d}.jpg",
                random.choice(sensors),
                upload_date,
                image_datetime,
                completed_date,
                random.choice(priorities) if priorities else None,
                random.choice(reports) if reports else None,
                random.choice(categories) if categories else None,
                vetter_id
            ))
            
            result = db.cursor.fetchone()
            if result:
                image_ids.append((result[0], image_id))
        
        print(f"✅ Inserted {len(image_ids)} images")
        
        # Insert image_area links (each image has 1-3 areas)
        image_area_ids = []
        for scvu_image_id, _ in image_ids:
            num_areas = random.randint(1, 3)
            selected_areas = random.sample(areas, min(num_areas, len(areas)))
            
            for area_id in selected_areas:
                db.cursor.execute("""
                    INSERT INTO image_area (scvu_image_id, scvu_area_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                    RETURNING scvu_image_area_id
                """, (scvu_image_id, area_id))
                
                result = db.cursor.fetchone()
                if result:
                    image_area_ids.append((result[0], scvu_image_id))
        
        print(f"✅ Created {len(image_area_ids)} image-area links")
        
        # Get image_area_ids for incomplete images
        db.cursor.execute("""
            SELECT ia.scvu_image_area_id, ia.scvu_image_id
            FROM image_area ia
            JOIN image i ON i.scvu_image_id = ia.scvu_image_id
            WHERE i.completed_date IS NULL
        """)
        incomplete_image_areas = [(row[0], row[1]) for row in db.cursor.fetchall()]
        
        tasks_created = 0
        for image_area_id, scvu_image_id in incomplete_image_areas[:20]:  # Limit to 20 tasks
            # 70% chance of having a task
            if random.random() < 0.7:
                assignee = random.choice(user_ids) if user_ids and random.random() < 0.6 else None
                status = random.choice(task_statuses) if task_statuses else 1
                
                db.cursor.execute("""
                    INSERT INTO task (scvu_image_area_id, assignee_keycloak_id, task_status_id, remarks)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (
                    image_area_id,
                    assignee,
                    status,
                    f"Test task for image area {image_area_id}" if random.random() < 0.3 else None
                ))
                tasks_created += 1
        
        print(f"✅ Created {tasks_created} tasks")
        
        # Commit all changes
        db.conn.commit()
        
        print("\n" + "=" * 60)
        print("✅ Dummy data insertion complete!")
        print("=" * 60)
        print(f"\nSummary:")
        print(f"  - {len(image_ids)} images (spread across last 3 months)")
        print(f"  - {len(image_area_ids)} image-area links")
        print(f"  - {tasks_created} tasks")
        print(f"\n💡 Date picker suggestions:")
        if len(dates) > 0:
            if len(dates) > 6:
                print(f"  - Last week: {dates[6].strftime('%Y-%m-%d')} to {dates[0].strftime('%Y-%m-%d')}")
            if len(dates) > 29:
                print(f"  - Last month: {dates[29].strftime('%Y-%m-%d')} to {dates[0].strftime('%Y-%m-%d')}")
            print(f"  - All data: {dates[-1].strftime('%Y-%m-%d')} to {dates[0].strftime('%Y-%m-%d')}")
        
        # Get actual date range from inserted images
        db.cursor.execute("SELECT MIN(upload_date), MAX(upload_date) FROM image WHERE upload_date IS NOT NULL")
        result = db.cursor.fetchone()
        if result and result[0] and result[1]:
            min_date = result[0].strftime('%Y-%m-%d')
            max_date = result[1].strftime('%Y-%m-%d')
            print(f"\n📅 Actual date range in database: {min_date} to {max_date}")
            print(f"   Use this range in the date picker to see all dummy data!")
        
    except Exception as e:
        db.conn.rollback()
        print(f"\n❌ Error inserting dummy data: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.closeCursor()

if __name__ == "__main__":
    insert_dummy_data()

