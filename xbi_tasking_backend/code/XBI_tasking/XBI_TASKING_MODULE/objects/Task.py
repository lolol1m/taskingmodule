import sqlalchemy as _sql
import sqlalchemy.orm as _orm

from GlobalUtils import GLOBAL_BASE_OBJECT

class Task(GLOBAL_BASE_OBJECT):
    '''
    Task represents all the data of Task in the database
    '''
    __tablename__ = "task" 
    id = _sql.Column(_sql.Integer, primary_key=True)
    image_id = _sql.Column(_sql.String, _sql.ForeignKey("image.uuid"))
    area_id = _sql.Column(_sql.String, _sql.ForeignKey("area.uuid"))
    user_id = _sql.Column(_sql.String, _sql.ForeignKey("users.user_id"))
    status_id = _sql.Column(_sql.Integer, _sql.ForeignKey("status.id"))

    image = _orm.relationship("Image", back_populates="tasks")
    area = _orm.relationship("Area", back_populates="tasks")
    user = _orm.relationship("User", back_populates="tasks")
    status = _orm.relationship("Status", back_populates="tasks")

    def __init__(self):
        self.id = 0
        self.image_id = ""
        self.area_id = ""
        self.user_id = ""
        self.status_id = 0
    
    def __repr__(self):
        return "<Task {}>".format(self.id)
    
    def initTask(self, json):
        '''
        Function:   Initialises the Task object using values from a JSON object
        Input:      Dictionary obtained from JSON object
        Output:     None
        '''
        self.id = json.get('id', '')
        self.image_id = json.get('image_id', '')
        self.area_id = json.get('area_id', '')
        self.user_id = json.get('user_id', '')
        self.status_id = json.get('status_id', '')
    
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
    
    def getImageId(self):
        '''
        Function:   Returns image_id of object
        Input:      None
        Output:     image_id of object as string
        '''
        return self.image_id
        
    def __setImageId(self, image_id):
        '''
        Function:   Sets image_id of object
        Input:      image_id string to be set 
        Output:     None
        '''
        self.image_id = image_id
    
    def getAreaId(self):
        '''
        Function:   Returns area_id of object
        Input:      None
        Output:     area_id of object as string
        '''
        return self.area_id
        
    def __setAreaId(self, area_id):
        '''
        Function:   Sets area_id of object
        Input:      area_id string to be set 
        Output:     None
        '''
        self.area_id = area_id
    
    def getUserId(self):
        '''
        Function:   Returns user_id of object
        Input:      None
        Output:     user_id of object as string
        '''
        return self.user_id
        
    def setUserId(self, user_id):
        '''
        Function:   Sets user_id of object
        Input:      user_id string to be set 
        Output:     None
        '''
        self.user_id = user_id
    
    def getStatusId(self):
        '''
        Function:   Returns status_id of object
        Input:      None
        Output:     status_id of object as integer
        '''
        return self.status_id
        
    def setStatusId(self, status_id):
        '''
        Function:   Sets status_id of object
        Input:      status_id integer to be set 
        Output:     None
        '''
        self.status_id = status_id