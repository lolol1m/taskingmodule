import time
from jose import jwt
from main_classes.KeycloakClient import KeycloakClient


class KeycloakService:
    def __init__(self, client=None, config=None):
        self.client = client or KeycloakClient(config=config)
        self._admin_token = None
        self._admin_token_exp = 0

    def get_admin_token(self):
        now = time.time()
        if self._admin_token and now < (self._admin_token_exp - 10):
            return self._admin_token

        token = self.client.get_admin_token()
        token_exp = None
        try:
            claims = jwt.get_unverified_claims(token)
            token_exp = claims.get("exp")
        except Exception:
            token_exp = None

        self._admin_token = token
        self._admin_token_exp = token_exp if token_exp else (now + 60)
        return token

    def get_user_by_id(self, token, keycloak_user_id):
        return self.client.get_user_by_id(token, keycloak_user_id)

    def find_user_id(self, token, username):
        return self.client.find_user_id(token, username)

    def get_role(self, token, role_name):
        return self.client.get_role(token, role_name)

    def get_users_for_role(self, token, role_name):
        return self.client.get_users_for_role(token, role_name)

    def assign_realm_role(self, token, user_id, role_representation):
        return self.client.assign_realm_role(token, user_id, role_representation)

    def create_user(self, token, username, password):
        return self.client.create_user(token, username, password)
