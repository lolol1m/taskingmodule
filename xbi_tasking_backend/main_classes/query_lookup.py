SQL_GET_PRIORITY = "SELECT name FROM priority WHERE name IS NOT NULL"
SQL_GET_CLOUD_COVER = "SELECT name FROM cloud_cover WHERE name IS NOT NULL"
SQL_GET_IMAGE_CATEGORY = "SELECT name FROM image_category WHERE name IS NOT NULL"
SQL_GET_REPORT = "SELECT name FROM report WHERE name IS NOT NULL"
SQL_GET_SENSORS = "SELECT sensor.name, sensor_category.name FROM sensor, sensor_category WHERE sensor.category_id = sensor_category.id"
SQL_GET_CATEGORIES = "SELECT sensor_category.name FROM sensor_category"
SQL_GET_AREAS = "SELECT area.scvu_area_id, area.area_name, area.opsv FROM area ORDER BY area_name ASC"
SQL_SET_OPSV_FALSE = "UPDATE area SET opsv = False"
SQL_SET_OPSV_AREAS = "UPDATE area SET opsv = True WHERE area_name = %s"
SQL_UPDATE_SENSOR_CATEGORY = "UPDATE sensor SET category_id = (SELECT id FROM sensor_category WHERE name = %s) WHERE name = %s"


class LookupQueries:
    def __init__(self, db):
        self.db = db

    def getPriority(self):
        '''
        Function:   Gets priority from the db
        Input:      None
        Output:     nested list of all the priorities
        '''
        return self.db.executeSelect(SQL_GET_PRIORITY)

    def getCloudCover(self):
        '''
        Function:   Gets cloud cover from the db
        Input:      None
        Output:     nested list of all the cloud cover
        '''
        return self.db.executeSelect(SQL_GET_CLOUD_COVER)

    def getImageCategory(self):
        '''
        Function:   Gets image category from the db
        Input:      None
        Output:     nested list of all the image category
        '''
        return self.db.executeSelect(SQL_GET_IMAGE_CATEGORY)

    def getReport(self):
        '''
        Function:   Gets report from the db
        Input:      None
        Output:     nested list of all the report
        '''
        return self.db.executeSelect(SQL_GET_REPORT)

    def getSensors(self):
        '''
        Function: Gets sensor data from db
        Input: None
        Output: sensor name, sensor_category_name in nested list
        '''
        cursor = self.db.executeSelect(SQL_GET_SENSORS)
        return cursor

    def getCategories(self):
        '''
        Function: Gets category names from the db
        Input: None
        Output: sensor category names in nested list
        '''
        cursor = self.db.executeSelect(SQL_GET_CATEGORIES)
        return cursor

    def getAreas(self):
        '''
        Function: Gets all the areas as well as their OpsV state
        Input: NIL
        Output: Query results of all the areas
        '''
        cursor = self.db.executeSelect(SQL_GET_AREAS)
        return cursor

    def setOpsvFalse(self):
        '''
        Function: Sets all the areas opsv to False
        Input: NIL
        Outpu: NIL
        '''
        self.db.executeUpdate(SQL_SET_OPSV_FALSE)

    def setOpsvAreas(self, area_list):
        '''
        Function: Sets specified areas opsv to True
        Input: List of areas
        Output: NIL
        '''
        self.db.executeUpdateMany(SQL_SET_OPSV_AREAS, area_list)

    def updateSensorCategory(self, category_sensor_list):
        '''
        Function: Updates sensor to the new category given
        Input: category_sensor_list is a nested list with category sensor
        Output: NIL
        '''
        self.db.executeUpdateMany(SQL_UPDATE_SENSOR_CATEGORY, category_sensor_list)
