import datetime
from datetime import timedelta
import dateutil.parser
import hashlib
from io import StringIO
import csv
from main_classes import QueryManager, ExcelGenerator
from GlobalUtils import datetime_format

class MainController():
    '''
    MainController contains all the functions for the UI to call, the main logic will be in this class.
    '''
    def __init__(self):
        self.qm = QueryManager()
        self.eg = ExcelGenerator()
    
    def accountLogin(self, json):
        '''
        Function:   validates password and returns account type
        Input:      json containing password string
        Output:     string of account type (II, Senior II, IA) or empty string if password is invalid
        '''
        hashed_password = hashlib.sha256(json['Password'].encode()).hexdigest()
        print("Password:", (hashed_password))
        return self.qm.accountLogin(hashed_password)
    
    def insertDSTAData(self, json, auto_assign = True):
        '''
        Function:   Imports images & their associated areas from DSTA json file, inserts into db (sensor, image, area, image_area) if not already existing
        Input:      json containing images in dsta format
        Output:     Dictionary with success message and count of images inserted
        '''

        #lets try only assigning areas
        image_count = 0
        area_count = 0
        errors = []
        try:
            for image in json['images']:
                try:
                    self.qm.insertSensor(image['sensorName'])
                    # insertImage ensures that image_id is unique
                    self.qm.insertImage(
                        image['imgId'],
                        image['imageFileName'],
                        image['sensorName'],
                        dateutil.parser.isoparse(image['uploadDate']),
                        dateutil.parser.isoparse(image['imageDateTime'])
                    )
                    image_count += 1
                    for area in image['areas']:
                        try:
                            self.qm.insertArea(area['areaName'])
                            self.qm.insertImageAreaDSTA(
                                image['imgId'],
                                area['areaName']
                            )
                            area_count += 1

                            # auto assigns tasks upon upload
                            if auto_assign:
                                self.qm.autoAssign(area['areaName'], image['imgId'])
                                
                        except Exception as e:
                            error_msg = f"Error inserting area {area.get('areaName', 'unknown')} for image {image['imgId']}: {str(e)}"
                            errors.append(error_msg)
                except Exception as e:
                    error_msg = f"Error inserting image {image.get('imgId', 'unknown')}: {str(e)}"
                    errors.append(error_msg)
                    print(error_msg)
            
            result = {
                "success": True,
                "message": f"Successfully inserted {image_count} images and {area_count} areas",
                "images_inserted": image_count,
                "areas_inserted": area_count
            }
            if errors:
                result["errors"] = errors
                result["message"] += f" (with {len(errors)} errors)"
            return result
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "images_inserted": image_count,
                "areas_inserted": area_count
            }
                
    def insertTTGData(self, json):
        '''
        Function:   Inserts TTG image and its areas into db
        Input:      json containing ttg image from ui
        Output:     NIL
        '''
        self.qm.insertSensor(json['sensorName'])
        scvu_image_id = self.qm.insertTTGImageReturnsId(
            json['imageFileName'],
            json['sensorName'],
            dateutil.parser.isoparse(json['uploadDate']),
            dateutil.parser.isoparse(json['imageDateTime'])
        )
        for area_name in json['areas']:
            self.qm.insertArea(area_name)
            self.qm.insertImageAreaTTG(scvu_image_id, area_name)
    
    def getPriority(self):
        '''
        Function:   Gets list of priority for drop down
        Input:      None
        Output:     list of all the priorities
        '''
        output = {}
        output["Priority"] = [i[0] for i in self.qm.getPriority()]
        return output
        
    def getCloudCover(self):
        '''
        Function:   Gets list of cloud cover for drop down
        Input:      None
        Output:     list of all the cloud cover
        '''
        output = {}
        output["Cloud Cover"] = [i[0] for i in self.qm.getCloudCover()]
        return output

    def getImageCategory(self):
        '''
        Function:   Gets list of image category for drop down
        Input:      None
        Output:     list of all the image category
        '''
        output = {}
        output["Image Category"] = [i[0] for i in self.qm.getImageCategory()]
        return output

    def getReport(self):
        '''
        Function:   Gets list of report for drop down
        Input:      None
        Output:     list of all the report
        '''
        output = {}
        output["Report"] = [i[0] for i in self.qm.getReport()]
        return output  
        
    def getUsers(self):
        '''
        Function:   Gets list of users for drop down
        Input:      None
        Output:     list of all the users
        '''
        output = {}
        output["Users"] = [i[0] for i in self.qm.getUsers()]
        return output 

    def getTaskingSummaryData(self, json):
        '''
        Function:   Get Data for Tasking Summary page
        Input:      None
        Output:     json in the format that UI wants
        '''
        output = {}
        image_datas = self.qm.getTaskingSummaryImageData(
            dateutil.parser.isoparse(json['Start Date']).strftime(f"%Y-%m-%d"), 
            (dateutil.parser.isoparse(json['End Date']) + timedelta(days=1)).strftime(f"%Y-%m-%d")
        )
        for image_data in image_datas:
            image_id = image_data[0]
            area_datas = self.qm.getTaskingSummaryAreaData(image_id)
            output[image_id] = self.formatTaskingSummaryImage(image_data, area_datas)
            for area_data in area_datas:
                task_id = area_data[0]
                # Use a negative key for tasks to avoid conflicts with image IDs
                # Frontend will still work because it uses Parent ID to identify child rows
                output[-task_id] = self.formatTaskingSummaryArea(area_data, image_id)
        return output

    def formatTaskingSummaryImage(self, image, areas):
        '''
        Function:   Formats the tasking summary image json
        Input:      image is id, sensor_name, image_file_name, image_id, 
                    upload_date, image_datetime, report, priority, 
                    image_category, quality, cloud_cover, ew_status, target_tracing
        Input:      areas is nested list with id, area_name, task_status, task_remarks, username
        Output:     json in the format that UI wants
        '''
        if not areas or len(areas) == 0:
            # Return empty/default values if no areas found
            return {
                "Sensor Name": image[1],
                "Image File Name": image[2],
                "Image ID": image[3],
                "Upload Date": image[4].strftime(datetime_format),
                "Image Datetime": image[5].strftime(datetime_format),
                "Report": image[6],
                "Priority": image[7],
                "Image Category": image[8],
                "Image Quality": image[9],
                "Cloud Cover": image[10],
                "EW Status": image[11],
                "Target Tracing": image[12],
                "Area": "No areas",
                "Task Completed": "0/0",
                "V10": False,
                "OPS V": False,
                "Remarks": "",
                "Child ID": [],
                "Assignee": "Unassigned"
            }
        
        count = 0
        remarks = ""
        child_id = []
        assignee = areas[0][4] if len(areas[0]) > 4 else "Unassigned"
        V10 = False
        OPSV = False
        for area in areas:
            child_id.append(area[0])
            remarks += (area[3] if area[3] else "") + "\n"
            if area[2] == "Completed":
                count += 1
            if assignee != area[4]:
                assignee = "multiple"
            V10 = V10 or (area[5] if len(area) > 5 else False)
            OPSV = OPSV or (area[6] if len(area) > 6 else False)

        output = {
            "Sensor Name": image[1],
            "Image File Name": image[2],
            "Image ID": image[3],
            "Upload Date": image[4].strftime(datetime_format),
            "Image Datetime": image[5].strftime(datetime_format),
            "Report": image[6],
            "Priority": image[7],
            "Image Category": image[8],
            "Image Quality": image[9],
            "Cloud Cover": image[10],
            "EW Status": image[11],
            "Target Tracing": image[12],
            "Area": areas[0][1] if len(areas[0]) > 1 else "Unknown",
            "Task Completed": str(count) + "/" + str(len(areas)),
            "V10": V10,
            "OPS V": OPSV,
            "Remarks": remarks,
            "Child ID": child_id,
            "Assignee": assignee
        }

        return output

    def formatTaskingSummaryArea(self, area, parent_id):
        '''
        Function:   Formats the tasking summary area json
        Input:      area is id, area_name, task_status, task_remarks, username
        Output:     json in the format that UI wants
        '''
        output = {
            "Area Name": area[1],
            "Assignee": area[4],
            "Task Status": area[2],
            "Remarks": area[3],
            "SCVU Task ID": area[0],  # Include the actual task ID for frontend use
            "Parent ID": parent_id
        }
        return output

    def getTaskingManagerData(self, json):
        '''
        Function:   Gets all incomplete images from database and outputs the required data from them and their associated areas
        Input:      NIL
        Output:     dictionary with image/area id as the keys and the required data as the values
        '''
        output = {}
        images = self.qm.getIncompleteImages(
            dateutil.parser.isoparse(json['Start Date']).strftime(f"%Y-%m-%d"), 
            (dateutil.parser.isoparse(json['End Date']) + timedelta(days=1)).strftime(f"%Y-%m-%d")
        )
        for image in images:
            areas = self.qm.getTaskingManagerDataForImage(image[0])
            image_areas = self.qm.getTaskingManagerDataForTask(image[0])
            output[image[0]] = self.formatTaskingManagerImage(image, image_areas)

            for area in areas:
                # Use negative area ID to avoid conflicts with image IDs
                output[-area[0]] = self.formatTaskingManagerArea(image, area, image_areas)
                
            
        return output
    
    def formatTaskingManagerImage(self, image_data, image_areas_data):
        '''
        Function:   Formats image data from query into the required form for images for getTaskingManagerData
        Input:      image_data from qm
        Output:     dictionary in the required form
        '''
        assignee = None
        if len(image_areas_data) != 0:
            assignee = image_areas_data[0][1]
        for area in image_areas_data:
            if assignee != area[1]:
                assignee = "multiple"
        data = {
            'Sensor Name': image_data[1],
            'Image File Name': image_data[2],
            'Image ID': image_data[3],
            'Upload Date': image_data[4].strftime(datetime_format),
            'Image Datetime': image_data[5].strftime(datetime_format),
            'Priority': image_data[6],
            'TTG': image_data[3] == None,
            'Assignee': assignee
        }
        return data
    
    def formatTaskingManagerArea(self, image_data, area_data, image_areas_data):
        '''
        Function:   Formats area and image data from query into the required form for areas for getTaskingManagerData
        Input:      image_data, area_data from qm
        Output:     dictionary in the required form
        '''
        assignee = None
        remarks = None
        for image_area in image_areas_data:
            if area_data[0] == image_area[0]:
                assignee = image_area[1]
                remarks = image_area[2]
        data = {
            'Area Name': area_data[1],
            'Parent ID': image_data[0],
            'SCVU Image Area ID': area_data[0],  # Include the actual scvu_image_area_id for frontend use
            'Assignee': assignee,
            'Remarks': remarks
        }
        return data
    
    def updateTaskingManagerData(self, json):
        '''
        Function:   updates priority of image 
        Input:      json is a dictionary with the required data
        Output:     NIL
        '''
        for image in json:
            if 'Priority' not in json[image]:
                continue      
            self.qm.updateTaskingManagerData(image, json[image]['Priority'])
        
        
    def assignTask(self, json):
        '''
        Function:   Creates and inserts a task into the database as well as initialise that task with the assignee 
        Input:      json is a dictionary with the required data
        Output:     NIL
        '''
        for task in json["Tasks"]:
            if task["Assignee"] == None:
                continue
            assignee_result = self.qm.getAssigneeID(task["Assignee"])
            if assignee_result is None or len(assignee_result) == 0:
                # Skip if assignee not found (shouldn't happen with proper mapping, but handle gracefully)
                print(f"Warning: Assignee '{task['Assignee']}' not found in users table")
                continue
            assignee_id = assignee_result[0][0]
            task_status_id = self.qm.getTaskStatusID('Incomplete')
            self.qm.assignTask(task['SCVU Image Area ID'], assignee_id, task_status_id)
        
    def startTasks(self, json):
        '''
        Function:   Updates task statuses to In Progress if it is currently Incomplete
        Input:      json containing the task ids to be updated
        Output:     NIL
        '''
        for task_id in json["SCVU Task ID"]:
            self.qm.startTask(task_id)
    
    def completeTasks(self, json):
        '''
        Function:   Updates task statuses to Verifying if it is currently In Progress
        Input:      json containing the task ids to be updated
        Output:     NIL
        '''
        for task_id in json["SCVU Task ID"]:
            self.qm.completeTask(task_id)
    
    def verifyPass(self, json):
        '''
        Function:   Updates task status to Complete if it is currently Verifying
        Input:      json containing the task id to be updated
        Output:     NIL
        '''
        for task_id in json["SCVU Task ID"]:
            self.qm.verifyPass(task_id)
    
    def verifyFail(self, json):
        '''
        Function:   Updates task status to In Progress if it is currently Verifying
        Input:      json containing the task id to be updated
        Output:     NIL
        '''
        for task_id in json["SCVU Task ID"]:
            self.qm.verifyFail(task_id)

    def completeImages(self, json):
        '''
        Function:   Runs completeImage for all the images in the list
        Input:      json is a dictionary with the required data
        Output:     Dictionary with results for each image
        '''
        current_datetime = datetime.datetime.today()
        results = {}
        for i in range(len(json["SCVU Image ID"])):
            image_id = json["SCVU Image ID"][i]
            result = self.completeImage(image_id, json["Vetter"], current_datetime)
            results[image_id] = result
        return results
    
    def completeImage(self, scvu_image_id, vetter, current_datetime):
        '''
        Function:   Sets the completed date of an image to the current date if all tasks associated with the image are complete
        Input:      json is a dictionary with the required data
        Output:     NIL
        '''
        tasks = self.qm.getAllTaskStatusForImage(scvu_image_id)
        completed_task_id = self.qm.getTaskStatusID("Completed")
        incomplete_tasks = []
        for task in tasks:
            if task[1] != completed_task_id:
                incomplete_tasks.append(task[0])
        if incomplete_tasks:
            # Return error message instead of empty dict
            return {"error": f"Cannot complete image {scvu_image_id}: Tasks {incomplete_tasks} are not completed"}
        self.qm.completeImage(scvu_image_id, vetter, current_datetime)
        return {"success": True}
    
    def uncompleteImages(self, json):
        '''
        Function:   Sets the completed date of an image to None
        Input:      json is a dictionary with the required data
        Output:     NIL
        '''
        for image_id in json["SCVU Image ID"]:
            self.qm.uncompleteImage(image_id)
    
    def updateTaskingSummaryData(self, json):
        '''
        Function:   Updates the report, image category, image quality, cloud cover & target tracing of image
        Input:      json is a dictionary with the required data
        Output:     NIL
        '''
        for thing in json:
            if 'Report' in json[thing]:
            
                self.qm.updateTaskingSummaryImage(
                    thing, 
                    json[thing]['Report'], 
                    json[thing]['Image Category'], 
                    json[thing]['Image Quality'], 
                    json[thing]['Cloud Cover'], 
                    json[thing]['Target Tracing']
                )
            if 'Remarks' in json[thing]:

                self.qm.updateTaskingSummaryTask(
                    thing,
                    json[thing]['Remarks']
                )
    def formatCompleteImageArea(self, area_data, image_id):
        '''
        Function:   Formats area for complete area
        Input:      dictionaries contain area data and image id
        Output:     formatted dictionary
        '''
        output = {
            "Area Name" : area_data[1],
            "Remarks" : area_data[2],
            "Assignee" : area_data[3],
            "Parent ID" : image_id,
        }

        return output
        
    def formatCompleteImageImage(self, image_data, area_data):
        '''
        Function:   Formats image for complete image 
        Input:      dictionaries containing image data and area data
        Output:     formatted dictionary 
        '''
        childList = []
        output = {}
        remarks = ''
        output = {
            'Sensor Name' : image_data[1],
            'Image File Name' : image_data[2],
            'Image ID' : image_data[3],
            'Upload Date' : image_data[4].strftime(datetime_format),
            'Image Datetime' : image_data[5].strftime(datetime_format),
            'Area' : area_data[0][1] if area_data and len(area_data) > 0 else '',
            'Assignee' : area_data[0][3] if area_data and len(area_data) > 0 else 'Unassigned',
            'Report' : image_data[6],  # report_name (COALESCE)
            'Priority' : image_data[7],  # priority_name (COALESCE)
            'Image Category' : image_data[8],  # image_category_name (COALESCE)
            'Image Quality' : image_data[9],
            'Cloud Cover' : image_data[10],  # cloud_cover_name (COALESCE)
            'EW Status' : image_data[11],
            'Vetter': image_data[12]
        }
        for area in area_data:
            childList.append(area[0])
            remarks += area[2] + "\n"
        output['Child ID'] = childList
        output['Remarks'] = remarks

        return output

    def getCompleteImageData(self, json):
        '''
        Function:   Gets the image and associated area data for completed images
        Input:      json (start date, end date)
        Output:     json containing completed image data
        '''

        imageData = self.qm.getImageData(
            dateutil.parser.isoparse(json['Start Date']).strftime(f"%Y-%m-%d"), 
            (dateutil.parser.isoparse(json['End Date']) + timedelta(days=1)).strftime(f"%Y-%m-%d")
        )
        output = {}
        
        for image in imageData:
            image_id = image[0]
            
            areaData = self.qm.getImageAreaData(image_id)
            output[image_id] = self.formatCompleteImageImage(image, areaData)
            for area in areaData:
                # Use negative task ID to avoid conflicts with image IDs
                output[-area[0]] = self.formatCompleteImageArea(area, image_id)
        return output               

    def getSensorCategory(self):
        '''
        Function:   Gets the category and associated sensors
        Input:      none
        Output:     json with categorys and the sensors
        '''
        output = {}

        categories = self.qm.getCategories()
        for cat in categories:
            output[cat[0]] = []
        
        sensors = self.qm.getSensors()
        for sensor in sensors:
            output[sensor[1]].append(sensor[0])

        return output
    
    def updateSensorCategory(self, json):
        '''
        Function:   updates the category of the sensors
        Input:      json with the required data (sensors)
        Output:     json with categorys and the sensors
        '''
        query_inputs = []
        for sensor in json["Sensors"]:
            query_inputs.append((sensor["Category"], sensor["Name"]))
        self.qm.updateSensorCategory(query_inputs)

    def getAreas(self):
        '''
        Function:   Gets all the areas 
        Input:      NIL
        Output:     list of areas
        '''
        data = self.qm.getAreas()
        output = {}
        output["Areas"] = []
        for area in data:
            # area[0] = scvu_area_id, area[1] = area_name, area[2] = opsv
            areaDict = {
                'ID' : area[0],
                'Area Name' : area[1],
                'OPS V' : area[2],
            }

            output["Areas"].append(areaDict)
        return output

    def setOpsvAreas(self, json):
        '''
        Function:   Set all the opsv of the areas to their correct state
        Input:      json containing areas
        Output:     NIL
        '''
        # reset all opsv to false
        self.qm.setOpsvFalse()

        # Get all the areas which are Opsv
        opsvAreas = []
        for area in json["Areas"]:
            if area['OPS V'] == True:
                opsvAreas.append((area['Area Name'],))
        
        self.qm.setOpsvAreas(opsvAreas)
    
    def updateUsers(self, userCSV):
        '''
        Function:   Updates users in db based on parade state csv
        Input:      csv file with users
        Output:     NIL
        '''
        # Extract names from parade state csv
        userList = []
        file = StringIO(userCSV)
        reader = csv.DictReader(file)
        for row in reader:
            userList.append((row['Name'], ))
        
        userList = tuple(userList)
        # userList = (('hello',),  ('hello hello',), ('pair of hello hello',), ('walrus',))
        # Reset isRecent flag
        self.qm.resetRecentUsers()

        # Add in unique users
        self.qm.addUsers(userList)

        # Update existing users
        self.qm.updateExistingUsers(userList)

    def getXBIReport(self, start_date, end_date):
        '''
        Function:   gets all the required fields for the XBI report inclusive of both dates
        Input:      start_date is a string in the "%Y-%m-%d" format
        Input:      end_date is a string in the "%Y-%m-%d" format
        Output:     NIL
        '''
        image_datas = self.qm.getXBIReportImage(
            dateutil.parser.isoparse(start_date).strftime(f"%Y-%m-%d"), 
            (dateutil.parser.isoparse(end_date) + timedelta(days=1)).strftime(f"%Y-%m-%d")
        )
        exploitable_images = {}
        unexploitable_images = {}
        for cat in self.qm.getCategories():
            exploitable_images[cat[0]] = 0

            # img error, failed, 100C, TOS
            unexploitable_images[cat[0]] = [0,0,0,0]

        for image in image_datas:
            if image[2] == None:
                continue
            elif image[2] == "Img Error":
                unexploitable_images[image[1]][0] += 1
            elif image[2] == "Failed":
                unexploitable_images[image[1]][1] += 1
            elif image[2] == "I-IIRS 0":
                unexploitable_images[image[1]][2] += 1
            elif image[2] == "TOS":
                unexploitable_images[image[1]][3] += 1
            else:
                exploitable_images[image[1]] += 1
        return exploitable_images, unexploitable_images

    def getXBIReportData(self, json):
        '''
        Function:   gets XBI Report Data for the UI
        Input:      json is the required data
        Output:     outputs a json with all the cats and counts
        '''
        exploitable, unexploitable = self.getXBIReport(json['Start Date'], json['End Date'])
        del exploitable["UNCATEGORISED"]
        del unexploitable["UNCATEGORISED"]
        output = {}
        output["Category"] = list(exploitable.keys())
        output["Exploitable"] = []
        output["Unexploitable"] = []
        output["Remarks"] = ""
        remarks = ["Img Error", "Failed", "100C", "TOS"]
        for i in output["Category"]:
            output["Exploitable"].append(exploitable[i])
            output["Unexploitable"].append(sum(unexploitable[i]))
            if sum(unexploitable[i]) == 0:
                continue
            output["Remarks"] += i + "\n"
            for j in range(len(remarks)):
                if unexploitable[i][j] != 0:
                    output["Remarks"] += remarks[j] + " - " + str(unexploitable[i][j]) + "\n"
        return output
    
    def getXBIReportDataForExcel(self, json):
        '''
        Function:   gets XBI Report Data for the but in an excel
        Input:      json is the required data
        Output:     outputs a excel
        '''
        exploitable, unexploitable = self.getXBIReport(json['Start Date'], json['End Date'])
        del exploitable["UNCATEGORISED"]
        del unexploitable["UNCATEGORISED"]
        output = {}
        output["Tasking"] = ["Coverage", "Total"]
        remarks = ["Img Error", "Failed", "100C", "TOS"]
        remarks_temp = ""
        for i in list(exploitable.keys()):
            output["Exploitable "+i] = [exploitable[i], exploitable[i]]
        for i in list(exploitable.keys()):
            output["Unexploitable "+i] = [sum(unexploitable[i]), sum(unexploitable[i])]
            if sum(unexploitable[i]) == 0:
                continue
            remarks_temp += i + "\n"
            for j in range(len(remarks)):
                if unexploitable[i][j] != 0:
                    remarks_temp += remarks[j] + " - " + str(unexploitable[i][j]) + "\n"
        output["Remarks"] = [remarks_temp,""]
        return self.eg.create_excel(output)
        
    def deleteImage(self, json):
        '''
        Function:   deletes an image and its associated image_areas and tasks from db
        Input:      json is the required data
        Output:     NIL
        '''
        scvu_image_id = json['SCVU Image ID']
        self.qm.deleteTasksForImage(scvu_image_id)
        self.qm.deleteImageAreasForImage(scvu_image_id)
        self.qm.deleteImage(scvu_image_id)
        
         