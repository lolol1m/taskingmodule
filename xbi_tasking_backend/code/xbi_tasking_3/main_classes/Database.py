import psycopg2

from main_classes import ConfigClass

class Database():
    '''
    Database class connects to the SQL database to execute queries
    '''
    def __init__(self):
        self.conn = psycopg2.connect(
            database=ConfigClass._instance.getDatabaseName(),
            user=ConfigClass._instance.getUser(),
            password=ConfigClass._instance.getPassword(),
            host=ConfigClass._instance.getIPAddress(),
            port=ConfigClass._instance.getPort())

        self.conn.autocommit = True
        self.cursor = None
    
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
        self.closeCursor()
    
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
        self.cursor.execute("INSERT INTO accounts(account, password) VALUES ('II', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b')")
        self.cursor.execute("INSERT INTO accounts(account, password) VALUES ('Senior II', 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35')")
        self.cursor.execute("INSERT INTO accounts(account, password) VALUES ('IA', '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce')")
        self.cursor.close()