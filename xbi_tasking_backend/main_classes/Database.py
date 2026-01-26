import psycopg2
from psycopg2 import sql
import time

from main_classes import ConfigClass

class Database():
    '''
    Database class connects to the SQL database to execute queries
    '''
    def __init__(self):
        db_name = ConfigClass._instance.getDatabaseName()
        try:
            # Try to connect to the target database
            self.conn = psycopg2.connect(
                database=db_name,
                user=ConfigClass._instance.getUser(),
                password=ConfigClass._instance.getPassword(),
                host=ConfigClass._instance.getIPAddress(),
                port=ConfigClass._instance.getPort(),
                connect_timeout=5)
        except psycopg2.OperationalError as e:
            # If database doesn't exist, try to create it
            if "does not exist" in str(e) or "database" in str(e).lower():
                try:
                    # Connect to default postgres database to create the target database
                    temp_conn = psycopg2.connect(
                        database='postgres',
                        user=ConfigClass._instance.getUser(),
                        password=ConfigClass._instance.getPassword(),
                        host=ConfigClass._instance.getIPAddress(),
                        port=ConfigClass._instance.getPort(),
                        connect_timeout=5)
                    temp_conn.autocommit = True
                    temp_cursor = temp_conn.cursor()
                    temp_cursor.execute(sql.SQL("CREATE DATABASE {}").format(
                        sql.Identifier(db_name)
                    ))
                    temp_cursor.close()
                    temp_conn.close()
                    print(f"✅ Created database '{db_name}'")
                    
                    # Now connect to the newly created database
                    self.conn = psycopg2.connect(
                        database=db_name,
                        user=ConfigClass._instance.getUser(),
                        password=ConfigClass._instance.getPassword(),
                        host=ConfigClass._instance.getIPAddress(),
                        port=ConfigClass._instance.getPort(),
                        connect_timeout=5)
                except Exception as create_error:
                    print(f"   Failed to create database: {create_error}")
                    print(f"   Original connection error: {e}")
                    print(f"   Host: {ConfigClass._instance.getIPAddress()}")
                    print(f"   Port: {ConfigClass._instance.getPort()}")
                    print(f"   Database: {db_name}")
                    print(f"   User: {ConfigClass._instance.getUser()}")
                    raise
            else:
                print(f"   Database connection failed: {e}")
                print(f"   Host: {ConfigClass._instance.getIPAddress()}")
                print(f"   Port: {ConfigClass._instance.getPort()}")
                print(f"   Database: {db_name}")
                print(f"   User: {ConfigClass._instance.getUser()}")
                print("\nPlease check:")
                print("1. PostgreSQL service is running")
                print("2. Database credentials are correct")
                raise

        self.conn.autocommit = True
        self.cursor = None
        
        # Check if tables exist, if not create them
        self._initializeDatabase()
    
    def _initializeDatabase(self):
        '''
        Initialize database schema if tables don't exist
        '''
        try:
            self.openCursor()
            # Check if user_cache table exists (new schema)
            self.cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_cache'
                )
            """)
            user_cache_exists = self.cursor.fetchone()[0]
            
            # Also check if image table exists (to detect old schema)
            self.cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'image'
                )
            """)
            image_table_exists = self.cursor.fetchone()[0]
            self.closeCursor()
            
            # If user_cache doesn't exist but image table does, we need to add user_cache and new columns
            if not user_cache_exists and image_table_exists:
                print("Updating database schema for Keycloak integration...")
                self.openCursor()
                
                # Create user_cache table (only for is_present state)
                self.cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_cache (
                        keycloak_user_id VARCHAR(255) PRIMARY KEY,
                        is_present BOOLEAN DEFAULT FALSE
                    )
                """)
                
                # Add new columns to image table if they don't exist
                self.cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'image' AND column_name = 'vetter_keycloak_id'
                """)
                if not self.cursor.fetchone():
                    self.cursor.execute("""
                        ALTER TABLE image 
                        ADD COLUMN vetter_keycloak_id VARCHAR(255)
                    """)
                    print("  ✅ Added vetter_keycloak_id to image table")
                
                # Add new columns to task table if they don't exist
                self.cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'task' AND column_name = 'assignee_keycloak_id'
                """)
                if not self.cursor.fetchone():
                    self.cursor.execute("""
                        ALTER TABLE task 
                        ADD COLUMN assignee_keycloak_id VARCHAR(255)
                    """)
                    print("  ✅ Added assignee_keycloak_id to task table")
                
                self.closeCursor()
                print("✅ Database schema updated for Keycloak")
            elif not user_cache_exists:
                # No tables exist at all, create full schema
                print("Creating database schema...")
                self._createSchema()
                self._insertInitialData()
                print("✅ Database schema created and initialized")
        except Exception as e:
            print(f"⚠️ Warning: Could not check/initialize database schema: {e}")
    
    def _createSchema(self):
        '''
        Create all database tables
        '''
        self.openCursor()
        
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS sensor_category (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL
            )
        """)
        
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS sensor (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                category_id INTEGER REFERENCES sensor_category(id)
            )
        """)
        
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS priority (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255)
            )
        """)
        
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS cloud_cover (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255)
            )
        """)
        
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS image_category (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255)
            )
        """)
        
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS report (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255)
            )
        """)
        
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS ew_status (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL
            )
        """)
        
        # User cache table for application state (is_present) only
        # Keycloak is the source of truth for user identity - we don't cache display names
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_cache (
                keycloak_user_id VARCHAR(255) PRIMARY KEY,
                is_present BOOLEAN DEFAULT FALSE
            )
        """)
        
        # Legacy users table - deprecated, kept for migration compatibility
        # Will be removed after migration is complete
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) UNIQUE NOT NULL,
                is_present BOOLEAN DEFAULT FALSE
            )
        """) # DEPRECATED: Use user_cache and Keycloak instead
        
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS area (
                scvu_area_id SERIAL PRIMARY KEY,
                area_name VARCHAR(255) UNIQUE NOT NULL,
                v10 BOOLEAN DEFAULT FALSE,
                opsv BOOLEAN DEFAULT FALSE
            )
        """)
        
        self.cursor.execute("""
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
                vetter_keycloak_id VARCHAR(255)  -- Keycloak user ID (sub)
            )
        """)
        
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS image_area (
                scvu_image_area_id SERIAL PRIMARY KEY,
                scvu_image_id INTEGER REFERENCES image(scvu_image_id),
                scvu_area_id INTEGER REFERENCES area(scvu_area_id),
                UNIQUE(scvu_image_id, scvu_area_id)
            )
        """)
        
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS task_status (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL
            )
        """)
        
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS task (
                scvu_task_id SERIAL PRIMARY KEY,
                scvu_image_area_id INTEGER UNIQUE REFERENCES image_area(scvu_image_area_id),
                assignee_keycloak_id VARCHAR(255),  -- Keycloak user ID (sub)
                task_status_id INTEGER REFERENCES task_status(id),
                remarks TEXT
            )
        """)

        #TODO: pretty sure this is no longer needed, but leaving until full refactor is complete
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                account VARCHAR(255) PRIMARY KEY,
                password VARCHAR(255) NOT NULL
            )
        """)
        
        self.closeCursor()
    
    def _insertInitialData(self):
        '''
        Insert initial data into lookup tables
        '''
        self.openCursor()
        
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (0, null) ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (1, 'UTC') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (2, '0C') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (3, '10-90C') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (4, '100C') ON CONFLICT DO NOTHING")
        
        self.cursor.execute("INSERT INTO ew_status(id, name) VALUES (1, 'ttg done') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO ew_status(id, name) VALUES (2, 'xbi done') ON CONFLICT DO NOTHING")
        
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (0, null) ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (1, 'Detection') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (2, 'Classification') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (3, 'Identification') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (4, 'Recognition') ON CONFLICT DO NOTHING")
        
        self.cursor.execute("INSERT INTO priority(id, name) VALUES (0, null) ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO priority(id, name) VALUES (1, 'Low') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO priority(id, name) VALUES (2, 'Medium') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO priority(id, name) VALUES (3, 'High') ON CONFLICT DO NOTHING")
        
        self.cursor.execute("INSERT INTO report(id, name) VALUES (0, null) ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (1, 'DS(OF)') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (2, 'DS(SF)') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (3, 'I-IIRS 0') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (4, 'IIR') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (5, 'Re-DL') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (6, 'Research') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (7, 'TOS') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (8, 'No Findings') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (9, 'Downgrade') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (10, 'Failed') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (11, 'Img Error') ON CONFLICT DO NOTHING")
        
        self.cursor.execute("INSERT INTO task_status(id, name) VALUES (1, 'Incomplete') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO task_status(id, name) VALUES (2, 'In Progress') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO task_status(id, name) VALUES (3, 'Verifying') ON CONFLICT DO NOTHING")
        self.cursor.execute("INSERT INTO task_status(id, name) VALUES (4, 'Completed') ON CONFLICT DO NOTHING")
        
        self.cursor.execute("INSERT INTO area(scvu_area_id, area_name, v10) VALUES (0, 'OTHERS', false) ON CONFLICT DO NOTHING")
        
        #TODO: legacy, please remove once confirmed not needed
        # self.cursor.execute("INSERT INTO accounts(account, password) VALUES ('II', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b') ON CONFLICT DO NOTHING")
        # self.cursor.execute("INSERT INTO accounts(account, password) VALUES ('Senior II', 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35') ON CONFLICT DO NOTHING")
        # self.cursor.execute("INSERT INTO accounts(account, password) VALUES ('IA', '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce') ON CONFLICT DO NOTHING")
        
        # self.cursor.execute("INSERT INTO users(name, is_recent) VALUES ('II User', True) ON CONFLICT (name) DO UPDATE SET is_recent = True")
        # self.cursor.execute("INSERT INTO users(name, is_recent) VALUES ('Senior II User', True) ON CONFLICT (name) DO UPDATE SET is_recent = True")
        # self.cursor.execute("INSERT INTO users(name, is_recent) VALUES ('IA User', True) ON CONFLICT (name) DO UPDATE SET is_recent = True")
        
        self.closeCursor()
    
    def openCursor(self):
        '''
        Function:   opens a cursor to allow queries to be executed
        Input:      NIL
        Output:     NIL
        '''
        self.cursor = self.conn.cursor()
    
    def closeCursor(self):
        '''
        Function:   closes the cursor to prevent queries to be executed
        Input:      NIL
        Output:     NIL
        '''
        self.cursor.close()
    
    def executeSelect(self, query, values=None):
        '''
        Function:   Executes a select statement
        Input:      query is a string with the select statement
        Input:      values is the values to be passed into the query
        Output:     return a list of all the results
        '''
        self.openCursor()
        if values != None:
            self.cursor.execute(query, values)
        else:
            self.cursor.execute(query)
        temp = self.cursor.fetchall()
        self.closeCursor()
        return temp
    
    def executeInsert(self, query, values=None):
        '''
        Function:   Executes an insert statement
        Input:      query is a string with the insert statement
        Input:      values is the values to be passed into the query
        Output:     NIL
        '''
        self.openCursor()
        if values != None:
            self.cursor.execute(query, values)
        else:
            self.cursor.execute(query)

        row_count = self.cursor.rowcount
        self.closeCursor()
        return row_count
    
    def executeInsertReturningID(self, query, values=None):
        '''
        Function:   Executes an insert statement with returning id
        Input:      query is a string with the insert statement with a returning id request
        Input:      values is the values to be passed into the query
        Output:     id of the last inserted value
        '''
        self.openCursor()
        if values != None:
            self.cursor.execute(query, values)
        else:
            self.cursor.execute(query)
        temp = self.cursor.fetchone()[0]
        self.closeCursor()
        return temp
    
    def executeUpdate(self, query, values=None):
        '''
        Function:   Executes an update statement
        Input:      query is a string with the update statement
        Input:      values is the values to be passed into the query
        Output:     NIL
        '''
        self.openCursor()
        if values != None:
            self.cursor.execute(query, values)
        else:
            self.cursor.execute(query)
        self.closeCursor()
    
    def executeDelete(self, query, values=None):
        '''
        Function:   Executes a delete statement
        Input:      query is a string with the delete statement
        Input:      values is the values to be passed into the query
        Output:     NIL
        '''
        self.openCursor()
        if values != None:
            self.cursor.execute(query, values)
        else:
            self.cursor.execute(query)
        self.closeCursor()
    
    def executeInsertMany(self, queries, values=None):
        '''
        Function: Executes multiple insert statements
        Input: queries is a string with multiple insert statements
        Output: NIL
        '''
        self.openCursor()
        if values != None:
            self.cursor.executemany(queries, values)
        else:
            self.cursor.executemany(queries)
        self.closeCursor()

    def executeUpdateMany(self, queries, values=None):
        '''
        Function: Executes multiple update statements
        Input: queries is a string with multiple insert statements
        Output: NIL
        '''
        self.openCursor()
        if values != None:
            self.cursor.executemany(queries, values)
        else:
            self.cursor.executemany(queries)
        self.closeCursor()

    def deleteAll(self):
        '''
        Function:   Should not be called but it drops the entire db
        Input:      None
        Output:     None
        '''
        if ConfigClass._instance.getDatabaseName() != "XBI_TASKING_3_TEST":
            exit()
        self.cursor = self.conn.cursor()
        self.cursor.execute("DELETE FROM task")
        self.cursor.execute("DELETE FROM image_area")
        self.cursor.execute("DELETE FROM area")
        self.cursor.execute("DELETE FROM image")
        self.cursor.execute("DELETE FROM cloud_cover")
        self.cursor.execute("DELETE FROM ew_status")
        self.cursor.execute("DELETE FROM image_category")
        self.cursor.execute("DELETE FROM priority")
        self.cursor.execute("DELETE FROM report")
        self.cursor.execute("DELETE FROM sensor")
        self.cursor.execute("DELETE FROM task_status")
        self.cursor.execute("DELETE FROM users")
        self.cursor.execute("DELETE FROM accounts")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (0, null)")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (1, 'UTC');")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (2, '0C');")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (3, '10-90C');")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (4, '100C');")
        self.cursor.execute("INSERT INTO ew_status(id, name) VALUES (1, 'ttg done');")
        self.cursor.execute("INSERT INTO ew_status(id, name) VALUES (2, 'xbi done');")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (0, null);")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (1, 'Detection');")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (2, 'Classification');")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (3, 'Identification');")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (4, 'Recognition');")
        self.cursor.execute("INSERT INTO priority(id, name) VALUES (0,null);")
        self.cursor.execute("INSERT INTO priority(id, name) VALUES (1,'Low');")
        self.cursor.execute("INSERT INTO priority(id, name) VALUES (2,'Medium');")
        self.cursor.execute("INSERT INTO priority(id, name) VALUES (3,'High');")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (0,null)")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (1,'DS(OF)')")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (2,'DS(SF)')")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (3,'I-IIRS 0')")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (4,'IIR')")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (5,'Re-DL')")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (6,'Research')")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (7,'TOS')")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (8,'No Findings')")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (9,'Downgrade')")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (10,'Failed')")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (11,'Img Error')")
        self.cursor.execute("INSERT INTO task_status(id, name) VALUES (1, 'Incomplete')")
        self.cursor.execute("INSERT INTO task_status(id, name) VALUES (2, 'In Progress')")
        self.cursor.execute("INSERT INTO task_status(id, name) VALUES (3, 'Verifying')")
        self.cursor.execute("INSERT INTO task_status(id, name) VALUES (4, 'Completed')")
        self.cursor.execute("INSERT INTO area(scvu_area_id, area_name, v10) VALUES (0, 'OTHERS', false)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('G074', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('G080', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('G14B', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('G15', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('G32B', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('G42', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('10007', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('10008', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('10009', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('G333', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('10014', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('10010', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('10017', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('10018', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('G077', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('PJ', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('CRM', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('LKIM', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('10013', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('SCM', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('G34A', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('Tg.S', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('PB', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('B016', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('B177', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('B133', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30010', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30011', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30012', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30013', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30014', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30015', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30016', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30017', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30018', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30019', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30020', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30021', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30022', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30023', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30024', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30025', true)")
        self.cursor.execute("INSERT INTO area(area_name, v10) VALUES ('30026', true)")
        #TODO: legacy, please remove once confirmed not needed
        self.cursor.execute("INSERT INTO accounts(account, password) VALUES ('II', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b')")
        self.cursor.execute("INSERT INTO accounts(account, password) VALUES ('Senior II', 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35')")
        self.cursor.execute("INSERT INTO accounts(account, password) VALUES ('IA', '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce')")
        self.cursor.close()