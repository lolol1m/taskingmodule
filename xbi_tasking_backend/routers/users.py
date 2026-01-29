import logging

from fastapi import APIRouter, Depends, Request, UploadFile

from api_utils import error_response, model_to_dict, run_blocking
from schemas import CreateUserPayload, StatusResponse, UsersResponse
from security import get_current_user, is_admin_user


logger = logging.getLogger("xbi_tasking_backend.users")
router = APIRouter(prefix="/users", tags=["users"])


@router.get("/getUsers")
async def get_users(request: Request, user: dict = Depends(get_current_user)) -> UsersResponse:
    '''
    Function: Gets the Users list from the db
    
    Output:

        {
            'Users': [<list of string>]
        }
    
    Sample:
    
        {
            'Users': ['user1', 'user2']
        }
    '''
    return await run_blocking(request.app.state.user_service.get_users)


@router.post("/createUser")
async def create_user(request: Request, payload: CreateUserPayload, user: dict = Depends(get_current_user)):
    if not user:
        return error_response(401, "Not authenticated", "not_authenticated")

    if not is_admin_user(user):
        return error_response(403, "Insufficient permissions", "insufficient_permissions")

    try:
        result = await run_blocking(request.app.state.user_service.create_user, model_to_dict(payload))
        if "error" in result:
            return error_response(400, result["error"], "invalid_user_payload")
        request.app.state.notification_service.push(
            "User created",
            f"Just now · {payload.username} ({payload.role})",
            user,
        )
        return result
    except ValueError as e:
        return error_response(400, str(e), "invalid_user_payload")
    except Exception as e:
        return error_response(500, "Failed to create user", "create_user_failed", {"error": str(e)})


@router.post("/updateUsers")
async def update_users(request: Request, file: UploadFile, user: dict = Depends(get_current_user)) -> StatusResponse:
    '''
    Function: Imports parade state from 68 (in a csv file) and inserts it into users
    
    Input: csv file with column 'Name'
    
    '''
    
    if not is_admin_user(user):
        return error_response(403, "Insufficient permissions", "insufficient_permissions")

    if file.content_type not in ("text/csv", "application/vnd.ms-excel"):
        logger.warning("updateUsers invalid file type: %s", file.content_type)
        return error_response(400, "Invalid file type. CSV required.", "invalid_file_type")
        
    # Read file contents
    contents = await file.read()
    if not contents:
        logger.warning("updateUsers empty CSV")
        return error_response(400, "Empty CSV file", "empty_csv")
        

    try:
        csv_text = contents.decode("utf-8")
    except UnicodeDecodeError:
        return error_response(400, "CSV file must be UTF-8 encoded", "invalid_encoding")

    try:
        await run_blocking(request.app.state.user_service.update_users, csv_text)
        return StatusResponse(status="success", message="updateUser success")
    except ValueError as e:
        return error_response(400, str(e), "invalid_csv")
    except Exception as e:
        return error_response(500, "Failed to update users", "update_users_failed", {"error": str(e)})
