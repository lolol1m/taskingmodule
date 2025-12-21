import sqlalchemy as _sql
import sqlalchemy.orm as _orm

from GlobalUtils import GLOBAL_BASE_OBJECT

class Status(GLOBAL_BASE_OBJECT):
    '''
    Status represents all the data of Status in the database
    '''

    __tablename__ = "status"
    id = _sql.Column(_sql.Integer, primary_key=True)
    status_name = _sql.Column(_sql.String)
    tasks = _orm.relationship("Task", back_populates="status")

    def __init__(self):
        self.id = 0
        self.status_name = ''
    
    def __repr__(self):
        return "<Status {}>".format(self.id)
    
    def initStatus(self, json):
        '''
        Function:   Initialises the Status object using values from a JSON object
        Input:      Dictionary obtained from JSON object
        Output:     None
        '''
        self.id = json.get('id', '')
        self.status_name = json.get('status_name', '')
    
    def getId(self):
        '''
        Function:   Returns id of object
        Input:      None
        Output:     id of object as integer
        '''
        return self.id
        
    def __setId(self, id):
        '''
        Function:   Sets id of object
        Input:      id integer to be set 
        Output:     None
        '''
        self.id = id
    
    def getStatusName(self):
        '''
        Function:   Returns status_name of object
        Input:      None
        Output:     status_name of object as string
        '''
        return self.status_name
        
    def setStatusName(self, status_name):
        '''
        Function:   Sets status_name of object
        Input:      status_name string to be set 
        Output:     None
        '''
        self.status_name = status_name