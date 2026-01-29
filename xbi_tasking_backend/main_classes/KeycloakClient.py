from urllib.parse import urlparse
import requests

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
