import logging
from constants import AssigneeLabel, TaskStatus
from main_classes.sql_utils import build_in_clause


logger = logging.getLogger("xbi_tasking_backend.query_tasking")

SQL_GET_USER_ACTIVE_TASKS = """
    SELECT COUNT(*)
    FROM task t
    JOIN task_status ts
        ON t.task_status_id = ts.id
    WHERE t.assignee_keycloak_id = %s
        AND ts.name != %s;
"""

SQL_GET_ACTIVE_TASK_COUNTS = """
    SELECT t.assignee_keycloak_id, COUNT(*)
    FROM task t
    JOIN task_status ts ON t.task_status_id = ts.id
    WHERE t.assignee_keycloak_id IN ({placeholders})
        AND ts.name != %s
    GROUP BY t.assignee_keycloak_id
"""

SQL_GET_ALL_TASK_STATUS_FOR_IMAGE = (
    "SELECT task.scvu_task_id, task.task_status_id "
    "FROM image_area "
    "JOIN task ON image_area.scvu_image_area_id = task.scvu_image_area_id "
    "WHERE image_area.scvu_image_id = %s"
)

SQL_GET_TASK_STATUS_ID = "SELECT id FROM task_status WHERE name = %s"

SQL_GET_INCOMPLETE_IMAGES = (
    "SELECT image.scvu_image_id, COALESCE(sensor.name, 'Unknown') as sensor_name, image.image_file_name, image.image_id, "
    "image.upload_date, image.image_datetime, COALESCE(priority.name, NULL) as priority_name "
    "FROM image "
    "LEFT JOIN sensor ON sensor.id = image.sensor_id "
    "LEFT JOIN priority ON priority.id = image.priority_id "
    "WHERE image.completed_date IS NULL "
    "AND (image.upload_date >= %s AND image.upload_date <= %s) "
    "ORDER BY image.upload_date DESC"
)

SQL_GET_TASKING_MANAGER_IMAGE = (
    "SELECT image_area.scvu_image_area_id, area.area_name "
    "FROM image_area "
    "JOIN area ON area.scvu_area_id = image_area.scvu_area_id "
    "WHERE image_area.scvu_image_id = %s"
)

SQL_GET_TASKING_MANAGER_IMAGE_FOR_IMAGES = """
    SELECT image_area.scvu_image_id, image_area.scvu_image_area_id, area.area_name
    FROM image_area
    JOIN area ON area.scvu_area_id = image_area.scvu_area_id
    WHERE image_area.scvu_image_id IN ({placeholders})
"""

SQL_GET_TASKING_MANAGER_TASK = (
    "SELECT image_area.scvu_image_area_id, COALESCE(task.assignee_keycloak_id, %s), task.remarks "
    "FROM task "
    "JOIN image_area ON task.scvu_image_area_id = image_area.scvu_image_area_id "
    "JOIN image ON image.scvu_image_id = image_area.scvu_image_id "
    "WHERE image_area.scvu_image_id = %s"
)

SQL_GET_TASKING_MANAGER_TASK_FOR_IMAGES = """
    SELECT image_area.scvu_image_id, image_area.scvu_image_area_id,
        COALESCE(task.assignee_keycloak_id, %s), task.remarks
    FROM task
    JOIN image_area ON task.scvu_image_area_id = image_area.scvu_image_area_id
    JOIN image ON image.scvu_image_id = image_area.scvu_image_id
    WHERE image_area.scvu_image_id IN ({placeholders})
"""

SQL_UPDATE_TASKING_MANAGER_PRIORITY = (
    "UPDATE image SET priority_id = (SELECT id FROM priority WHERE name = %s OR (COALESCE(%s,'') = '' AND name is null)) "
    "WHERE scvu_image_id = %s"
)

SQL_ASSIGN_TASK = (
    "INSERT INTO task (assignee_keycloak_id, scvu_image_area_id, task_status_id) "
    "VALUES (%s, %s, %s) "
    "ON CONFLICT (scvu_image_area_id) "
    "DO UPDATE SET assignee_keycloak_id = EXCLUDED.assignee_keycloak_id, task_status_id = EXCLUDED.task_status_id"
)

SQL_GET_IMAGE_AREA_ID_FOR_AUTOASSIGN = """
    SELECT ia.scvu_image_area_id
    FROM image_area ia
    JOIN image i
        ON ia.scvu_image_id = i.scvu_image_id
    JOIN area a
        ON ia.scvu_area_id = a.scvu_area_id
    WHERE a.area_name = %s
        AND i.image_id = %s
"""

