from main_classes import Database

class QueryManager():
    '''
    QueryManager handles all the queries to the backend
    '''
    def __init__(self):
        self.database = Database()