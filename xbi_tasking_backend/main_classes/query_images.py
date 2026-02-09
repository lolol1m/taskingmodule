import datetime
from constants import AssigneeLabel
from main_classes.sql_utils import build_in_clause


SQL_INSERT_SENSOR = "INSERT INTO sensor (name) VALUES (%s) ON CONFLICT (name) DO NOTHING"

SQL_INSERT_IMAGE = (
    "INSERT INTO image (image_id, image_file_name, sensor_id, upload_date, image_datetime, ew_status_id, report_id, priority_id, image_category_id, cloud_cover_id) "
    "VALUES (%s, %s, (SELECT id FROM sensor WHERE name=%s), %s, %s, (SELECT id FROM ew_status WHERE name = 'xbi done'), 0, 0, 0, 0) "
    "ON CONFLICT (image_id, image_file_name) DO NOTHING"
)

SQL_INSERT_AREA = (
    "INSERT INTO area (area_name) "
    "VALUES (%s) "
    "ON CONFLICT (area_name) DO NOTHING"
)

SQL_INSERT_IMAGE_AREA_DSTA = (
    "INSERT INTO image_area (scvu_image_id, scvu_area_id) "
    "VALUES ((SELECT scvu_image_id FROM image WHERE image_id = %s), (SELECT scvu_area_id FROM area WHERE area_name = %s)) "
    "ON CONFLICT (scvu_image_id, scvu_area_id) DO NOTHING"
)

SQL_INSERT_TTG_IMAGE_RETURNING_ID = (
    "INSERT INTO image (image_file_name, sensor_id, upload_date, image_datetime, ew_status_id) "
    "VALUES (%s, (SELECT id FROM sensor WHERE name=%s), %s, %s, (SELECT id FROM ew_status WHERE name = 'ttg done')) "
    "RETURNING scvu_image_id"
)

SQL_INSERT_IMAGE_AREA_TTG = (
    "INSERT INTO image_area (scvu_image_id, scvu_area_id) "
    "VALUES (%s, (SELECT scvu_area_id FROM area WHERE area_name = %s)) "
    "ON CONFLICT (scvu_image_id, scvu_area_id) DO NOTHING"
)

SQL_COMPLETE_IMAGE = "UPDATE image SET completed_date = %s, vetter_keycloak_id = %s WHERE scvu_image_id = %s"
SQL_UNCOMPLETE_IMAGE = "UPDATE image SET completed_date = null WHERE scvu_image_id = %s"
SQL_GET_IMAGE_COMPLETE_DATE = "SELECT completed_date FROM image WHERE scvu_image_id = %s"
SQL_GET_IMAGE_BY_ID_AND_NAME = "SELECT image_id, image_file_name FROM image WHERE image_id = %s AND image_file_name = %s"

SQL_GET_IMAGE_AREA_DATA = (
    "SELECT task.scvu_task_id, area.area_name, COALESCE(task.remarks, '') as remarks, task.assignee_keycloak_id "
    "FROM task "
    "JOIN image_area ON task.scvu_image_area_id = image_area.scvu_image_area_id "
    "JOIN area ON image_area.scvu_area_id = area.scvu_area_id "
    "JOIN image ON image_area.scvu_image_id = image.scvu_image_id "
    "WHERE image.scvu_image_id = %s "
    "ORDER BY area.area_name"
)

SQL_GET_IMAGE_AREA_DATA_FOR_IMAGES = """
    SELECT image.scvu_image_id, task.scvu_task_id, area.area_name,
        COALESCE(task.remarks, '') as remarks, task.assignee_keycloak_id
    FROM task
    JOIN image_area ON task.scvu_image_area_id = image_area.scvu_image_area_id
    JOIN area ON image_area.scvu_area_id = area.scvu_area_id
    JOIN image ON image_area.scvu_image_id = image.scvu_image_id
    WHERE image.scvu_image_id IN ({placeholders})
    ORDER BY image.scvu_image_id, area.area_name
"""

