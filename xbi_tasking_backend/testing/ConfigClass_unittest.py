import unittest

from config import get_config, load_config

class ConfigClass_unittest(unittest.TestCase):
    @classmethod
    def setUpClass(self):
        load_config("testing.config")

    @classmethod
    def tearDownClass(self):
        pass

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_getDatabaseName_baseCase(self):
        res = "XBI_TASKING_3_TEST"
        exp = get_config().getDatabaseName()
        self.assertEqual(res, exp, "does not equal to db name")

    def test_getIPAddress_baseCase(self):
        res = "localhost"
        exp = get_config().getIPAddress()
        self.assertEqual(res, exp, "does not equal to IP")

    def test_getPort_baseCase(self):
        res = "5432"
        exp = get_config().getPort()
        self.assertEqual(res, exp, "does not equal to port")
    
    def test_getUser_baseCase(self):
        res = "postgres"
        exp = get_config().getUser()
        self.assertEqual(res, exp, "does not equal to User")

    def test_getPassword_baseCase(self):
        res = "admin123"
        exp = get_config().getPassword()
        self.assertEqual(res, exp, "does not equal to Password")

    def startUnitTest(self):
        unittest.main()