from main_classes import Database
import objects

class QueryManager():
    '''
    QueryManager handles all the queries to the backend
    '''
    def __init__(self):
        self.database = Database()
    
    def GetAssignees(self):
        '''
        Function: Gets the list of assignees from database
        Input: None
        Output: Returns a list of User objects 
        '''
        return self.database.getObjects(objects.User)

    def insertAreas(self, areas):
        '''
        Function:   Inserts list of area objects into Database
        Input:      areas is the list of area objects
        '''
        self.database.insertObjects(areas)
    
    def insertImages(self, images):
        '''
        Function:   Inserts list of image objects into Database
        Input:      images is the list of image objects
        '''
        self.database.insertObjects(images)
