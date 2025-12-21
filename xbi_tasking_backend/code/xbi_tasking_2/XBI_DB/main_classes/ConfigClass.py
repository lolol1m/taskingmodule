import configparser
from configparser import SafeConfigParser

class ConfigClass:
    def __init__(self,config_file_path):
        self.config = configparser.ConfigParser()
        self.config.read(config_file_path)
        
    def getIPAddress(self):
        full = self.config.get('Database', 'ip_address')
        IPAddress = full.split(':')[0]
        return IPAddress

    def getPort(self):
        full = self.config.get('Database', 'ip_address')
        port = full.split(':')[-1]
        return port

    def getPassword(self):
        return self.config.get('Database', 'password')
    
    def getName(self):
        return self.config.get('Database', 'name')

