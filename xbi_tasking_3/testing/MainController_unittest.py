import unittest
import datetime
from main_classes import MainController, ConfigClass

class MainController_unittest(unittest.TestCase):
    @classmethod
    def setUpClass(self):
        self.mc = MainController()
        ConfigClass("testing.config")
        if ConfigClass._instance.getDatabaseName() != "XBI_TASKING_3_TEST":
            print("PLS CHECK YOUR config file")
            exit()
        else:
            self.tearDownClass()

    @classmethod
    def tearDownClass(self):
        self.mc.qm.db.deleteAll()

    def setUp(self):
        self.mc.qm.db.deleteAll()
        self.maxDiff = None

    def tearDown(self):
        self.mc.qm.db.deleteAll()
    
    def test_accountLogin_baseCase(self):
        res = self.mc.accountLogin({
            'Password': '1'
        })
        exp = "II"
        self.assertEqual(res, exp, "accountLogin failed - II not returned")
        
        res = self.mc.accountLogin({
            'Password': 'hello'
        })
        exp = ""
        self.assertEqual(res, exp, "accountLogin failed - empty string not returned")
    
    def test_insertDSTAData_baseCase(self):
        data = {
            'images': [{
                'imgId': 1,
                'imageFileName': 'hello.gif',
                'sensorName': 'SB',
                'uploadDate': '2023-02-08T09:59:33.333Z',
                'imageDateTime': '2023-02-08T09:59:33.333Z',
                'areas': [{
                    'areaId': 2,
                    'areaName': 'area_2'
                }]
            }]
        }
        
        self.mc.insertDSTAData(data)
        res = self.mc.qm.db.executeSelect("SELECT image_id FROM image")[0][0]
        exp = 1
        self.assertEqual(res, exp, "insertDSTAData failed - image not correctly inserted")
        
        res = self.mc.qm.db.executeSelect("SELECT area_name FROM area WHERE area_name='area_2'")[0][0]
        exp = 'area_2'
        self.assertEqual(res, exp, "insertDSTAData failed - area not correctly inserted")
        
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image WHERE image_id = 1")[0][0]
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area WHERE area_name = 'area_2'")[0][0]
        res = self.mc.qm.db.executeSelect("SELECT scvu_image_id, scvu_area_id FROM image_area")[0]
        exp = (image_id, 0)
        self.assertEqual(res, exp, "insertDSTAData failed - image_area not correctly inserted")
    
    def test_insertTTGData_baseCase(self):
        data = {
            'imageFileName': 'hello.gif',
            'sensorName': 'SB',
            'uploadDate': '2023-02-08T09:59:33.333Z',
            'imageDateTime': '2023-02-08T09:59:33.333Z',
            'areas': ['area1', 'area2', 'area1']
        }
        self.mc.insertTTGData(data)
        res = self.mc.qm.db.executeSelect("SELECT image_file_name FROM image")[-1][0]
        exp = 'hello.gif'
        self.assertEqual(res, exp, "insertTTGData failed - image not correctly inserted")
        
        res = self.mc.qm.db.executeSelect("SELECT area_name FROM area WHERE area_name = 'area1'")
        exp = 1
        self.assertEqual(len(res), exp, "insertTTGData failed - incorrect number of areas inserted")
        
        res = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")
        exp = 3
        self.assertEqual(len(res), exp, "insertTTGData failed - incorrect number of image_areas inserted")
    
    def test_getPriority_baseCase(self):
        res = self.mc.getPriority()
        exp = {"Priority": ["Low", "Medium", "High"]}
        self.assertEqual(res, exp, "priority not correct")

    def test_getCloudCover_baseCase(self):
        res = self.mc.getCloudCover()
        exp = {'Cloud Cover': ['UTC', '0C', '10-90C', '100C']}
        self.assertEqual(res, exp, "priority not correct")

    def test_getImageCategory_baseCase(self):
        res = self.mc.getImageCategory()
        exp = {'Image Category': ['Detection', 'Classification', 'Identification', 'Recognition']}
        self.assertEqual(res, exp, "priority not correct")
    
    def test_getUsers_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name, is_recent) VALUES (1, 'pte thanos', True)")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (2, 'pte tony')")
        
        res = self.mc.getUsers()
        exp = {'Users': ['pte thanos']}
        self.assertEqual(res, exp, "users not correct")
    
    def test_getReport_baseCase(self):
        res = self.mc.getReport()
        exp = {'Report': ['DS(OF)', 'DS(SF)', 'I-IIRS 0', 'IIR', 'Re-DL', 'Research', 'TOS', 'No Findings', 'Downgrade', 'Failed', 'Img Error']}
        self.assertEqual(res, exp, "priority not correct")

    def test_getTaskingSummaryData_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area WHERE area_name='area_51'")[0][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 2, %s)", (image_area_id, ))
        task_id = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        res = self.mc.getTaskingSummaryData({
            'Start Date': '2023-02-07T16:00:00.000Z',
            'End Date': '2023-02-07T16:00:00.000Z'
        })
        exp = {image_id: {'Sensor Name': 'SB', 'Image File Name': 'hello.png', 'Image ID': 1, 'Upload Date': '2023-02-07, 11:44:10', 'Image Datetime': '1900-01-01, 11:44:10', 'Report': None, 'Priority': 'Low', 'Image Category': None, 'Image Quality': '', 'Cloud Cover': None, 'EW Status': 'ttg done', 'Target Tracing': False, 'Area': 'area_51', 'Task Completed': '0/1', 'V10': False, 'OPS V': False, 'Remarks': '\n', 'Child ID': [task_id], 'Assignee': 'hello'}, task_id: {'Area Name': 'area_51', 'Assignee': 'hello', 'Task Status': 'In Progress', 'Remarks': '', 'Parent ID': image_id}}
        self.assertEqual(res, exp, "tasking summary get is incorrect")

    def test_getTaskingManagerData_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'user_hello')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (2, 'user_hello2')")
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 2, %s)", (image_area_id, ))
        task_id = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 2, '2023-02-08 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id2 = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[1][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_52')")
        area_id2 = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[1][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id2, area_id2))
        image_area_id2 = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[1][0] 
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 2, %s)", (image_area_id2, ))
        
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_53')")
        area_id3 = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[2][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id2, area_id3))
        image_area_id3 = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[2][0] 
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (2, 1, %s)", (image_area_id3, ))
        
        res = self.mc.getTaskingManagerData({
            'Start Date': '2023-02-07T16:00:00.000Z',
            'End Date': '2023-02-08T16:00:00.000Z'
        })
        
        self.assertIn(image_id, res, 'getTaskingManagerData failed - image1 is missing')
        self.assertEqual("user_hello", res[image_id]["Assignee"], "assignee is missing")
        self.assertIn(image_area_id, res, 'getTaskingManagerData failed - imagearea1 is missing')
        self.assertEqual(True, res[image_id]['TTG'], 'getTaskingManagerData failed - ttg is wrong for image 1')
        self.assertIn(image_id2, res, 'getTaskingManagerData failed - image2 is missing')
        self.assertIn(image_area_id2, res, 'getTaskingManagerData failed - imagearea2 is missing')
        self.assertEqual("user_hello", res[image_area_id]["Assignee"], "assignee is missing")
        self.assertIn(image_area_id3, res, 'getTaskingManagerData failed - imagearea3 is missing')
        self.assertEqual(False, res[image_id2]['TTG'], 'getTaskingManagerData failed - ttg is wrong for image 2')
        
        exp_len = 5
        self.assertEqual(len(res), exp_len, 'getTaskingManagerData failed - output has excess items')
        
    
    def test_formatTaskingSummaryImage_baseCase(self):
        res = self.mc.formatTaskingSummaryImage((12876, 'SB', 'hello.png', 1, datetime.datetime(2023, 2, 7, 11, 44, 10, 973005), datetime.time(11, 44, 10, 973005), 'DS(OF)', 'Low', 'Detection', 'really bad', 'UTC', 'ttg done', False), [(1,"area1", "Incomplete","remark 1", "user 1", False, False)])
        exp = {'Sensor Name': 'SB', 'Image File Name': 'hello.png', 'Image ID': 1, 'Upload Date': '2023-02-07, 11:44:10', 'Image Datetime': '1900-01-01, 11:44:10', 'Report': 'DS(OF)', 'Priority': 'Low', 'Image Category': 'Detection', 'Image Quality': 'really bad', 'Cloud Cover': 'UTC', 'EW Status': 'ttg done', 'Target Tracing': False, 'Area': 'area1', 'Task Completed': '0/1', 'V10': False, 'OPS V': False, 'Remarks': 'remark 1\n', 'Child ID': [1], 'Assignee': 'user 1'}
        self.assertEqual(res, exp, "format tasking summary image is incorrect")

    def test_formatTaskingSummaryArea_baseCase(self):
        res = self.mc.formatTaskingSummaryArea((1,"area1", "Incomplete","remark 1", "user 1"),2)
        exp = {'Area Name': 'area1', 'Assignee': 'user 1', 'Task Status': 'Incomplete', 'Remarks': 'remark 1', 'Parent ID': 2}
        self.assertEqual(res, exp, "format tasking summary area is incorrect")

    def test_updateTaskingManagerData_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'user_hello')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        
        self.mc.updateTaskingManagerData({
            image_id: {
                'Image ID': 213981392,
                'Priority': 'Medium'
            },
            29013: {
                'i am a placeholder to test for area': 349
            }
        })
        res = self.mc.qm.db.executeSelect(f"SELECT priority_id FROM image WHERE scvu_image_id = %s", (image_id,))[0][0]
        exp = 2
        self.assertEqual(res, exp, "updateTaskingManagerData failed")
    
    def test_uncompleteImages_baseCase(self):
        time = datetime.datetime.now()
        self.mc.qm.db.executeInsert(f"INSERT INTO sensor VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert(f"INSERT INTO image VALUES (26, 1, 'test.png', 1, '{time}', '{time}', 1, 1, 1, 'quality here', 1, 1, False, null)")
        self.mc.uncompleteImages({'SCVU Image ID' : [26]})

        res = self.mc.qm.getImageCompleteDate(26)
        exp = [(None,)]
        self.assertEqual(res, exp, "uncomplete date not correct")

    def test_assignTask_baseCase(self):
        time = datetime.datetime.now()
        self.mc.qm.db.executeInsert(f"INSERT INTO sensor VALUES (1, 'SB')")
        # self.mc.qm.db.executeInsert(f"INSERT INTO image_area")
        # self.mc.qm.db.executeInsert(f"INSERT INTO image VALUES (26, 1, 1, 'test.png', 1, '{time}', '{time}', 1, 'remarks here', 1, 1, 'quality here', 1, 1, False, null)")
        self.mc.qm.db.executeInsert(f"INSERT INTO users VALUES (1, 'walrus', True)")
        self.mc.qm.db.executeInsert(f"INSERT INTO users VALUES (2, 'walrus 2.0', True)")

        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        self.mc.assignTask({"Tasks":[{'SCVU Image Area ID' : image_area_id, 'Assignee' : 'walrus'}]}) 

        res = self.mc.qm.db.executeSelect(f"SELECT assignee_id FROM task WHERE scvu_image_area_id = %s", (image_area_id, ))
        exp = [(1,)]
        self.assertEqual(res, exp, "assign task not correct")
        
        self.mc.assignTask({"Tasks":[{'SCVU Image Area ID' : image_area_id, 'Assignee' : 'walrus 2.0'}]}) 
        
        res = self.mc.qm.db.executeSelect(f"SELECT assignee_id FROM task WHERE scvu_image_area_id = %s", (image_area_id, ))
        exp = [(2,)]
        self.assertEqual(res, exp, "assign task not correct - reassignment is incorrect")

    def test_startTasks_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 1, %s)", (image_area_id, ))
        task_id = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.mc.startTasks({'SCVU Task ID': [task_id]})
        res = self.mc.qm.db.executeSelect(f"SELECT task_status_id FROM task WHERE scvu_task_id = %s", (task_id,))[0][0]
        exp = self.mc.qm.db.executeSelect("SELECT id FROM task_status WHERE name = 'In Progress'")[0][0]
        self.assertEqual(res, exp, "startTask base case failed")
    
    def test_completeTasks_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 2, %s)", (image_area_id, ))
        task_id = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.mc.completeTasks({'SCVU Task ID': [task_id]})
        res = self.mc.qm.db.executeSelect(f"SELECT task_status_id FROM task WHERE scvu_task_id = %s", (task_id,))[0][0]
        exp = self.mc.qm.db.executeSelect("SELECT id FROM task_status WHERE name = 'Verifying'")[0][0]
        self.assertEqual(res, exp, "startTask base case failed")
    
    def test_verifyPass_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id, ))
        task_id = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.mc.verifyPass({'SCVU Task ID': [task_id]})
        res = self.mc.qm.db.executeSelect(f"SELECT task_status_id FROM task WHERE scvu_task_id = %s", (task_id,))[0][0]
        exp = self.mc.qm.db.executeSelect("SELECT id FROM task_status WHERE name = 'Completed'")[0][0]
        self.assertEqual(res, exp, "verifyPass base case failed")
    
    def test_verifyFail_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id, ))
        task_id = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.mc.verifyFail({'SCVU Task ID': [task_id]})
        res = self.mc.qm.db.executeSelect(f"SELECT task_status_id FROM task WHERE scvu_task_id = %s", (task_id,))[0][0]
        exp = self.mc.qm.db.executeSelect("SELECT id FROM task_status WHERE name = 'In Progress'")[0][0]
        self.assertEqual(res, exp, "verifyFail base case failed")
    
    def test_completeImages_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id, ))
        task_id = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        json = {'SCVU Task ID': [task_id]}
        self.mc.startTasks(json)
        self.mc.completeTasks(json)
        self.mc.verifyPass(json)
        
        self.mc.completeImages({'SCVU Image ID': [image_id], 'Vetter': 'hello'})
        res = type(self.mc.qm.db.executeSelect(f"SELECT completed_date FROM image WHERE scvu_image_id = %s", (image_id,))[0][0])
        exp = type(datetime.time())
        self.assertEqual(res, exp, "completeImages base case failed")
    
    def test_completeImage_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1)")
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id, ))
        task_id = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        json = {'SCVU Task ID': [task_id]}
        self.mc.startTasks(json)
        self.mc.completeTasks(json)
        self.mc.verifyPass(json)
        
        self.mc.completeImage(image_id, 'hello', datetime.datetime.now())
        res = type(self.mc.qm.db.executeSelect(f"SELECT completed_date FROM image WHERE scvu_image_id = %s", (image_id,))[0][0])
        exp = type(datetime.time())
        self.assertEqual(res, exp, "completeImage base case failed")
    
    def test_updateTaskingSummaryData_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'user_hello')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 5, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id2 = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[1][0]
        
        self.mc.updateTaskingSummaryData({
            image_id: {
                'Image ID': 9180180410130131,
                'Report': 'Research',
                'Image Category': 'Detection',
                'Image Quality': 'image quality is very very good',
                'Cloud Cover': 'UTC',
                'Target Tracing': False
            },
            341: {
                'i am a placeholder to test for area': 12345
            }   
        })
        res = self.mc.qm.db.executeSelect(f"SELECT report_id, image_category_id, image_quality, cloud_cover_id, target_tracing FROM image WHERE scvu_image_id = %s", (image_id,))[0]
        exp = (6, 1, 'image quality is very very good', 1, False)
        self.assertEqual(res, exp, "updateTaskingManagerData failed")
        
    def test_getCompleteImageData_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")

        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date, vetter_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005', 1)")
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area WHERE area_name='area_51'")[0][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]

        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id, remarks) VALUES (1, 3, %s, 'HELLO I AM REMARK')", (image_area_id, ))
        task_id = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        res = self.mc.getCompleteImageData({
            'Start Date': '2023-02-07T16:00:00.000Z',
            'End Date': '2023-02-07T16:00:00.000Z'
        })
        exp = {image_id: {'Sensor Name': 'SB', 'Image File Name': 'hello.png', 'Image ID': 1, 'Upload Date': '2023-02-07, 11:44:10', 'Image Datetime': '1900-01-01, 11:44:10', 'Area': 'area_51', 'Assignee': 'hello', 'Report': 'DS(OF)', 'Priority': 'Low', 'Image Category': 'Detection', 'Image Quality': 'really bad', 'Cloud Cover': 'UTC', 'EW Status': 'ttg done', 'Vetter': 'hello', 'Child ID': [task_id], 'Remarks': 'HELLO I AM REMARK\n'}, task_id: {'Area Name': 'area_51', 'Remarks': '', 'Assignee': 'hello', 'Parent ID': image_id, 'Remarks': 'HELLO I AM REMARK'}}
        self.assertEqual(res, exp, "getcompleteimagedata does not work")

    def test_getSensorCategory_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        res = self.mc.getSensorCategory()
        exp = {'UNCATEGORISED': ['SB'], 'UAV': [], 'AB': [], 'HB': [], 'AVIS': []}
        self.assertEqual(res, exp, "getsensorcategory does not work")
        
    def test_getAreas_baseCase(self):
        res = self.mc.getAreas()["Areas"][0]['Area Name']
        exp = '10007'
        self.assertEqual(res, exp, "getAreas does not work")

    def test_setOpsvAreas_baseCase(self):
        self.mc.setOpsvAreas({'Areas':[{'Area Name' : 'G074', 'OPS V' : True}, {'Area Name' : 'G080', 'OPS V' : True}, {'Area Name' : 'G14B', 'OPS V' : False}]})
        res = [area[0] for area in self.mc.qm.db.executeSelect(f"SELECT area_name FROM area WHERE opsv = True")]
        exp = ['G074', 'G080']
        self.assertEqual(res, exp, "setOpsvAreas does not work")
    
    def test_setOpsvAreas_edgeCase_noAreas(self):
        self.mc.setOpsvAreas({'Areas':[{'ID' : 12907, 'Area Name' : 'G074', 'OPS V' : False}]})
        res = self.mc.qm.db.executeSelect(f"SELECT area_name FROM area WHERE opsv = True")
        exp = []
        self.assertEqual(res, exp, "setOpsvAreas does not work - dies when no areas are passed in")
    
    def test_updateUsers_baseCase(self):
        self.mc.qm.db.executeInsert(f"INSERT INTO users (name, is_recent) VALUES ('walrus', True)")
        
        csv_file = b'Name,test\r\nhello1,123\r\nhello2,234\r\nhello3,345\r\n'
        self.mc.updateUsers(csv_file.decode('utf-8'))
        res = [user[1] for user in self.mc.qm.db.executeSelect(f"SELECT * FROM users WHERE is_recent = True")]
        exp = ['hello1', 'hello2', 'hello3']
        self.assertNotIn('walrus', res, 'updateUsers failed - walrus has not been unrecented')
        self.assertEqual(res, exp, 'updateUsers failed - users not added correctly')

    def test_updateSensorCategory_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (2, 'SR')")
        self.mc.updateSensorCategory({'Sensors': [{'Name': 'SR','Category': 'UAV'}]})
        res = self.mc.getSensorCategory()
        exp = {'UNCATEGORISED': ['SB'], 'UAV': ['SR'], 'AB': [], 'HB': [], 'AVIS': []}
        self.assertEqual(res, exp, "updateSensorCategory does not work")
    
    def test_getXBIReport_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (1, 'SB', 1)")
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (2, 'SR', 2)")
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (3, 'SB2', 1)")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (2, 'hello.png', 2, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 0, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (2, 'hello.png', 3, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (3, 'hello.png', 4, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 11, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (3, 'hello.png', 5, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 10, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        res = self.mc.getXBIReport('2023-02-07', '2023-02-08')
        exp = ({'UNCATEGORISED': 0, 'UAV': 1, 'AB': 1, 'HB': 0, 'AVIS': 0}, {'UNCATEGORISED': [0, 0, 0, 0], 'UAV': [1, 1, 0, 0], 'AB': [0, 0, 0, 0], 'HB': [0, 0, 0, 0], 'AVIS': [0, 0, 0, 0]})
        self.assertEqual(res, exp, "getXBIReport doesnt work")

    def test_getXBIReportData_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (1, 'SB', 1)")
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (2, 'SR', 2)")
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (3, 'SB2', 1)")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (2, 'hello.png', 2, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 0, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (2, 'hello.png', 3, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (3, 'hello.png', 4, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 11, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (3, 'hello.png', 5, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 10, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        res = self.mc.getXBIReportData({
            'Start Date': '2023-02-07T16:00:00.000Z',
            'End Date': '2023-02-07T16:00:00.000Z'
        })
        exp = {'Category': ['UAV', 'AB', 'HB', 'AVIS'], 'Exploitable': [1, 1, 0, 0], 'Unexploitable': [2, 0, 0, 0], 'Remarks': 'UAV\nImg Error - 1\nFailed - 1\n'}
        self.assertEqual(res, exp, "getXBIReportData doesnt work")
    
    def test_getXBIReportDataForExcel(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (1, 'SB', 1)")
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (2, 'SR', 2)")
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (3, 'SB2', 1)")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (2, 'hello.png', 2, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 0, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (2, 'hello.png', 3, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (3, 'hello.png', 4, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 11, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (3, 'hello.png', 5, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 10, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        res = self.mc.getXBIReportDataForExcel({
            'Start Date': '2023-02-07T16:00:00.000Z',
            'End Date': '2023-02-07T16:00:00.000Z'
        })
        res = self.mc.getXBIReportDataForExcel({
            'Start Date': '2023-02-07T16:00:00.000Z',
            'End Date': '2023-02-07T16:00:00.000Z'
        })
    
    def test_deleteImage_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (1, 'hello.png', '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[0][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_51')")
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[0][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id))
        image_area_id = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[0][0]
        
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id, ))
        task_id = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_52')")
        area_id2 = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[1][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id, area_id2))
        image_area_id2 = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[1][0]
        
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id2, ))
        task_id2 = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[1][0]
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) VALUES (1, 'hello.png', '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005')")
        image_id2 = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[1][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_53')")
        area_id3 = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[2][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id2, area_id3))
        image_area_id3 = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[2][0]
        
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (1, 3, %s)", (image_area_id3, ))
        task_id3 = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[2][0]
        
        self.mc.deleteImage({
            'SCVU Image ID': image_id
        })
        
        res_task = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")
        exp = task_id3
        self.assertEqual(res_task[0][0], exp, "deleteImage failed - tasks not properly deleted")
        exp_len = 1
        self.assertEqual(len(res_task), exp_len, "deleteImage failed - tasks not properly deleted")
        
        res_image_area = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")
        exp = image_area_id3
        self.assertEqual(res_image_area[0][0], exp, "deleteImage failed - image_areas not properly deleted")
        exp_len = 1
        self.assertEqual(len(res_image_area), exp_len, "deleteImage failed - image_areas not properly deleted")
        
        res_image = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")
        exp = image_id2
        self.assertEqual(res_image[0][0], exp, "deleteImage failed - image not properly deleted")
        exp_len = 1
        self.assertEqual(len(res_image), exp_len, "deleteImage failed - image not properly deleted")
        
    def startUnitTest(self):
        unittest.main()