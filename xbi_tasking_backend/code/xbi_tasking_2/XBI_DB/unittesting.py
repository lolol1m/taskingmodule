from testing import Database_unittest, ConfigClass_unittest, Task_unittest

db = Database_unittest()
db.startUnitTest()

config = ConfigClass_unittest()
config.startUnitTest()

task = Task_unittest()
task.startUnitTest()