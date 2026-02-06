import os
import psycopg2
from contextlib import contextmanager
from psycopg2 import sql
from psycopg2.pool import ThreadedConnectionPool

import logging
from config import get_config
from main_classes.DatabaseSchemaManager import DatabaseSchemaManager

logger = logging.getLogger("xbi_tasking_backend.database")

class Database():
    '''
    Database class connects to the SQL database to execute queries
    '''
    def __init__(self, config=None):
        self._config = config or get_config()
        db_name = self._config.getDatabaseName()
        self._pool = self._create_pool(db_name)
        self._schema_manager = DatabaseSchemaManager(self)
        
        # Check if tables exist, if not create them (configurable for prod)
        if self._config.getAutoInitDb():
            self._schema_manager.initialize_database()

    def _create_pool(self, db_name):
        conn_kwargs = dict(
            database=db_name,
            user=self._config.getUser(),
            password=self._config.getPassword(),
            host=self._config.getIPAddress(),
            port=self._config.getPort(),
            connect_timeout=5,
        )
        try:
            return ThreadedConnectionPool(1, int(os.getenv("DB_POOL_MAX", "10")), **conn_kwargs)
        except psycopg2.OperationalError as e:
            if "does not exist" in str(e) or "database" in str(e).lower():
                self._create_database(db_name)
                return ThreadedConnectionPool(1, int(os.getenv("DB_POOL_MAX", "10")), **conn_kwargs)
            logger.error("Database connection failed: %s", e)
            logger.error("Please check: PostgreSQL service and configuration")
            raise

    def _create_database(self, db_name):
        try:
            temp_conn = psycopg2.connect(
                database='postgres',
                user=self._config.getUser(),
                password=self._config.getPassword(),
                host=self._config.getIPAddress(),
                port=self._config.getPort(),
                connect_timeout=5)
            temp_conn.autocommit = True
            with temp_conn.cursor() as temp_cursor:
                temp_cursor.execute(sql.SQL("CREATE DATABASE {}").format(
                    sql.Identifier(db_name)
                ))
            temp_conn.close()
            logger.info("Created database '%s'", db_name)
        except Exception as create_error:
            logger.error("Failed to create database: %s", create_error)
            raise

    @contextmanager
    def _get_cursor(self, *, autocommit: bool = True):
        conn = self._pool.getconn()
        try:
            conn.autocommit = autocommit
            with conn.cursor() as cursor:
                yield cursor
            if not autocommit:
                conn.commit()
        except Exception:
            if not autocommit:
                conn.rollback()
            raise
        finally:
            self._pool.putconn(conn)

    @contextmanager
    def transaction(self):
        with self._get_cursor(autocommit=False) as cursor:
            yield cursor
    
    
    def executeSelect(self, query, values=None):
        '''
        Function:   Executes a select statement
        Input:      query is a string with the select statement
        Input:      values is the values to be passed into the query
        Output:     return a list of all the results
        '''
        with self._get_cursor() as cursor:
            if values != None:
                cursor.execute(query, values)
            else:
                cursor.execute(query)
            temp = cursor.fetchall()
        return temp
    
    def executeInsert(self, query, values=None):
        '''
        Function:   Executes an insert statement
        Input:      query is a string with the insert statement
        Input:      values is the values to be passed into the query
        Output:     NIL
        '''
        with self._get_cursor() as cursor:
            if values != None:
                cursor.execute(query, values)
            else:
                cursor.execute(query)

            row_count = cursor.rowcount
        return row_count
    
    def executeInsertReturningID(self, query, values=None):
        '''
        Function:   Executes an insert statement with returning id
        Input:      query is a string with the insert statement with a returning id request
        Input:      values is the values to be passed into the query
        Output:     id of the last inserted value
        '''
        with self._get_cursor() as cursor:
            if values != None:
                cursor.execute(query, values)
            else:
                cursor.execute(query)
            temp = cursor.fetchone()[0]
        return temp
    
    def executeUpdate(self, query, values=None):
        '''
        Function:   Executes an update statement
        Input:      query is a string with the update statement
        Input:      values is the values to be passed into the query
        Output:     NIL
        '''
        with self._get_cursor() as cursor:
            if values != None:
                cursor.execute(query, values)
            else:
                cursor.execute(query)
    
    def executeDelete(self, query, values=None):
        '''
        Function:   Executes a delete statement
        Input:      query is a string with the delete statement
        Input:      values is the values to be passed into the query
        Output:     NIL
        '''
        with self._get_cursor() as cursor:
            if values != None:
                cursor.execute(query, values)
            else:
                cursor.execute(query)
    
    def executeInsertMany(self, queries, values=None):
        '''
        Function: Executes multiple insert statements
        Input: queries is a string with multiple insert statements
        Output: NIL
        '''
        if values is not None and len(values) == 0:
            return
        with self._get_cursor() as cursor:
            if values != None:
                cursor.executemany(queries, values)
            else:
                cursor.executemany(queries)

    def executeUpdateMany(self, queries, values=None):
        '''
        Function: Executes multiple update statements
        Input: queries is a string with multiple insert statements
        Output: NIL
        '''
        if values is not None and len(values) == 0:
            return
        with self._get_cursor() as cursor:
            if values != None:
                cursor.executemany(queries, values)
            else:
                cursor.executemany(queries)

    def deleteAll(self):
        '''
        Function:   Should not be called but it drops the entire db
        Input:      None
        Output:     None
        '''
        if self._config.getDatabaseName() != "XBI_TASKING_3_TEST":
            exit()
        statements = [
            "DELETE FROM task",
            "DELETE FROM image_area",
            "DELETE FROM area",
            "DELETE FROM image",
            "DELETE FROM cloud_cover",
            "DELETE FROM ew_status",
            "DELETE FROM image_category",
            "DELETE FROM priority",
            "DELETE FROM report",
            "DELETE FROM sensor",
            "DELETE FROM sensor_category",
            "DELETE FROM task_status",
            "DELETE FROM accounts",
        ]
        with self._get_cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)

    def seed_lookup_data(self):
        self._schema_manager.seed_lookup_data()

    def seed_test_data(self):
        if self._config.getDatabaseName() != "XBI_TASKING_3_TEST":
            raise RuntimeError("seed_test_data is only allowed for test database.")
        self.seed_lookup_data()
        statements = [
            "INSERT INTO area(scvu_area_id, area_name, v10) VALUES (0, 'OTHERS', false) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('G074', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('G080', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('G14B', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('G15', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('G32B', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('G42', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('10007', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('10008', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('10009', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('G333', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('10014', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('10010', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('10017', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('10018', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('G077', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('PJ', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('CRM', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('LKIM', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('10013', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('SCM', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('G34A', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('Tg.S', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('PB', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('B016', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('B177', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('B133', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30010', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30011', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30012', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30013', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30014', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30015', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30016', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30017', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30018', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30019', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30020', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30021', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30022', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30023', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30024', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30025', true) ON CONFLICT DO NOTHING",
            "INSERT INTO area(area_name, v10) VALUES ('30026', true) ON CONFLICT DO NOTHING",
        ]
        with self._get_cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)