import configparser


class ConfigClass:
    """
    ConfigClass contains all the functions to read the config file.
    """
    def __init__(self, config_file_path):
        self.config = configparser.ConfigParser()
        self.config.read(config_file_path)
    
    def getDatabaseName(self):
        return self.config.get('Database', 'database_name')

    def getIPAddress(self):
        return self.config.get('Database', 'ip_address')

    def getPort(self):
        return self.config.get('Database', 'port')

    def getUser(self):
        return self.config.get('Database', 'user')

    def getPassword(self):
        return self.config.get('Database', 'password')
    
    def getKeycloakURL(self):
        return self.config.get('Keycloak', 'keycloak_url')
    
    def getKeycloakRealm(self):
        return self.config.get('Keycloak', 'realm')
    
    def getKeycloakClientID(self):
        return self.config.get('Keycloak', 'client_id')
    
    def getKeycloakClientSecret(self):
        return self.config.get('Keycloak', 'client_secret')
    
    def getKeycloakAdminClientID(self):
        return self.config.get('Keycloak', 'admin_client_id')
    
    def getKeycloakAdminClientSecret(self):
        return self.config.get('Keycloak', 'admin_client_secret')

    def getAutoInitDb(self):
        return self.config.getboolean('Database', 'auto_init_db', fallback=True)

    def getKeycloakAllowedClientIDs(self):
        raw = self.config.get('Keycloak', 'allowed_client_ids', fallback='').strip()
        if not raw:
            return [self.getKeycloakClientID()]
        return [client_id.strip() for client_id in raw.split(',') if client_id.strip()]