SQL_GET_TASKING_SUMMARY_IMAGE = """
    SELECT DISTINCT image.scvu_image_id, COALESCE(sensor.name, NULL) as sensor_name, image.image_file_name, image.image_id,
        image.upload_date, image.image_datetime,
        COALESCE(report.name, NULL) as report_name, COALESCE(priority.name, NULL) as priority_name,
        COALESCE(image_category.name, NULL) as image_category_name, image.image_quality, COALESCE(cloud_cover.name, NULL) as cloud_cover_name,
        COALESCE(ew_status.name, NULL) as ew_status_name, image.target_tracing
    FROM image
    LEFT JOIN sensor ON sensor.id = image.sensor_id
    LEFT JOIN ew_status ON ew_status.id = image.ew_status_id
    LEFT JOIN report ON report.id = image.report_id
    LEFT JOIN priority ON priority.id = image.priority_id
    LEFT JOIN image_category ON image_category.id = image.image_category_id
    LEFT JOIN cloud_cover ON cloud_cover.id = image.cloud_cover_id
    JOIN image_area ON image_area.scvu_image_id = image.scvu_image_id
    JOIN task ON image_area.scvu_image_area_id = task.scvu_image_area_id
    WHERE image.completed_date IS NULL
        AND (image.upload_date >= %s AND image.upload_date <= %s)
"""

SQL_GET_TASKING_SUMMARY_IMAGE_FOR_USER = """
    SELECT DISTINCT image.scvu_image_id, COALESCE(sensor.name, NULL) as sensor_name, image.image_file_name, image.image_id,
        image.upload_date, image.image_datetime,
        COALESCE(report.name, NULL) as report_name, COALESCE(priority.name, NULL) as priority_name,
        COALESCE(image_category.name, NULL) as image_category_name, image.image_quality, COALESCE(cloud_cover.name, NULL) as cloud_cover_name,
        COALESCE(ew_status.name, NULL) as ew_status_name, image.target_tracing
    FROM image
    LEFT JOIN sensor ON sensor.id = image.sensor_id
    LEFT JOIN ew_status ON ew_status.id = image.ew_status_id
    LEFT JOIN report ON report.id = image.report_id
    LEFT JOIN priority ON priority.id = image.priority_id
    LEFT JOIN image_category ON image_category.id = image.image_category_id
    LEFT JOIN cloud_cover ON cloud_cover.id = image.cloud_cover_id
    JOIN image_area ON image_area.scvu_image_id = image.scvu_image_id
    JOIN task ON image_area.scvu_image_area_id = task.scvu_image_area_id
    WHERE image.completed_date IS NULL
        AND (image.upload_date >= %s AND image.upload_date <= %s)
        AND task.assignee_keycloak_id = %s
"""

SQL_GET_TASKING_SUMMARY_AREA = (
    "SELECT task.scvu_task_id, area.area_name, task_status.name, COALESCE(task.remarks, '') as remarks, "
    "task.assignee_keycloak_id, area.v10, area.opsv "
    "FROM task "
    "JOIN image_area ON task.scvu_image_area_id = image_area.scvu_image_area_id "
    "JOIN area ON image_area.scvu_area_id = area.scvu_area_id "
    "JOIN image ON image_area.scvu_image_id = image.scvu_image_id "
    "JOIN task_status ON task.task_status_id = task_status.id "
    "WHERE image.scvu_image_id = %s "
    "ORDER BY area.area_name"
)

SQL_GET_TASKING_SUMMARY_AREA_FOR_IMAGES = """
    SELECT image.scvu_image_id, task.scvu_task_id, area.area_name, task_status.name,
        COALESCE(task.remarks, '') as remarks, task.assignee_keycloak_id, area.v10, area.opsv
    FROM task
    JOIN image_area ON task.scvu_image_area_id = image_area.scvu_image_area_id
    JOIN area ON image_area.scvu_area_id = area.scvu_area_id
    JOIN image ON image_area.scvu_image_id = image.scvu_image_id
    JOIN task_status ON task.task_status_id = task_status.id
    WHERE image.scvu_image_id IN ({placeholders})
    ORDER BY image.scvu_image_id, area.area_name
"""

