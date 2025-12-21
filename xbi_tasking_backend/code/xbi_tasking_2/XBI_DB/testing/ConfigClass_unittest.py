import unittest
from main_classes import ConfigClass

class ConfigClass_unittest(unittest.TestCase):
    @classmethod
    def setUpClass(self):
        self.config = ConfigClass("testing.config")

    @classmethod
    def tearDownClass(self):
        pass

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_getIPAddress_baseCase(self):
        res = "192.168.1.2"
        exp = self.config.getIPAddress()
        self.assertEqual(res, exp, "does not equal to IP")

    def test_getPort_baseCase(self):
        res = "5432"
        exp = self.config.getPort()
        self.assertEqual(res, exp, "does not equal to port")

    def test_getPassword_baseCase(self):
        res = "P@ssword1"
        exp = self.config.getPassword()
        self.assertEqual(res, exp, "does not equal to Password")
    
    def test_getName_baseCase(self):
        res = "brandon"
        exp = self.config.getName()
        self.assertEqual(res, exp, "does not equal to Name")

    def startUnitTest(self):
        unittest.main()