import unittest
import datetime
import hashlib
from main_classes import QueryManager, ConfigClass

class QueryManager_unittest(unittest.TestCase):
    @classmethod
    def setUpClass(self):
        self.qm = QueryManager()
        ConfigClass("testing.config")
        if ConfigClass._instance.getDatabaseName() != "XBI_TASKING_3_TEST":
            print("PLS CHECK YOUR config file")
            exit()
        else:
            self.tearDownClass()

    @classmethod
    def tearDownClass(self):
        self.qm.db.deleteAll()

    def setUp(self):
        self.qm.db.deleteAll()

    def tearDown(self):
        self.qm.db.deleteAll()
    
    def test_accountLogin_baseCase(self):
        wp = hashlib.sha256('1'.encode()).hexdigest()
        res = self.qm.accountLogin(wp)
        exp = "II"
        self.assertEqual(res, exp, "accountLogin Failed - II not returned")
        
        wp = hashlib.sha256('hello'.encode()).hexdigest()
        res = self.qm.accountLogin(wp)
        exp = ""
        self.assertEqual(res, exp, "accountLogin Failed - empty string not returned")
    
    def test_insertSensor_baseCase(self):
        self.qm.insertSensor('sensor1')
        self.qm.insertSensor('sensor1')
        
        res = self.qm.db.executeSelect("SELECT name FROM sensor")
        self.assertEqual(len(res), 1, "insertSensor failed - no/multiple insertions")
    
    def test_insertImage_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        
        curr_time = datetime.datetime.now()
        self.qm.insertImage(1, 'hello.png', 'SB', curr_time, curr_time)
        self.qm.insertImage(1, 'hello.png', 'SB', curr_time, curr_time)
        
        res = self.qm.db.executeSelect("SELECT image_id FROM image")
        exp = 1
        self.assertEqual(len(res), 1, "insertImage failed - multiple insertions")
        self.assertEqual(res[0][0], exp, "insertImage failed - wrong image_id")

        res = self.qm.db.executeSelect("SELECT ew_status_id FROM image")[0][0]
        exp = 2
        self.assertEqual(res, exp, "insertImage failed - wrong ew status id")
    
    def test_insertArea_baseCase(self):
        self.qm.insertArea('area_1')
        self.qm.insertArea('area_1')
        
        res = self.qm.db.executeSelect("SELECT area_name FROM area WHERE area_name = 'area_1'")
        exp = 'area_1'
        self.assertEqual(len(res), 1, "insertArea failed - multiple insertions")
        self.assertEqual(res[0][0], exp, "insertArea failed - wrong image_id")
    
    def test_insertImageAreaDSTA_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        curr_time = datetime.datetime.now()
        self.qm.insertImage(1, 'hello.png', 'SB', curr_time, curr_time)
        self.qm.insertArea('areaHello')
        self.qm.insertArea('areaHello2')
        
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image WHERE image_id = 1")[0][0]
        area_id1 = self.qm.db.executeSelect("SELECT scvu_area_id FROM area WHERE area_name = 'areaHello'")[0][0]
        
        self.qm.insertImageAreaDSTA(1, 'areaHello')
        self.qm.insertImageAreaDSTA(1, 'areaHello2')
        self.qm.insertImageAreaDSTA(1, 'areaHello2')
        
        res = self.qm.db.executeSelect("SELECT scvu_image_id, scvu_area_id FROM image_area")
        exp_len = 2
        exp_val = (image_id, area_id1)
        self.assertEqual(len(res), exp_len, "insertImageAreaDSTA failed - multiple insertions")
        self.assertEqual(res[0], exp_val, "insertImageAreaDSTA failed - wrong image_id")
    
    def test_insertTTGImageReturnsId_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        curr_time = datetime.datetime.now()
        image_id = self.qm.insertTTGImageReturnsId('hello.png', 'SB', curr_time, curr_time)
        
        res = image_id
        exp = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.assertEqual(res, exp, 'insertTTGImage failed')
        
        res = self.qm.db.executeSelect("SELECT ew_status_id FROM image")[0][0]
        exp = 1
        self.assertEqual(res, exp, "insertTTGImage failed - wrong ew status id")
    
    def test_insertImageAreaTTG_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        curr_time = datetime.datetime.now()
        image_id = self.qm.insertTTGImageReturnsId('hello.png', 'SB', curr_time, curr_time)
        self.qm.insertArea('areaHello')
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[-1][0]
        
        self.qm.insertImageAreaTTG(image_id, 'areaHello')
        
        res = self.qm.db.executeSelect("SELECT scvu_image_id, scvu_area_id FROM image_area")[0]
        exp = (image_id, area_id)
        self.assertEqual(res, exp, "insertImageAreaTTG failed")
        
    
    def test_getAllTaskStatusForImage_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 1, %s)", (image_area_id, ))
        
        res = self.qm.getAllTaskStatusForImage(image_id)[0]
        exp = self.qm.db.executeSelect("SELECT scvu_task_id,task_status_id FROM task")[0]
        self.assertEqual(res, exp, "getAllTaskStatusForImage base case failed")
    
    def test_getTaskStatusID_baseCase(self):
        res = self.qm.getTaskStatusID("Incomplete")
        exp = self.qm.db.executeSelect("SELECT id FROM task_status WHERE name = 'Incomplete'")[0][0]
        self.assertEqual(res, exp, "getTaskStatusID failed")
    
    def test_completeImage_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 1, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.qm.startTask(task_id)
        self.qm.completeTask(task_id)
        self.qm.verifyPass(task_id)
        
        curr_time = datetime.datetime.now()
        self.qm.completeImage(image_id, 'hello', curr_time)
        res = type(self.qm.db.executeSelect(f"SELECT completed_date FROM image WHERE scvu_image_id = %s", (image_id,))[0][0])
        exp = type(datetime.time())
        self.assertEqual(res, exp, "completeImage base case failed")
    
    def test_getPriority_baseCase(self):
        res = self.qm.getPriority()
        exp = [('Low',), ('Medium',), ('High',)]
        self.assertEqual(res, exp, "priority not correct")

    def test_getCloudCover_baseCase(self):
        res = self.qm.getCloudCover()
        exp = [('UTC',), ('0C',), ('10-90C',), ('100C',)]
        self.assertEqual(res, exp, "cloud cover not correct")

    def test_getImageCategory_baseCase(self):
        res = self.qm.getImageCategory()
        exp = [('Detection',), ('Classification',), ('Identification',), ('Recognition',)]
        self.assertEqual(res, exp, "image category not correct")

    def test_getReport_baseCase(self):
        res = self.qm.getReport()
        exp = [('DS(OF)',), ('DS(SF)',), ('I-IIRS 0',), ('IIR',), ('Re-DL',), ('Research',), ('TOS',), ('No Findings',), ('Downgrade',), ('Failed',), ('Img Error',)]
        self.assertEqual(res, exp, "image category not correct")
    
    def test_getUsers_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO users(id, name, is_recent) VALUES (1, 'pte thanos', True)")
        self.qm.db.executeInsert("INSERT INTO users(id, name, is_recent) VALUES (2, 'pte tony', True)")
        
        res = self.qm.getUsers()
        exp = [('pte thanos',), ('pte tony',)]
        self.assertEqual(res, exp, "users not correct")

    def test_getTaskingSummaryImageData_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'user_hello')")
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 2, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 2, '2023-02-08 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[1][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_52')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[1][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[1][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 2, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[1][0]
        
        res = self.qm.getTaskingSummaryImageData('2023-02-07', '2023-02-08')
        exp = ('SB', 'hello.png', 1, datetime.datetime(2023, 2, 7, 11, 44, 10, 973005), datetime.time(11, 44, 10, 973005), None, 'Low', None, '', None, 'ttg done', False)
        self.assertEqual(res[0][1:], exp, "tasking summary image is wrong - same start and end date is wrong")
        
        res = self.qm.getTaskingSummaryImageData('2023-02-07', '2023-02-09')
        exp = 2
        self.assertEqual(len(res), exp, "tasking summary image is wrong - diff start and end date is wrong")

    def test_getIncompleteImages_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id, completed_date) VALUES (1, 'hello.png', 2, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, '2023-02-07 11:44:10.973005')")
        
        res = self.qm.getIncompleteImages('2023-02-07', '2023-02-08')
        exp_len = 1 
        self.assertEqual(len(res), exp_len, 'getIncompleteImages failed - got complete image')
        
        exp_id = image_id
        self.assertEqual(res[0][0], exp_id, 'getIncompleteImages failed')
    
    def test_getTaskingManagerDataForImage_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'user_hello')")
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 2, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 2, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id2 = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[1][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_52')")
        area_id2 = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[1][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id2, area_id2))
        image_area_id2 = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[1][0] 
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 2, %s)", (image_area_id2, ))
        
        res = self.qm.getTaskingManagerDataForImage(image_id)
        exp_len = 1 
        self.assertEqual(len(res), exp_len, 'getTaskingManagerDataForImage failed - excess areas')
        
        exp_id = image_area_id
        self.assertEqual(res[0][0], exp_id, 'getTaskingManagerDataForImage failed')
            
    def test_getTaskingManagerDataForTask_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'user_hello')")
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 2, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 2, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id2 = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[1][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_52')")
        area_id2 = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[1][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id2, area_id2))
        image_area_id2 = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[1][0] 
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 2, %s)", (image_area_id2, ))
        
        res = self.qm.getTaskingManagerDataForTask(image_id)[0][1:]
        exp = ('user_hello', '')
        self.assertEqual(res, exp, 'getTaskingManagerDataForTask failed')

    def test_getTaskingSummaryAreaData_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area WHERE area_name='area_51'")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 1, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        res = self.qm.getTaskingSummaryAreaData(image_id)[0][1:]
        exp = ('area_51', 'Incomplete', '', 'hello', False, False)
        self.assertEqual(res, exp, "tasking summary area is wrong")


    def test_updateTaskingManagerData_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'user_hello')")
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        
        self.qm.updateTaskingManagerData(image_id, 'Medium')
        res = self.qm.db.executeSelect(f"SELECT priority_id FROM image WHERE scvu_image_id = %s", (image_id,))[0][0]
        exp = 2
        self.assertEqual(res, exp, "updateTaskingManagerData failed")
    
    def test_startTask_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 1, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.qm.startTask(task_id)
        res = self.qm.db.executeSelect(f"SELECT task_status_id FROM task WHERE scvu_task_id = %s", (task_id,))[0][0]
        exp = self.qm.db.executeSelect("SELECT id FROM task_status WHERE name = 'In Progress'")[0][0]
        self.assertEqual(res, exp, "startTask base case failed")
    
    def test_completeTask_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 2, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.qm.completeTask(task_id)
        res = self.qm.db.executeSelect(f"SELECT task_status_id FROM task WHERE scvu_task_id = %s", (task_id,))[0][0]
        exp = self.qm.db.executeSelect("SELECT id FROM task_status WHERE name = 'Verifying'")[0][0]
        self.assertEqual(res, exp, "completeTask base case failed")
        
    def test_verifyPass_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.qm.verifyPass(task_id)
        res = self.qm.db.executeSelect(f"SELECT task_status_id FROM task WHERE scvu_task_id = %s", (task_id,))[0][0]
        exp = self.qm.db.executeSelect("SELECT id FROM task_status WHERE name = 'Completed'")[0][0]
        self.assertEqual(res, exp, "verifyPass base case failed")
        
    def test_verifyFail_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.qm.verifyFail(task_id)
        res = self.qm.db.executeSelect(f"SELECT task_status_id FROM task WHERE scvu_task_id = %s", (task_id,))[0][0]
        exp = self.qm.db.executeSelect("SELECT id FROM task_status WHERE name = 'In Progress'")[0][0]
        self.assertEqual(res, exp, "verifyFail base case failed")

    def test_uncompleteImage_baseCase(self):
        pass
    
    def test_getImageData_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date, vetter_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005', 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        res = self.qm.getImageData('2023-02-07', '2023-02-08')[0][0]
        exp = image_id
        self.assertEqual(res, exp, 'getImageData failed')
    
    def test_getXBIReportImage_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        res = self.qm.getXBIReportImage('2023-02-07', '2023-02-08')
        exp = [('SB', 'UNCATEGORISED', 'DS(OF)')]
        self.assertEqual(res, exp, 'getXBIReportImage failed')
        
    def test_getImageAreaData_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        res = self.qm.getImageAreaData(image_id)[0][1]
        exp = 'OTHERS'
        self.assertEqual(res, exp, 'getImageAreaData failed')    
        
    def test_updateTaskingSummaryImage_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'user_hello')")
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        
        self.qm.updateTaskingSummaryImage(image_id, 'Research', 'Detection', 'image quality is very very good', 'UTC', False)
        res = self.qm.db.executeSelect(f"SELECT report_id, image_category_id, image_quality, cloud_cover_id, target_tracing FROM image WHERE scvu_image_id = %s", (image_id,))[0]
        exp = (6, 1, 'image quality is very very good', 1, False)
        self.assertEqual(res, exp, "updateTaskingManagerImage failed")
    
    def test_updateTaskingSummaryTask_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]

        self.qm.updateTaskingSummaryTask(task_id, 'HELLO EVEREYBODY')
        res = self.qm.db.executeSelect(f"SELECT remarks FROM task WHERE scvu_task_id = %s", (task_id, ))[0][0]
        exp = "HELLO EVEREYBODY"
        self.assertEqual(res, exp, "updateTaskingManagerTask failed")

    def test_getSensors_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        res = self.qm.getSensors()
        exp = [('SB', 'UNCATEGORISED')]
        self.assertEqual(res, exp, "getSensors failed")
    
    def test_getCategories_baseCase(self):
        res = self.qm.getCategories()
        exp = [('UNCATEGORISED',), ('UAV',), ('AB',), ('HB',), ('AVIS',)]
        self.assertEqual(res, exp, "getCategories failed")
    
    def test_setOpsvFalse_baseCase(self):
        self.qm.db.executeUpdate("UPDATE area SET opsv = True WHERE area_name = 'G074'")
        
        self.qm.setOpsvFalse()
        res = self.qm.db.executeSelect(f"SELECT area_name FROM area WHERE opsv = True")
        exp = []
        self.assertEqual(res, exp, "setOpsvFalse does not work")
    
    def test_setOpsvAreas_baseCase(self):
        self.qm.setOpsvAreas([('G074', ), ('G080', )])
        res = [area[0] for area in self.qm.db.executeSelect(f"SELECT area_name FROM area WHERE opsv = True")]
        exp = ['G074', 'G080']
        self.assertEqual(res, exp, "setOpsvAreas does not work")

    def test_updateExistingUsers_baseCase(self):
        self.qm.db.executeInsert(f"INSERT INTO users (name, is_recent) VALUES ('walrus', False)")
        self.qm.db.executeInsert(f"INSERT INTO users (name, is_recent) VALUES ('seal', False)")
        
        self.qm.updateExistingUsers([('walrus', )])
        res = [user[0] for user in self.qm.db.executeSelect(f"SELECT name FROM users WHERE is_recent = True")]
        exp = ['walrus']
        self.assertEqual(res, exp, 'updateExistingUsers failed - users not added correctly')

    def test_updateSensorCategory_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (2, 'SR')")
        self.qm.updateSensorCategory([('UAV', 'SB'),('AB', 'SR')])
        res = self.qm.getSensors()
        exp = [('SB', 'UAV'), ('SR', 'AB')]
        self.assertEqual(res, exp, "updateSensorCat failed")

    def test_deleteTasksForImage_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (1, 'hello.png', '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id, ))
        task_id = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_52')")
        area_id2 = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[1][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id2))
        image_area_id2 = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[1][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id2, ))
        task_id2 = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[1][0]
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (1, 'hello.png', '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        image_id2 = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[1][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_53')")
        area_id3 = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[2][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id2, area_id3))
        image_area_id3 = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[2][0]
        
        self.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id3, ))
        task_id3 = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")[2][0]
        
        self.qm.deleteTasksForImage(image_id)
        res = self.qm.db.executeSelect("SELECT scvu_task_id FROM task")
        exp = task_id3
        self.assertEqual(res[0][0], exp, "deleteTasksForImage failed - first task after deletion is incorrect")
        
        exp_len = 1
        self.assertEqual(len(res), exp_len, "deleteTasksForImage failed - length of tasks after deletion is incorrect")
    
    def test_deleteImageAreasForImage_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (1, 'hello.png', '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_52')")
        area_id2 = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[1][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id2))
        image_area_id2 = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[1][0]
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (1, 'hello.png', '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        image_id2 = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[1][0]
        self.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_53')")
        area_id3 = self.qm.db.executeSelect("SELECT scvu_area_id FROM area")[2][0]
        self.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id2, area_id3))
        image_area_id3 = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[2][0]
        
        self.qm.deleteImageAreasForImage(image_id)
        res = self.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")
        exp = image_area_id3
        self.assertEqual(res[0][0], exp, "deleteImageAreasForImage failed - first image_area after deletion is incorrect")
        
        exp_len = 1
        self.assertEqual(len(res), exp_len, "deleteImageAreasForImage failed - length of image_area after deletion is incorrect")
    
    def test_deleteImage_baseCase(self):
        self.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (1, 'hello.png', '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        image_id = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        
        self.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (1, 'hello.png', '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        image_id2 = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")[1][0]
        
        self.qm.deleteImage(image_id)
        res = self.qm.db.executeSelect("SELECT scvu_image_id FROM image")
        exp = image_id2
        self.assertEqual(res[0][0], exp, "deleteImage failed - first image after deletion is incorrect")
        
        exp_len = 1
        self.assertEqual(len(res), exp_len, "deleteImage failed - length of image after deletion is incorrect")
    
    def startUnitTest(self):
        unittest.main()