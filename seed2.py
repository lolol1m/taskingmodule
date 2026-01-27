"""
Seed database with dummy data specifically for Tasking Summary.
"""
import os
import random
import sys
from datetime import datetime, timedelta
#IGNORE THIS FIRST
# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "xbi_tasking_backend"))

from main_classes import ConfigClass, Database, QueryManager


def reset_seed_data(db):
    print("\n Resetting data for Tasking Summary...")
    db.cursor.execute(
        "TRUNCATE task, image_area, image RESTART IDENTITY CASCADE"
    )
    print("   Data cleared (task, image_area, image)")


def ensure_lookup_values(db, table, values):
    db.cursor.execute(f"SELECT id FROM {table} ORDER BY id")
    ids = [row[0] for row in db.cursor.fetchall()]
    if ids:
        return ids
    for name in values:
        db.cursor.execute(
            f"INSERT INTO {table} (name) VALUES (%s) ON CONFLICT DO NOTHING RETURNING id",
            (name,),
        )
        row = db.cursor.fetchone()
        if row:
            ids.append(row[0])
    if not ids:
        db.cursor.execute(f"SELECT id FROM {table} ORDER BY id")
        ids = [row[0] for row in db.cursor.fetchall()]
    return ids


def insert_dummy_data():
    print("=" * 60)
    print("Seeding Tasking Summary Dummy Data")
    print("=" * 60)

    args = sys.argv[1:]
    reset = "--reset" in args
    args = [arg for arg in args if arg != "--reset"]
    config_path = args[0] if args else "xbi_tasking_backend/dev_server.config"
    ConfigClass(config_path)
    db = Database()

    try:
        db.openCursor()

        if reset:
            reset_seed_data(db)

        priorities = ensure_lookup_values(db, "priority", ["Low", "Medium", "High"])
        reports = ensure_lookup_values(db, "report", ["IIR", "Research", "TOS", "No Findings"])
        image_categories = ensure_lookup_values(
            db, "image_category", ["Detection", "Classification", "Identification"]
        )
        cloud_covers = ensure_lookup_values(db, "cloud_cover", ["UTC", "0C", "10-90C", "100C"])
        ew_statuses = ensure_lookup_values(db, "ew_status", ["TTG DONE", "TTG PENDING"])

        db.cursor.execute("SELECT id FROM sensor ORDER BY id LIMIT 5")
        sensors = [row[0] for row in db.cursor.fetchall()]
        if not sensors:
            db.cursor.execute(
                "INSERT INTO sensor (name) VALUES ('Dummy Sensor') ON CONFLICT DO NOTHING RETURNING id"
            )
            result = db.cursor.fetchone()
            if result:
                sensors = [result[0]]
            else:
                db.cursor.execute("SELECT id FROM sensor LIMIT 1")
                sensors = [db.cursor.fetchone()[0]] if db.cursor.rowcount > 0 else [1]

        db.cursor.execute("SELECT id FROM task_status ORDER BY id")
        task_statuses = [row[0] for row in db.cursor.fetchall()]
        if not task_statuses:
            task_statuses = [1, 2, 3, 4]

        # Get or create areas
        db.cursor.execute("SELECT scvu_area_id FROM area WHERE scvu_area_id > 0 ORDER BY scvu_area_id")
        areas = [row[0] for row in db.cursor.fetchall()]
        if not areas:
            area_names = ["Area Alpha", "Area Beta", "Area Gamma", "Area Delta", "Area Echo"]
            for name in area_names:
                db.cursor.execute(
                    "INSERT INTO area (area_name, v10, opsv) VALUES (%s, %s, %s) "
                    "ON CONFLICT DO NOTHING RETURNING scvu_area_id",
                    (name, random.choice([True, False]), random.choice([True, False])),
                )
            db.cursor.execute("SELECT scvu_area_id FROM area WHERE scvu_area_id > 0 ORDER BY scvu_area_id")
            areas = [row[0] for row in db.cursor.fetchall()]

        # Ensure users are marked present
        db.cursor.execute(
            """
            UPDATE user_cache
            SET is_present = TRUE
            WHERE is_present = FALSE
            """
        )

        # Sync Keycloak users if possible
        target_usernames = ["iiuser", "iisenior", "iauser"]
        try:
            qm = QueryManager()
            for username in target_usernames:
                user_id = qm._mapKeycloakUsernameToKeycloakId(username)
                if not user_id:
                    continue
                db.cursor.execute(
                    "INSERT INTO user_cache (keycloak_user_id, is_present) VALUES (%s, TRUE) "
                    "ON CONFLICT (keycloak_user_id) DO UPDATE SET is_present = TRUE",
                    (user_id,),
                )
        except Exception as exc:
            print(f"   ⚠️ Could not sync Keycloak users: {exc}")

        db.cursor.execute("SELECT keycloak_user_id FROM user_cache LIMIT 10")
        user_ids = [row[0] for row in db.cursor.fetchall()]
        if not user_ids:
            dummy_users = ["dummy-user-1", "dummy-user-2", "dummy-user-3"]
            for user_id in dummy_users:
                db.cursor.execute(
                    "INSERT INTO user_cache (keycloak_user_id, is_present) VALUES (%s, %s) "
                    "ON CONFLICT (keycloak_user_id) DO UPDATE SET is_present = TRUE",
                    (user_id, True),
                )
            user_ids = dummy_users

        print(
            f"\n Found {len(priorities)} priorities, {len(sensors)} sensors, {len(areas)} areas, {len(user_ids)} users"
        )

        today = datetime.now()
        dates = [today - timedelta(days=i) for i in range(30)]

        image_ids = []
        for i, upload_date in enumerate(dates):
            image_id = 20000 + i
            image_datetime = upload_date + timedelta(hours=random.randint(0, 23))
            db.cursor.execute(
                """
                INSERT INTO image (
                    image_id, image_file_name, sensor_id, upload_date, image_datetime,
                    report_id, priority_id, image_category_id, image_quality, cloud_cover_id,
                    ew_status_id, target_tracing
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (image_id) DO UPDATE SET
                    image_file_name = EXCLUDED.image_file_name,
                    upload_date = EXCLUDED.upload_date
                RETURNING scvu_image_id
                """,
                (
                    image_id,
                    f"IMG_{image_id:05d}.jpg",
                    random.choice(sensors),
                    upload_date,
                    image_datetime,
                    random.choice(reports) if reports else None,
                    random.choice(priorities) if priorities else None,
                    random.choice(image_categories) if image_categories else None,
                    random.choice(["Good", "Fair", "Poor"]),
                    random.choice(cloud_covers) if cloud_covers else None,
                    random.choice(ew_statuses) if ew_statuses else None,
                    random.choice([True, False]),
                ),
            )
            result = db.cursor.fetchone()
            if result:
                image_ids.append((result[0], image_id))

        print(f" Inserted {len(image_ids)} images")

        image_area_ids = []
        for scvu_image_id, _ in image_ids:
            num_areas = random.randint(1, 3)
            selected_areas = random.sample(areas, min(num_areas, len(areas)))
            for area_id in selected_areas:
                db.cursor.execute(
                    """
                    INSERT INTO image_area (scvu_image_id, scvu_area_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                    RETURNING scvu_image_area_id
                    """,
                    (scvu_image_id, area_id),
                )
                result = db.cursor.fetchone()
                if result:
                    image_area_ids.append(result[0])

        print(f" Created {len(image_area_ids)} image-area links")

        # Create tasks for Tasking Summary
        for image_area_id in image_area_ids:
            db.cursor.execute(
                """
                INSERT INTO task (assignee_keycloak_id, scvu_image_area_id, task_status_id, remarks)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (scvu_image_area_id)
                DO UPDATE SET assignee_keycloak_id = EXCLUDED.assignee_keycloak_id,
                              task_status_id = EXCLUDED.task_status_id,
                              remarks = EXCLUDED.remarks
                """,
                (
                    random.choice(user_ids),
                    image_area_id,
                    random.choice(task_statuses),
                    random.choice(["", "Check clouds", "Urgent", "Verify target", ""]),
                ),
            )

        db.conn.commit()

        print("\n" + "=" * 60)
        print(" Tasking Summary seed complete!")
        print("=" * 60)
        print(f"  - {len(image_ids)} images")
        print(f"  - {len(image_area_ids)} image-area links")
        print(f"  - {len(image_area_ids)} tasks")

    except Exception as e:
        db.conn.rollback()
        print(f"\n Error inserting dummy data: {e}")
        import traceback

        traceback.print_exc()
        raise
    finally:
        db.closeCursor()


if __name__ == "__main__":
    insert_dummy_data()
