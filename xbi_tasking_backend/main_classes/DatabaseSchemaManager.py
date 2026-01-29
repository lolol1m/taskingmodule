import logging
import os


logger = logging.getLogger("xbi_tasking_backend.database.schema")


class DatabaseSchemaManager:
    def __init__(self, database):
        self._db = database
        self._config = database._config

    def initialize_database(self):
        """
        Initialize database schema if tables don't exist.
        """
        try:
            with self._db._get_cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'user_cache'
                    )
                """)
                user_cache_exists = cursor.fetchone()[0]

                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'image'
                    )
                """)
                image_table_exists = cursor.fetchone()[0]

            if not user_cache_exists and image_table_exists:
                logger.info("Updating database schema for Keycloak integration...")
                with self._db._get_cursor() as cursor:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS user_cache (
                            keycloak_user_id VARCHAR(255) PRIMARY KEY,
                            is_present BOOLEAN DEFAULT FALSE
                        )
                    """)

                    cursor.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'image' AND column_name = 'vetter_keycloak_id'
                    """)
                    if not cursor.fetchone():
                        cursor.execute("""
                            ALTER TABLE image 
                            ADD COLUMN vetter_keycloak_id VARCHAR(255)
                        """)
                        logger.info("Added vetter_keycloak_id to image table")

                    cursor.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'task' AND column_name = 'assignee_keycloak_id'
                    """)
                    if not cursor.fetchone():
                        cursor.execute("""
                            ALTER TABLE task 
                            ADD COLUMN assignee_keycloak_id VARCHAR(255)
                        """)
                        logger.info("Added assignee_keycloak_id to task table")
                logger.info("Database schema updated for Keycloak")
            elif not user_cache_exists:
                logger.info("Creating database schema...")
                self._create_schema()
                self._insert_initial_data()
                logger.info("Database schema created and initialized")

            with self._db._get_cursor() as cursor:
                cursor.execute("ALTER TABLE task DROP COLUMN IF EXISTS assignee_id")
                cursor.execute("ALTER TABLE image DROP COLUMN IF EXISTS vetter_id")
                cursor.execute("DROP TABLE IF EXISTS users")
        except Exception as e:
            logger.warning("Could not check/initialize database schema: %s", e)

    def _create_schema(self):
        """
        Create all database tables.
        """
        with self._db._get_cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sensor_category (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sensor (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    category_id INTEGER REFERENCES sensor_category(id)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS priority (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cloud_cover (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS image_category (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS report (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ew_status (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_cache (
                    keycloak_user_id VARCHAR(255) PRIMARY KEY,
                    is_present BOOLEAN DEFAULT FALSE
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS area (
                    scvu_area_id SERIAL PRIMARY KEY,
                    area_name VARCHAR(255) UNIQUE NOT NULL,
                    v10 BOOLEAN DEFAULT FALSE,
                    opsv BOOLEAN DEFAULT FALSE
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS image (
                    scvu_image_id SERIAL PRIMARY KEY,
                    image_id BIGINT UNIQUE,
                    image_file_name VARCHAR(255),
                    sensor_id INTEGER REFERENCES sensor(id),
                    upload_date TIMESTAMP,
                    image_datetime TIMESTAMP,
                    completed_date TIMESTAMP,
                    priority_id INTEGER REFERENCES priority(id),
                    report_id INTEGER REFERENCES report(id),
                    image_category_id INTEGER REFERENCES image_category(id),
                    image_quality VARCHAR(255),
                    cloud_cover_id INTEGER REFERENCES cloud_cover(id),
                    ew_status_id INTEGER REFERENCES ew_status(id),
                    target_tracing BOOLEAN,
                    vetter_keycloak_id VARCHAR(255)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS image_area (
                    scvu_image_area_id SERIAL PRIMARY KEY,
                    scvu_image_id INTEGER REFERENCES image(scvu_image_id),
                    scvu_area_id INTEGER REFERENCES area(scvu_area_id),
                    UNIQUE(scvu_image_id, scvu_area_id)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS task_status (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS task (
                    scvu_task_id SERIAL PRIMARY KEY,
                    scvu_image_area_id INTEGER UNIQUE REFERENCES image_area(scvu_image_area_id),
                    assignee_keycloak_id VARCHAR(255),
                    task_status_id INTEGER REFERENCES task_status(id),
                    remarks TEXT
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS accounts (
                    account VARCHAR(255) PRIMARY KEY,
                    password VARCHAR(255) NOT NULL
                )
            """)

    def _insert_initial_data(self):
        """
        Insert initial data into lookup tables.
        """
        with self._db._get_cursor() as cursor:
            cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (0, null) ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (1, 'UTC') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (2, '0C') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (3, '10-90C') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (4, '100C') ON CONFLICT DO NOTHING")

            cursor.execute("INSERT INTO ew_status(id, name) VALUES (1, 'ttg done') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO ew_status(id, name) VALUES (2, 'xbi done') ON CONFLICT DO NOTHING")

            cursor.execute("INSERT INTO image_category(id, name) VALUES (0, null) ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO image_category(id, name) VALUES (1, 'Detection') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO image_category(id, name) VALUES (2, 'Classification') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO image_category(id, name) VALUES (3, 'Identification') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO image_category(id, name) VALUES (4, 'Recognition') ON CONFLICT DO NOTHING")

            cursor.execute("INSERT INTO priority(id, name) VALUES (0, null) ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO priority(id, name) VALUES (1, 'Low') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO priority(id, name) VALUES (2, 'Medium') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO priority(id, name) VALUES (3, 'High') ON CONFLICT DO NOTHING")

            cursor.execute("INSERT INTO report(id, name) VALUES (0, null) ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO report(id, name) VALUES (1, 'DS(OF)') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO report(id, name) VALUES (2, 'DS(SF)') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO report(id, name) VALUES (3, 'I-IIRS 0') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO report(id, name) VALUES (4, 'IIR') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO report(id, name) VALUES (5, 'Re-DL') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO report(id, name) VALUES (6, 'Research') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO report(id, name) VALUES (7, 'TOS') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO report(id, name) VALUES (8, 'No Findings') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO report(id, name) VALUES (9, 'Downgrade') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO report(id, name) VALUES (10, 'Failed') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO report(id, name) VALUES (11, 'Img Error') ON CONFLICT DO NOTHING")

            cursor.execute("INSERT INTO task_status(id, name) VALUES (1, 'Incomplete') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO task_status(id, name) VALUES (2, 'In Progress') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO task_status(id, name) VALUES (3, 'Verifying') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO task_status(id, name) VALUES (4, 'Completed') ON CONFLICT DO NOTHING")

            cursor.execute("INSERT INTO sensor_category(id, name) VALUES (1, 'UNCATEGORISED') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO sensor_category(id, name) VALUES (2, 'UAV') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO sensor_category(id, name) VALUES (3, 'AB') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO sensor_category(id, name) VALUES (4, 'HB') ON CONFLICT DO NOTHING")
            cursor.execute("INSERT INTO sensor_category(id, name) VALUES (5, 'AVIS') ON CONFLICT DO NOTHING")

            cursor.execute("INSERT INTO area(scvu_area_id, area_name, v10) VALUES (0, 'OTHERS', false) ON CONFLICT DO NOTHING")

            allow_legacy_accounts = os.getenv("ALLOW_LEGACY_ACCOUNTS", "").lower() == "true"
            if allow_legacy_accounts:
                cursor.execute("INSERT INTO accounts(account, password) VALUES ('II', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b') ON CONFLICT DO NOTHING")
                cursor.execute("INSERT INTO accounts(account, password) VALUES ('Senior II', 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35') ON CONFLICT DO NOTHING")
                cursor.execute("INSERT INTO accounts(account, password) VALUES ('IA', '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce') ON CONFLICT DO NOTHING")

    def seed_lookup_data(self):
        self._insert_initial_data()
