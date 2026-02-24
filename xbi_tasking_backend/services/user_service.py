import logging
from io import StringIO
import csv
from main_classes.EnumClasses import Role, ParadeStateStatus
from main_classes.KeycloakClient import KeycloakClient


logger = logging.getLogger("xbi_tasking_backend.user_service")


class UserService:
    def __init__(self, db, keycloak_queries, keycloak_client=None):
        self.db = db
        self.keycloak = keycloak_queries
        self.kc = keycloak_client or KeycloakClient()

    def get_users(self):
        output = {}
        users = self.keycloak.getUsers()

        if not users:
            output["Users"] = []
            output["Warning"] = "No users available from Keycloak."
            return output
        
        output["Users"] = users
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

        result = self.keycloak.createKeycloakUser(username, password, role)
        return {"success": True, "user": result}

    def update_users(self, csv_text):
        user_list = []
        present_list = []
        ps_status = ParadeStateStatus
        file = StringIO(csv_text)
        reader = csv.DictReader(file)
        fieldnames = reader.fieldnames or []
        if "Name" not in fieldnames or "Status" not in fieldnames:
            raise ValueError("CSV must include Name and Status columns")
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
        
        user_list = tuple(user_list)
        present_list = tuple(present_list)
        with self.db.transaction():
            self.keycloak.resetRecentUsers()
            self.keycloak.addUsers(user_list)
            self.keycloak.updateExistingUsers(present_list)

    def change_password(self, user, current_password, new_password):
        """
        Change the current user's password.
        
        Args:
            user: The current user dict from JWT token
            current_password: The user's current password for verification
            new_password: The new password to set
        
        Returns:
            dict with success or error key
        """
        username = user.get("preferred_username")
        user_id = user.get("sub")

        if not username or not user_id:
            logger.warning("Invalid user session: username=%s, user_id=%s", username, user_id)
            return {"error": "Invalid user session"}

        if not new_password or len(new_password) < 8:
            return {"error": "New password must be at least 8 characters"}

        # Verify current password
        try:
            is_valid = self.kc.verify_user_credentials(username, current_password)
            if not is_valid:
                logger.warning("Password verification failed for user %s", username)
                return {"error": "Current password is incorrect"}
        except Exception as e:
            logger.exception("Error verifying credentials for user %s: %s", username, e)
            return {"error": "Failed to verify current password"}

        try:
            # Get admin token and set new password
            admin_token = self.kc.get_admin_token()
            self.kc.set_user_password(admin_token, user_id, new_password, temporary=False)
            logger.info("Password changed successfully for user %s", username)
            return {"success": True}
        except Exception as e:
            logger.exception("Failed to change password for user %s: %s", username, e)
            return {"error": "Failed to change password"}

    def admin_reset_password(self, target_username, new_password):
        """
        Admin function to reset another user's password.
        Does not require current password verification.
        
        Args:
            target_username: The username of the user to reset password for
            new_password: The new password to set
        
        Returns:
            dict with success or error key
        """
        if not target_username:
            return {"error": "Target username is required"}

        if not new_password or len(new_password) < 8:
            return {"error": "New password must be at least 8 characters"}

        try:
            # Get admin token
            admin_token = self.kc.get_admin_token()
            
            # Find the user ID by username
            user_id = self.kc.find_user_id(admin_token, target_username)
            if not user_id:
                return {"error": f"User '{target_username}' not found"}

            # Set new password
            self.kc.set_user_password(admin_token, user_id, new_password, temporary=False)
            logger.info("Password reset successfully for user %s by admin", target_username)
            return {"success": True}
        except Exception as e:
            logger.exception("Failed to reset password for user %s: %s", target_username, e)
            return {"error": "Failed to reset password"}
