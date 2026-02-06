import logging

from fastapi import APIRouter, Depends, Request

from api_utils import error_response, model_to_dict, run_blocking
from schemas import (
    AssignTaskPayload,
    DateRangePayload,
    ImageIdsPayload,
    KeyValueMapResponse,
    StatusResponse,
    TaskIdsPayload,
    UpdateTaskingManagerPayload,
    UpdateTaskingSummaryPayload,
)
from security import get_current_user, is_admin_user


logger = logging.getLogger("xbi_tasking_backend.tasking")
router = APIRouter(prefix="/tasking", tags=["tasking"])


@router.post("/getTaskingSummaryData")
async def get_tasking_summary_data(request: Request, payload: DateRangePayload, user: dict = Depends(get_current_user)) -> KeyValueMapResponse:
    '''
    Function: Get Data for Tasking Summary page
    
    Input:

        {
            'Start Date': <datetime yyyy-mm-ddT16:00:00.000Z>,
            'End Date': <datetime yyyy-mm-ddT16:00:00.000Z>
        }
    
    Output:
        {

            0: { 
                        "Sensor Name": "s1", 
                        "Image File Name": "abc.png", 
                        "Image ID": 2, 
                        "Upload Date": "29/1/2023 06:14", 
                        "Image Datetime": "29/1/2023 05:14",
                        "Area": "area1", 
                        "Assignee": "multiple", 
                        "Report": None,
                        "Task Completed": "1/3",
                        "Priority": None, 
                        "Image Category": None,
                        "Image Quality": "bad quality",
                        "Cloud Cover": None,
                        "EW Status": "TTG DONE",
                        "Target Tracing": True,
                        "V10": True,
                        "OPS V": False,
                        "Remarks": "image is gone",
                        "Child ID": [1,2]

                    },
            1: { 
                        "Area Name": "area1", 
                        "Assignee": "multiple", 
                        "Task Status": "Completed",
                        "Remarks": "image is gone",
                        "Parent ID": 0 
                    },
        }
    
    Note: II users only see tasks assigned to them. Senior II and IA see all tasks.
    '''
    try:
        return await run_blocking(request.app.state.tasking_service.get_tasking_summary, model_to_dict(payload), user)
    except Exception:
        logger.exception("getTaskingSummaryData failed")
        return error_response(500, "Tasking summary failed", "tasking_summary_failed")


@router.post("/getTaskingManagerData")
async def get_tasking_manager_data(request: Request, payload: DateRangePayload, user: dict = Depends(get_current_user)) -> KeyValueMapResponse:
    '''
    Function: Gets tasking manager data (incomplete images) from db between date range
    
    Input:
    
        {
            'Start Date': <datetime yyyy-mm-ddT16:00:00.000Z>,
            'End Date': <datetime yyyy-mm-ddT16:00:00.000Z>
        }
    
    Sample:
    
        {
            'Start Date': '2024-04-04T16:00:00.000Z',
            'End Date': '2024-04-04T16:00:00.000Z'
        }
    
    Output:

        {
            <scvu image id>: {
                'Sensor Name': <str>,
                'Image File Name': <str>,
                'Image ID': <int of dsta image id>,
                'Upload Date': <datetime in dd/mm/yyyy hh:mm>,
                'Image Datetime': <datetime in dd/mm/yyyy hh:mm>,
                'Assignee': <str, 'multiple' or assignee name>,
                'Priority': <str Low Medium High>,
                'TTG': <boolean>
            },
            <scvu image area id>: {
                'Area Name': <str>,
                'Assignee': <str>,
                'Remarks': <str>,
                'Parent ID': <int>
            },
            ...
        }
    
    Sample:
    
        {
            1: {
                'Sensor Name': 'SB',
                'Image File Name': 'hello.gif',
                'Image ID': 493,
                'Upload Date': '04/04/2024 12:00',
                'Image Datetime': '04/04/2024 08:00',
                'Assignee': 'multiple',
                'Priority': 'High'
            },
            2: {
                'Area Name': 'area_554',
                'Assignee': 'pte thanos',
                'Remarks': '',
                'Parent ID': 1
            },
            3: {
                'Area Name': 'area_555',
                'Assignee': 'pte tony',
                'Remarks': '',
                'Parent ID': 1
            },
            ...
        }
        
    '''
    try:
        return await run_blocking(request.app.state.tasking_service.get_tasking_manager, model_to_dict(payload))
    except Exception:
        logger.exception("getTaskingManagerData failed")
        return error_response(500, "Tasking manager failed", "tasking_manager_failed")


