import unittest

from main_classes import OutgoingRequest
import GlobalVariables

class OutgoingRequest_unittest(unittest.TestCase):
    @classmethod
    def setUpClass(self):
        self.OutgoingRequest = OutgoingRequest()
        if GlobalVariables.DSTA_ENDPOINT != "http://127.0.0.1:12345":
            print("PLS CHECK UR IP ADDRESS")
            exit()
    
    @classmethod
    def tearDownClass(self):
        pass

    def setUp(self):
        pass
    
    def tearDown(self):
        pass

    def test_join_url_base_case(self):
        '''
        Base case for join_url
        '''
        res = self.OutgoingRequest.JoinUrl("192.168.1.2:12345", "get_image")
        exp = r"192.168.1.2:12345/get_image"
        self.assertEqual(res, exp, "join_url base case failed")
    
    def test_get_images_base_case(self):
        '''
        Base case for GetImages
        '''
        images = self.OutgoingRequest.GetImages()
        res = len(images)
        exp = 3
        self.assertEqual(res, exp, "get_images request should have returned 3 images")
        res = [images[0].GetUuid(), images[1].GetUuid(), images[2].GetUuid()]
        exp = ["imageid1", "imageid2", "imageid3"]
        self.assertEqual(res, exp, "get_images should return the 3 ids expected")
    
    def test_extract_images_from_json_base_case(self):
        '''
        Base case for ExtractImagesFromJson
        '''
        images = self.OutgoingRequest.ExtractImagesFromJson({
            'imageid1': {
                'sensor':'sb',
                'imaging_date':'19-10-22',
                'upload_date':'19-10-22'
            },
            'imageid2': {
                'sensor':'s4',
                'imaging_date':'19-10-22',
                'upload_date':'19-10-22'
            },
            'imageid3': {
                'sensor':'s4',
                'imaging_date':'19-10-22',
                'upload_date':'19-10-22'
            }
        })
        res = len(images)
        exp = 3
        self.assertEqual(res, exp, "get_images request should have returned 3 images")
        res = [images[0].GetUuid(), images[1].GetUuid(), images[2].GetUuid()]
        exp = ["imageid1", "imageid2", "imageid3"]
        self.assertEqual(res, exp, "get_images should return the 3 ids expected")


    def startUnitTest(self):
        unittest.main()