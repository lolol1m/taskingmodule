import sqlalchemy as _sql
import sqlalchemy.orm as orm

from GlobalUtils import GLOBAL_BASE_OBJECT

class TaskStatus(GLOBAL_BASE_OBJECT):
    __tablename__ = "task_status"
    id = _sql.Column(_sql.Integer, primary_key=True)
    name = _sql.Column(_sql.String)

    def __init__(self):
        self.id = None
        self.name = None

    def __repr__(self):
        return "<TaskStatus {}>".format(self.id)
    
    def getID(self):
        return self.id
    
    def setID(self, id):
        self.id = id

    def getName(self):
        return self.name
    
    def setName(self, name):
        self.name = name