@router.post("/updateTaskingManagerData")
async def update_tasking_manager_data(request: Request, payload: UpdateTaskingManagerPayload, user: dict = Depends(get_current_user)) -> StatusResponse:
    '''
    Function: Updates the priority of Image
    
    Input:
    
        {
            <scvu_image_id>: {
                'Priority': <string Low Medium High>
            },
            ...
        }
    
    Sample:
    
        {
            1: {
                'Priority': 'Medium'
            },
            ...
        }
    '''
    try:
        if not is_admin_user(user):
            return error_response(403, "Insufficient permissions", "insufficient_permissions")
        result = await run_blocking(request.app.state.tasking_service.update_tasking_manager, model_to_dict(payload))
        if result is None:
            audit = getattr(request.app.state, "audit_service", None)
            if audit:
                audit.log_event(
                    "tasking_manager_update",
                    user,
                    details={"image_count": len(model_to_dict(payload))},
                    ip_address=request.client.host if request.client else None,
                )
            return StatusResponse(status="success", message="Tasking manager updated")
        return result
    except Exception:
        logger.exception("updateTaskingManagerData failed")
        return error_response(500, "Failed to update tasking manager", "update_tasking_manager_failed")


@router.post("/assignTask")
async def assign_task(request: Request, payload: AssignTaskPayload, user: dict = Depends(get_current_user)):
    '''
    Function: Assigns the Task to someone
    
    Input:
    
        {
            'Tasks': [
                {
                    'SCVU Image Area ID': <int>,
                    'Assignee': <string>
                }, ...
            ]
        }
    
    Sample:

        {
            'Tasks': [
                {
                    'SCVU Image Area ID': 1,
                    'Assignee': 'zz'
                }, ...
            ]
        }
    '''
    try:
        if not is_admin_user(user):
            return error_response(403, "Insufficient permissions", "insufficient_permissions")
        data = model_to_dict(payload)
        tasks = data.get("Tasks", [])
        if not tasks:
            return error_response(400, "Tasks list is required", "missing_tasks")
        task_count = len(tasks)
        await run_blocking(request.app.state.tasking_service.assign_task, data)
        audit = getattr(request.app.state, "audit_service", None)
        if audit:
            audit.log_event(
                "task_assign",
                user,
                details={"task_count": task_count},
                ip_address=request.client.host if request.client else None,
            )
        return {"status": "success", "message": "Tasks assigned successfully", "tasks_processed": task_count}
    except Exception:
        logger.exception("assignTask failed")
        return error_response(500, "Failed to assign tasks", "assign_task_failed")


@router.post("/startTasks")
async def start_tasks(request: Request, payload: TaskIdsPayload, user: dict = Depends(get_current_user)) -> StatusResponse:
    '''
    Function: Starts the Tasks by setting task status to In Progress
    
    Input:

        {
            'SCVU Task ID': <list of int>
        }
    
    Sample:
    
        {
            'SCVU Task ID': [1]
        }
    '''
    try:
        result = await run_blocking(request.app.state.tasking_service.start_tasks, model_to_dict(payload))
        if result is None:
            audit = getattr(request.app.state, "audit_service", None)
            if audit:
                audit.log_event(
                    "task_start",
                    user,
                    details={"task_count": len(payload.task_ids)},
                    ip_address=request.client.host if request.client else None,
                )
            return StatusResponse(status="success", message="Tasks started")
        return result
    except Exception:
        logger.exception("startTasks failed")
        return error_response(500, "Failed to start tasks", "start_tasks_failed")


