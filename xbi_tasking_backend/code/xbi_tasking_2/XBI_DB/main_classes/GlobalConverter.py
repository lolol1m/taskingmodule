class Singleton(object):
    _instance = None
    def __new__(class_, *args, **kwargs):
        if not isinstance(class_._instance, class_):
            class_._instance = object.__new__(class_, *args, **kwargs)
        return class_._instance

class GlobalConverter(Singleton):
    '''
    GlobalConverter is a singleton object that can be
    '''

    cloud_cover_cache = dict()
    ew_status_cache = dict()
    image_category_cache = dict()
    priority_cache  = dict()
    report_cache = dict()
    task_status_cache = dict()

    def __init(self):
        self._instance = self.__new__()    

    def createCache(self, cloud_cover_list, ew_status_list, image_category_list, priority_list, report_list, task_status_list):
        '''
        Function: Creates the cache of objects with reference to the DB
        Input: Takes in the tables for the different objects from the DB
        Output: Initialises the caches for all the different object types
        '''
        for item in cloud_cover_list:
            self.cloud_cover_cache[item.getName()] = item
        for item in ew_status_list:
            self.ew_status_list[item.getName()] = item
        for item in image_category_list:
            self.image_category_cache[item.getName()] = item
        for item in priority_list:
            self.priority_list[item.getName()] = item
        for item in report_list:
            self.report_list[item.getName()] = item
        for item in task_status_list:
            self.task_status_list[item.getName()] = item

    def getCloudCoverID(self, name):
        '''
        Function: Function to get the cloud cover ID from the cache
        Input: String input
        Output: Cloud Cover Object
        '''
        return self.cloud_cover_cache.get(name, None)

    def getEWStatusID(self, name):
        '''
        Function: Function to get the EW Status ID from the cache
        Input: String input
        Output: EWStatus Object
        '''
        return self.ew_status_cache.get(name, None)
    
    def getImageCategoryID(self, name):
        '''
        Function: Function to get the Image Category ID from the cache
        Input: String input
        Output: Image Category Object
        '''
        return self.image_category_cache.get(name, None)
    
    def getPriorityID(self, name):
        '''
        Function: Function to get the Priority ID from the cache
        Input: String input
        Output: Priority Object
        '''
        return self.priority_cache.get(name, None)

    def getReportID(self, name):
        '''
        Function: Function to get the Report ID from the cache
        Input: String input
        Output: Report Object
        '''
        return self.report_cache.get(name, None)

    def getTaskStatusID(self, name):
        '''
        Function: Function to get the Task Status ID from the cache
        Input: String input
        Output: Task Status Object
        '''
        return self.task_status_cache.get(name, None)