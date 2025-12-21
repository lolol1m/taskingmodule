from main_classes import APIManager

class MainController():
    '''
    MainController contains all the functions for the UI to call, the main logic will be in this class.
    '''
    def __init__(self):
        self.API = APIManager()
    
    def getAssignees(self):
        '''
        Function: Gets the list of assignees from database
        Input: None
        Output: Returns a dictionary where the key is 'assignees' and the value is a list of user_id strings 
        '''
        list_of_users = self.API.getAssignees()
        return list_of_users

    def getAreas(self, image_id):
        '''
        Function:   Gets the areas from the DSTA endpoint
        Input:      image_id is the uuid of the image you want to get areas from
        Output:     returns the list of area object
        '''
        areas = self.API.getAreasFromDSTA(image_id)
        self.API.insertAreasFromDSTA(areas)
        return areas
    
    def getImages(self):
        '''
        Function:   Gets the images from the DSTA endpoint
        Input:      None
        Output:     returns the list of Image object
        '''
        images = self.API.getImagesFromDSTA()
        self.API.insertImagesFromDSTA(images)