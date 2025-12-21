import sqlalchemy as _sql
import sqlalchemy.orm as _orm
import psycopg2
from urllib.parse import quote_plus as urlquote
from objects import User

from GlobalVariables import DB_URL, DB_PASSWORD
class Database():
    '''
    Database talks to postgres to pull and store the required data
    '''
    def __init__(self):
        self.engine = _sql.create_engine(('postgresql+psycopg2://postgres:%s@'+DB_URL) % urlquote(DB_PASSWORD))
        self.db = _orm.sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.client = self.db()
    
    def getObjects(self, obj, query=None):
        '''
        Function:   Gets the list of objects from database
        Input:      obj is the object to query
        Output:     Returns a list of objects 
        '''
        if query == None:
            return self.client.query(obj).all()
        return self.client.query(obj).filter(query).all()
    
    def getObject(self, obj, query=None):
        '''
        Function:   Gets an object from database
        Input:      obj is the object to query
        Output:     Returns 1 object
        '''
        if query == None:
            return self.client.query(obj).first()
        return self.client.query(obj).filter(query).first()

    def getOrInsertObjects(self, obj, query=None):
        '''
        Function:   Gets the list of objects from database
        Input:      obj is the object to query
        Output:     Returns a list of objects 
        '''
        # if self.client.query(obj).filter_by(obj.user_id).first():

        # if query == None:
        #     return self.client.query(obj).all()
        # return self.client.query(obj).filter(query).all()

    def insertObjects(self, objs):
        '''
        Function:   Inserts list of objects into database
        Input:      objects is the list of objects to be inserted into Database
        '''
        self.client.add_all(objs)
        self.client.commit()

    def insertObjects2(self, objs):
        '''
        Function:   Inserts list of objects into database
        Input:      objects is the list of objects to be inserted into Database
        '''
        for obj in objs:
            self.insertObject(obj)
        self.client.commit()
    def insertObject(self, obj):
        '''
        Function:   Inserts object into database
        Input:      object is the object to be inserted into Database
        '''
        self.client.add(obj)