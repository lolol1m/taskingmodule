import unittest
from main_classes import ConfigClass

class ConfigClass_unittest(unittest.TestCase):
    @classmethod
    def setUpClass(self):
        ConfigClass("testing.config")

    @classmethod
    def tearDownClass(self):
        pass

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_getDatabaseName_baseCase(self):
        res = "XBI_TASKING_3_TEST"
        exp = ConfigClass._instance.getDatabaseName()
        self.assertEqual(res, exp, "does not equal to db name")

    def test_getIPAddress_baseCase(self):
        res = "192.168.1.2"
        exp = ConfigClass._instance.getIPAddress()
        self.assertEqual(res, exp, "does not equal to IP")

    def test_getPort_baseCase(self):
        res = "5432"
        exp = ConfigClass._instance.getPort()
        self.assertEqual(res, exp, "does not equal to port")
    
    def test_getUser_baseCase(self):
        res = "postgres"
        exp = ConfigClass._instance.getUser()
        self.assertEqual(res, exp, "does not equal to User")

    def test_getPassword_baseCase(self):
        res = "P@ssword1"
        exp = ConfigClass._instance.getPassword()
        self.assertEqual(res, exp, "does not equal to Password")

    def startUnitTest(self):
        unittest.main()