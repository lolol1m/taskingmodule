from main_classes.Database import Database
from main_classes.query_keycloak import KeycloakQueries
from main_classes.query_tasking import TaskingQueries
from main_classes.query_images import ImageQueries
from main_classes.query_lookup import LookupQueries
from main_classes.query_reports import ReportQueries
from services.keycloak_service import KeycloakService


class QueryManager():
    '''
    QueryManager handles all the queries to the backend
    '''
    def __init__(self, config=None):
        self.db = Database(config=config)
        self._keycloak_user_cache = {}
        keycloak_service = KeycloakService(config=config)
        self._keycloak = KeycloakQueries(self.db, self._keycloak_user_cache, keycloak_service=keycloak_service)
        self._tasking = TaskingQueries(self.db, self._keycloak)
        self._images = ImageQueries(self.db, self._keycloak)
        self._lookup = LookupQueries(self.db)
        self._reports = ReportQueries(self.db)

    def _get_keycloak_username(self, keycloak_user_id):
        return self._keycloak.get_keycloak_username(keycloak_user_id)
    
    def _mapKeycloakUsernameToDBUsername(self, keycloak_username):
        return self._keycloak.map_keycloak_username_to_db_username(keycloak_username)
    
    def _mapKeycloakUsernameToKeycloakId(self, keycloak_username):
        return self._keycloak.map_keycloak_username_to_keycloak_id(keycloak_username)

    def createKeycloakUser(self, username, password, role_name):
        return self._keycloak.createKeycloakUser(username, password, role_name)

    def get_keycloak_admin_token(self):
        '''
        Obtain Keycloak admin token of xbi-tasking-admin client
        Input: NIL
        Output: Admin client token
        '''
        return self._keycloak.get_keycloak_admin_token()
    
    # NOTE: getUsers now calls Keycloak directly and returns IDs and roles
    
    def getUserActiveTasks(self, keycloak_user_id):
        return self._tasking.getUserActiveTasks(keycloak_user_id)

    def getActiveTaskCountsForUsers(self, keycloak_user_ids):
        return self._tasking.getActiveTaskCountsForUsers(keycloak_user_ids)
    
    def insertSensor(self, sensor_name):
        return self._images.insertSensor(sensor_name)
    
    def insertImage(self, image_id, image_file_name, sensor_name, upload_date, image_datetime):
        return self._images.insertImage(image_id, image_file_name, sensor_name, upload_date, image_datetime)
    
    def insertArea(self, area_name):
        return self._images.insertArea(area_name)
    
    def insertImageAreaDSTA(self, image_id, area_name):
        return self._images.insertImageAreaDSTA(image_id, area_name)
    
    def insertTTGImageReturnsId(self, image_file_name, sensor_name, upload_date, image_datetime):
        return self._images.insertTTGImageReturnsId(image_file_name, sensor_name, upload_date, image_datetime)
    
    def insertImageAreaTTG(self, scvu_image_id, area_name):
        return self._images.insertImageAreaTTG(scvu_image_id, area_name)
    
    def getAllTaskStatusForImage(self, scvu_image_id):
        return self._tasking.getAllTaskStatusForImage(scvu_image_id)
    
    def getTaskStatusID(self, status_name):
        return self._tasking.getTaskStatusID(status_name)
    
    def completeImage(self, scvu_image_id, vetter_keycloak_id, current_datetime):
        return self._images.completeImage(scvu_image_id, vetter_keycloak_id, current_datetime)

    def uncompleteImage(self, scvu_image_id):
        return self._images.uncompleteImage(scvu_image_id)

    def getImageCompleteDate(self, scvu_image_id):
        return self._images.getImageCompleteDate(scvu_image_id)

    def getKeycloakUserID(self, assignee_username):
        return self._keycloak.getKeycloakUserID(assignee_username)

    def getIncompleteImages(self, start_date, end_date):
        return self._tasking.getIncompleteImages(start_date, end_date)
    
    def getTaskingManagerDataForImage(self, scvu_image_id):
        return self._tasking.getTaskingManagerDataForImage(scvu_image_id)

    def getTaskingManagerDataForTask(self, scvu_image_id):
        return self._tasking.getTaskingManagerDataForTask(scvu_image_id)

    def updateTaskingManagerData(self, scvu_image_id, priority_name):
        return self._tasking.updateTaskingManagerData(scvu_image_id, priority_name)

    def assignTask(self, image_area_id, assignee_keycloak_id, task_status_id):
        return self._tasking.assignTask(image_area_id, assignee_keycloak_id, task_status_id)

    def autoAssign(self, area_name, image_id):
        return self._tasking.autoAssign(area_name, image_id)
    
    def getPriority(self):
        return self._lookup.getPriority()

    def getCloudCover(self):
        return self._lookup.getCloudCover()
    
    def getImageCategory(self):
        return self._lookup.getImageCategory()

    def getReport(self):
        return self._lookup.getReport()
    
    def syncUserCache(self, keycloak_user_id, display_name=None):
        return self._keycloak.syncUserCache(keycloak_user_id, display_name)
    
    def getUsers(self):
        return self._keycloak.getUsers()
    
    def getUserIds(self):
        return self._keycloak.getUserIds()

    def getTaskingSummaryImageData(self, start_date, end_date):
        return self._tasking.getTaskingSummaryImageData(start_date, end_date)

    def getTaskingSummaryImageDataForUser(self, start_date, end_date, assignee_keycloak_id):
        return self._tasking.getTaskingSummaryImageDataForUser(start_date, end_date, assignee_keycloak_id)

    def getTaskingSummaryAreaData(self, image_id):
        return self._tasking.getTaskingSummaryAreaData(image_id)

    def getTaskingSummaryAreaDataForImages(self, image_ids):
        return self._tasking.getTaskingSummaryAreaDataForImages(image_ids)

    def getTaskingSummaryAreaDataForImagesForUser(self, image_ids, assignee_keycloak_id):
        return self._tasking.getTaskingSummaryAreaDataForImagesForUser(image_ids, assignee_keycloak_id)

    def startTask(self, task_id):
        return self._tasking.startTask(task_id)
    
    def completeTask(self, task_id):
        return self._tasking.completeTask(task_id)
    
    def verifyPass(self, task_id):
        return self._tasking.verifyPass(task_id)
        
    def verifyFail(self, task_id):
        return self._tasking.verifyFail(task_id)

    def updateTaskingSummaryImage(self, scvu_image_id, report_name, image_category_name, image_quality_name, cloud_cover_name, target_tracing):
        return self._tasking.updateTaskingSummaryImage(scvu_image_id, report_name, image_category_name, image_quality_name, cloud_cover_name, target_tracing)
    
    def updateTaskingSummaryTask(self, scvu_task_id, remarks):
        return self._tasking.updateTaskingSummaryTask(scvu_task_id, remarks)

    def getImageAreaData(self, scvu_image_id):
        return self._images.getImageAreaData(scvu_image_id)

    def getImageAreaDataForImages(self, scvu_image_ids):
        return self._images.getImageAreaDataForImages(scvu_image_ids)

    def getImageData(self, start_date, end_date):
        return self._images.getImageData(start_date, end_date)

    def getImageDataForUser(self, start_date, end_date, assignee_keycloak_id):
        return self._images.getImageDataForUser(start_date, end_date, assignee_keycloak_id)

    def getXBIReportImage(self, start_date, end_date):
        return self._reports.getXBIReportImage(start_date, end_date)

    def getSensors(self):
        return self._lookup.getSensors()

    def getCategories(self):
        return self._lookup.getCategories()

    def getAreas(self):
        return self._lookup.getAreas()
    
    def setOpsvFalse(self):
        return self._lookup.setOpsvFalse()

    def setOpsvAreas(self, area_list):
        return self._lookup.setOpsvAreas(area_list)

    def resetRecentUsers(self):
        return self._keycloak.resetRecentUsers()

    #TODO: figure out how the new user add system is going to work and change this accordingly
    def addUsers(self, user_list):
        return self._keycloak.addUsers(user_list)
    
    #TODO: figure out how the new user add system is going to work and change this accordingly
    def updateExistingUsers(self, user_list):
        return self._keycloak.updateExistingUsers(user_list)

    def updateSensorCategory(self, category_sensor_list):
        return self._lookup.updateSensorCategory(category_sensor_list)
    
    def deleteTasksForImage(self, scvu_image_id):
        return self._images.deleteTasksForImage(scvu_image_id)
    
    def deleteImageAreasForImage(self, scvu_image_id):
        return self._images.deleteImageAreasForImage(scvu_image_id)
    
    def deleteImage(self, scvu_image_id):
        return self._images.deleteImage(scvu_image_id)
