from main_classes import Database

class QueryManager():
    '''
    QueryManager handles all the queries to the backend
    '''
    def __init__(self):
        self.db = Database()
    
    def accountLogin(self, hashed_password):
        '''
        Function:   validates password and returns account type
        Input:      hashed_password string
        Output:     string of account type (II, Senior II, IA) or empty string if password is invalid
        '''
        result = self.db.executeSelect(
            "SELECT account FROM accounts WHERE password = %s",
            (hashed_password,)
        )
        if result:
            return result[0][0]
        return ""
    
    def insertSensor(self, sensor_name):
        '''
        Function:   Inserts sensor into database if not already existing
        Input:      sensor_name string
        Output:     NIL
        '''
        self.db.executeInsert(
            "INSERT INTO sensor(name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
            (sensor_name,)
        )
    
    def insertImage(self, image_id, image_file_name, sensor_name, upload_date, image_datetime):
        '''
        Function:   Inserts image into database if not already existing
        Input:      image_id, image_file_name, sensor_name, upload_date, image_datetime
        Output:     NIL
        '''
        sensor_id = self.db.executeSelect("SELECT id FROM sensor WHERE name = %s", (sensor_name,))[0][0]
        ew_status_id = 2  # xbi done
        self.db.executeInsert(
            """INSERT INTO image(image_id, image_file_name, sensor_id, upload_date, image_datetime, ew_status_id)
               VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (image_id) DO NOTHING""",
            (image_id, image_file_name, sensor_id, upload_date, image_datetime, ew_status_id)
        )
    
    def insertArea(self, area_name):
        '''
        Function:   Inserts area into database if not already existing
        Input:      area_name string
        Output:     NIL
        '''
        self.db.executeInsert(
            "INSERT INTO area(area_name) VALUES (%s) ON CONFLICT (area_name) DO NOTHING",
            (area_name,)
        )
    
    def insertImageAreaDSTA(self, image_id, area_name):
        '''
        Function:   Inserts image_area relationship for DSTA format
        Input:      image_id, area_name
        Output:     NIL
        '''
        scvu_image_id = self.db.executeSelect(
            "SELECT scvu_image_id FROM image WHERE image_id = %s",
            (image_id,)
        )[0][0]
        scvu_area_id = self.db.executeSelect(
            "SELECT scvu_area_id FROM area WHERE area_name = %s",
            (area_name,)
        )[0][0]
        self.db.executeInsert(
            """INSERT INTO image_area(scvu_image_id, scvu_area_id)
               VALUES (%s, %s) ON CONFLICT (scvu_image_id, scvu_area_id) DO NOTHING""",
            (scvu_image_id, scvu_area_id)
        )
    
    def insertTTGImageReturnsId(self, image_file_name, sensor_name, upload_date, image_datetime):
        '''
        Function:   Inserts TTG image and returns the scvu_image_id
        Input:      image_file_name, sensor_name, upload_date, image_datetime
        Output:     scvu_image_id
        '''
        sensor_id = self.db.executeSelect("SELECT id FROM sensor WHERE name = %s", (sensor_name,))[0][0]
        ew_status_id = 1  # ttg done
        scvu_image_id = self.db.executeInsertReturningID(
            """INSERT INTO image(image_file_name, sensor_id, upload_date, image_datetime, ew_status_id)
               VALUES (%s, %s, %s, %s, %s) RETURNING scvu_image_id""",
            (image_file_name, sensor_id, upload_date, image_datetime, ew_status_id)
        )
        return scvu_image_id
    
    def insertImageAreaTTG(self, scvu_image_id, area_name):
        '''
        Function:   Inserts image_area relationship for TTG format
        Input:      scvu_image_id, area_name
        Output:     NIL
        '''
        scvu_area_id = self.db.executeSelect(
            "SELECT scvu_area_id FROM area WHERE area_name = %s",
            (area_name,)
        )[0][0]
        self.db.executeInsert(
            """INSERT INTO image_area(scvu_image_id, scvu_area_id)
               VALUES (%s, %s) ON CONFLICT (scvu_image_id, scvu_area_id) DO NOTHING""",
            (scvu_image_id, scvu_area_id)
        )
    
    def getPriority(self):
        '''
        Function:   Gets list of priority for drop down
        Input:      None
        Output:     list of all priorities (excluding null)
        '''
        return self.db.executeSelect("SELECT name FROM priority WHERE name IS NOT NULL ORDER BY id")
    
    def getCloudCover(self):
        '''
        Function:   Gets list of cloud cover for drop down
        Input:      None
        Output:     list of all cloud cover (excluding null)
        '''
        return self.db.executeSelect("SELECT name FROM cloud_cover WHERE name IS NOT NULL ORDER BY id")
    
    def getImageCategory(self):
        '''
        Function:   Gets list of image category for drop down
        Input:      None
        Output:     list of all image categories (excluding null)
        '''
        return self.db.executeSelect("SELECT name FROM image_category WHERE name IS NOT NULL ORDER BY id")
    
    def getReport(self):
        '''
        Function:   Gets list of report for drop down
        Input:      None
        Output:     list of all reports (excluding null)
        '''
        return self.db.executeSelect("SELECT name FROM report WHERE name IS NOT NULL ORDER BY id")
    
    def getUsers(self):
        '''
        Function:   Gets list of users for drop down
        Input:      None
        Output:     list of all users with is_recent = True
        '''
        return self.db.executeSelect("SELECT name FROM users WHERE is_recent = True ORDER BY name")
    
    def getTaskingSummaryImageData(self, start_date, end_date):
        '''
        Function:   Gets image data for tasking summary
        Input:      start_date, end_date strings in YYYY-MM-DD format
        Output:     list of image data tuples
        '''
        query = """
            SELECT i.scvu_image_id, s.name, i.image_file_name, i.image_id,
                   i.upload_date, i.image_datetime, r.name, p.name,
                   ic.name, i.image_quality, cc.name, ew.name, i.target_tracing
            FROM image i
            LEFT JOIN sensor s ON i.sensor_id = s.id
            LEFT JOIN priority p ON i.priority_id = p.id
            LEFT JOIN report r ON i.report_id = r.id
            LEFT JOIN image_category ic ON i.image_category_id = ic.id
            LEFT JOIN cloud_cover cc ON i.cloud_cover_id = cc.id
            LEFT JOIN ew_status ew ON i.ew_status_id = ew.id
            WHERE i.upload_date >= %s AND i.upload_date < %s
            ORDER BY i.upload_date
        """
        return self.db.executeSelect(query, (start_date, end_date))
    
    def getTaskingSummaryAreaData(self, scvu_image_id):
        '''
        Function:   Gets area data for tasking summary for a specific image
        Input:      scvu_image_id
        Output:     list of area data tuples
        '''
        query = """
            SELECT t.scvu_task_id, a.area_name, ts.name, t.remarks, u.name, a.v10, a.opsv
            FROM image_area ia
            JOIN area a ON ia.scvu_area_id = a.scvu_area_id
            LEFT JOIN task t ON ia.scvu_image_area_id = t.scvu_image_area_id
            LEFT JOIN task_status ts ON t.task_status_id = ts.id
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE ia.scvu_image_id = %s
            ORDER BY a.area_name
        """
        return self.db.executeSelect(query, (scvu_image_id,))
    
    def getIncompleteImages(self, start_date, end_date):
        '''
        Function:   Gets incomplete images (no completed_date) within date range
        Input:      start_date, end_date strings in YYYY-MM-DD format
        Output:     list of image data tuples
        '''
        query = """
            SELECT i.scvu_image_id, s.name, i.image_file_name, i.image_id,
                   i.upload_date, i.image_datetime, p.name
            FROM image i
            LEFT JOIN sensor s ON i.sensor_id = s.id
            LEFT JOIN priority p ON i.priority_id = p.id
            WHERE i.upload_date >= %s AND i.upload_date < %s
            AND i.completed_date IS NULL
            ORDER BY i.upload_date
        """
        return self.db.executeSelect(query, (start_date, end_date))
    
    def getTaskingManagerDataForImage(self, scvu_image_id):
        '''
        Function:   Gets image_area data for a specific image
        Input:      scvu_image_id
        Output:     list of image_area data tuples
        '''
        query = """
            SELECT ia.scvu_image_area_id, a.area_name
            FROM image_area ia
            JOIN area a ON ia.scvu_area_id = a.scvu_area_id
            WHERE ia.scvu_image_id = %s
            ORDER BY a.area_name
        """
        return self.db.executeSelect(query, (scvu_image_id,))
    
    def getTaskingManagerDataForTask(self, scvu_image_id):
        '''
        Function:   Gets task data for a specific image
        Input:      scvu_image_id
        Output:     list of task data tuples
        '''
        query = """
            SELECT ia.scvu_image_area_id, u.name, t.remarks
            FROM image_area ia
            LEFT JOIN task t ON ia.scvu_image_area_id = t.scvu_image_area_id
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE ia.scvu_image_id = %s
            ORDER BY ia.scvu_image_area_id
        """
        return self.db.executeSelect(query, (scvu_image_id,))
    
    def updateTaskingManagerData(self, scvu_image_id, priority_name):
        '''
        Function:   Updates priority of an image
        Input:      scvu_image_id, priority_name
        Output:     NIL
        '''
        priority_id = self.db.executeSelect(
            "SELECT id FROM priority WHERE name = %s",
            (priority_name,)
        )[0][0]
        self.db.executeUpdate(
            "UPDATE image SET priority_id = %s WHERE scvu_image_id = %s",
            (priority_id, scvu_image_id)
        )
    
    def getAssigneeID(self, assignee_name):
        '''
        Function:   Gets assignee ID from name
        Input:      assignee_name string
        Output:     list with tuple containing assignee_id
        '''
        return self.db.executeSelect(
            "SELECT id FROM users WHERE name = %s",
            (assignee_name,)
        )
    
    def getTaskStatusID(self, status_name):
        '''
        Function:   Gets task status ID from name
        Input:      status_name string
        Output:     task_status_id integer
        '''
        result = self.db.executeSelect(
            "SELECT id FROM task_status WHERE name = %s",
            (status_name,)
        )
        if result:
            return result[0][0]
        return None
    
    def assignTask(self, scvu_image_area_id, assignee_id, task_status_id):
        '''
        Function:   Creates or updates a task assignment
        Input:      scvu_image_area_id, assignee_id, task_status_id
        Output:     NIL
        '''
        self.db.executeInsert(
            """INSERT INTO task(scvu_image_area_id, assignee_id, task_status_id)
               VALUES (%s, %s, %s)
               ON CONFLICT (scvu_image_area_id) 
               DO UPDATE SET assignee_id = %s, task_status_id = %s""",
            (scvu_image_area_id, assignee_id, task_status_id, assignee_id, task_status_id)
        )
    
    def startTask(self, scvu_task_id):
        '''
        Function:   Updates task status to In Progress
        Input:      scvu_task_id
        Output:     NIL
        '''
        task_status_id = self.getTaskStatusID('In Progress')
        self.db.executeUpdate(
            "UPDATE task SET task_status_id = %s WHERE scvu_task_id = %s",
            (task_status_id, scvu_task_id)
        )
    
    def completeTask(self, scvu_task_id):
        '''
        Function:   Updates task status to Verifying
        Input:      scvu_task_id
        Output:     NIL
        '''
        task_status_id = self.getTaskStatusID('Verifying')
        self.db.executeUpdate(
            "UPDATE task SET task_status_id = %s WHERE scvu_task_id = %s",
            (task_status_id, scvu_task_id)
        )
    
    def verifyPass(self, scvu_task_id):
        '''
        Function:   Updates task status to Completed
        Input:      scvu_task_id
        Output:     NIL
        '''
        task_status_id = self.getTaskStatusID('Completed')
        self.db.executeUpdate(
            "UPDATE task SET task_status_id = %s WHERE scvu_task_id = %s",
            (task_status_id, scvu_task_id)
        )
    
    def verifyFail(self, scvu_task_id):
        '''
        Function:   Updates task status to In Progress (revert from Verifying)
        Input:      scvu_task_id
        Output:     NIL
        '''
        task_status_id = self.getTaskStatusID('In Progress')
        self.db.executeUpdate(
            "UPDATE task SET task_status_id = %s WHERE scvu_task_id = %s",
            (task_status_id, scvu_task_id)
        )
    
    def getAllTaskStatusForImage(self, scvu_image_id):
        '''
        Function:   Gets all task statuses for an image
        Input:      scvu_image_id
        Output:     list of tuples (scvu_task_id, task_status_id)
        '''
        query = """
            SELECT t.scvu_task_id, t.task_status_id
            FROM image_area ia
            JOIN task t ON ia.scvu_image_area_id = t.scvu_image_area_id
            WHERE ia.scvu_image_id = %s
        """
        return self.db.executeSelect(query, (scvu_image_id,))
    
    def completeImage(self, scvu_image_id, vetter, current_datetime):
        '''
        Function:   Sets completed_date and vetter_id for an image
        Input:      scvu_image_id, vetter (username), current_datetime
        Output:     NIL
        '''
        vetter_id = None
        if vetter:
            vetter_result = self.db.executeSelect(
                "SELECT id FROM users WHERE name = %s",
                (vetter,)
            )
            if vetter_result:
                vetter_id = vetter_result[0][0]
        
        self.db.executeUpdate(
            "UPDATE image SET completed_date = %s, vetter_id = %s WHERE scvu_image_id = %s",
            (current_datetime, vetter_id, scvu_image_id)
        )
    
    def uncompleteImage(self, scvu_image_id):
        '''
        Function:   Sets completed_date to NULL for an image
        Input:      scvu_image_id
        Output:     NIL
        '''
        self.db.executeUpdate(
            "UPDATE image SET completed_date = NULL, vetter_id = NULL WHERE scvu_image_id = %s",
            (scvu_image_id,)
        )
    
    def updateTaskingSummaryImage(self, scvu_image_id, report_name, image_category_name, 
                                   image_quality, cloud_cover_name, target_tracing):
        '''
        Function:   Updates image fields in tasking summary
        Input:      scvu_image_id, report_name, image_category_name, image_quality, cloud_cover_name, target_tracing
        Output:     NIL
        '''
        report_id = None
        if report_name:
            report_result = self.db.executeSelect("SELECT id FROM report WHERE name = %s", (report_name,))
            if report_result:
                report_id = report_result[0][0]
        
        image_category_id = None
        if image_category_name:
            cat_result = self.db.executeSelect("SELECT id FROM image_category WHERE name = %s", (image_category_name,))
            if cat_result:
                image_category_id = cat_result[0][0]
        
        cloud_cover_id = None
        if cloud_cover_name:
            cc_result = self.db.executeSelect("SELECT id FROM cloud_cover WHERE name = %s", (cloud_cover_name,))
            if cc_result:
                cloud_cover_id = cc_result[0][0]
        
        self.db.executeUpdate(
            """UPDATE image SET report_id = %s, image_category_id = %s, 
               image_quality = %s, cloud_cover_id = %s, target_tracing = %s
               WHERE scvu_image_id = %s""",
            (report_id, image_category_id, image_quality, cloud_cover_id, target_tracing, scvu_image_id)
        )
    
    def updateTaskingSummaryTask(self, scvu_task_id, remarks):
        '''
        Function:   Updates task remarks
        Input:      scvu_task_id, remarks
        Output:     NIL
        '''
        self.db.executeUpdate(
            "UPDATE task SET remarks = %s WHERE scvu_task_id = %s",
            (remarks, scvu_task_id)
        )
    
    def getImageData(self, start_date, end_date):
        '''
        Function:   Gets completed image data within date range
        Input:      start_date, end_date strings in YYYY-MM-DD format
        Output:     list of image data tuples
        '''
        query = """
            SELECT i.scvu_image_id
            FROM image i
            WHERE i.completed_date >= %s AND i.completed_date < %s
            ORDER BY i.completed_date
        """
        return self.db.executeSelect(query, (start_date, end_date))
    
    def getImageAreaData(self, scvu_image_id):
        '''
        Function:   Gets area data for a completed image
        Input:      scvu_image_id
        Output:     list of area data tuples
        '''
        query = """
            SELECT ia.scvu_image_area_id, a.area_name
            FROM image_area ia
            JOIN area a ON ia.scvu_area_id = a.scvu_area_id
            WHERE ia.scvu_image_id = %s
            ORDER BY a.area_name
        """
        return self.db.executeSelect(query, (scvu_image_id,))
    
    def getCategories(self):
        '''
        Function:   Gets list of sensor categories
        Input:      None
        Output:     list of category names
        '''
        return self.db.executeSelect("SELECT name FROM sensor_category ORDER BY name")
    
    def getSensors(self):
        '''
        Function:   Gets list of sensors with their categories
        Input:      None
        Output:     list of tuples (sensor_name, category_name)
        '''
        query = """
            SELECT s.name, COALESCE(sc.name, 'UNCATEGORISED')
            FROM sensor s
            LEFT JOIN sensor_category sc ON s.category_id = sc.id
            ORDER BY s.name
        """
        return self.db.executeSelect(query)
    
    def updateSensorCategory(self, query_inputs):
        '''
        Function:   Updates sensor categories
        Input:      query_inputs list of tuples (category_name, sensor_name)
        Output:     NIL
        '''
        for category_name, sensor_name in query_inputs:
            category_id = None
            if category_name:
                cat_result = self.db.executeSelect(
                    "SELECT id FROM sensor_category WHERE name = %s",
                    (category_name,)
                )
                if cat_result:
                    category_id = cat_result[0][0]
            
            self.db.executeUpdate(
                "UPDATE sensor SET category_id = %s WHERE name = %s",
                (category_id, sensor_name)
            )
    
    def getAreas(self):
        '''
        Function:   Gets list of all areas
        Input:      None
        Output:     list of area data tuples
        '''
        return self.db.executeSelect("SELECT scvu_area_id, area_name, v10, opsv FROM area ORDER BY area_name")
    
    def setOpsvFalse(self):
        '''
        Function:   Sets all areas' opsv to False
        Input:      None
        Output:     NIL
        '''
        self.db.executeUpdate("UPDATE area SET opsv = False")
    
    def setOpsvAreas(self, opsvAreas):
        '''
        Function:   Sets opsv to True for specified areas
        Input:      opsvAreas list of tuples (area_name,)
        Output:     NIL
        '''
        for area_tuple in opsvAreas:
            area_name = area_tuple[0]
            self.db.executeUpdate(
                "UPDATE area SET opsv = True WHERE area_name = %s",
                (area_name,)
            )
    
    def resetRecentUsers(self):
        '''
        Function:   Sets all users' is_recent to False
        Input:      None
        Output:     NIL
        '''
        self.db.executeUpdate("UPDATE users SET is_recent = False")
    
    def addUsers(self, userList):
        '''
        Function:   Adds new users or updates existing ones to set is_recent = True
        Input:      userList list of tuples (user_name,)
        Output:     NIL
        '''
        for user_tuple in userList:
            user_name = user_tuple[0]
            self.db.executeInsert(
                """INSERT INTO users(name, is_recent) VALUES (%s, True)
                   ON CONFLICT (name) DO UPDATE SET is_recent = True""",
                (user_name,)
            )
    
    def updateExistingUsers(self, userList):
        '''
        Function:   Updates existing users to set is_recent = True
        Input:      userList list of tuples (user_name,)
        Output:     NIL
        '''
        for user_tuple in userList:
            user_name = user_tuple[0]
            self.db.executeUpdate(
                "UPDATE users SET is_recent = True WHERE name = %s",
                (user_name,)
            )
    
    def getXBIReportImage(self, start_date, end_date):
        '''
        Function:   Gets image data for XBI report
        Input:      start_date, end_date strings in YYYY-MM-DD format
        Output:     list of tuples (sensor_name, category_name, report_name)
        '''
        query = """
            SELECT s.name, COALESCE(sc.name, 'UNCATEGORISED'), COALESCE(r.name, '')
            FROM image i
            JOIN sensor s ON i.sensor_id = s.id
            LEFT JOIN sensor_category sc ON s.category_id = sc.id
            LEFT JOIN report r ON i.report_id = r.id
            WHERE i.completed_date >= %s AND i.completed_date < %s
            ORDER BY i.completed_date
        """
        return self.db.executeSelect(query, (start_date, end_date))
    
    def deleteTasksForImage(self, scvu_image_id):
        '''
        Function:   Deletes all tasks for an image
        Input:      scvu_image_id
        Output:     NIL
        '''
        query = """
            DELETE FROM task
            WHERE scvu_image_area_id IN (
                SELECT scvu_image_area_id FROM image_area WHERE scvu_image_id = %s
            )
        """
        self.db.executeDelete(query, (scvu_image_id,))
    
    def deleteImageAreasForImage(self, scvu_image_id):
        '''
        Function:   Deletes all image_area relationships for an image
        Input:      scvu_image_id
        Output:     NIL
        '''
        self.db.executeDelete(
            "DELETE FROM image_area WHERE scvu_image_id = %s",
            (scvu_image_id,)
        )
    
    def deleteImage(self, scvu_image_id):
        '''
        Function:   Deletes an image
        Input:      scvu_image_id
        Output:     NIL
        '''
        self.db.executeDelete(
            "DELETE FROM image WHERE scvu_image_id = %s",
            (scvu_image_id,)
        )

