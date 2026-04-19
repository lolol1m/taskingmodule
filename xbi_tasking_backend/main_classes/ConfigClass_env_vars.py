import os 

# class Singleton(object):
#     _instance = None
#     def __new__(class_, config_file_path, *args, **kwargs):
#         if not isinstance(class_._instance, class_):
#             class_._instance = object.__new__(class_, *args, **kwargs)
#         return class_._instance
    
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
        self.database_name = os.getenv("DB_NAME", "XBI_TASKING_3")
        self.ip_address = os.getenv("DB_HOST", "postgres")
        self.port = int(os.getenv("DB_PORT", "5432"))
        self.user = os.getenv("DB_USER", "postgres")
        self.password = os.getenv("DB_PASSWORD", "password")

        # Keycloak
        self.keycloak_public_url = os.getenv("KEYCLOAK_PUBLIC_URL", "http://localhost:8080")
        self.keycloak_internal_url = os.getenv("KEYCLOAK_INTERNAL_URL", "http://keycloak:8080")
        self.realm = os.getenv("KEYCLOAK_REALM", "xbi-tasking")
        self.client_id = os.getenv("KEYCLOAK_CLIENT_ID", "xbi-tasking-backend")
        self.client_secret = os.getenv("KEYCLOAK_CLIENT_SECRET", "")
        self.admin_client_id = os.getenv("KEYCLOAK_ADMIN_CLIENT_ID", "xbi-tasking-admin")
        self.admin_client_secret = os.getenv("KEYCLOAK_ADMIN_CLIENT_SECRET", "")
        self.keycloak_enabled = os.getenv("KEYCLOAK_ENABLED", "true").lower() == "true"
    
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

