import sqlalchemy as _sql
import sqlalchemy.orm as _orm

from GlobalUtils import GLOBAL_BASE_OBJECT

class User(GLOBAL_BASE_OBJECT):
    '''
    User represents all the data of User in the database
    '''
    __tablename__ = "users"
    user_id = _sql.Column(_sql.String, primary_key = True)

    tasks = _orm.relationship("Task", back_populates="user")
    def __init__(self):
        self.user_id = ""
    
    def __repr__(self):
        return "<User {}>".format(self.user_id)

    def initUser(self, json):
        '''
        Function:   Initialises the User object using values from a JSON object
        Input:      Dictionary obtained from JSON object
        Output:     None
        '''
        self.user_id = json.get("user_id", "")
    
    def getUserId(self):
        '''
        Function:   Returns user_id of object
        Input:      None
        Output:     user_id of object as string
        '''
        return self.user_id
        
    def __setUserId(self, user_id):
        '''
        Function:   Sets user_id of object
        Input:      user_id string to be set 
        Output:     None
        '''
        self.user_id = user_id