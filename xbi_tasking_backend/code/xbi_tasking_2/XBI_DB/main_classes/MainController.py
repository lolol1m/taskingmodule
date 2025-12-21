from main_classes import QueryManager

class MainController():
    '''
    MainController contains all the functions for the UI to call, the main logic will be in this class.
    '''
    def __init__(self):
        self.query_manager = QueryManager()