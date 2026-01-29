import json
import logging

from fastapi import APIRouter, Depends, Request, UploadFile

from api_utils import error_response, model_to_dict, run_blocking
from schemas import DeleteImagePayload, InsertTTGPayload, StatusResponse
from security import get_current_user, is_admin_user


logger = logging.getLogger("xbi_tasking_backend.images")
router = APIRouter(prefix="/images", tags=["images"])


@router.post("/insertDSTAData")
async def insert_dsta_data(request: Request, file: UploadFile, user: dict = Depends(get_current_user)):
    '''
    Function: Imports data from DSTA (in a json file) and inserts it into db
    
    Input: (as a file)

        {
            'images': [{
                'imgId': <long>,
                'imageFileName': <str>, 
                'sensorName': <str>, 
                'uploadDate': <datetime>, 
                'imageDateTime': <datetime>, 
                'areas': [{ 
                    'areaId': <long>,
                    'areaName': <string>
                },
                ...
                ]
            },
            ...
            ]
        }

        # hello
                {
            'images': [{
                'imgId': <long>,
                'imageFileName': <str>,
                'sensorName': <str>,
                'uploadDate': <datetime>,
                'imageDateTime': <datetime>,
                'areas': [<string>, ...]
            },
            ...
            ]
        }
    
    Sample:
    
        {
            'images': [{
                'imgId': 12345,
                'imageFileName': 'hello.gif',
                'sensorName': 'SB',
                'uploadDate': <datetime>,
                'imageDateTime': <datetime>,
                'areas': [{
                    'areaId': 678910,
                    'areaName': 'area_51'
                },
                ...
                ]
            },
            ...
            ]
        }
        
    '''
    
    contents = await file.read()
    if file.content_type != "application/json":
        return error_response(400, "File must be JSON format", "invalid_file_type")
    try:
        try:
            json_data = json.loads(contents.decode("utf-8"))
        except UnicodeDecodeError:
            return error_response(400, "JSON file must be UTF-8 encoded", "invalid_encoding")
        except json.JSONDecodeError as e:
            return error_response(400, "Invalid JSON file", "invalid_json", {"error": str(e)})
        result = await run_blocking(request.app.state.image_service.insert_dsta_data, json_data)
        if result.get("success"):
            images = result.get("images_inserted")
            areas = result.get("areas_inserted")
            meta = f"Just now · {images} images, {areas} areas"
            request.app.state.notification_service.push("Upload completed", meta, user)
        return result
    except Exception as e:
        request.app.state.notification_service.push("Upload failed", "Just now · Upload error", user)
        return error_response(500, "Failed to insert data", "insert_failed", {"error": str(e)})


@router.post("/insertTTGData")
async def insert_ttg_data(request: Request, payload: InsertTTGPayload, user: dict = Depends(get_current_user)) -> StatusResponse:
    '''
    Function: Inserts TTG Data into DB
    
    Input:
    
        {
            'imageFileName': <str>,
            'sensorName': <str>,
            'uploadDate': <datetime>,
            'imageDateTime': <datetime>,
            'areas': [<list of str>]
        }
    
    Sample:
    
        {
            'imageFileName': 'hello.gif',
            'sensorName': 'SB',
            'uploadDate': <datetime>,
            'imageDateTime': <datetime>,
            'areas': ['area1', 'area2']
        }
        
    '''
    try:
        result = await run_blocking(request.app.state.image_service.insert_ttg_data, model_to_dict(payload))
        if result is None:
            return StatusResponse(status="success", message="TTG data inserted")
        return result
    except ValueError as e:
        return error_response(400, str(e), "invalid_ttg_payload")
    except Exception as e:
        return error_response(500, "Failed to insert TTG data", "insert_ttg_failed", {"error": str(e)})


@router.post("/deleteImage")
async def delete_image(request: Request, payload: DeleteImagePayload, user: dict = Depends(get_current_user)):
    '''
    Function: Deletes an image and its associated image_areas and tasks from db
    Input:
    
        {
            'SCVU Image ID': <int>
        }
    
    Sample:
    
        {
            'SCVU Image ID': 12
        }
    '''
    if not is_admin_user(user):
        return error_response(403, "Insufficient permissions", "insufficient_permissions")
    try:
        return await run_blocking(request.app.state.image_service.delete_image, model_to_dict(payload))
    except Exception as e:
        return error_response(500, "Failed to delete image", "delete_image_failed", {"error": str(e)})
