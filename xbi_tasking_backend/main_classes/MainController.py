from main_classes.QueryManager import QueryManager
from main_classes.ExcelGenerator import ExcelGenerator
from main_classes.KeycloakClient import KeycloakClient
from services.tasking_service import TaskingService
from services.image_service import ImageService
from services.lookup_service import LookupService
from services.user_service import UserService
from services.report_service import ReportService

class MainController():
    '''
    MainController contains all the functions for the UI to call, the main logic will be in this class.
    '''
    def __init__(self, config=None):
        self.qm = QueryManager(config=config)
        self.eg = ExcelGenerator()

        self.image_service = ImageService(self.qm.db, self.qm._images, self.qm._tasking)
        self.tasking_service = TaskingService(self.qm._tasking, self.qm._keycloak, image_service=self.image_service)
        self.lookup_service = LookupService(self.qm._lookup)
        self.user_service = UserService(self.qm.db, self.qm._keycloak, KeycloakClient())
        self.report_service = ReportService(self.qm._reports, self.qm._lookup, self.eg)
    
    def insertDSTAData(self, json, auto_assign = True):
        return self.image_service.insert_dsta_data(json, auto_assign)

    def insertTTGData(self, json):
        return self.image_service.insert_ttg_data(json)

    def getPriority(self):
        return self.lookup_service.get_priority()

    def getCloudCover(self):
        return self.lookup_service.get_cloud_cover()

    def getImageCategory(self):
        return self.lookup_service.get_image_category()

    def getReport(self):
        return self.lookup_service.get_report()

    def getUsers(self):
        return self.user_service.get_users()

    def createUser(self, json):
        return self.user_service.create_user(json)

    def getTaskingSummaryData(self, json):
        return self.tasking_service.get_tasking_summary(json)

    def getTaskingManagerData(self, json):
        return self.tasking_service.get_tasking_manager(json)

    def updateTaskingManagerData(self, json):
        return self.tasking_service.update_tasking_manager(json)

    def assignTask(self, json):
        return self.tasking_service.assign_task(json)

    def startTasks(self, json):
        return self.tasking_service.start_tasks(json)

    def completeTasks(self, json):
        return self.tasking_service.complete_tasks(json)

    def verifyPass(self, json):
        return self.tasking_service.verify_pass(json)

    def verifyFail(self, json):
        return self.tasking_service.verify_fail(json)

    def completeImages(self, json, vetter_keycloak_id=None):
        if vetter_keycloak_id is None and isinstance(json, dict):
            vetter_name = json.get("Vetter")
            if vetter_name:
                vetter_keycloak_id = self.qm.getKeycloakUserID(vetter_name) or vetter_name
        return self.image_service.complete_images(json, vetter_keycloak_id)

    def completeImage(self, scvu_image_id, vetter_keycloak_id, current_datetime):
        return self.image_service._complete_image(scvu_image_id, vetter_keycloak_id, current_datetime)

    def uncompleteImages(self, json):
        return self.image_service.uncomplete_images(json)

    def updateTaskingSummaryData(self, json):
        return self.tasking_service.update_tasking_summary(json)


    def getCompleteImageData(self, json, user=None):
        return self.image_service.get_complete_image_data(json, user)

    def getSensorCategory(self):
        return self.lookup_service.get_sensor_category()

    def updateSensorCategory(self, json):
        return self.lookup_service.update_sensor_category(json)

    def getAreas(self):
        return self.lookup_service.get_areas()

    def setOpsvAreas(self, json):
        return self.lookup_service.set_opsv_areas(json)

    def updateUsers(self, userCSV):
        return self.user_service.update_users(userCSV)

    def getXBIReport(self, start_date, end_date):
        return self.report_service.get_xbi_report(start_date, end_date)

    def getXBIReportData(self, json):
        return self.report_service.get_xbi_report_data(json)

    def getXBIReportDataForExcel(self, json):
        return self.report_service.get_xbi_report_data_for_excel(json)

    def deleteImage(self, json):
        return self.image_service.delete_image(json)