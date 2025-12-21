import sqlalchemy as _sql
import sqlalchemy.orm as _orm

from GlobalUtils import GLOBAL_BASE_OBJECT

class Area(GLOBAL_BASE_OBJECT):
    '''
    Area represents all the data of Area in the database
    '''
    __tablename__ = "area"
    uuid = _sql.Column(_sql.String, primary_key=True)
    tasks = _orm.relationship("Task", back_populates="area")

    def __init__(self):
        self.uuid = ""
    
    def __repr__(self):
        return "<Area {}>".format(self.uuid)

    def initAreaDSTA(self, uuid):
        '''
        Function:   Initialises the Image object using values from the uuid provided
        Input:      String which is the id of the image
        Output:     None
        '''
        self.uuid = uuid
        
    def getUUID(self):
        '''
        Function:   Returns UUID of object
        Input:      None
        Output:     UUID of object as string
        '''
        return self.uuid
    
    def __setUUID(self, uuid):
        '''
        Function:   Sets UUID of object
        Input:      UUID string to be set 
        Output:     None
        '''
        self.uuid = uuid

    