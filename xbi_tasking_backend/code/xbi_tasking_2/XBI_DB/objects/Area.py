import sqlalchemy as _sql
import sqlalchemy.orm as _orm

from GlobalUtils import GLOBAL_BASE_OBJECT

class Area(GLOBAL_BASE_OBJECT):
    '''
    Area represents all the data of Area in the database
    '''
    __tablename__ = "area"
    scvu_area_id = _sql.Column(_sql.Integer, primary_key=True)
    area_name = _sql.Column(_sql.String)
    # tasks = _orm.relationship("Task", back_populates="area")
    
    def __init__(self):
        self.scvu_area_id = None
        self.area_name = None
        
    
    def __repr__(self):
        return "<Area {}>".format(self.area_name)

    def initArea(self, area_name):
        '''
        Function:   Initialises the Area object using values from the name provided
        Input:      String which is the name of the area
        Output:     None
        '''
        self.area_name = area_name
        
    def getSCVUAreaID(self):
        return self.scvu_area_id
    
    def setSCVUAreaID(self, scvu_area_id):
        self.scvu_area_id = scvu_area_id
    
    def getAreaName(self):
        return self.area_name
    
    def setAreaName(self, area_name):
        self.area_name = area_name
        

    