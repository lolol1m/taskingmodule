from main_classes import MainController

class FrontendController():
    '''
    FrontendController handles the incoming request and reformats the objects to json
    '''
    def __init__(self):
        self.mc = MainController()
    
    def getAssignees(self, json):
        assignees = self.mc.getAssignees()
        output = [assignee.getUserId() for assignee in assignees]
        output_json = {}
        output_json["assignees"] = output
        return output_json