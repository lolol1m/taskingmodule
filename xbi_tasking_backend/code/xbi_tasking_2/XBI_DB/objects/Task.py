import sqlalchemy as _sql
import sqlalchemy.orm as orm

from GlobalUtils import GLOBAL_BASE_OBJECT

class Task(GLOBAL_BASE_OBJECT):
    __tablename__ = "task"
    scvu_task_id = _sql.Column(_sql.Integer, primary_key=True)
    scvu_image_id = _sql.Column(_sql.Integer)
    scvu_area_id = _sql.Column(_sql.Integer)
    assignee_id = _sql.Column(_sql.Integer)
    task_status_id = _sql.Column(_sql.Integer)

    def __init__(self):
        self.scvu_task_id = 0
        self.scvu_image_id = 0
        self.scvu_area_id = 0
        self.assignee_id = 0
        self.task_status_id = 0

    def __repr__(self):
        return "<Task {}>".format(self.scvu_image_id)
    
    def getSCVUTaskID(self):
        return self.scvu_task_id
    
    def setSCVUTaskID(self, scvu_task_id):
        self.scvu_task_id = scvu_task_id
    
    def getSCVUImageID(self):
        return self.scvu_image_id
    
    def setSCVUImageID(self, scvu_image_id):
        self.scvu_image_id = scvu_image_id
    
    def getSCVUAreaID(self):
        return self.scvu_area_id
    
    def setSCVUAreaID(self, scvu_area_id):
        self.scvu_area_id = scvu_area_id

    def getAssigneeID(self):
        return self.assignee_id
    
    def setAssigneeID(self, assignee_id):
        self.assignee_id = assignee_id
    
    def getTaskStatusID(self):
        return self.task_status_id
    
    def setTaskStatusID(self, task_status_id):
        self.task_status_id = task_status_id