SQL_GET_TASKING_SUMMARY_AREA_FOR_IMAGES_FOR_USER = """
    SELECT image.scvu_image_id, task.scvu_task_id, area.area_name, task_status.name,
        COALESCE(task.remarks, '') as remarks, task.assignee_keycloak_id, area.v10, area.opsv
    FROM task
    JOIN image_area ON task.scvu_image_area_id = image_area.scvu_image_area_id
    JOIN area ON image_area.scvu_area_id = area.scvu_area_id
    JOIN image ON image_area.scvu_image_id = image.scvu_image_id
    JOIN task_status ON task.task_status_id = task_status.id
    WHERE image.scvu_image_id IN ({placeholders})
        AND task.assignee_keycloak_id = %s
    ORDER BY image.scvu_image_id, area.area_name
"""

SQL_UPDATE_TASK_STATUS = (
    "UPDATE task SET task_status_id = (SELECT id FROM task_status WHERE name = %s) "
    "WHERE scvu_task_id = %s "
    "AND task_status_id = (SELECT id FROM task_status WHERE name = %s)"
)

SQL_RESET_IMAGE_TASKS_FROM_COMPLETED = (
    "UPDATE task "
    "SET task_status_id = (SELECT id FROM task_status WHERE name = %s) "
    "WHERE task_status_id = (SELECT id FROM task_status WHERE name = %s) "
    "AND scvu_image_area_id IN ("
    "  SELECT scvu_image_area_id "
    "  FROM image_area "
    "  WHERE scvu_image_id = %s"
    ")"
)

SQL_UPDATE_TASKING_SUMMARY_IMAGE = (
    "UPDATE image SET report_id = (SELECT id FROM report WHERE name = %s OR (COALESCE(%s,'') = '' AND name is null)), "
    "image_category_id = (SELECT id FROM image_category WHERE name = %s OR (COALESCE(%s,'') = '' AND name is null)), "
    "image_quality = %s, "
    "cloud_cover_id = (SELECT id FROM cloud_cover WHERE name = %s OR (COALESCE(%s,'') = '' AND name is null)), "
    "target_tracing = %s "
    "WHERE scvu_image_id = %s"
)

SQL_UPDATE_TASKING_SUMMARY_TASK = "UPDATE task SET remarks = %s WHERE scvu_task_id = %s"


