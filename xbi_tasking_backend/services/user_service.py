import logging
from io import StringIO
import csv
from main_classes.EnumClasses import Role, ParadeStateStatus


logger = logging.getLogger("xbi_tasking_backend.user_service")


class UserService:
    def __init__(self, query_manager):
        self.qm = query_manager

    def get_users(self):
        output = {}
        user_objects = self.qm.getUsers()

        if not user_objects:
            output["Users"] = []
            output["Warning"] = "No users available from Keycloak."
            return output
        
        output["Users"] = user_objects
        return output

    def create_user(self, payload):
        username = payload.get("username", "").strip()
        password = payload.get("password", "").strip()
        role = payload.get("role", "").strip()

        if not username or not password or not role:
            return {"error": "username, password, and role are required"}

        valid_roles = {r.value for r in Role}
        if role not in valid_roles:
            return {"error": f"Invalid role. Must be one of: {', '.join(sorted(valid_roles))}"}

        result = self.qm.createKeycloakUser(username, password, role)
        return {"success": True, "user": result}

    def update_users(self, csv_text):
        userList = []
        presentList = []
        ps_status = ParadeStateStatus
        file = StringIO(csv_text)
        reader = csv.DictReader(file)
        fieldnames = reader.fieldnames or []
        if "Name" not in fieldnames or "Status" not in fieldnames:
            raise ValueError("CSV must include Name and Status columns")
        for row in reader:
            name = (row.get('Name') or "").strip()
            if not name:
                continue
            userList.append((name, ))
            status_value = row.get('Status')
            status_enum = ps_status.from_value(status_value) if status_value else None
            if status_enum == ps_status.PRESENT:
                presentList.append((name,))
            elif status_value:
                logger.warning("Unknown parade state status: %s", status_value)
        
        userList = tuple(userList)
        presentList = tuple(presentList)
        with self.qm.db.transaction():
            self.qm.resetRecentUsers()
            self.qm.addUsers(userList)
            self.qm.updateExistingUsers(presentList)