SQL_GET_IMAGE_DATA = (
    "SELECT image.scvu_image_id, COALESCE(sensor.name, NULL) as sensor_name, image.image_file_name, image.image_id, image.upload_date, image.image_datetime, "
    "COALESCE(report.name, NULL) as report_name, COALESCE(priority.name, NULL) as priority_name, "
    "COALESCE(image_category.name, NULL) as image_category_name, image.image_quality, "
    "COALESCE(cloud_cover.name, NULL) as cloud_cover_name, COALESCE(ew_status.name, NULL) as ew_status_name, image.vetter_keycloak_id "
    "FROM image "
    "LEFT JOIN sensor ON sensor.id = image.sensor_id "
    "LEFT JOIN ew_status ON ew_status.id = image.ew_status_id "
    "LEFT JOIN report ON report.id = image.report_id "
    "LEFT JOIN priority ON priority.id = image.priority_id "
    "LEFT JOIN image_category ON image_category.id = image.image_category_id "
    "LEFT JOIN cloud_cover ON cloud_cover.id = image.cloud_cover_id "
    "WHERE image.completed_date IS NOT NULL "
    "AND ((image.completed_date >= %s AND image.completed_date < %s) "
    "OR (image.upload_date >= %s AND image.upload_date < %s))"
)

SQL_GET_IMAGE_DATA_FOR_USER = """
    SELECT image.scvu_image_id, COALESCE(sensor.name, NULL) as sensor_name, image.image_file_name, image.image_id, image.upload_date, image.image_datetime,
        COALESCE(report.name, NULL) as report_name, COALESCE(priority.name, NULL) as priority_name,
        COALESCE(image_category.name, NULL) as image_category_name, image.image_quality,
        COALESCE(cloud_cover.name, NULL) as cloud_cover_name, COALESCE(ew_status.name, NULL) as ew_status_name, image.vetter_keycloak_id
    FROM image
    LEFT JOIN sensor ON sensor.id = image.sensor_id
    LEFT JOIN ew_status ON ew_status.id = image.ew_status_id
    LEFT JOIN report ON report.id = image.report_id
    LEFT JOIN priority ON priority.id = image.priority_id
    LEFT JOIN image_category ON image_category.id = image.image_category_id
    LEFT JOIN cloud_cover ON cloud_cover.id = image.cloud_cover_id
    WHERE image.completed_date IS NOT NULL
        AND ((image.completed_date >= %s AND image.completed_date < %s)
             OR (image.upload_date >= %s AND image.upload_date < %s))
        AND EXISTS (
            SELECT 1
            FROM task t
            JOIN image_area ia ON ia.scvu_image_area_id = t.scvu_image_area_id
            WHERE ia.scvu_image_id = image.scvu_image_id
                AND t.assignee_keycloak_id = %s
        )
"""

SQL_DELETE_TASKS_FOR_IMAGE = (
    "DELETE FROM task WHERE scvu_image_area_id IN (SELECT scvu_image_area_id FROM image_area WHERE scvu_image_id = %s)"
)
SQL_DELETE_IMAGE_AREAS_FOR_IMAGE = "DELETE FROM image_area WHERE scvu_image_id = %s"
SQL_DELETE_IMAGE = "DELETE FROM image WHERE scvu_image_id = %s"


