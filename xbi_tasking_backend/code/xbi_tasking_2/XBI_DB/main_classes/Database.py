import sqlalchemy as _sql
import sqlalchemy.orm as _orm
import psycopg2
from urllib.parse import quote_plus as urlquote

class Database():
    '''
    Database talks to postgres to pull and store the required data
    '''
    def __init__(self):
        self.engine = _sql.create_engine(('postgresql+psycopg2://postgres:%s@'+"192.168.1.2:5432/XBI_TASKING_V2_testing") % urlquote("P@ssword1"))
        self.db = _orm.sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.client = self.db()
        
    def getObject(self, obj, query=None):
        '''
        Function:   Gets an object from database
        Input:      obj is the object to query
        Output:     Returns 1 object
        '''
        if query == None:
            return self.client.query(obj).first()
        return self.client.query(obj).filter(query).first()

    def getObjects(self, obj, query=None):
        '''
        Function:   Gets the list of objects from database
        Input:      obj is the object to query
        Output:     Returns a list of objects 
        '''
        if query == None:
            return self.client.query(obj).all()
        return self.client.query(obj).filter(query).all()
    
    def insertObject(self, obj):
        '''
        Function:   Inserts an object into database
        Input:      obj is the object to be inserted into Database
        '''
        self.client.add(obj)
        self.client.commit()

    def insertObjects(self, objs):
        '''
        Function:   Inserts list of objects into database
        Input:      objs is the list of objects to be inserted into Database
        '''
        self.client.add_all(objs)
        self.client.commit()

    def mergeObject(self, obj):
        '''
        Function:   Merge an object into database (Insert but wont break when got dupes)
        Input:      obj is the object to be inserted into Database
        '''
        self.client.merge(obj)
        self.client.commit()

    def mergeObjects(self, objs):
        '''
        Function:   Merge an list of objects into database (Insert but wont break when got dupes)
        Input:      objs is the list of objects to be inserted into Database
        '''
        for obj in objs:
            self.client.merge(obj)
        self.client.commit()

    def deleteAll(self):
        '''
        Function:   Should not be called but it drops the entire db
        Input:      None
        Output:     None
        '''
        self.conn = psycopg2.connect(database="XBI_TASKING_V2_testing", user="postgres", password="P@ssword1", host="192.168.1.2", port=5432)
        self.conn.autocommit = True
        self.cursor = self.conn.cursor()
        self.cursor.execute("DELETE FROM area")
        self.cursor.execute("DELETE FROM image")
        self.cursor.execute("DELETE FROM task")
        self.cursor.execute("DELETE FROM cloud_cover")
        self.cursor.execute("DELETE FROM ew_status")
        self.cursor.execute("DELETE FROM image_category")
        self.cursor.execute("DELETE FROM priority")
        self.cursor.execute("DELETE FROM report")
        self.cursor.execute("DELETE FROM sensor")
        self.cursor.execute("DELETE FROM task_status")
        self.cursor.execute("DELETE FROM users")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (0, '')")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (1, 'UTC');")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (2, '0C');")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (3, '10-90C');")
        self.cursor.execute("INSERT INTO cloud_cover(id, name) VALUES (4, '100C');")
        self.cursor.execute("INSERT INTO ew_status(id, name) VALUES (1, 'ttg done');")
        self.cursor.execute("INSERT INTO ew_status(id, name) VALUES (2, 'xbi done');")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (0, '');")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (1, 'Detection');")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (2, 'Classification');")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (3, 'Identification');")
        self.cursor.execute("INSERT INTO image_category(id, name) VALUES (4, 'Recognition');")
        self.cursor.execute("INSERT INTO priority(id, name) VALUES (0,'');")
        self.cursor.execute("INSERT INTO priority(id, name) VALUES (1,'Low');")
        self.cursor.execute("INSERT INTO priority(id, name) VALUES (2,'Medium');")
        self.cursor.execute("INSERT INTO priority(id, name) VALUES (3,'High');")
        self.cursor.execute("INSERT INTO report(id, name) VALUES (0,'')")
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
        self.cursor.close()