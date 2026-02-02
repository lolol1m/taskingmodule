class LookupService:
    def __init__(self, query_manager):
        self.qm = query_manager

    def get_priority(self):
        output = {}
        output["Priority"] = [i[0] for i in self.qm.getPriority()]
        return output
        
    def get_cloud_cover(self):
        output = {}
        output["Cloud Cover"] = [i[0] for i in self.qm.getCloudCover()]
        return output

    def get_image_category(self):
        output = {}
        output["Image Category"] = [i[0] for i in self.qm.getImageCategory()]
        return output

    def get_report(self):
        output = {}
        output["Report"] = [i[0] for i in self.qm.getReport()]
        return output

    def get_sensor_category(self):
        output = {}

        categories = self.qm.getCategories()
        for cat in categories:
            output[cat[0]] = []
        
        sensors = self.qm.getSensors()
        for sensor in sensors:
            output[sensor[1]].append(sensor[0])

        return output
    
    def update_sensor_category(self, payload):
        query_inputs = []
        for sensor in payload["Sensors"]:
            query_inputs.append((sensor["Category"], sensor["Name"]))
        self.qm.updateSensorCategory(query_inputs)

    def get_areas(self):
        data = self.qm.getAreas()
        output = {}
        output["Areas"] = []
        for area in data:
            areaDict = {
                'ID' : area[0],
                'Area Name' : area[1],
                'OPS V' : area[2],
            }

            output["Areas"].append(areaDict)
        return output

    def set_opsv_areas(self, payload):
        self.qm.setOpsvFalse()

        opsvAreas = []
        for area in payload["Areas"]:
            if area['OPS V'] == True:
                opsvAreas.append((area['Area Name'],))
        
        self.qm.setOpsvAreas(opsvAreas)