class ImageQueries:
    def __init__(self, db, keycloak_queries):
        self.db = db
        self.keycloak = keycloak_queries

    def insertSensor(self, sensor_name):
        '''
        Function:   Inserts sensor into db if it doesn't already exist
        Input:      sensor_name
        Output:     NIL
        '''
        self.db.executeInsert(SQL_INSERT_SENSOR, (sensor_name,))

    def insertImage(self, image_id, image_file_name, sensor_name, upload_date, image_datetime):
        '''
        Function:   Inserts image from DSTA into db
        Input:      image_id, image_file_name, sensor_name, upload_date, image_datetime
        Output:     NIL
        '''
        # Set default values for required foreign keys (0 = null in lookup tables)
        rows = self.db.executeInsert(
            SQL_INSERT_IMAGE,
            (image_id, image_file_name, sensor_name, upload_date, image_datetime),
        )

        return rows > 0

    def insertArea(self, area_name):
        '''
        Function:   Inserts area from DSTA / TTG into db
        Input:      area_name
        Output:     NIL
        '''
        self.db.executeInsert(SQL_INSERT_AREA, (area_name,))

    def insertImageAreaDSTA(self, image_id, area_name):
        '''
        Function:   Inserts image_area for DSTA into db 
        Input:      image_id, area_name
        Output:     NIL
        '''
        self.db.executeInsert(SQL_INSERT_IMAGE_AREA_DSTA, (image_id, area_name))

    def insertTTGImageReturnsId(self, image_file_name, sensor_name, upload_date, image_datetime):
        '''
        Function:   Inserts TTG image into db
        Input:      image_file_name, sensor_name, upload_date, image_datetime
        Output:     scvu_image_id of the inserted image
        '''
        return self.db.executeInsertReturningID(
            SQL_INSERT_TTG_IMAGE_RETURNING_ID,
            (image_file_name, sensor_name, upload_date, image_datetime),
        )

    def insertImageAreaTTG(self, scvu_image_id, area_name):
        '''
        Function:   Inserts image_area for DSTA into db 
        Input:      image_id, area_name
        Output:     NIL
        '''
        self.db.executeInsert(SQL_INSERT_IMAGE_AREA_TTG, (scvu_image_id, area_name))

    def completeImage(self, scvu_image_id, vetter_keycloak_id, current_datetime):
        '''
        Function:   Sets completion date for image to current date
        Input:      scvu image id, vetter_keycloak_id (Keycloak user ID/sub), current_datetime
        Output:     NIL
        '''
        self.db.executeUpdate(
            SQL_COMPLETE_IMAGE,
            (current_datetime, vetter_keycloak_id, scvu_image_id),
        )

    def uncompleteImage(self, scvu_image_id):
        '''
        Function:   Sets the completed date of an image to None
        Input:      scvu image id
        Output:     NIL
        '''
        self.db.executeUpdate(SQL_UNCOMPLETE_IMAGE, (scvu_image_id,))

    def getImageCompleteDate(self, scvu_image_id):
        '''
        Function:   Gets the completed date of an image
        Input:      scvu image id
        Output:     nested list with image completed date
        '''
        return self.db.executeSelect(SQL_GET_IMAGE_COMPLETE_DATE, (scvu_image_id,))

    def getImageByIdAndName(self, image_id, image_file_name):
        '''
        Function:   Gets image record by image_id + image_file_name
        Input:      image_id, image_file_name
        Output:     list of tuples (image_id, image_file_name)
        '''
        return self.db.executeSelect(SQL_GET_IMAGE_BY_ID_AND_NAME, (image_id, image_file_name))

    def getImageAreaData(self, scvu_image_id):
        '''
        Function: Gets image area data for completed images
        Input: scvu_image_id
        Output: scvu_task_id, area name, remarks, assignee name
        '''
        results = self.db.executeSelect(SQL_GET_IMAGE_AREA_DATA, (scvu_image_id,))
        assignee_ids = [row[3] for row in results if row[3]]
        usernames = self.keycloak.get_keycloak_usernames_bulk(assignee_ids)
        formatted = []
        for row in results:
            task_id, area_name, remarks, assignee_keycloak_id = row
            if assignee_keycloak_id:
                assignee = usernames.get(assignee_keycloak_id, assignee_keycloak_id)
            else:
                assignee = AssigneeLabel.UNASSIGNED
            formatted.append((task_id, area_name, remarks, assignee))
        return formatted

    def getImageAreaDataForImages(self, scvu_image_ids):
        '''
        Function: Gets image area data for completed images (batch)
        Input: scvu_image_ids
        Output: list of tuples with image_id, task_id, area_name, remarks, assignee
        '''
        if not scvu_image_ids:
            return []

        placeholders, values = build_in_clause(scvu_image_ids)
        imageAreaQuery = SQL_GET_IMAGE_AREA_DATA_FOR_IMAGES.format(placeholders=placeholders)
        results = self.db.executeSelect(imageAreaQuery, values)
        assignee_ids = [row[4] for row in results if row[4]]
        usernames = self.keycloak.get_keycloak_usernames_bulk(assignee_ids)
        formatted = []
        for row in results:
            image_id, task_id, area_name, remarks, assignee_keycloak_id = row
            if assignee_keycloak_id:
                assignee = usernames.get(assignee_keycloak_id, assignee_keycloak_id)
            else:
                assignee = AssigneeLabel.UNASSIGNED
            formatted.append((image_id, task_id, area_name, remarks, assignee))
        return formatted

    def getImageData(self, start_date, end_date, limit=None, offset=None):
        '''
        Function: Gets image data for completed images
        Input: start_date, end_date
        Output: scvu image id, sensor name, image file name, image id, image upload date, image date time, report name, priority name, image category name, image quality, cloud cover, ew status
        '''
        query = SQL_GET_IMAGE_DATA
        values = (start_date, end_date, start_date, end_date)
        if limit is not None:
            query = f"{query} LIMIT %s OFFSET %s"
            values = values + (limit, offset or 0)
        results = self.db.executeSelect(query, values)
        vetter_ids = [row[12] for row in results if row[12]]
        usernames = self.keycloak.get_keycloak_usernames_bulk(vetter_ids)
        formatted = []
        for row in results:
            row = list(row)
            vetter_keycloak_id = row[12]
            if vetter_keycloak_id:
                row[12] = usernames.get(vetter_keycloak_id, vetter_keycloak_id)
            else:
                row[12] = AssigneeLabel.UNASSIGNED
            formatted.append(tuple(row))
        return formatted

    def getImageDataForUser(self, start_date, end_date, assignee_keycloak_id, limit=None, offset=None):
        '''
        Function: Gets completed image data filtered by assignee for completed images
        Input: start_date, end_date, assignee_keycloak_id (Keycloak user ID/sub)
        Output: same shape as getImageData
        '''
        query = SQL_GET_IMAGE_DATA_FOR_USER
        values = (start_date, end_date, start_date, end_date, assignee_keycloak_id)
        if limit is not None:
            query = f"{query} LIMIT %s OFFSET %s"
            values = values + (limit, offset or 0)
        results = self.db.executeSelect(query, values)
        vetter_ids = [row[12] for row in results if row[12]]
        usernames = self.keycloak.get_keycloak_usernames_bulk(vetter_ids)
        formatted = []
        for row in results:
            row = list(row)
            vetter_keycloak_id = row[12]
            if vetter_keycloak_id:
                row[12] = usernames.get(vetter_keycloak_id, vetter_keycloak_id)
            else:
                row[12] = AssigneeLabel.UNASSIGNED
            formatted.append(tuple(row))
        return formatted

    def deleteTasksForImage(self, scvu_image_id):
        '''
        Function: Deletes all tasks for an certain image
        Input: scvu_image_id
        Output: NIL
        '''
        self.db.executeDelete(SQL_DELETE_TASKS_FOR_IMAGE, (scvu_image_id,))

    def deleteImageAreasForImage(self, scvu_image_id):
        '''
        Function: Deletes all image_areas for an certain image
        Input: scvu_image_id
        Output: NIL
        '''
        self.db.executeDelete(SQL_DELETE_IMAGE_AREAS_FOR_IMAGE, (scvu_image_id,))

    def deleteImage(self, scvu_image_id):
        '''
        Function: Deletes an image
        Input: scvu_image_id
        Output: NIL
        '''
        self.db.executeDelete(SQL_DELETE_IMAGE, (scvu_image_id,))
