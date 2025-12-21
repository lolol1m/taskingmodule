import sqlalchemy as _sql
import sqlalchemy.orm as orm

from GlobalUtils import GLOBAL_BASE_OBJECT

class CloudCover(GLOBAL_BASE_OBJECT):
    __tablename__ = "cloud_cover"
    id = _sql.Column(_sql.Integer, primary_key=True)
    name = _sql.Column(_sql.String)

    def __init__(self):
        self.id = None
        self.name = None

    def __repr__(self):
        return "<CloudCover {}>".format(self.id)
    
    def getID(self):
        return self.id
    
    def setID(self, id):
        self.id = id

    def getName(self):
        return self.name
    
    def setName(self, name):
        self.name = name
    