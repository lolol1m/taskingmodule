# Uncomment below to use config file and comment lines below "import os"
# import configparser


# class ConfigClass:
#     """
#     ConfigClass contains all the functions to read the config file.
#     """
#     def __init__(self, config_file_path):
#         self.config = configparser.ConfigParser()
#         self.config.read(config_file_path)
    
#     def getDatabaseName(self):
#         return self.config.get('Database', 'database_name')

#     def getIPAddress(self):
#         return self.config.get('Database', 'ip_address')

#     def getPort(self):
#         return self.config.get('Database', 'port')

#     def getUser(self):
#         return self.config.get('Database', 'user')

#     def getPassword(self):
#         return self.config.get('Database', 'password')
    
#     def getKeycloakPublicURL(self):
#         return self.config.get('Keycloak', 'keycloak_url')
    
#     def getKeycloakRealm(self):
#         return self.config.get('Keycloak', 'realm')
    
#     def getKeycloakClientID(self):
#         return self.config.get('Keycloak', 'client_id')
    
#     def getKeycloakClientSecret(self):
#         return self.config.get('Keycloak', 'client_secret')
    
#     def getKeycloakAdminClientID(self):
#         return self.config.get('Keycloak', 'admin_client_id')
    
#     def getKeycloakAdminClientSecret(self):
#         return self.config.get('Keycloak', 'admin_client_secret')

#     def getAutoInitDb(self):
#         return self.config.getboolean('Database', 'auto_init_db', fallback=True)

#     def getKeycloakAllowedClientIDs(self):
#         raw = self.config.get('Keycloak', 'allowed_client_ids', fallback='').strip()
#         if not raw:
#             return [self.getKeycloakClientID()]
#         return [client_id.strip() for client_id in raw.split(',') if client_id.strip()]

# Uncomment below to use env vars and comment above lines
import os 

class Singleton(object):
    _instance = None
    def __new__(class_, config_file_path, *args, **kwargs):
        if not isinstance(class_._instance, class_):
            class_._instance = object.__new__(class_, *args, **kwargs)
        return class_._instance
    
class SingletonEnv(object):
    _instance = None
    def __new__(cls, *args, **kwargs):
        if not isinstance(cls._instance, cls):
            cls._instance = super(SingletonEnv, cls).__new__(cls)
        return cls._instance

class ConfigClass(SingletonEnv):
    '''
    ConfigClass contains all the functions to read the config file
    '''
    def __init__(self):
        # self.config = configparser.ConfigParser()
        # self.config.read(config_file_path)
        self.frontend_url = os.getenv("FRONTEND_URL", "https://localhost:5173")
        self.database_name = os.getenv("DB_NAME", "XBI_TASKING_3")
        self.ip_address = os.getenv("DB_HOST", "postgres")
        self.port = int(os.getenv("DB_PORT", "5432"))
        self.user = os.getenv("DB_USER", "postgres")
        self.password = os.getenv("DB_PASSWORD", "password")
        self.auto_init_db = os.getenv("AUTO_INIT_DB", "true").lower() == "true"

        # Keycloak
        self.keycloak_public_url = os.getenv("KEYCLOAK_PUBLIC_URL", "http://localhost:8080")
        self.keycloak_internal_url = os.getenv("KEYCLOAK_INTERNAL_URL", "http://keycloak:8080")
        self.realm = os.getenv("KEYCLOAK_REALM", "xbi-tasking")
        self.client_id = os.getenv("KEYCLOAK_CLIENT_ID", "xbi-tasking-backend")
        self.client_secret = os.getenv("KEYCLOAK_CLIENT_SECRET", "")
        self.admin_client_id = os.getenv("KEYCLOAK_ADMIN_CLIENT_ID", "xbi-tasking-admin")
        self.admin_client_secret = os.getenv("KEYCLOAK_ADMIN_CLIENT_SECRET", "")
        self.keycloak_enabled = os.getenv("KEYCLOAK_ENABLED", "true").lower() == "true"
        self.allowed_client_ids = os.getenv("ALLOWED_CLIENT_IDS","").strip()

    def getFrontendURL(self):
        return self.frontend_url
        
    def getDatabaseName(self):
        return self.database_name

    def getIPAddress(self):
        return self.ip_address

    def getPort(self):
        return self.port

    def getUser(self):
        return self.user

    def getPassword(self):
        return self.password
    
    def getKeycloakPublicURL(self):
        return self.keycloak_public_url
    
    def getKeycloakInternalURL(self):
        return self.keycloak_internal_url
       
    def getKeycloakRealm(self):
        return self.realm
    
    def getKeycloakClientID(self):
        return self.client_id
    
    def getKeycloakClientSecret(self):
        return self.client_secret
    
    def getKeycloakAdminClientID(self):
        return self.admin_client_id
    
    def getKeycloakAdminClientSecret(self):
        return self.admin_client_secret

    def getAutoInitDb(self):
        return self.auto_init_db

    def getKeycloakAllowedClientIDs(self):
        if not self.allowed_client_ids:
            return [self.getKeycloakClientID()]
        return [client_id.strip() for client_id in self.allowed_client_ids.split(',') if client_id.strip()]