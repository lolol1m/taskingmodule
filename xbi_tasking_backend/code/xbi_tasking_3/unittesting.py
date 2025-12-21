from testing import ConfigClass_unittest, MainController_unittest, QueryManager_unittest, Database_unittest

config = ConfigClass_unittest()
config.startUnitTest()

db = Database_unittest()
db.startUnitTest()

qm = QueryManager_unittest()
qm.startUnitTest()

mc = MainController_unittest()
mc.startUnitTest()