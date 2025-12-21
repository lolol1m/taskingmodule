import sqlalchemy as _sql
import sqlalchemy.orm as orm

from GlobalUtils import GLOBAL_BASE_OBJECT

class Users(GLOBAL_BASE_OBJECT):
    __tablename__ = "users"
    id = _sql.Column(_sql.Integer, primary_key=True)
    name = _sql.Column(_sql.String)
    is_admin = _sql.Column(_sql.Boolean)

    def __init__(self):
        self.id = None
        self.name = None
        self.is_admin = False

    def __repr__(self):
        return "<Users {}>".format(self.id)
    
    def getID(self):
        return self.id
    
    def setID(self, id):
        self.id = id

    def getName(self):
        return self.name
    
    def setName(self, name):
        self.name = name

    def getIsAdmin(self):
        return self.is_admin

    def setIsAdmin(self, is_admin):
        self.is_admin = is_admin