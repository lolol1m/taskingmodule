from GlobalVariables import DSTA_ENDPOINT
from objects import Image, Area
from main_classes.OutgoingRequest import OutgoingRequest

import requests
import datetime

class RequestManager():
    '''
    RequestManager handles the data given by DSTA by changing it to datatypes we can handle
    '''
    def __init__(self):
        self.outgoingRequest = OutgoingRequest()

    def getImages(self):
        '''
        Function:   Gets the images from the DSTA endpoint
        Input:      None
        Output:     returns a list of image objects
        '''
        json = self.outgoingRequest.getImages(datetime.datetime.now().strftime("%d-%m-%Y"), datetime.datetime.now().strftime("%d-%m-%Y"))
        images = self.extractImagesFromJson(json)
        return images
    
    def extractImagesFromJson(self, json):
        '''
        Function:   extracts images from the json file passed in
        Input:      json is a python dictionary with the image data
        Output:     returns a list of image objects
        '''
        images = []
        for image in json:
            new_image = Image()
            new_image.initImageDsta(image, json[image])
            images.append(new_image)
        return images
    
    def getAreas(self, image):
        '''
        Function:   Gets the areas from the DSTA endpoint
        Input:      image is an image class
        Output:     returns a list of area objects
        '''
        json = self.outgoingRequest.getAreas(image.GetUuid())
        areas = self.extractAreasFromJson(json)
        return areas
    
    def extractAreasFromJson(self, json):
        '''
        Function:   extracts areas from the json file passed in
        Input:      json is a python dictionary with the area data
        Output:     returns a list of area objects
        '''
        areas = []
        for area in json["areas"]:
            new_area = Area()
            new_area.initAreaDsta(area)
            areas.append(new_area)
        return areas
    
    def isAdmin(self, user):
        '''
        Function:   pulls whether a user is an admin or not
        Input:      the id of the user as a string
        Output:     returns boolean true or false
        '''
        json = self.outgoingRequest.isAdmin(user.getUserId())
        return json["admin"]
