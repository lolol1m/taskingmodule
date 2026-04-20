import logging
from io import StringIO
import csv
from main_classes.EnumClasses import ParadeStateStatus
from main_classes.KeycloakClient import KeycloakClient


logger = logging.getLogger("xbi_tasking_backend.user_service")


class UserService:
    def __init__(self, db, keycloak_queries, keycloak_client=None, tasking_queries=None):
        self.db = db
        self.keycloak = keycloak_queries
        self.tasking = tasking_queries
        self.kc = keycloak_client or KeycloakClient()

    def ensure_user_cache(self, token_info):
        user_id = token_info.get("sub")
        if not user_id:
            return
        username = token_info.get("preferred_username")
        account_type = token_info.get("account_type")
        self.keycloak.ensureUserCacheEntry(user_id, username=username, role=account_type)

    def get_users(self):
        users = self.keycloak.getUsersFromCache()
        return {"Users": users or []}

    def edit_user(self, payload):
        user_id = payload.get("user_id", "").strip()
        if not user_id:
            return {"error": "user_id is required"}
        new_status = payload.get("status") or None
        new_coy = payload.get("coy")

        # Username and role are managed in Keycloak; edits here only update local
        # presence/COY cache.
        if payload.get("username") or payload.get("role"):
            return {"error": "Username and role are managed in Keycloak; edit them there."}

        try:
            self.keycloak.editUserCacheOnly(user_id, new_status=new_status, new_coy=new_coy)
            return {"success": True}
        except Exception:
            logger.exception("editUserCacheOnly failed for user_id=%s", user_id)
            return {"error": "Failed to update user"}

    def update_users(self, csv_text):
        user_list = []
        present_list = []
        coy_list = []
        ps_status = ParadeStateStatus
        file = StringIO(csv_text)
        reader = csv.DictReader(file)
        fieldnames = reader.fieldnames or []
        if "Name" not in fieldnames or "Status" not in fieldnames:
            raise ValueError("CSV must include Name and Status columns")
        has_coy = "Coy" in fieldnames
        for row in reader:
            name = (row.get("Name") or "").strip()
            if not name:
                continue
            user_list.append((name,))
            status_value = row.get("Status")
            status_enum = ps_status.from_value(status_value) if status_value else None
            if status_enum == ps_status.PRESENT:
                present_list.append((name,))
            elif status_value:
                logger.warning("Unknown parade state status: %s", status_value)
            if has_coy:
                coy_value = (row.get("Coy") or "").strip()
                if coy_value:
                    coy_list.append((name, coy_value))

        user_list = tuple(user_list)
        present_list = tuple(present_list)
        with self.db.transaction():
            self.keycloak.resetRecentUsers()
            self.keycloak.addUsers(user_list)
            self.keycloak.updateExistingUsers(present_list)
            if coy_list:
                self.keycloak.updateUserCoy(coy_list)
