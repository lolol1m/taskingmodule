import unittest
from main_classes import Database
from objects import Area

class Database_unittest(unittest.TestCase):
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

    def test_getObject_baseCase(self):
        area1 = Area()
        area2 = Area()
        area1.initArea("area1")
        area2.initArea("area2")
        self.db.insertObjects([area1, area2])
        areas = self.db.getObject(Area)
        res = areas.getAreaName()
        exp = "area1"
        self.assertEqual(res, exp, "area not inserted")

    def test_getObjects_baseCase(self):
        area1 = Area()
        area2 = Area()
        area1.initArea("area1")
        area2.initArea("area2")
        self.db.insertObjects([area1, area2])
        areas = self.db.getObjects(Area)
        res = areas[0].getAreaName()
        exp = "area1"
        self.assertEqual(res, exp, "area not inserted")
        res = areas[1].getAreaName()
        exp = "area2"
        self.assertEqual(res, exp, "area not inserted")

    def test_insertObject_baseCase(self):
        area1 = Area()
        area1.initArea("area3")
        self.db.insertObject(area1)
        area = self.db.getObject(Area)
        res = area.getAreaName()
        exp = "area3"
        self.assertEqual(res, exp)

    def test_insertObjects_baseCase(self):
        area1 = Area()
        area2 = Area()
        area1.initArea("area1")
        area2.initArea("area2")
        self.db.insertObjects([area1, area2])
        areas = self.db.getObjects(Area)
        res = areas[0].getAreaName()
        exp = "area1"
        self.assertEqual(res, exp, "area not inserted")
        res = areas[1].getAreaName()
        exp = "area2"
        self.assertEqual(res, exp, "area not inserted")
    
    def test_mergeObject_baseCase(self):
        area1 = Area()
        area1.initArea("area1")
        self.db.insertObject(area1)
        area = self.db.getObject(Area)
        area.setAreaName("areaaa2")
        self.db.mergeObject(area)
        new_area = self.db.getObject(Area)
        res = new_area.getAreaName()
        exp = "areaaa2"
        self.assertEqual(res, exp)

    def test_mergeObjects_baseCase(self):
        area1 = Area()
        area2 = Area()
        area1.initArea("area")
        area2.initArea("area")
        self.db.insertObjects([area1, area2])
        areas = self.db.getObjects(Area)
        areas[0].setAreaName("area1")
        areas[1].setAreaName("area2")
        self.db.mergeObjects(areas)
        areas = self.db.getObjects(Area)
        res = areas[0].getAreaName()
        exp = "area1"
        self.assertEqual(res, exp, "area not inserted")
        res = areas[1].getAreaName()
        exp = "area2"
        self.assertEqual(res, exp, "area not inserted")

    def startUnitTest(self):
        unittest.main()