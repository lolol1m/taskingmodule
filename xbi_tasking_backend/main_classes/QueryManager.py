from main_classes import Database, ConfigClass
import os
import requests

class QueryManager():
    '''
    QueryManager handles all the queries to the backend
    '''
    def __init__(self):
        self.db = Database()
    
    def _mapKeycloakUsernameToDBUsername(self, keycloak_username):
        '''
        Helper function to map Keycloak usernames to database usernames
        Input: Keycloak username (e.g., "iiuser", "iisenior", "iauser")
        Output: Database username (e.g., "II User", "Senior II User", "IA User")
        '''
        username_mapping = {
            'iiuser': 'II User',
            'iisenior': 'Senior II User',
            'iauser': 'IA User'
        }
        # Try to map the username, fallback to original if no mapping exists
        return username_mapping.get(keycloak_username.lower(), keycloak_username)
    
    def get_keycloak_admin_token(self):
        '''
        Obtain Keycloak admin token of xbi-tasking-admin client
        Input: NIL
        Output: Admin client token
        '''
        config = ConfigClass._instance
        keycloak_url = config.getKeycloakURL()
        realm = config.getKeycloakRealm()
        admin_client_id = config.getKeycloakAdminClientID()
        admin_client_secret = config.getKeycloakAdminClientSecret()
        
        # Check if admin client secret is configured (not a placeholder)
        if not admin_client_secret or admin_client_secret == 'your_admin_client_secret':
            raise ValueError("Keycloak admin client secret is not configured. Please set admin_client_secret in dev_server.config")
        
        url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/token"

        data = {
            "grant_type": "client_credentials",
            "client_id": admin_client_id,
            "client_secret": admin_client_secret
        }

        try:
            response = requests.post(url, data=data, timeout=5)
            response.raise_for_status()
            return response.json()["access_token"]
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                raise ValueError(f"Failed to authenticate with Keycloak admin client. Please verify admin_client_id and admin_client_secret in dev_server.config. Error: {e}")
            raise
    
    #TODO: can't find a matching call in the rest of the codebase, not sure what this is used for but suspect its not good practice. recommend removal and testing.
    def getUsersList(self):
        '''
        Obtains usernames of all II, Senior II, and IA users from Keycloak
        Input: NIL
        Output: List of usernames (empty list if Keycloak admin client is not configured)
        '''
        try:
            token = self.get_keycloak_admin_token()
        except (ValueError, requests.exceptions.RequestException) as e:
            print(f"Warning: Could not get Keycloak admin token: {e}")
            print("Returning empty user list. Configure admin_client_secret in dev_server.config to enable Keycloak user listing.")
            return []
        
        config = ConfigClass._instance
        keycloak_url = config.getKeycloakURL()
        realm = config.getKeycloakRealm()

        headers = {
            "Authorization": f"Bearer {token}"
        }

        # Get users with II, Senior II, and IA roles
        all_usernames = set()
        roles = ['II', 'Senior II', 'IA']
        
        for role in roles:
            url = f"{keycloak_url}/admin/realms/{realm}/roles/{role}/users"
            try:
                response = requests.get(url, headers=headers, timeout=5)
                response.raise_for_status()
                users = response.json()
                print(f" [getUsersList] Found {len(users)} users with role '{role}': {[u['username'] for u in users]}")
                for user in users:
                    all_usernames.add(user["username"])
            except requests.exceptions.RequestException as e:
                print(f"⚠️ Warning: Could not fetch users with role '{role}' from Keycloak: {e}")
                continue
        
        print(f" [getUsersList] Total unique usernames: {list(all_usernames)}")
        return list(all_usernames)
    
    def getUserActiveTasks(self, keycloak_user_id):
        '''
        Counts unfinished tasks for a user
        Input: keycloak_user_id (Keycloak user ID/sub)
        Output: integer value of unfinished tasks
        '''
        query = """
                SELECT COUNT(*)
                FROM task t
                JOIN task_status ts
                ON t.task_status_id = ts.id
                WHERE t.assignee_keycloak_id = %s
                AND ts.name != %s;
                """        
        
        result = self.db.executeSelect(query, (keycloak_user_id, 'Completed'))
        return result[0][0]
    
    #TODO: legacy, please remove once confirmed not needed
    def accountLogin(self, hashed_password):
        '''
        Function:   Inserts sensor into db if it doesn't already exist
        Input:      sensor_name
        Output:     NIL
        '''
        query = f"SELECT account FROM accounts WHERE password = %s"
        cursor = self.db.executeSelect(query, (hashed_password, ))
        if len(cursor) == 0:
            return ''
        return cursor[0][0]
    
    def insertSensor(self, sensor_name):
        '''
        Function:   Inserts sensor into db if it doesn't already exist
        Input:      sensor_name
        Output:     NIL
        '''
        query = f"INSERT INTO sensor (name) VALUES (%s) ON CONFLICT (name) DO NOTHING"
        self.db.executeInsert(query, (sensor_name,))
    
    def insertImage(self, image_id, image_file_name, sensor_name, upload_date, image_datetime):
        '''
        Function:   Inserts image from DSTA into db
        Input:      image_id, image_file_name, sensor_name, upload_date, image_datetime
        Output:     NIL
        '''
        # Set default values for required foreign keys (0 = null in lookup tables)
        query = f"INSERT INTO image (image_id, image_file_name, sensor_id, upload_date, image_datetime, ew_status_id, report_id, priority_id, image_category_id, cloud_cover_id) \
        VALUES (%s, %s, (SELECT id FROM sensor WHERE name=%s), %s, %s, (SELECT id FROM ew_status WHERE name = 'xbi done'), 0, 0, 0, 0) \
        ON CONFLICT (image_id) DO NOTHING"
        rows = self.db.executeInsert(query, (image_id, image_file_name, sensor_name, upload_date, image_datetime))

        return rows > 0
    
    def insertArea(self, area_name):
        '''
        Function:   Inserts area from DSTA / TTG into db
        Input:      area_name
        Output:     NIL
        '''
        query = f"INSERT INTO area (area_name) \
        VALUES (%s) \
        ON CONFLICT (area_name) DO NOTHING"
        self.db.executeInsert(query, (area_name, ))
    
    def insertImageAreaDSTA(self, image_id, area_name):
        '''
        Function:   Inserts image_area for DSTA into db 
        Input:      image_id, area_name
        Output:     NIL
        '''
        query = f"INSERT INTO image_area (scvu_image_id, scvu_area_id) \
        VALUES ((SELECT scvu_image_id FROM image WHERE image_id = %s), (SELECT scvu_area_id FROM area WHERE area_name = %s)) \
        ON CONFLICT (scvu_image_id, scvu_area_id) DO NOTHING"
        self.db.executeInsert(query, (image_id, area_name))
    
    def insertTTGImageReturnsId(self, image_file_name, sensor_name, upload_date, image_datetime):
        '''
        Function:   Inserts TTG image into db
        Input:      image_file_name, sensor_name, upload_date, image_datetime
        Output:     scvu_image_id of the inserted image
        '''
        query = f"INSERT INTO image (image_file_name, sensor_id, upload_date, image_datetime, ew_status_id) \
        VALUES (%s, (SELECT id FROM sensor WHERE name=%s), %s, %s, (SELECT id FROM ew_status WHERE name = 'ttg done')) \
        RETURNING scvu_image_id"
        return self.db.executeInsertReturningID(query, (image_file_name, sensor_name, upload_date, image_datetime))
    
    def insertImageAreaTTG(self, scvu_image_id, area_name):
        '''
        Function:   Inserts image_area for DSTA into db 
        Input:      image_id, area_name
        Output:     NIL
        '''
        query = f"INSERT INTO image_area (scvu_image_id, scvu_area_id) \
        VALUES (%s, (SELECT scvu_area_id FROM area WHERE area_name = %s)) \
        ON CONFLICT (scvu_image_id, scvu_area_id) DO NOTHING"
        self.db.executeInsert(query, (scvu_image_id, area_name))
    
    def getAllTaskStatusForImage(self, scvu_image_id):
        '''
        Function:   Gets all tasks and their statuses for an image
        Input:      scvu image id
        Output:     list of tasks with their status
        '''
        query = f"SELECT task.scvu_task_id, task.task_status_id \
        FROM image_area, task \
        WHERE image_area.scvu_image_area_id = task.scvu_image_area_id \
        AND image_area.scvu_image_id = %s"
        
        cursor = self.db.executeSelect(query, (scvu_image_id, ))
        if len(cursor) == 0:
            return None
        return cursor
    
    def getTaskStatusID(self, status_name):
        '''
        Function:   Gets status id by status name
        Input:      status name
        Output:     status id
        '''
        
        query = f"SELECT id FROM task_status WHERE name = %s"
        cursor = self.db.executeSelect(query, (status_name, ))
        if len(cursor) == 0:
            return None
        return cursor[0][0]
    
    def completeImage(self, scvu_image_id, vetter_keycloak_id, current_datetime):
        '''
        Function:   Sets completion date for image to current date
        Input:      scvu image id, vetter_keycloak_id (Keycloak user ID/sub), current_datetime
        Output:     NIL
        '''
        query = f"UPDATE image SET completed_date = %s, vetter_keycloak_id = %s WHERE scvu_image_id = %s"
        cursor = self.db.executeUpdate(query, (current_datetime, vetter_keycloak_id, scvu_image_id))

    def uncompleteImage(self, scvu_image_id):
        '''
        Function:   Sets the completed date of an image to None
        Input:      scvu image id
        Output:     NIL
        '''
        query = f"UPDATE image SET completed_date = null WHERE scvu_image_id = %s"
        cursor = self.db.executeUpdate(query, (scvu_image_id, ))

    def getImageCompleteDate(self, scvu_image_id):
        '''
        Function:   Gets the completed date of an image
        Input:      scvu image id
        Output:     nested list with image completed date
        '''
        query = f"SELECT completed_date FROM image WHERE scvu_image_id = %s"
        return self.db.executeSelect(query, (scvu_image_id, ))

    def getKeycloakUserID(self, assignee_username):
        '''
        Function:   Gets the Keycloak user ID for the given username
        Input:      Assignee username (Keycloak username)
        Output:     Keycloak user ID (sub) or None if not found
        Note:       Queries Keycloak Admin API to get user ID by username
        '''
        try:
            token = self.get_keycloak_admin_token()
        except (ValueError, requests.exceptions.RequestException) as e:
            print(f"Warning: Could not get Keycloak admin token: {e}")
            return None
        
        config = ConfigClass._instance
        keycloak_url = config.getKeycloakURL()
        realm = config.getKeycloakRealm()
        
        # Query Keycloak Admin API for user by username
        url = f"{keycloak_url}/admin/realms/{realm}/users"
        headers = {"Authorization": f"Bearer {token}"}
        params = {"username": assignee_username, "exact": "true"}
        
        try:
            response = requests.get(url, headers=headers, params=params, timeout=5)
            response.raise_for_status()
            users = response.json()
            if users and len(users) > 0:
                return users[0].get('id')  # Return Keycloak user ID (sub)
            return None
        except requests.exceptions.RequestException as e:
            print(f"Warning: Could not fetch user from Keycloak: {e}")
            return None

    def getIncompleteImages(self, start_date, end_date):
        '''
        Function:   Gets data for incomplete images from db
        Input:      start_date, end_date (date strings in YYYY-MM-DD format)
        Output:     list of tuple, each containing scvu_image_id, sensor.name, image_file_name, image_id, upload_date, image_datetime, priority.name
        Note:       Returns images that are incomplete (no completed_date) and have upload_date within the specified date range
        '''
        query = f"SELECT image.scvu_image_id, COALESCE(sensor.name, 'Unknown') as sensor_name, image.image_file_name, image.image_id, image.upload_date, image.image_datetime, COALESCE(priority.name, NULL) as priority_name \
        FROM image \
        LEFT JOIN sensor ON sensor.id = image.sensor_id \
        LEFT JOIN priority ON priority.id = image.priority_id \
        WHERE image.completed_date IS NULL \
        AND (image.upload_date >= %s AND image.upload_date < %s) \
        ORDER BY image.upload_date DESC"
        cursor = self.db.executeSelect(query, (start_date, end_date))
        return cursor
    
    def getTaskingManagerDataForImage(self, scvu_image_id):
        '''
        Function:   Gets data for tasking manager from area and task for a given image
        Input:      NIL
        Output:     list of tuple, each containing image_area.scvu_image_area_id, area.area_name
        '''
        query = f"SELECT image_area.scvu_image_area_id, area.area_name \
        FROM area, image_area \
        WHERE image_area.scvu_image_id = %s \
        AND area.scvu_area_id = image_area.scvu_area_id"
        cursor = self.db.executeSelect(query, (scvu_image_id,))
        return cursor

    def getTaskingManagerDataForTask(self, scvu_image_id):
        '''
        Function:   Gets data for tasking manager for task
        Input:      NIL
        Output:     list of tuple, each containing imageareaid, assignee name and remarks
        '''
        query = f"SELECT image_area.scvu_image_area_id, COALESCE(task.assignee_keycloak_id, 'Unassigned'), task.remarks \
        FROM task \
        JOIN image_area ON task.scvu_image_area_id = image_area.scvu_image_area_id \
        JOIN image ON image.scvu_image_id = image_area.scvu_image_id \
        WHERE image_area.scvu_image_id = %s"
        cursor = self.db.executeSelect(query, (scvu_image_id,))
        return cursor

    def updateTaskingManagerData(self, scvu_image_id, priority_name):
        '''
        Function:   Updates priority_id of image
        Input:      scvu_image_id, priority.name
        Output:     NIL
        '''
        query = f"UPDATE image SET priority_id = (SELECT id FROM priority WHERE name = %s OR (COALESCE(%s,'') = '' AND name is null)) \
        WHERE scvu_image_id = %s"
        self.db.executeUpdate(query, (priority_name, priority_name, scvu_image_id))

    def assignTask(self, image_area_id, assignee_keycloak_id, task_status_id):
        '''
        Function:   Creates and inserts a task into the database with the assignee
        Input:      image_area_id, assignee_keycloak_id (Keycloak user ID/sub), task_status_id
        Output:     NIL
        '''
        insertTaskQuery = "INSERT INTO task (assignee_keycloak_id, scvu_image_area_id, task_status_id) \
        VALUES (%s, %s, %s) \
        ON CONFLICT (scvu_image_area_id) \
        DO UPDATE SET assignee_keycloak_id = EXCLUDED.assignee_keycloak_id, task_status_id = EXCLUDED.task_status_id"
        cursor = self.db.executeInsert(insertTaskQuery, (assignee_keycloak_id, image_area_id, task_status_id))

    def autoAssign(self, area_name, image_id):
        '''
        Function:   Creates and inserts a task into the database as well as initialise that task with the automatically designated assignee 
        Input:      area_id
        Output:     NIL
        '''

        # FIND THE CORRECT IMAGE AREA ID FIRST, currently doesnt work
        id_set = self.getUserIds()

        id_dict = {u: 0 for u in id_set}
        
        # Obtain scvu_image_area_id
        query = f"""
        SELECT ia.scvu_image_area_id 
        FROM image_area ia 
        JOIN image i 
            ON ia.scvu_image_id = i.scvu_image_id
        JOIN area a
            ON ia.scvu_area_id = a.scvu_area_id
        WHERE a.area_name = %s
        AND i.image_id = %s
        """

        result = self.db.executeSelect(query, (area_name, image_id))
        scvu_image_area_id  = result[0][0]

        for keycloak_user_id in id_dict.keys():
            active_tasks = self.getUserActiveTasks(keycloak_user_id)
            # minor optimisation to terminate iteration  when user no active tasks
            if active_tasks == 0:
                self.assignTask(scvu_image_area_id, keycloak_user_id, 1)
                return "assigned" 
            id_dict[keycloak_user_id] = active_tasks

        assignee_keycloak_id = min(id_dict, key= id_dict.get)
        self.assignTask(scvu_image_area_id, assignee_keycloak_id, 1)
        return "assigned"
    
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
    
    def syncUserCache(self, keycloak_user_id, display_name=None):
        '''
        Function:   Ensures user exists in cache (for is_present state management)
        Input:      keycloak_user_id (sub), display_name (ignored - Keycloak is source of truth)
        Output:     NIL
        Note:       We only store keycloak_user_id and is_present - display names come from Keycloak
        '''
        # Just ensure user exists in cache - we don't store display_name
        query = """
            INSERT INTO user_cache (keycloak_user_id, is_present)
            VALUES (%s, FALSE)
            ON CONFLICT (keycloak_user_id) DO NOTHING
        """
        self.db.executeInsert(query, (keycloak_user_id,))
    
    def getUsers(self):
        '''
        Function:   Gets users from Keycloak (II, Senior II, IA roles) with is_present filter from cache
        Input:      None
        Output:     nested list of usernames (as tuples for compatibility)
        Note:       Keycloak is the source of truth - we only cache is_present state
        '''
        # Get users from Keycloak with II, Senior II, or IA roles
        keycloak_usernames = self.getUsersList()
        
        if not keycloak_usernames:
            # If Keycloak query failed, return empty list
            return []
        
        # Get Keycloak user IDs for these usernames and ensure they exist in cache
        try:
            token = self.get_keycloak_admin_token()
        except (ValueError, requests.exceptions.RequestException):
            # If admin client not configured, return (username, username) tuples (no is_present filter)
            return [(username, username) for username in keycloak_usernames]
        
        config = ConfigClass._instance
        keycloak_url = config.getKeycloakURL()
        realm = config.getKeycloakRealm()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get user IDs and ensure they're in cache (for is_present filtering)
        user_data = []  # List of (user_id, username) tuples
        for username in keycloak_usernames:
            url = f"{keycloak_url}/admin/realms/{realm}/users"
            params = {"username": username, "exact": "true"}
            try:
                response = requests.get(url, headers=headers, params=params, timeout=5)
                if response.status_code == 200:
                    users = response.json()
                    if users:
                        user_id = users[0].get('id')
                        # Ensure user exists in cache (for is_present filtering)
                        # We don't store display_name - Keycloak is source of truth
                        query = """
                            INSERT INTO user_cache (keycloak_user_id, is_present)
                            VALUES (%s, FALSE)
                            ON CONFLICT (keycloak_user_id) DO NOTHING
                        """
                        self.db.executeInsert(query, (user_id,))
                        user_data.append((user_id, username))
            except requests.exceptions.RequestException:
                continue
        
        # Filter by is_present from cache - return usernames from Keycloak (source of truth)
        if user_data:
            user_ids = [uid for uid, _ in user_data]
            placeholders = ','.join(['%s'] * len(user_ids))
            query = f"""
                SELECT keycloak_user_id 
                FROM user_cache 
                WHERE keycloak_user_id IN ({placeholders}) 
                AND is_present = True
            """
            result = self.db.executeSelect(query, tuple(user_ids))
            present_user_ids = {row[0] for row in result}
            
            # Log which users are filtered out
            filtered_out = [(uid, uname) for uid, uname in user_data if uid not in present_user_ids]
            if filtered_out:
                print(f" [getUsers] Filtered out {len(filtered_out)} users (is_present=False): {[uname for _, uname in filtered_out]}")
            
            print(f" [getUsers] Returning {len(present_user_ids)} users with is_present=True: {[uname for uid, uname in user_data if uid in present_user_ids]}")
            # Return (user_id, username) tuples for users who are present
            return [(user_id, username) for user_id, username in user_data if user_id in present_user_ids]
        
        # Fallback: return (username, username) tuples if we couldn't get IDs
        return [(username, username) for username in keycloak_usernames]
    
    def getUserIds(self):
        '''
        Function:   Gets Keycloak user IDs for users with II role who are present
        Input:      None
        Output:     Set of Keycloak user IDs
        '''
        # Get usernames from Keycloak
        usernames = self.getUsersList()
        if not usernames:
            return set()
        
        # Get Keycloak user IDs for these usernames
        keycloak_ids = set()
        try:
            token = self.get_keycloak_admin_token()
        except (ValueError, requests.exceptions.RequestException):
            return set()
        
        config = ConfigClass._instance
        keycloak_url = config.getKeycloakURL()
        realm = config.getKeycloakRealm()
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Query each user to get their ID
        for username in usernames:
            url = f"{keycloak_url}/admin/realms/{realm}/users"
            params = {"username": username, "exact": "true"}
            try:
                response = requests.get(url, headers=headers, params=params, timeout=5)
                if response.status_code == 200:
                    users = response.json()
                    if users:
                        keycloak_ids.add(users[0].get('id'))
            except requests.exceptions.RequestException:
                continue
        
        # Filter by is_present from cache
        if keycloak_ids:
            placeholders = ','.join(['%s'] * len(keycloak_ids))
            query = f"""
                SELECT keycloak_user_id 
                FROM user_cache 
                WHERE keycloak_user_id IN ({placeholders}) 
                AND is_present = True
            """
            result = self.db.executeSelect(query, tuple(keycloak_ids))
            return set(row[0] for row in result)
        
        return set()

        rows = self.db.executeSelect(query, (names,))
        id_list = {u[0] for u in rows}

        return id_list

    def getTaskingSummaryImageData(self, start_date, end_date):
        '''
        Function:   Gets data for tasking summary
        Input:      NIL
        Output:     nested list with id, sensor_name, image_file_name, image_id, upload_date, image_datetime, report, priority, image_category, quality, cloud_cover, ew_status, target_tracing
        '''
        query = f"SELECT DISTINCT image.scvu_image_id, COALESCE(sensor.name, NULL) as sensor_name, image.image_file_name, image.image_id, image.upload_date, image.image_datetime, \
        COALESCE(report.name, NULL) as report_name, COALESCE(priority.name, NULL) as priority_name, \
        COALESCE(image_category.name, NULL) as image_category_name, image.image_quality, COALESCE(cloud_cover.name, NULL) as cloud_cover_name, \
        COALESCE(ew_status.name, NULL) as ew_status_name, image.target_tracing \
        FROM image \
        LEFT JOIN sensor ON sensor.id = image.sensor_id \
        LEFT JOIN ew_status ON ew_status.id = image.ew_status_id \
        LEFT JOIN report ON report.id = image.report_id \
        LEFT JOIN priority ON priority.id = image.priority_id \
        LEFT JOIN image_category ON image_category.id = image.image_category_id \
        LEFT JOIN cloud_cover ON cloud_cover.id = image.cloud_cover_id \
        JOIN image_area ON image_area.scvu_image_id = image.scvu_image_id \
        JOIN task ON image_area.scvu_image_area_id = task.scvu_image_area_id \
        WHERE image.completed_date IS NULL \
        AND task.assignee_keycloak_id IS NOT NULL \
        AND task.assignee_keycloak_id <> '' \
        AND (image.upload_date >= %s AND image.upload_date < %s)"
        return self.db.executeSelect(query, (start_date, end_date))

    def getTaskingSummaryAreaData(self, image_id):
        '''
        Function:   Gets data for tasking summary area
        Input:      image_id
        Output:     nested list with id, area_name, task_status, task_remarks, username
        '''
        # First get the raw data with Keycloak user IDs
        query = "SELECT task.scvu_task_id, area.area_name, task_status.name, COALESCE(task.remarks, '') as remarks, task.assignee_keycloak_id, area.v10, area.opsv \
        FROM task \
        JOIN image_area ON task.scvu_image_area_id = image_area.scvu_image_area_id \
        JOIN area ON image_area.scvu_area_id = area.scvu_area_id \
        JOIN image ON image_area.scvu_image_id = image.scvu_image_id \
        JOIN task_status ON task.task_status_id = task_status.id \
        WHERE image.scvu_image_id = %s \
        AND task.assignee_keycloak_id IS NOT NULL \
        AND task.assignee_keycloak_id <> '' \
        ORDER BY area.area_name"
        results = self.db.executeSelect(query, (image_id,))
        
        # Convert Keycloak user IDs to usernames
        formatted_results = []
        for row in results:
            task_id, area_name, task_status, remarks, assignee_keycloak_id, v10, opsv = row
            username = 'Unassigned'
            
            if assignee_keycloak_id:
                # Try to get username from Keycloak
                try:
                    token = self.get_keycloak_admin_token()
                    config = ConfigClass._instance
                    keycloak_url = config.getKeycloakURL()
                    realm = config.getKeycloakRealm()
                    headers = {"Authorization": f"Bearer {token}"}
                    
                    url = f"{keycloak_url}/admin/realms/{realm}/users/{assignee_keycloak_id}"
                    response = requests.get(url, headers=headers, timeout=5)
                    if response.status_code == 200:
                        user_data = response.json()
                        username = user_data.get('username', assignee_keycloak_id)
                    else:
                        username = assignee_keycloak_id  # Fallback to ID if user not found
                except:
                    username = assignee_keycloak_id  # Fallback to ID if Keycloak query fails
            
            formatted_results.append((task_id, area_name, task_status, remarks, username, v10, opsv))
        
        return formatted_results

    def startTask(self, task_id):
        '''
        Function:   Updates task status to In Progress if it is currently Incomplete
        Input:      task_id is the id of the task to be updated
        Output:     NIL
        '''
        query = f"UPDATE task SET task_status_id = (SELECT id FROM task_status WHERE name='In Progress') \
        WHERE scvu_task_id = %s \
        AND task_status_id = (SELECT id FROM task_status WHERE name='Incomplete')"
        self.db.executeUpdate(query, (task_id, ))
    
    def completeTask(self, task_id):
        '''
        Function:   Updates task status to Verifying if it is currently In Progress
        Input:      task_id is the id of the task to be updated
        Output:     NIL
        '''
        query = f"UPDATE task SET task_status_id = (SELECT id FROM task_status WHERE name='Verifying') \
        WHERE scvu_task_id = %s \
        AND task_status_id = (SELECT id FROM task_status WHERE name='In Progress')"
        self.db.executeUpdate(query, (task_id, ))
    
    def verifyPass(self, task_id):
        '''
        Function:   Updates task status to Complete if it is currently Verifying
        Input:      task_id is the id of the task to be updated
        Output:     NIL
        '''
        query = f"UPDATE task SET task_status_id = (SELECT id FROM task_status WHERE name='Completed') \
        WHERE scvu_task_id = %s \
        AND task_status_id = (SELECT id FROM task_status WHERE name='Verifying')"
        self.db.executeUpdate(query, (task_id, ))
        
    def verifyFail(self, task_id):
        '''
        Function:   Updates task status to In Progress if it is currently Verifying
        Input:      task_id is the id of the task to be updated
        Output:     NIL
        '''
        query = f"UPDATE task SET task_status_id = (SELECT id FROM task_status WHERE name='In Progress') \
        WHERE scvu_task_id = %s \
        AND task_status_id = (SELECT id FROM task_status WHERE name='Verifying')"
        self.db.executeUpdate(query, (task_id, ))

    def updateTaskingSummaryImage(self, scvu_image_id, report_name, image_category_name, image_quality_name, cloud_cover_name, target_tracing):
        '''
        Function:   Updates scvu_image_id, report_id, image_category_id, image_quality, cloud_cover_id, target_tracing of image
        Input:      scvu_image_id, report_name, image_category_name, image_quality_name, cloud_cover_name, target_tracing
        Output:     NIL
        '''
        query = f"UPDATE image SET report_id = (SELECT id FROM report WHERE name = %s OR (COALESCE(%s,'') = '' AND name is null)), \
        image_category_id = (SELECT id FROM image_category WHERE name = %s OR (COALESCE(%s,'') = '' AND name is null)), \
        image_quality = %s, \
        cloud_cover_id = (SELECT id FROM cloud_cover WHERE name = %s OR (COALESCE(%s,'') = '' AND name is null)), \
        target_tracing = %s \
        WHERE scvu_image_id = %s"
        self.db.executeUpdate(query, (report_name, report_name, image_category_name, image_category_name, image_quality_name, cloud_cover_name, cloud_cover_name, target_tracing, scvu_image_id))
    
    def updateTaskingSummaryTask(self, scvu_task_id, remarks):
        '''
        Function:   Updates remarks of task
        Input:      scvu_task_id, remarks
        Output:     NIL
        '''
        query = f"UPDATE task SET remarks = %s WHERE scvu_task_id = %s"
        self.db.executeUpdate(query, (remarks, scvu_task_id))

    def getImageAreaData(self, scvu_image_id):
        '''
        Function: Gets image area data for completed images
        Input: scvu_image_id
        Output: scvu_task_id, area name, remarks, assignee name
        '''
        imageAreaQuery = f"SELECT task.scvu_task_id, area.area_name, COALESCE(task.remarks, '') as remarks, COALESCE(task.assignee_keycloak_id, 'Unassigned') as assignee_name \
        FROM task \
        JOIN image_area ON task.scvu_image_area_id = image_area.scvu_image_area_id \
        JOIN area ON image_area.scvu_area_id = area.scvu_area_id \
        JOIN image ON image_area.scvu_image_id = image.scvu_image_id \
        WHERE image.scvu_image_id = %s \
        ORDER BY area.area_name"
        cursor = self.db.executeSelect(imageAreaQuery, (scvu_image_id, ))
        return cursor

    def getImageData(self, start_date, end_date):
        '''
        Function: Gets image data for completed images
        Input: start_date, end_date
        Output: scvu image id, sensor name, image file name, image id, image upload date, image date time, report name, priority name, image category name, image quality, cloud cover, ew status
        '''
        imageQuery = f"SELECT image.scvu_image_id, sensor.name, image.image_file_name, image.image_id, image.upload_date, image.image_datetime, \
        COALESCE(report.name, NULL) as report_name, COALESCE(priority.name, NULL) as priority_name, \
        COALESCE(image_category.name, NULL) as image_category_name, image.image_quality, \
        COALESCE(cloud_cover.name, NULL) as cloud_cover_name, ew_status.name, COALESCE(image.vetter_keycloak_id, 'Unknown') as vetter_name \
        FROM image \
        JOIN sensor ON sensor.id = image.sensor_id \
        JOIN ew_status ON ew_status.id = image.ew_status_id \
        LEFT JOIN report ON report.id = image.report_id \
        LEFT JOIN priority ON priority.id = image.priority_id \
        LEFT JOIN image_category ON image_category.id = image.image_category_id \
        LEFT JOIN cloud_cover ON cloud_cover.id = image.cloud_cover_id \
        WHERE image.completed_date IS NOT NULL \
        AND ((image.completed_date >= %s AND image.completed_date < %s) \
             OR (image.upload_date >= %s AND image.upload_date < %s))"

        cursor = self.db.executeSelect(imageQuery, (start_date, end_date, start_date, end_date))
        return cursor

    def getXBIReportImage(self, start_date, end_date):
        '''
        Function: Gets image data for xbi
        Input: start_date, end_date
        Output: sensor name, category name, report name
        '''
        query = f"SELECT sensor.name, sensor_category.name, report.name \
        FROM image, sensor, sensor_category, report \
        WHERE (image.upload_date >= %s AND image.upload_date < %s) \
        AND sensor.id = image.sensor_id \
        AND sensor.category_id = sensor_category.id \
        AND report.id = image.report_id \
        AND completed_date IS NOT NULL"
        cursor = self.db.executeSelect(query, (start_date, end_date))
        return cursor

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
        cursor = self.db.executeUpdateMany(query, area_list)

    def resetRecentUsers(self):
        '''
        Function: Resets the isRecent flag on all users
        Input: NIL
        Output: NIL
        '''
        query = f"UPDATE user_cache SET is_present = False"
        self.db.executeUpdate(query)

    #TODO: figure out how the new user add system is going to work and change this accordingly
    def addUsers(self, user_list):
        '''
        Function: Adds unique new users to the database cache (for is_present state)
        Input: List of (keycloak_user_id,) tuples
        Output: NIL
        Note: Keycloak is source of truth - we only store is_present state here
        '''
        # Insert into user_cache - only store keycloak_user_id and is_present
        query = f"INSERT INTO user_cache (keycloak_user_id, is_present) VALUES (%s, FALSE) ON CONFLICT (keycloak_user_id) DO NOTHING"
        self.db.executeInsertMany(query, user_list)
    
    #TODO: figure out how the new user add system is going to work and change this accordingly
    def updateExistingUsers(self, user_list):
        '''
        Function: Updates existing users isRecent flag
        Input: List of users
        Output: NIL
        '''
        query = f"UPDATE user_cache SET is_present = True WHERE keycloak_user_id = %s"
        cursor = self.db.executeUpdateMany(query, user_list)

    def updateSensorCategory(self, category_sensor_list):
        '''
        Function: Updates sensor to the new category given
        Input: category_sensor_list is a nested list with category sensor
        Output: NIL
        '''
        query = f"UPDATE sensor SET category_id = (SELECT id FROM sensor_category WHERE name = %s) WHERE name = %s"
        cursor = self.db.executeUpdateMany(query, category_sensor_list)
    
    def deleteTasksForImage(self, scvu_image_id):
        '''
        Function: Deletes all tasks for an certain image
        Input: scvu_image_id
        Output: NIL
        '''
        query = f"DELETE FROM task WHERE scvu_image_area_id IN (SELECT scvu_image_area_id FROM image_area WHERE scvu_image_id = %s)"
        cursor = self.db.executeDelete(query, (scvu_image_id, ))
    
    def deleteImageAreasForImage(self, scvu_image_id):
        '''
        Function: Deletes all image_areas for an certain image
        Input: scvu_image_id
        Output: NIL
        '''
        query = f"DELETE FROM image_area WHERE scvu_image_id = %s"
        cursor = self.db.executeDelete(query, (scvu_image_id, ))
    
    def deleteImage(self, scvu_image_id):
        '''
        Function: Deletes an image
        Input: scvu_image_id
        Output: NIL
        '''
        query = f"DELETE FROM image WHERE scvu_image_id = %s"
        cursor = self.db.executeDelete(query, (scvu_image_id, ))