class TaskingQueries:
    def __init__(self, db, keycloak_queries):
        self.db = db
        self.keycloak = keycloak_queries

    def getUserActiveTasks(self, keycloak_user_id):
        '''
        Counts unfinished tasks for a user
        Input: keycloak_user_id (Keycloak user ID/sub)
        Output: integer value of unfinished tasks
        '''
        result = self.db.executeSelect(SQL_GET_USER_ACTIVE_TASKS, (keycloak_user_id, TaskStatus.COMPLETED))
        return result[0][0]

    def getActiveTaskCountsForUsers(self, keycloak_user_ids):
        '''
        Function:   Gets active task counts for users in bulk
        Input:      iterable of keycloak_user_ids
        Output:     dict of keycloak_user_id -> active task count
        '''
        user_ids = list(keycloak_user_ids)
        if not user_ids:
            return {}
        placeholders, values = build_in_clause(user_ids)
        query = SQL_GET_ACTIVE_TASK_COUNTS.format(placeholders=placeholders)
        result = self.db.executeSelect(query, values + (TaskStatus.COMPLETED,))
        counts = {row[0]: row[1] for row in result}
        for user_id in user_ids:
            counts.setdefault(user_id, 0)
        return counts

    def getAllTaskStatusForImage(self, scvu_image_id):
        '''
        Function:   Gets all tasks and their statuses for an image
        Input:      scvu image id
        Output:     list of tasks with their status
        '''
        cursor = self.db.executeSelect(SQL_GET_ALL_TASK_STATUS_FOR_IMAGE, (scvu_image_id,))
        if len(cursor) == 0:
            return []
        return cursor

    def getTaskStatusID(self, status_name):
        '''
        Function:   Gets status id by status name
        Input:      status name
        Output:     status id
        '''
        cursor = self.db.executeSelect(SQL_GET_TASK_STATUS_ID, (status_name,))
        if len(cursor) == 0:
            return None
        return cursor[0][0]

    def getIncompleteImages(self, start_date, end_date, limit=None, offset=None):
        '''
        Function:   Gets data for incomplete images from db
        Input:      start_date, end_date (date strings in YYYY-MM-DD format)
        Output:     list of tuple, each containing scvu_image_id, sensor.name, image_file_name, image_id, upload_date, image_datetime, priority.name
        Note:       Returns images that are incomplete (no completed_date) and have upload_date within the specified date range
        '''
        query = SQL_GET_INCOMPLETE_IMAGES
        values = (start_date, end_date)
        if limit is not None:
            query = f"{query} LIMIT %s OFFSET %s"
            values = values + (limit, offset or 0)
        cursor = self.db.executeSelect(query, values)
        return cursor

    def getTaskingManagerDataForImage(self, scvu_image_id):
        '''
        Function:   Gets data for tasking manager from area and task for a given image
        Input:      NIL
        Output:     list of tuple, each containing image_area.scvu_image_area_id, area.area_name
        '''
        cursor = self.db.executeSelect(SQL_GET_TASKING_MANAGER_IMAGE, (scvu_image_id,))
        return cursor

    def getTaskingManagerDataForImages(self, scvu_image_ids):
        '''
        Function:   Gets tasking manager area data for multiple images
        Input:      iterable of scvu_image_id
        Output:     list of tuples: scvu_image_id, scvu_image_area_id, area_name
        '''
        if not scvu_image_ids:
            return []
        placeholders, values = build_in_clause(scvu_image_ids)
        query = SQL_GET_TASKING_MANAGER_IMAGE_FOR_IMAGES.format(placeholders=placeholders)
        return self.db.executeSelect(query, values)

    def getTaskingManagerDataForTask(self, scvu_image_id):
        '''
        Function:   Gets data for tasking manager for task
        Input:      NIL
        Output:     list of tuple, each containing imageareaid, assignee name and remarks
        '''
        results = self.db.executeSelect(
            SQL_GET_TASKING_MANAGER_TASK,
            (AssigneeLabel.UNASSIGNED, scvu_image_id),
        )
        if not results:
            return results

        assignee_ids = [row[1] for row in results if row[1] and row[1] != 'Unassigned']
        usernames = self.keycloak.get_keycloak_usernames_bulk(assignee_ids)

        formatted = []
        for image_area_id, assignee_keycloak_id, remarks in results:
            if assignee_keycloak_id == AssigneeLabel.UNASSIGNED or not assignee_keycloak_id:
                assignee_name = AssigneeLabel.UNASSIGNED
            else:
                assignee_name = usernames.get(assignee_keycloak_id, assignee_keycloak_id)
            formatted.append((image_area_id, assignee_name, remarks))
        return formatted

    def getTaskingManagerDataForTasks(self, scvu_image_ids):
        '''
        Function:   Gets tasking manager task data for multiple images
        Input:      iterable of scvu_image_id
        Output:     list of tuples: scvu_image_id, scvu_image_area_id, assignee_name, remarks
        '''
        if not scvu_image_ids:
            return []
        placeholders, values = build_in_clause(scvu_image_ids)
        query = SQL_GET_TASKING_MANAGER_TASK_FOR_IMAGES.format(placeholders=placeholders)
        results = self.db.executeSelect(query, (AssigneeLabel.UNASSIGNED,) + values)
        if not results:
            return results
        assignee_ids = [row[2] for row in results if row[2] and row[2] != AssigneeLabel.UNASSIGNED]
        usernames = self.keycloak.get_keycloak_usernames_bulk(assignee_ids)
        formatted = []
        for scvu_image_id, image_area_id, assignee_keycloak_id, remarks in results:
            if assignee_keycloak_id == AssigneeLabel.UNASSIGNED or not assignee_keycloak_id:
                assignee_name = AssigneeLabel.UNASSIGNED
            else:
                assignee_name = usernames.get(assignee_keycloak_id, assignee_keycloak_id)
            formatted.append((scvu_image_id, image_area_id, assignee_name, remarks))
        return formatted

    def updateTaskingManagerData(self, scvu_image_id, priority_name):
        '''
        Function:   Updates priority_id of image
        Input:      scvu_image_id, priority.name
        Output:     NIL
        '''
        self.db.executeUpdate(
            SQL_UPDATE_TASKING_MANAGER_PRIORITY,
            (priority_name, priority_name, scvu_image_id),
        )

    def assignTask(self, image_area_id, assignee_keycloak_id, task_status_id):
        '''
        Function:   Creates and inserts a task into the database with the assignee
        Input:      image_area_id, assignee_keycloak_id (Keycloak user ID/sub), task_status_id
        Output:     NIL
        '''
        self.db.executeInsert(
            SQL_ASSIGN_TASK,
            (assignee_keycloak_id, image_area_id, task_status_id),
        )

    def autoAssign(self, area_name, image_id):
        '''
        Function:   Creates and inserts a task into the database as well as initialise that task with the automatically designated assignee 
        Input:      area_id
        Output:     NIL
        '''
        id_set = self.keycloak.getUserIds()
        if not id_set:
            logger.debug("autoAssign has no users to assign")
            return "unassigned"

        id_dict = {u: 0 for u in id_set}
        
        # Obtain scvu_image_area_id
        result = self.db.executeSelect(SQL_GET_IMAGE_AREA_ID_FOR_AUTOASSIGN, (area_name, image_id))
        if not result:
            logger.warning(
                "autoAssign failed to resolve image_area: area=%s image_id=%s",
                area_name,
                image_id,
            )
            return "unassigned"
        scvu_image_area_id  = result[0][0]

        counts = self.getActiveTaskCountsForUsers(id_dict.keys())
        for keycloak_user_id, active_tasks in counts.items():
            if active_tasks == 0:
                self.assignTask(scvu_image_area_id, keycloak_user_id, 1)
                return "assigned"
            id_dict[keycloak_user_id] = active_tasks

        assignee_keycloak_id = min(id_dict, key=id_dict.get)
        self.assignTask(scvu_image_area_id, assignee_keycloak_id, 1)
        return "assigned"

    def getTaskingSummaryImageData(self, start_date, end_date, limit=None, offset=None):
        '''
        Function:   Gets data for tasking summary
        Input:      NIL
        Output:     nested list with id, sensor_name, image_file_name, image_id, upload_date, image_datetime, report, priority, image_category, quality, cloud_cover, ew_status, target_tracing
        '''
        query = SQL_GET_TASKING_SUMMARY_IMAGE
        values = (start_date, end_date)
        if limit is not None:
            query = f"{query} LIMIT %s OFFSET %s"
            values = values + (limit, offset or 0)
        return self.db.executeSelect(query, values)

    def getTaskingSummaryImageDataForUser(self, start_date, end_date, assignee_keycloak_id, limit=None, offset=None):
        '''
        Function:   Gets data for tasking summary filtered by assignee (for II users)
        Input:      start_date, end_date, assignee_keycloak_id
        Output:     nested list with id, sensor_name, image_file_name, image_id, upload_date, image_datetime, report, priority, image_category, quality, cloud_cover, ew_status, target_tracing
        '''
        query = SQL_GET_TASKING_SUMMARY_IMAGE_FOR_USER
        values = (start_date, end_date, assignee_keycloak_id)
        if limit is not None:
            query = f"{query} LIMIT %s OFFSET %s"
            values = values + (limit, offset or 0)
        return self.db.executeSelect(query, values)

    def getTaskingSummaryAreaData(self, image_id):
        '''
        Function:   Gets data for tasking summary area
        Input:      image_id
        Output:     nested list with id, area_name, task_status, task_remarks, username
        '''
        # First get the raw data with Keycloak user IDs
        results = self.db.executeSelect(SQL_GET_TASKING_SUMMARY_AREA, (image_id,))

        user_ids = [row[4] for row in results if row[4]]
        usernames = self.keycloak.get_keycloak_usernames_bulk(user_ids)

        formatted_results = []
        for row in results:
            task_id, area_name, task_status, remarks, assignee_keycloak_id, v10, opsv = row
            username = usernames.get(assignee_keycloak_id) if assignee_keycloak_id else AssigneeLabel.UNASSIGNED
            formatted_results.append((task_id, area_name, task_status, remarks, username, v10, opsv))

        return formatted_results

    def getTaskingSummaryAreaDataForImages(self, image_ids):
        '''
        Function:   Gets data for tasking summary areas for multiple images
        Input:      image_ids
        Output:     list of tuples with image_id, task_id, area_name, task_status, remarks, username, v10, opsv
        '''
        if not image_ids:
            return []

        placeholders, values = build_in_clause(image_ids)
        query = SQL_GET_TASKING_SUMMARY_AREA_FOR_IMAGES.format(placeholders=placeholders)
        results = self.db.executeSelect(query, values)

        user_ids = [row[5] for row in results if row[5]]
        usernames = self.keycloak.get_keycloak_usernames_bulk(user_ids)

        formatted_results = []
        for row in results:
            image_id, task_id, area_name, task_status, remarks, assignee_keycloak_id, v10, opsv = row
            username = usernames.get(assignee_keycloak_id) if assignee_keycloak_id else AssigneeLabel.UNASSIGNED
            formatted_results.append((image_id, task_id, area_name, task_status, remarks, username, v10, opsv))
        return formatted_results

    def getTaskingSummaryAreaDataForImagesForUser(self, image_ids, assignee_keycloak_id):
        '''
        Function:   Gets data for tasking summary areas for multiple images filtered by assignee (for II users)
        Input:      image_ids, assignee_keycloak_id
        Output:     list of tuples with image_id, task_id, area_name, task_status, remarks, username, v10, opsv
        '''
        if not image_ids:
            return []

        placeholders, values = build_in_clause(image_ids)
        query = SQL_GET_TASKING_SUMMARY_AREA_FOR_IMAGES_FOR_USER.format(placeholders=placeholders)
        results = self.db.executeSelect(query, values + (assignee_keycloak_id,))

        user_ids = [row[5] for row in results if row[5]]
        usernames = self.keycloak.get_keycloak_usernames_bulk(user_ids)

        formatted_results = []
        for row in results:
            image_id, task_id, area_name, task_status, remarks, assignee_kc_id, v10, opsv = row
            username = usernames.get(assignee_kc_id) if assignee_kc_id else AssigneeLabel.UNASSIGNED
            formatted_results.append((image_id, task_id, area_name, task_status, remarks, username, v10, opsv))
        return formatted_results

    def startTask(self, task_id):
        '''
        Function:   Updates task status to In Progress if it is currently Incomplete
        Input:      task_id is the id of the task to be updated
        Output:     NIL
        '''
        self.db.executeUpdate(SQL_UPDATE_TASK_STATUS, (TaskStatus.IN_PROGRESS, task_id, TaskStatus.INCOMPLETE))

    def completeTask(self, task_id):
        '''
        Function:   Updates task status to Verifying if it is currently In Progress
        Input:      task_id is the id of the task to be updated
        Output:     NIL
        '''
        self.db.executeUpdate(SQL_UPDATE_TASK_STATUS, (TaskStatus.VERIFYING, task_id, TaskStatus.IN_PROGRESS))

    def verifyPass(self, task_id):
        '''
        Function:   Updates task status to Complete if it is currently Verifying
        Input:      task_id is the id of the task to be updated
        Output:     NIL
        '''
        self.db.executeUpdate(SQL_UPDATE_TASK_STATUS, (TaskStatus.COMPLETED, task_id, TaskStatus.VERIFYING))

    def verifyFail(self, task_id):
        '''
        Function:   Updates task status to In Progress if it is currently Verifying
        Input:      task_id is the id of the task to be updated
        Output:     NIL
        '''
        self.db.executeUpdate(SQL_UPDATE_TASK_STATUS, (TaskStatus.IN_PROGRESS, task_id, TaskStatus.VERIFYING))

    def resetImageTasksFromCompleted(self, scvu_image_id):
        '''
        Function:   Resets all completed tasks for an image to verifying
                    when an image is uncompleted.
        Input:      scvu_image_id
        Output:     NIL
        '''
        self.db.executeUpdate(
            SQL_RESET_IMAGE_TASKS_FROM_COMPLETED,
            (TaskStatus.VERIFYING, TaskStatus.COMPLETED, scvu_image_id),
        )

    def updateTaskingSummaryImage(self, scvu_image_id, report_name, image_category_name, image_quality_name, cloud_cover_name, target_tracing):
        '''
        Function:   Updates scvu_image_id, report_id, image_category_id, image_quality, cloud_cover_id, target_tracing of image
        Input:      scvu_image_id, report_name, image_category_name, image_quality_name, cloud_cover_name, target_tracing
        Output:     NIL
        '''
        self.db.executeUpdate(
            SQL_UPDATE_TASKING_SUMMARY_IMAGE,
            (
                report_name,
                report_name,
                image_category_name,
                image_category_name,
                image_quality_name,
                cloud_cover_name,
                cloud_cover_name,
                target_tracing,
                scvu_image_id,
            ),
        )

    def updateTaskingSummaryTask(self, scvu_task_id, remarks):
        '''
        Function:   Updates remarks of task
        Input:      scvu_task_id, remarks
        Output:     NIL
        '''
        self.db.executeUpdate(SQL_UPDATE_TASKING_SUMMARY_TASK, (remarks, scvu_task_id))
