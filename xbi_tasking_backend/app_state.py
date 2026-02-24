from main_classes.Database import Database
from main_classes.ExcelGenerator import ExcelGenerator
from main_classes.KeycloakClient import KeycloakClient
from main_classes.query_images import ImageQueries
from main_classes.query_keycloak import KeycloakQueries
from main_classes.query_lookup import LookupQueries
from main_classes.query_reports import ReportQueries
from main_classes.query_tasking import TaskingQueries
from services.keycloak_service import KeycloakService
from services.notification_service import NotificationService
from services.audit_service import AuditService
from services.tasking_service import TaskingService
from services.image_service import ImageService
from services.lookup_service import LookupService
from services.user_service import UserService
from services.report_service import ReportService
from services.rate_limit_service import RateLimitService


def init_app_state(app, config):
    db = Database(config=config)
    keycloak_service = KeycloakService(config=config)
    keycloak_cache = {}
    keycloak_queries = KeycloakQueries(db, keycloak_cache, keycloak_service=keycloak_service)
    tasking_queries = TaskingQueries(db, keycloak_queries)
    image_queries = ImageQueries(db, keycloak_queries)
    lookup_queries = LookupQueries(db)
    report_queries = ReportQueries(db)
    eg = ExcelGenerator()

    app.state.image_service = ImageService(db, image_queries, tasking_queries)
    app.state.tasking_service = TaskingService(tasking_queries, keycloak_queries, image_service=app.state.image_service)
    app.state.lookup_service = LookupService(lookup_queries)
    app.state.report_service = ReportService(report_queries, lookup_queries, eg)
    app.state.user_service = UserService(db, keycloak_queries, KeycloakClient())
    app.state.notification_service = NotificationService()
    app.state.audit_service = AuditService()
    app.state.rate_limit_service = RateLimitService()
