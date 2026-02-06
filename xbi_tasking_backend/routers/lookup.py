import logging

from fastapi import APIRouter, Depends, Request

from api_utils import error_response, model_to_dict, run_blocking
from schemas import KeyValueMapResponse, OpsvAreasPayload, StatusResponse, UpdateSensorCategoryPayload
from security import get_current_user


router = APIRouter(prefix="/lookup", tags=["lookup"])
logger = logging.getLogger("xbi_tasking_backend.lookup")


@router.get("/getPriority")
async def get_priority(request: Request, user: dict = Depends(get_current_user)) -> KeyValueMapResponse:
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
    try:
        return await run_blocking(request.app.state.lookup_service.get_priority)
    except Exception:
        logger.exception("getPriority failed")
        return error_response(500, "Failed to load priorities", "get_priority_failed")


@router.get("/getCloudCover")
async def get_cloud_cover(request: Request, user: dict = Depends(get_current_user)) -> KeyValueMapResponse:
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
    try:
        return await run_blocking(request.app.state.lookup_service.get_cloud_cover)
    except Exception:
        logger.exception("getCloudCover failed")
        return error_response(500, "Failed to load cloud cover", "get_cloud_cover_failed")


@router.get("/getImageCategory")
async def get_image_category(request: Request, user: dict = Depends(get_current_user)) -> KeyValueMapResponse:
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
    try:
        return await run_blocking(request.app.state.lookup_service.get_image_category)
    except Exception:
        logger.exception("getImageCategory failed")
        return error_response(500, "Failed to load image categories", "get_image_category_failed")


@router.get("/getReport")
async def get_report(request: Request, user: dict = Depends(get_current_user)) -> KeyValueMapResponse:
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
    try:
        return await run_blocking(request.app.state.lookup_service.get_report)
    except Exception:
        logger.exception("getReport failed")
        return error_response(500, "Failed to load reports", "get_report_failed")


@router.get("/getSensorCategory")
async def get_sensor_category(request: Request, user: dict = Depends(get_current_user)):
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
    try:
        return await run_blocking(request.app.state.lookup_service.get_sensor_category)
    except Exception:
        logger.exception("getSensorCategory failed")
        return error_response(500, "Failed to load sensor categories", "get_sensor_category_failed")


@router.post("/updateSensorCategory")
async def update_sensor_category(request: Request, payload: UpdateSensorCategoryPayload, user: dict = Depends(get_current_user)) -> StatusResponse:
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
    try:
        result = await run_blocking(request.app.state.lookup_service.update_sensor_category, model_to_dict(payload))
        if result is None:
            return StatusResponse(status="success", message="Sensor categories updated")
        return result
    except Exception:
        logger.exception("updateSensorCategory failed")
        return error_response(500, "Failed to update sensor categories", "update_sensor_category_failed")


@router.get("/getAreas")
async def get_areas(request: Request, user: dict = Depends(get_current_user)):
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
    try:
        return await run_blocking(request.app.state.lookup_service.get_areas)
    except Exception:
        logger.exception("getAreas failed")
        return error_response(500, "Failed to load areas", "get_areas_failed")


@router.post("/setOpsvAreas")
async def set_opsv_areas(request: Request, payload: OpsvAreasPayload, user: dict = Depends(get_current_user)) -> StatusResponse:
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
    try:
        result = await run_blocking(request.app.state.lookup_service.set_opsv_areas, model_to_dict(payload))
        if result is None:
            return StatusResponse(status="success", message="OpsV areas updated")
        return result
    except Exception:
        logger.exception("setOpsvAreas failed")
        return error_response(500, "Failed to update OpsV areas", "set_opsv_areas_failed")
