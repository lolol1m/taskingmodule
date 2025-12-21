import sqlalchemy as _sql
import sqlalchemy.orm as _orm

from GlobalUtils import GLOBAL_BASE_OBJECT

class Sensor(GLOBAL_BASE_OBJECT):
    __tablename__ = "sensor"
    id = _sql.Column(_sql.Integer, primary_key=True)
    name = _sql.Column(_sql.String)

    image = _orm.relationship("Image", back_populates="sensor")

    def __init__(self):
        self.id = None
        self.name = None

    def __repr__(self):
        return "<Sensor {}>".format(self.id)
    
    def getID(self):
        return self.id
    
    def setID(self, id):
        self.id = id

    def getName(self):
        return self.name
    
    def setName(self, name):
        self.name = name