SQL_GET_XBI_REPORT_IMAGE = (
    "SELECT sensor.name, sensor_category.name, report.name "
    "FROM image, sensor, sensor_category, report "
    "WHERE (image.upload_date >= %s AND image.upload_date <= %s) "
    "AND sensor.id = image.sensor_id "
    "AND sensor.category_id = sensor_category.id "
    "AND report.id = image.report_id "
    "AND completed_date IS NOT NULL"
)


class ReportQueries:
    def __init__(self, db):
        self.db = db

    def getXBIReportImage(self, start_date, end_date, limit=None, offset=None):
        '''
        Function: Gets image data for xbi
        Input: start_date, end_date
        Output: sensor name, category name, report name
        '''
        query = SQL_GET_XBI_REPORT_IMAGE
        values = (start_date, end_date)
        if limit is not None:
            query = f"{query} LIMIT %s OFFSET %s"
            values = values + (limit, offset or 0)
        cursor = self.db.executeSelect(query, values)
        return cursor
