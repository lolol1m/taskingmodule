import logging
from urllib.parse import urlparse
import requests

logger = logging.getLogger("xbi_tasking_backend.keycloak_client")

from config import get_config

class KeycloakClient:
    def __init__(self, config=None):
        self.config = config or get_config()

    def _base(self):
        keycloak_url = self.config.getKeycloakURL()
        realm = self.config.getKeycloakRealm()
        return keycloak_url, realm

    def get_admin_token(self):
        admin_client_id = self.config.getKeycloakAdminClientID()
        admin_client_secret = self.config.getKeycloakAdminClientSecret()
        if not admin_client_secret or admin_client_secret == "your_admin_client_secret":
            raise ValueError(
                "Keycloak admin client secret is not configured. Please set admin_client_secret in dev_server.config"
            )

        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/token"
        data = {
            "grant_type": "client_credentials",
            "client_id": admin_client_id,
            "client_secret": admin_client_secret,
        }
        response = requests.post(url, data=data, timeout=5)
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code == 401:
                raise ValueError(
                    "Failed to authenticate with Keycloak admin client. "
                    "Please verify admin_client_id and admin_client_secret in dev_server.config."
                )
            raise
        return response.json()["access_token"]

    def get_user_by_id(self, token, keycloak_user_id):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/users/{keycloak_user_id}"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        return response.json()

    def find_user_id(self, token, username):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/users"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        params = {"username": username, "exact": "true"}
        response = requests.get(url, headers=headers, params=params, timeout=5)
        response.raise_for_status()
        users = response.json()
        if not users:
            return None
        return users[0]["id"]

    def get_role(self, token, role_name):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/roles/{role_name}"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        return response.json()

    def get_users_for_role(self, token, role_name):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/roles/{role_name}/users"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        return response.json()

    def assign_realm_role(self, token, user_id, role_representation):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/users/{user_id}/role-mappings/realm"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        response = requests.post(url, headers=headers, json=[role_representation], timeout=5)
        response.raise_for_status()

    def create_user(self, token, username, password):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/users"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {
            "username": username,
            "enabled": True,
            "credentials": [
                {"type": "password", "value": password, "temporary": False},
            ],
        }
        response = requests.post(url, headers=headers, json=payload, timeout=5)
        response.raise_for_status()
        location = response.headers.get("Location")
        if not location:
            return None
        path = urlparse(location).path or ""
        return path.rsplit("/", 1)[-1] if "/" in path else None

    def set_user_password(self, token, user_id, new_password, temporary=False):
        """Set a new password for a user via Admin API"""
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/users/{user_id}/reset-password"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {
            "type": "password",
            "value": new_password,
            "temporary": temporary,
        }
        response = requests.put(url, headers=headers, json=payload, timeout=5)
        response.raise_for_status()

    def delete_user(self, token, user_id):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/users/{user_id}"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.delete(url, headers=headers, timeout=5)
        response.raise_for_status()

    def get_user_realm_roles(self, token, user_id):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/users/{user_id}/role-mappings/realm"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        return response.json()

    def remove_realm_role(self, token, user_id, role_representation):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/users/{user_id}/role-mappings/realm"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        response = requests.delete(url, headers=headers, json=[role_representation], timeout=5)
        response.raise_for_status()

    def get_user(self, token, user_id):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/users/{user_id}"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        return response.json()

    def update_user_info(self, token, user_id, username):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/users/{user_id}"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        current = self.get_user(token, user_id)
        if current.get("username") == username:
            return
        # Only include mutable fields — sending read-only fields (access,
        # disableableCredentialTypes, etc.) causes Keycloak to return 400.
        payload = {
            "username": username,
            "enabled": current.get("enabled", True),
            "emailVerified": current.get("emailVerified", False),
        }
        for optional in ("firstName", "lastName", "email", "attributes"):
            if current.get(optional) is not None:
                payload[optional] = current[optional]
        response = requests.put(url, headers=headers, json=payload, timeout=5)
        if not response.ok:
            logger.error(
                "Keycloak PUT /users/%s returned %s: %s",
                user_id, response.status_code, response.text,
            )
        response.raise_for_status()

    # ── Client role methods ─────────────────────────────────────────────────

    def get_client_uuid(self, token, client_id):
        """Get the internal UUID of a client by its clientId string."""
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/clients"
        headers = {"Authorization": f"Bearer {token}"}
        params = {"clientId": client_id}
        response = requests.get(url, headers=headers, params=params, timeout=5)
        response.raise_for_status()
        clients = response.json()
        if not clients:
            return None
        return clients[0]["id"]

    def get_client_role(self, token, client_uuid, role_name):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/clients/{client_uuid}/roles/{role_name}"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        return response.json()

    def get_user_client_roles(self, token, user_id, client_uuid):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/users/{user_id}/role-mappings/clients/{client_uuid}"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        return response.json()

    def assign_client_role(self, token, user_id, client_uuid, role_representation):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/users/{user_id}/role-mappings/clients/{client_uuid}"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        response = requests.post(url, headers=headers, json=[role_representation], timeout=5)
        response.raise_for_status()

    def remove_client_role(self, token, user_id, client_uuid, role_representation):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/users/{user_id}/role-mappings/clients/{client_uuid}"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        response = requests.delete(url, headers=headers, json=[role_representation], timeout=5)
        response.raise_for_status()

    def get_users_for_client_role(self, token, client_uuid, role_name):
        keycloak_url, realm = self._base()
        url = f"{keycloak_url}/admin/realms/{realm}/clients/{client_uuid}/roles/{role_name}/users"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        return response.json()

    def verify_user_credentials(self, username, password):
        """Verify user credentials by attempting to get a token using admin client"""
        keycloak_url, realm = self._base()
        admin_client_id = self.config.getKeycloakAdminClientID()
        admin_client_secret = self.config.getKeycloakAdminClientSecret()
        url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/token"
        data = {
            "grant_type": "password",
            "client_id": admin_client_id,
            "client_secret": admin_client_secret,
            "username": username,
            "password": password,
        }
        response = requests.post(url, data=data, timeout=5)
        return response.status_code == 200
