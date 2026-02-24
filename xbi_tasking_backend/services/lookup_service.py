class LookupService:
    def __init__(self, lookup_queries):
        self.lookup = lookup_queries

    def get_priority(self):
        output = {}
        output["Priority"] = [i[0] for i in self.lookup.getPriority()]
        return output
        
    def get_cloud_cover(self):
        output = {}
        output["Cloud Cover"] = [i[0] for i in self.lookup.getCloudCover()]
        return output

    def get_image_category(self):
        output = {}
        output["Image Category"] = [i[0] for i in self.lookup.getImageCategory()]
        return output

    def get_report(self):
        output = {}
        output["Report"] = [i[0] for i in self.lookup.getReport()]
        return output

    def get_sensor_category(self):
        output = {}

        categories = self.lookup.getCategories()
        for category in categories:
            output[category[0]] = []
        
        sensors = self.lookup.getSensors()
        for sensor_name, category_name in sensors:
            output[category_name].append(sensor_name)

        return output
    
    def update_sensor_category(self, payload):
        query_inputs = []
        for sensor in payload["Sensors"]:
            query_inputs.append((sensor["Category"], sensor["Name"]))
        self.lookup.updateSensorCategory(query_inputs)

    def get_areas(self):
        data = self.lookup.getAreas()
        output = {}
        output["Areas"] = []
        for area in data:
            area_dict = {
                "ID": area[0],
                "Area Name": area[1],
                "OPS V": area[2],
            }

            output["Areas"].append(area_dict)
        return output

    def set_opsv_areas(self, payload):
        self.lookup.setOpsvFalse()

        opsv_areas = []
        for area in payload["Areas"]:
            if area["OPS V"] is True:
                opsv_areas.append((area["Area Name"],))
        
        self.lookup.setOpsvAreas(opsv_areas)
