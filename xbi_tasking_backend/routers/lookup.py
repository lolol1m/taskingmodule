from fastapi import APIRouter, Request

from api_utils import model_to_dict, run_blocking
from schemas import KeyValueMapResponse, OpsvAreasPayload, StatusResponse, UpdateSensorCategoryPayload


router = APIRouter(prefix="/lookup", tags=["lookup"])


@router.get("/getPriority")
async def get_priority(request: Request) -> KeyValueMapResponse:
    '''
    Function: Gets the Priority list from the db
    
    Output:

        {
            'Priority': [<list of String>]
        }
    
    Sample:
    
        {
            "Priority": ["Low", "Medium", "High"]
        }
    '''
    return await run_blocking(request.app.state.lookup_service.get_priority)


@router.get("/getCloudCover")
async def get_cloud_cover(request: Request) -> KeyValueMapResponse:
    '''
    Function: Gets the Cloud Cover list from the db
    
    Output:

        {
            "Cloud Cover": [<list of String>]
        }
    
    Sample:
    
        {
            'Cloud Cover': ['UTC', '0C', '10-90C', '100C']
        }
    '''
    return await run_blocking(request.app.state.lookup_service.get_cloud_cover)


@router.get("/getImageCategory")
async def get_image_category(request: Request) -> KeyValueMapResponse:
    '''
    Function: Gets the Image Category list from the db
    
    Output:

        {
            'Image Category': [<list of String>]
        }
    
    Sample:
    
        {
            'Image Category': ['Detection', 'Classification', 'Identification', 'Recognition']
        }
    '''
    return await run_blocking(request.app.state.lookup_service.get_image_category)


@router.get("/getReport")
async def get_report(request: Request) -> KeyValueMapResponse:
    '''
    Function: Gets the Report list from the db
    
    Output:

        {
            'Report': [<list of string>]
        }
    
    Sample:
    
        {
            'Report': ['DS(OF)', 'DS(SF)', 'I-IIRS 0', 'IIR', 'Re-DL', 'Research', 'TOS', 'No Findings', 'Downgrade', 'Failed', 'Img Error']
        }
    '''
    return await run_blocking(request.app.state.lookup_service.get_report)


@router.get("/getSensorCategory")
async def get_sensor_category(request: Request):
    '''
    Function: gets the category of the sensors
    
    Output:
    
        {
            'CAT_A': ['sensor 1', 'sensor 2'],
            'CAT_B': ['sensor 3', 'sensor 4'],
            'UNCATEGORISED': ['sensor 5', 'sensor 6']
        }
    
    Sample:
        
        {
            <category name str>: [<sensor name str>, <sensor name str>],
            <category name str>: [<sensor name str>, <sensor name str>],
            'UNCATEGORISED': [<sensor name str>, <sensor name str>]
        }
        
    '''
    return await run_blocking(request.app.state.lookup_service.get_sensor_category)


@router.post("/updateSensorCategory")
async def update_sensor_category(request: Request, payload: UpdateSensorCategoryPayload) -> StatusResponse:
    '''
    Function: Updates the category of the sensors
    
    Input:
    
        {
            'Sensors': [{
                'Name': <str>,
                'Category': <str>
            },
            ...
            ]
        }
    
    Sample:
        
        {
            'Sensors': [{
                'Name': 'sensor a',
                'Category': 'CAT_A'
            },
            ...
            ]
        }
        
    '''
    result = await run_blocking(request.app.state.lookup_service.update_sensor_category, model_to_dict(payload))
    if result is None:
        return StatusResponse(status="success", message="Sensor categories updated")
    return result


@router.get("/getAreas")
async def get_areas(request: Request):
    '''
    Function: Get all the areas for the UI
    
    Output:
    
        {
            'Areas': [{
                'ID': <int of ID>, 
                'Area Name': <string of area name>, 
                'OPS V': <boolean whether it is ops v or not>
            },
            ...
            ]
        }
    
    Sample:
        
        {
            'Areas': [{
                'ID': 1024362, 
                'Area Name': 'G074', 
                'OPS V': False
            },
            ...
            ]
        }
        
    '''
    return await run_blocking(request.app.state.lookup_service.get_areas)


@router.post("/setOpsvAreas")
async def set_opsv_areas(request: Request, payload: OpsvAreasPayload) -> StatusResponse:
    '''
    Function: Updates the area for those that are OpsV
    
    Input:
    
        {
            'Areas': [{
                'ID': <int of ID>, 
                'Area Name': <string of area name>, 
                'OPS V': <boolean whether it is ops v or not>
            },
            ...
            ]
        }
    
    Sample:
        
        {
            'Areas': [{
                'ID': 1024362, 
                'Area Name': 'G074', 
                'OPS V': True
            },
            ...
            ]
        }
        
    '''
    result = await run_blocking(request.app.state.lookup_service.set_opsv_areas, model_to_dict(payload))
    if result is None:
        return StatusResponse(status="success", message="OpsV areas updated")
    return result
