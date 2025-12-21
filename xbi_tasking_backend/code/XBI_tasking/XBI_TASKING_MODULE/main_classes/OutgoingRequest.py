from GlobalVariables import DSTA_ENDPOINT
from objects import Image, Area

import requests
import datetime

class OutgoingRequest():
    '''
    OutgoingRequest handles calling DSTA endpoints to get their data
    '''
    def __init__(self):
        self.endpoint = DSTA_ENDPOINT
        self.get_image_endpoint = "get_image"
        self.get_area_endpoint = "get_area"
        self.get_user_endpoint = "get_user"

    def joinUrl(self, url1, url2):
        '''
        Function:   Joins the url of 2 urls
        Input:      First url as a string
        Input:      Second url as a string
        Output:     both url joined together as a string
        '''
        return url1 + "/" + url2

    def getImages(self, start_date, end_date):
        '''
        Function:   Gets the images from the DSTA endpoint
        Input:      start_date is a date as a string
        Input:      end_date us a date as a string
        Output:     returns the json from DSTA
        '''
        url = self.joinUrl(self.endpoint, self.get_image_endpoint)
        url = self.joinUrl(url, start_date)
        url = self.joinUrl(url, end_date)
        json = requests.get(url).json()
        return json
    
    def getAreas(self, uuid):
        '''
        Function:   Gets the areas from the DSTA endpoint
        Input:      uuid is a string
        Output:     returns a json of area objects
        '''
        url = self.joinUrl(self.endpoint, self.get_area_endpoint)
        url = self.joinUrl(url, uuid)
        json = requests.get(url).json()
        return json
    
    def isAdmin(self, user_id):
        '''
        Function:   pulls whether a user is an admin or not
        Input:      the id of the user as a string
        Output:     returns boolean true or false
        '''
        url = self.joinUrl(self.endpoint, self.get_user_endpoint)
        url = self.joinUrl(url, user_id)
        json = requests.get(url).json()
        return json

