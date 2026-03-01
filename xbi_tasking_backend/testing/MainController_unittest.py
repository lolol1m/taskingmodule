import unittest
import datetime

from formatters.tasking_formatter import format_tasking_summary_area, format_tasking_summary_image

from config import get_config, load_config
from main_classes.MainController import MainController
from testing.test_helpers import KeycloakTestAdapter

class MainController_unittest(unittest.TestCase):
    @classmethod
    def setUpClass(self):
        config = load_config("testing.config")
        self.mc = MainController(config=config)
        if get_config().getDatabaseName() != "XBI_TASKING_3_TEST":
            print("PLS CHECK YOUR config file")
            exit()
        else:
            self.tearDownClass()

    @classmethod
    def tearDownClass(self):
        self.mc.qm.db.deleteAll()

    def setUp(self):
        self.mc.qm.db.deleteAll()
        self.mc.qm.db.seed_test_data()
        self.maxDiff = None
        self.kc_adapter = KeycloakTestAdapter()
        self.kc_adapter.patch_db(self.mc.qm.db)
        self.kc_adapter.patch_keycloak(self.mc.qm)

    def tearDown(self):
        self.mc.qm.db.deleteAll()
        self.kc_adapter.restore_db(self.mc.qm.db)
        self.kc_adapter.restore_keycloak(self.mc.qm)
    
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
        exp = (image_id, area_id)
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
        exp = 2
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
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name, is_present) VALUES (1, 'pte thanos', True)")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (2, 'pte tony')")
        res = self.mc.getUsers()
        exp = {
            'Users': [
                {'id': 'kc-pte thanos', 'name': 'pte thanos', 'role': 'II', 'is_present': True},
                {'id': 'kc-pte tony', 'name': 'pte tony', 'role': 'II', 'is_present': False},
            ]
        }
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
        task_status_id = self.mc.qm.getTaskStatusID("In Progress")
        assignee_kc_id = self.mc.qm.getKeycloakUserID("hello")
        self.mc.qm.assignTask(image_area_id, assignee_kc_id, task_status_id)
        task_id = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        res = self.mc.getTaskingSummaryData({
            'Start Date': '2023-02-07T16:00:00.000Z',
            'End Date': '2023-02-07T16:00:00.000Z'
        })
        exp = {
            image_id: {
                'Sensor Name': 'SB',
                'Image File Name': 'hello.png',
                'Image ID': 1,
                'Upload Date': '2023-02-07, 11:44:10',
                'Image Datetime': '2023-02-07, 11:44:10',
                'Report': None,
                'Priority': 'Low',
                'Image Category': None,
                'Image Quality': None,
                'Cloud Cover': None,
                'EW Status': None,
                'Target Tracing': None,
                'Area': 'area_51',
                'Task Completed': '0/1',
                'V10': False,
                'OPS V': False,
                'Remarks': '\n',
                'Child ID': [task_id],
                'Assignee': 'hello'
            },
            -task_id: {
                'Area Name': 'area_51',
                'Assignee': 'hello',
                'Task Status': 'In Progress',
                'Remarks': '',
                'SCVU Task ID': task_id,
                'Parent ID': image_id
            }
        }
        self.assertEqual(res, exp, "tasking summary get is incorrect")

    def test_getTaskingSummaryData_exact_datetime_range(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_exact') ON CONFLICT (area_name) DO NOTHING")
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area WHERE area_name='area_exact'")[0][0]
        task_status_id = self.mc.qm.getTaskStatusID("In Progress")
        assignee_kc_id = self.mc.qm.getKeycloakUserID("hello")

        self.mc.qm.db.executeInsert(
            "INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) "
            "VALUES (1, 'old.png', 101, '2023-02-07 09:15:00', '2023-02-07 09:15:00', 1)"
        )
        old_scvu_image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image WHERE image_id = 101")[0][0]
        self.mc.qm.db.executeInsert(
            "INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)",
            (old_scvu_image_id, area_id),
        )
        old_image_area_id = self.mc.qm.db.executeSelect(
            "SELECT scvu_image_area_id FROM image_area WHERE scvu_image_id = %s",
            (old_scvu_image_id,),
        )[0][0]
        self.mc.qm.assignTask(old_image_area_id, assignee_kc_id, task_status_id)

        self.mc.qm.db.executeInsert(
            "INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) "
            "VALUES (1, 'new.png', 102, '2023-02-07 15:45:00', '2023-02-07 15:45:00', 1)"
        )
        new_scvu_image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image WHERE image_id = 102")[0][0]
        self.mc.qm.db.executeInsert(
            "INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)",
            (new_scvu_image_id, area_id),
        )
        new_image_area_id = self.mc.qm.db.executeSelect(
            "SELECT scvu_image_area_id FROM image_area WHERE scvu_image_id = %s",
            (new_scvu_image_id,),
        )[0][0]
        self.mc.qm.assignTask(new_image_area_id, assignee_kc_id, task_status_id)

        res = self.mc.getTaskingSummaryData({
            'Start Date': '2023-02-07T15:00:00',
            'End Date': '2023-02-07T16:00:00',
            'Use Exact Time': True,
        })
        self.assertIn(new_scvu_image_id, res, "exact datetime filter should include image inside window")
        self.assertNotIn(old_scvu_image_id, res, "exact datetime filter should exclude image outside window")

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
        task_status_id = self.mc.qm.getTaskStatusID("In Progress")
        self.mc.qm.assignTask(image_area_id, "kc-hello", task_status_id)
        task_id = self.mc.qm.db.executeSelect("SELECT scvu_task_id FROM task")[0][0]
        
        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, priority_id) VALUES (1, 'hello.png', 2, '2023-02-08 11:44:10.973005', '2023-02-07 11:44:10.973005', 1)")
        image_id2 = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image")[1][0]
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_52')")
        area_id2 = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[1][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id2, area_id2))
        image_area_id2 = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[1][0] 
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (null, 2, %s)", (image_area_id2, ))
        
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_53')")
        area_id3 = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area")[2][0]
        self.mc.qm.db.executeInsert(f"INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)", (image_id2, area_id3))
        image_area_id3 = self.mc.qm.db.executeSelect("SELECT scvu_image_area_id FROM image_area")[2][0] 
        self.mc.qm.db.executeInsert(f"INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id) VALUES (null, 1, %s)", (image_area_id3, ))
        
        res = self.mc.getTaskingManagerData({
            'Start Date': '2023-02-07T16:00:00.000Z',
            'End Date': '2023-02-08T16:00:00.000Z'
        })
        
        self.assertIn(image_id2, res, 'getTaskingManagerData failed - image2 is missing')
        self.assertIn(-image_area_id2, res, 'getTaskingManagerData failed - imagearea2 is missing')
        self.assertIn(-image_area_id3, res, 'getTaskingManagerData failed - imagearea3 is missing')
        self.assertEqual(False, res[image_id2]['TTG'], 'getTaskingManagerData failed - ttg is wrong for image 2')
        
        exp_len = 3
        self.assertEqual(len(res), exp_len, 'getTaskingManagerData failed - output has excess items')
        
    
    def test_formatTaskingSummaryImage_baseCase(self):
        res = format_tasking_summary_image(
            (12876, 'SB', 'hello.png', 1, datetime.datetime(2023, 2, 7, 11, 44, 10, 973005), datetime.time(11, 44, 10, 973005), 'DS(OF)', 'Low', 'Detection', 'really bad', 'UTC', 'ttg done', False),
            [(1,"area1", "Incomplete","remark 1", "user 1", False, False)]
        )
        exp = {'Sensor Name': 'SB', 'Image File Name': 'hello.png', 'Image ID': 1, 'Upload Date': '2023-02-07, 11:44:10', 'Image Datetime': '1900-01-01, 11:44:10', 'Report': 'DS(OF)', 'Priority': 'Low', 'Image Category': 'Detection', 'Image Quality': 'really bad', 'Cloud Cover': 'UTC', 'EW Status': 'ttg done', 'Target Tracing': False, 'Area': 'area1', 'Task Completed': '0/1', 'V10': False, 'OPS V': False, 'Remarks': 'remark 1\n', 'Child ID': [1], 'Assignee': 'user 1'}
        self.assertEqual(res, exp, "format tasking summary image is incorrect")

    def test_formatTaskingSummaryArea_baseCase(self):
        res = format_tasking_summary_area((1,"area1", "Incomplete","remark 1", "user 1"),2)
        exp = {'Area Name': 'area1', 'Assignee': 'user 1', 'Task Status': 'Incomplete', 'Remarks': 'remark 1', 'SCVU Task ID': 1, 'Parent ID': 2}
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
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert(
            "INSERT INTO image(scvu_image_id, image_id, image_file_name, sensor_id, upload_date, image_datetime, completed_date, "
            "priority_id, report_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, target_tracing, vetter_keycloak_id) "
            "VALUES (26, 1, 'test.png', 1, %s, %s, %s, 1, 1, 1, 'quality here', 1, 1, False, 'kc-hello')",
            (time, time, time),
        )
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
        exp = type(datetime.datetime.now())
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
        exp = type(datetime.datetime.now())
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

        self.mc.qm.db.executeInsert("INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date, vetter_keycloak_id) VALUES (1, 'hello.png', 1, '2023-02-07 11:44:10.973005', '2023-02-07 11:44:10.973005', 1, 1, 1, 'really bad', 1, 1, '2023-02-07 11:44:10.973005', 'kc-hello')")
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
        exp = {
            image_id: {
                'Sensor Name': 'SB',
                'Image File Name': 'hello.png',
                'Image ID': 1,
                'Upload Date': '2023-02-07, 11:44:10',
                'Image Datetime': '2023-02-07, 11:44:10',
                'Area': 'area_51',
                'Assignee': 'hello',
                'Report': 'DS(OF)',
                'Priority': 'Low',
                'Image Category': 'Detection',
                'Image Quality': 'really bad',
                'Cloud Cover': 'UTC',
                'EW Status': 'ttg done',
                'Vetter': 'hello',
                'Child ID': [task_id],
                'Remarks': 'HELLO I AM REMARK\n'
            },
            -task_id: {
                'Area Name': 'area_51',
                'Remarks': 'HELLO I AM REMARK',
                'Assignee': 'hello',
                'Parent ID': image_id
            }
        }
        self.assertEqual(res, exp, "getcompleteimagedata does not work")

    def test_getCompleteImageData_exact_datetime_range(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name) VALUES (1, 'SB')")
        self.mc.qm.db.executeInsert("INSERT INTO users(id, name) VALUES (1, 'hello')")
        self.mc.qm.db.executeInsert("INSERT INTO area(area_name) VALUES ('area_complete_exact') ON CONFLICT (area_name) DO NOTHING")
        area_id = self.mc.qm.db.executeSelect("SELECT scvu_area_id FROM area WHERE area_name='area_complete_exact'")[0][0]

        self.mc.qm.db.executeInsert(
            "INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date, vetter_keycloak_id) "
            "VALUES (1, 'complete_old.png', 201, '2023-02-07 09:15:00', '2023-02-07 09:15:00', 1, 1, 1, 'good', 1, 1, '2023-02-07 09:30:00', 'kc-hello')"
        )
        old_scvu_image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image WHERE image_id = 201")[0][0]
        self.mc.qm.db.executeInsert(
            "INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)",
            (old_scvu_image_id, area_id),
        )
        old_image_area_id = self.mc.qm.db.executeSelect(
            "SELECT scvu_image_area_id FROM image_area WHERE scvu_image_id = %s",
            (old_scvu_image_id,),
        )[0][0]
        self.mc.qm.db.executeInsert(
            "INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id, remarks) VALUES (1, 3, %s, 'old remark')",
            (old_image_area_id,),
        )

        self.mc.qm.db.executeInsert(
            "INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date, vetter_keycloak_id) "
            "VALUES (1, 'complete_new.png', 202, '2023-02-07 15:45:00', '2023-02-07 15:45:00', 1, 1, 1, 'good', 1, 1, '2023-02-07 15:50:00', 'kc-hello')"
        )
        new_scvu_image_id = self.mc.qm.db.executeSelect("SELECT scvu_image_id FROM image WHERE image_id = 202")[0][0]
        self.mc.qm.db.executeInsert(
            "INSERT INTO image_area(scvu_image_id, scvu_area_id) VALUES (%s, %s)",
            (new_scvu_image_id, area_id),
        )
        new_image_area_id = self.mc.qm.db.executeSelect(
            "SELECT scvu_image_area_id FROM image_area WHERE scvu_image_id = %s",
            (new_scvu_image_id,),
        )[0][0]
        self.mc.qm.db.executeInsert(
            "INSERT INTO task(assignee_id, task_status_id, scvu_image_area_id, remarks) VALUES (1, 3, %s, 'new remark')",
            (new_image_area_id,),
        )

        res = self.mc.getCompleteImageData({
            'Start Date': '2023-02-07T15:00:00',
            'End Date': '2023-02-07T16:00:00',
            'Use Exact Time': True,
        })
        self.assertIn(new_scvu_image_id, res, "exact datetime filter should include completed image in window")
        self.assertNotIn(old_scvu_image_id, res, "exact datetime filter should exclude completed image outside window")

    def test_getSensorCategory_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor_category(id, name) VALUES (1, 'UNCATEGORISED') ON CONFLICT DO NOTHING")
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (1, 'SB', 1)")
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
    
    @unittest.skip("Legacy users table removed; updateUsers unit test not applicable.")
    def test_updateUsers_baseCase(self):
        pass

    def test_updateSensorCategory_baseCase(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor_category(id, name) VALUES (1, 'UNCATEGORISED') ON CONFLICT DO NOTHING")
        self.mc.qm.db.executeInsert("INSERT INTO sensor_category(id, name) VALUES (2, 'UAV') ON CONFLICT DO NOTHING")
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (1, 'SB', 1)")
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (2, 'SR', 1)")
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
        exp = ({'UNCATEGORISED': 1, 'UAV': 1, 'AB': 0, 'HB': 0, 'AVIS': 0}, {'UNCATEGORISED': [1, 1, 0, 0], 'UAV': [0, 0, 0, 0], 'AB': [0, 0, 0, 0], 'HB': [0, 0, 0, 0], 'AVIS': [0, 0, 0, 0]})
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
        exp = {'Category': ['UAV', 'AB', 'HB', 'AVIS'], 'Exploitable': [1, 0, 0, 0], 'Unexploitable': [0, 0, 0, 0], 'Remarks': ''}
        self.assertEqual(res, exp, "getXBIReportData doesnt work")

    def test_getXBIReportData_exact_datetime_range(self):
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (1, 'SB', 1)")
        self.mc.qm.db.executeInsert("INSERT INTO sensor(id, name, category_id) VALUES (2, 'SR', 2)")

        self.mc.qm.db.executeInsert(
            "INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) "
            "VALUES (1, 'rep_old.png', 301, '2023-02-07 09:15:00', '2023-02-07 09:15:00', 1, 1, 1, 'good', 1, 1, '2023-02-07 09:30:00')"
        )
        self.mc.qm.db.executeInsert(
            "INSERT INTO image(sensor_id, image_file_name, image_id, upload_date, image_datetime, report_id, priority_id, image_category_id, image_quality, cloud_cover_id, ew_status_id, completed_date) "
            "VALUES (2, 'rep_new.png', 302, '2023-02-07 15:45:00', '2023-02-07 15:45:00', 1, 1, 1, 'good', 1, 1, '2023-02-07 15:50:00')"
        )

        res = self.mc.getXBIReportData({
            'Start Date': '2023-02-07T15:00:00',
            'End Date': '2023-02-07T16:00:00',
            'Use Exact Time': True,
        })
        self.assertEqual(sum(res["Exploitable"]), 1, "exact datetime filter should only count one in-window image")
    
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