class LookupQueries:
    def __init__(self, db):
        self.db = db

    def getPriority(self):
        '''
        Function:   Gets priority from the db
        Input:      None
        Output:     nested list of all the priorities
        '''
        query = "SELECT name FROM priority WHERE name IS NOT NULL"
        return self.db.executeSelect(query)

    def getCloudCover(self):
        '''
        Function:   Gets cloud cover from the db
        Input:      None
        Output:     nested list of all the cloud cover
        '''
        query = "SELECT name FROM cloud_cover WHERE name IS NOT NULL"
        return self.db.executeSelect(query)

    def getImageCategory(self):
        '''
        Function:   Gets image category from the db
        Input:      None
        Output:     nested list of all the image category
        '''
        query = "SELECT name FROM image_category WHERE name IS NOT NULL"
        return self.db.executeSelect(query)

    def getReport(self):
        '''
        Function:   Gets report from the db
        Input:      None
        Output:     nested list of all the report
        '''
        query = "SELECT name FROM report WHERE name IS NOT NULL"
        return self.db.executeSelect(query)

    def getSensors(self):
        '''
        Function: Gets sensor data from db
        Input: None
        Output: sensor name, sensor_category_name in nested list
        '''
        query = f"SELECT sensor.name, sensor_category.name FROM sensor, sensor_category WHERE sensor.category_id = sensor_category.id"
        cursor = self.db.executeSelect(query)
        return cursor

    def getCategories(self):
        '''
        Function: Gets category names from the db
        Input: None
        Output: sensor category names in nested list
        '''
        query = f"SELECT sensor_category.name FROM sensor_category"
        cursor = self.db.executeSelect(query)
        return cursor

    def getAreas(self):
        '''
        Function: Gets all the areas as well as their OpsV state
        Input: NIL
        Output: Query results of all the areas
        '''
        query = f"SELECT area.scvu_area_id, area.area_name, area.opsv FROM area ORDER BY area_name ASC"
        cursor = self.db.executeSelect(query)
        return cursor

    def setOpsvFalse(self):
        '''
        Function: Sets all the areas opsv to False
        Input: NIL
        Outpu: NIL
        '''
        query = f"UPDATE area SET opsv = False"
        self.db.executeUpdate(query)

    def setOpsvAreas(self, area_list):
        '''
        Function: Sets specified areas opsv to True
        Input: List of areas
        Output: NIL
        '''
        query = f"UPDATE area SET opsv = True WHERE area_name = %s"
        self.db.executeUpdateMany(query, area_list)

    def updateSensorCategory(self, category_sensor_list):
        '''
        Function: Updates sensor to the new category given
        Input: category_sensor_list is a nested list with category sensor
        Output: NIL
        '''
        query = f"UPDATE sensor SET category_id = (SELECT id FROM sensor_category WHERE name = %s) WHERE name = %s"
        self.db.executeUpdateMany(query, category_sensor_list)