@router.post("/completeTasks")
async def complete_tasks(request: Request, payload: TaskIdsPayload, user: dict = Depends(get_current_user)) -> StatusResponse:
    '''
    Function: Completes the Tasks for user by setting task status to Verifying
    
    Input:
    
        {
            'SCVU Task ID': <list of int>
        }
    
    Sample:
    
        {
            'SCVU Task ID': [1]
        }
    '''
    try:
        result = await run_blocking(request.app.state.tasking_service.complete_tasks, model_to_dict(payload))
        if result is None:
            audit = getattr(request.app.state, "audit_service", None)
            if audit:
                audit.log_event(
                    "task_complete",
                    user,
                    details={"task_count": len(payload.task_ids)},
                    ip_address=request.client.host if request.client else None,
                )
            return StatusResponse(status="success", message="Tasks completed")
        return result
    except Exception:
        logger.exception("completeTasks failed")
        return error_response(500, "Failed to complete tasks", "complete_tasks_failed")
    

@router.post("/verifyPass")
async def verify_pass(request: Request, payload: TaskIdsPayload, user: dict = Depends(get_current_user)) -> StatusResponse:
    '''
    Function: Verifies the Tasks as passed and sets task status to Complete
    
    Input:

        {
            'SCVU Task ID': <list of int>
        }
    
    Sample:
    
        {
            'SCVU Task ID': [1]
        }
    '''
    try:
        result = await run_blocking(request.app.state.tasking_service.verify_pass, model_to_dict(payload))
        if result is None:
            audit = getattr(request.app.state, "audit_service", None)
            if audit:
                audit.log_event(
                    "task_verify_pass",
                    user,
                    details={"task_count": len(payload.task_ids)},
                    ip_address=request.client.host if request.client else None,
                )
            return StatusResponse(status="success", message="Tasks verified")
        return result
    except Exception:
        logger.exception("verifyPass failed")
        return error_response(500, "Failed to verify tasks", "verify_pass_failed")


@router.post("/verifyFail")
async def verify_fail(request: Request, payload: TaskIdsPayload, user: dict = Depends(get_current_user)) -> StatusResponse:
    '''
    Function: Verifies the Tasks as Failed and resets task status to In Progress
    
    Input:

        {
            'SCVU Task ID': <list of int>
        }
    
    Sample:
    
        {
            'SCVU Task ID': [1]
        }
    '''
    try:
        result = await run_blocking(request.app.state.tasking_service.verify_fail, model_to_dict(payload))
        if result is None:
            audit = getattr(request.app.state, "audit_service", None)
            if audit:
                audit.log_event(
                    "task_verify_fail",
                    user,
                    details={"task_count": len(payload.task_ids)},
                    ip_address=request.client.host if request.client else None,
                )
            return StatusResponse(status="success", message="Tasks updated")
        return result
    except Exception:
        logger.exception("verifyFail failed")
        return error_response(500, "Failed to verify tasks", "verify_fail_failed")


@router.post("/completeImages")
async def complete_images(request: Request, payload: ImageIdsPayload, user: dict = Depends(get_current_user)) -> dict:
    '''
    Function: Checks if all tasks for images have Completed status, then updates completed_date of image to current datetime
    
    Input:
        {
            'SCVU Image ID': <list of int>
        }
        Note: Vetter is automatically taken from the authenticated user's JWT token
    
    Sample:

        {
            'SCVU Image ID': [1]
        }
    '''
    try:
        data = model_to_dict(payload)
        # Get Keycloak user ID from JWT token (sub claim)
        vetter_keycloak_id = user.get("sub")
        result = await run_blocking(request.app.state.tasking_service.complete_images, data, vetter_keycloak_id)
        if result is None:
            audit = getattr(request.app.state, "audit_service", None)
            if audit:
                audit.log_event(
                    "image_complete",
                    user,
                    details={"image_count": len(payload.image_ids)},
                    ip_address=request.client.host if request.client else None,
                )
            return StatusResponse(status="success", message="Images completed")
        return result
    except Exception:
        logger.exception("completeImages failed")
        return error_response(500, "Failed to complete images", "complete_images_failed")


