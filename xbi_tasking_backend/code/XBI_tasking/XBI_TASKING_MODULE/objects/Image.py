import sqlalchemy as _sql
import sqlalchemy.orm as _orm

from GlobalUtils import GLOBAL_BASE_OBJECT

class Image(GLOBAL_BASE_OBJECT):
    '''
    Image represents all the data of Image in the database
    '''
    __tablename__ = "image"
    uuid = _sql.Column(_sql.String, primary_key=True)
    sensor = _sql.Column(_sql.String)
    imaging_date = _sql.Column(_sql.Date)
    upload_date = _sql.Column(_sql.Date)
    priority = _sql.Column(_sql.String, default="")
    tasks = _orm.relationship("Task", back_populates="image")

    def __init__(self):
        self.uuid = ""
        self.sensor = ""
        self.imaging_date = ""
        self.upload_date = ""
        self.priority = 0
    
    def __repr__(self):
        return "<Image {}>".format(self.uuid)

    def initImageDSTA(self, uuid, json):
        '''
        Function:   Takes in a json object to initialise the values of the object
        Input:      Python dictionary that is from the json object
        Output:     None 
        '''
        self.uuid = uuid
        self.sensor = json.get("sensor","")
        self.imaging_date = json.get("imaging_date","")
        self.upload_date = json.get("upload_date","")
        self.priority = json.get("priority",0)
    
    def getUUID(self):
        return self.uuid

    def __setUUID(self, uuid):
        self.uuid = uuid
    
    def getSensor(self):
        return self.sensor
    
    def __setSensor(self, sensor):
        self.sensor = sensor
    
    def getImagingDate(self):
        return self.imaging_date
    
    def __setImagingDate(self, imaging_date):
        self.imaging_date = imaging_date
    
    def getUploadDate(self):
        return self.upload_date
    
    def __setUploadDate(self, upload_date):
        self.upload_date = upload_date
    
    def getPriority(self):
        return self.priority
    
    def setPriority(self, priority):
        self.priority = priority


    
    