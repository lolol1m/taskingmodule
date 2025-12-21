import unittest
from main_classes import Database
from objects import Task, Area, Image, Sensor

class Task_unittest(unittest.TestCase):
    @classmethod
    def setUpClass(self):
        self.db = Database()
        self.db.deleteAll()

    @classmethod
    def tearDownClass(self):
        self.db.deleteAll()

    def setUp(self):
        self.db.deleteAll()

    def tearDown(self):
        self.db.deleteAll()

    def test_taskRelationship_baseCase(self):
        print("wut")
        s = Sensor()
        s.name = "SB"
        self.db.insertObject(s)
        s2 = Sensor()
        s2.name = "SB"
        i = Image()
        i.pass_id = 1
        i.sensor_id = None
        i.sensor = s2
        i.image_file_name = ""
        i.image_id = 1
        i.upload_date = "2022-11-12 05:45:00"
        i.image_datetime = "2022-11-12 05:45:00"
        i.report_id = 0
        i.remarks = "hi"
        i.priority_id = 0
        i.image_category_id = 1
        i.cloud_cover_id = 1
        i.ew_status_id = 1
        i.target_tracing = False
        self.db.insertObject(i)
        a = self.db.getObject(Image)
        print(a.sensor_id, a.sensor.name)

    def startUnitTest(self):
        unittest.main()