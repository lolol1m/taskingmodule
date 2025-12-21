import sqlalchemy as _sql
import sqlalchemy.orm as _orm

from GlobalUtils import GLOBAL_BASE_OBJECT

class Image(GLOBAL_BASE_OBJECT):
    '''
    Image represents all the data of the image in the database
    '''

    __tablename__ = "image"
    scvu_image_id = _sql.Column(_sql.Integer, primary_key=True)
    pass_id = _sql.Column(_sql.Integer)
    sensor_id = _sql.Column(_sql.Integer, _sql.ForeignKey("sensor.id"))
    image_file_name = _sql.Column(_sql.String)
    image_id = _sql.Column(_sql.Integer)
    upload_date = _sql.Column(_sql.Date)
    image_datetime = _sql.Column(_sql.Date)
    report_id = _sql.Column(_sql.Integer)
    remarks = _sql.Column(_sql.String)
    priority_id = _sql.Column(_sql.Integer)
    image_category_id = _sql.Column(_sql.Integer)
    image_quality = _sql.Column(_sql.String)
    cloud_cover_id = _sql.Column(_sql.Integer)
    ew_status_id = _sql.Column(_sql.Integer)
    target_tracing = _sql.Column(_sql.Boolean)
    completed_date = _sql.Column(_sql.Date)

    sensor = _orm.relationship("Sensor", back_populates="image")



    def __init__(self):
        self.scvu_image_id = None
        self.pass_id = None
        self.sensor_id = None
        self.image_file_name = None
        self.image_id = None
        self.upload_date = None
        self.image_datetime = None
        self.report_id = 0
        self.remarks = ""
        self.priority_id = 0
        self.image_category_id = 0
        self.image_quality = ""
        self.cloud_cover_id = 0
        self.ew_status_id = None
        self.target_tracing = False
        self.completed_date = None
        
    def __repr__(self):
        return "<Image {}>".format(self.image_id)
    
    def getSCVUImageID(self):
        return self.scvu_image_id
    
    def setSCVUImageID(self, scvu_image_id):
        self.scvu_image_id = scvu_image_id
    
    def getPassID(self):
        return self.pass_id
    
    def setPassID(self, pass_id):
        self.pass_id = pass_id

    def getSensorID(self):
        return self.sensor_id
    
    def setSensorID(self, sensor_id):
        self.sensor_id = sensor_id

    def getImageFileName(self):
        return self.image_file_name
    
    def setImageFileName(self, image_file_name):
        self.image_file_name = image_file_name

    def getImageID(self):
        return self.image_id
    
    def setImageID(self, image_id):
        self.image_id = image_id

    def getUploadDate(self):
        return self.upload_date
    
    def setUploadDate(self, upload_date):
        self.upload_date = upload_date

    def getImageDateTime(self):
        return self.image_datetime
    
    def setImageDateTime(self, image_datetime):
        self.image_datetime = image_datetime
    
    def getReportID(self):
        return self.report_id
    
    def setReportID(self, upload_date):
        self.report_id = report_id

    def getRemarks(self):
        return self.remarks
    
    def setRemarks(self, remarks):
        self.remarks = remarks

    def getPriorityID(self):
        return self.priority_id
    
    def setPriorityID(self, priority_id):
        self.priority_id = priority_id

    def getImageCategoryID(self):
        return self.image_category_id
    
    def setImageCategoryID(self, image_category_id):
        self.image_category_id = image_category_id

    def getImageQuality(self):
        return self.image_quality
    
    def setImageQuality(self, image_quality):
        self.image_quality = image_quality

    def getCloudCoverID(self):
        return self.cloud_cover_id
    
    def setCloudCoverID(self, cloud_cover_id):
        self.cloud_cover_id = cloud_cover_id

    def getEWStatusID(self):
        return self.ew_status_id
    
    def setEWStatusID(self, ew_status_id):
        self.ew_status_id = ew_status_id

    def getTargetTracing(self):
        return self.target_tracing

    def setTargetTracing(self, target_tracing):
        self.target_tracing = target_tracing
    
    def getCompletedDate(self):
        return self.completed_date
    
    def setCompletedDate(self, completed_date):
        self.completed_date = completed_date
    

    
    