@router.post("/uncompleteImages")
async def uncomplete_images(request: Request, payload: ImageIdsPayload, user: dict = Depends(get_current_user)) -> StatusResponse:
    '''
    Function: Sets the completed date of images to None
    
    Input:
        {
            'SCVU Image ID': <list of int>
        }
    
    Sample:
    
        {
            'SCVU Image ID': [1]
        }
    '''
    try:
        if not is_admin_user(user):
            return error_response(403, "Insufficient permissions", "insufficient_permissions")
        result = await run_blocking(request.app.state.tasking_service.uncomplete_images, model_to_dict(payload))
        if result is None:
            audit = getattr(request.app.state, "audit_service", None)
            if audit:
                audit.log_event(
                    "image_uncomplete",
                    user,
                    details={"image_count": len(payload.image_ids)},
                    ip_address=request.client.host if request.client else None,
                )
            return StatusResponse(status="success", message="Images uncompleted")
        return result
    except Exception:
        logger.exception("uncompleteImages failed")
        return error_response(500, "Failed to uncomplete images", "uncomplete_images_failed")


@router.post("/getCompleteImageData")
async def get_complete_image_data(request: Request, payload: DateRangePayload, user: dict = Depends(get_current_user)) -> KeyValueMapResponse:
    '''
    Function: Gets data for completed images including their areas
    Input:
    
        {
            'Start Date': <datetime yyyy-mm-ddT16:00:00.000Z>,
            'End Date': <datetime yyyy-mm-ddT16:00:00.000Z>
        }
    
    Sample:
    
        {
            'Start Date': '2024-04-04T16:00:00.000Z',
            'End Date': '2024-04-05T16:00:00.000Z'
        }
    
    Output:
    
        {
            <scvu image id>: {
                'Sensor Name' : <str>,
                'Image File Name' : <str>,
                'Image ID' : <int or null>,
                'Upload Date' : <str>,
                'Image Datetime' : <datetime>,
                'Area' : <str of first area name>,
                'Assignee' : <str of first area assignee>,
                'Report' : <str>,
                'Priority' : <str>,
                'Image Category' : <str>,
                'Image Quality' : <str>,
                'Cloud Cover' : <str>,
                'EW Status' : <boolean>,
                'Vetter': <str>,
                'Remarks': <str of all area remarks>
            },
            <scvu area id>: {
                "Area Name" : <str>,
                "Remarks" : <str>,
                "Assignee" : <str>,
                "Parent ID" : <int of parent scvu image id>,
            },
            ...
        }
    
    '''

    try:
        return await run_blocking(request.app.state.tasking_service.get_complete_image_data, model_to_dict(payload), user)
    except Exception:
        logger.exception("getCompleteImageData failed")
        return error_response(500, "Failed to get completed image data", "get_complete_image_data_failed")


@router.post("/updateTaskingSummaryData")
async def update_tasking_summary_data(request: Request, payload: UpdateTaskingSummaryPayload, user: dict = Depends(get_current_user)) -> StatusResponse:
    '''
    Function: Updates the report, image category, image quality, cloud cover & target tracing of image
    
    Input:
    
        {
            <scvu_image_id>: {
                'Report': <str>,
                'Image Category': <str>,
                'Image Quality': <str>,
                'Cloud Cover': <str>,
                'Target Tracing': <boolean>
            },
            ...
        }
    
    Sample:
        
        {
            <scvu_image_id>: {
                'Report': <str>,
                'Image Category': <str>,
                'Image Quality': <str>,
                'Cloud Cover': <str>,
                'Target Tracing': <boolean>
            },
            ...
        }
        
    '''
    try:
        if not is_admin_user(user):
            return error_response(403, "Insufficient permissions", "insufficient_permissions")
        result = await run_blocking(request.app.state.tasking_service.update_tasking_summary, model_to_dict(payload))
        if result is None:
            audit = getattr(request.app.state, "audit_service", None)
            if audit:
                audit.log_event(
                    "tasking_summary_update",
                    user,
                    details={"image_count": len(model_to_dict(payload))},
                    ip_address=request.client.host if request.client else None,
                )
            return StatusResponse(status="success", message="Tasking summary updated")
        return result
    except Exception:
        logger.exception("updateTaskingSummaryData failed")
        return error_response(500, "Failed to update tasking summary", "update_tasking_summary_failed")
