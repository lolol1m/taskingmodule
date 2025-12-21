from main_classes import RequestManager
from main_classes import QueryManager

class APIManager():
    '''
    Class that links all the API request required
    '''
    def __init__(self):
        self.request_manager = RequestManager()
        self.query_manager = QueryManager()

    def getAssignees(self):
        '''
        Function: Gets the list of assignees from database
        Input: None
        Output: Returns a list of User Objects 
        '''
        return self.query_manager.GetAssignees()
        
    def getAreasFromDSTA(self, image_id):
        '''
        Function:   Gets the areas from the DSTA endpoint
        Input:      image_id is the uuid of the image you want to get areas from
        Output:     returns a list of area objects
        '''
        return self.request_manager.getAreas(image_id)

    def insertAreasFromDSTA(self, areas):
        '''
        Function:   Inserts the area objects into database
        Input:      areas is the list of area objects gotten from DSTA
        '''
        self.query_manager.insertAreas(areas)
    
    def getImagesFromDSTA(self):
        '''
        Function:   Gets the images from the DSTA endpoint
        Input:      None
        Output:     returns a list of image objects
        '''
        return self.request_manager.getImages()

    def insertImagesFromDSTA(self, images):
        '''
        Function:   Inserts the image objects into database
        Input:      images is the list of area objects gotten from DSTA
        '''
        self.query_manager.insertImages(images)