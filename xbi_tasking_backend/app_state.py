from main_classes.QueryManager import QueryManager
from main_classes.ExcelGenerator import ExcelGenerator
from services.notification_service import NotificationService
from services.tasking_service import TaskingService
from services.image_service import ImageService
from services.lookup_service import LookupService
from services.user_service import UserService
from services.report_service import ReportService


def init_app_state(app, config):
    qm = QueryManager(config=config)
    eg = ExcelGenerator()

    app.state.qm = qm
    app.state.image_service = ImageService(qm)
    app.state.tasking_service = TaskingService(qm, image_service=app.state.image_service)
    app.state.lookup_service = LookupService(qm)
    app.state.report_service = ReportService(qm, eg)
    app.state.user_service = UserService(qm)
    app.state.notification_service = NotificationService()
