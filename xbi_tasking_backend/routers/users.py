import logging

from fastapi import APIRouter, Depends, Request, UploadFile

from api_utils import error_response, model_to_dict, run_blocking
from constants import ContentType, MAX_UPLOAD_BYTES
from schemas import EditUserPayload, StatusResponse, UsersResponse
from security import can_upload_parade_state, get_current_user, is_admin_user


logger = logging.getLogger("xbi_tasking_backend.users")
router = APIRouter(prefix="/users", tags=["users"])


@router.get("/verify")
async def verify_access(user: dict = Depends(get_current_user)):
    """Lightweight ping the frontend uses to confirm the session is authenticated
    and the user passes the required-group gate in the auth middleware."""
    return {"ok": True}


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


@router.post("/editUser")
async def edit_user(request: Request, payload: EditUserPayload, user: dict = Depends(get_current_user)):
    if not user:
        return error_response(401, "Not authenticated", "not_authenticated")
    if not is_admin_user(user):
        return error_response(403, "Insufficient permissions", "insufficient_permissions")
    try:
        result = await run_blocking(request.app.state.user_service.edit_user, model_to_dict(payload))
        if "error" in result:
            return error_response(400, result["error"], "edit_user_failed")
        return result
    except ValueError as e:
        return error_response(400, str(e), "edit_user_failed")
    except Exception as e:
        logger.exception("editUser failed")
        return error_response(500, "Failed to edit user", "edit_user_failed", {"error": str(e)})


@router.post("/updateUsers")
async def update_users(request: Request, file: UploadFile, user: dict = Depends(get_current_user)) -> StatusResponse:
    '''
    Function: Imports parade state from 68 (in a csv file) and inserts it into users

    Input: csv file with column 'Name'

    '''

    if not is_admin_user(user):
        return error_response(403, "Insufficient permissions", "insufficient_permissions")

    if file.content_type not in ContentType.CSV:
        logger.warning("updateUsers invalid file type: %s", file.content_type)
        return error_response(400, "Invalid file type. CSV required.", "invalid_file_type")

    contents = await file.read()
    if not contents:
        logger.warning("updateUsers empty CSV")
        return error_response(400, "Empty CSV file", "empty_csv")
    if len(contents) > MAX_UPLOAD_BYTES:
        logger.warning("updateUsers CSV too large")
        return error_response(413, "CSV file too large", "payload_too_large")

    try:
        csv_text = contents.decode("utf-8")
    except UnicodeDecodeError:
        return error_response(400, "CSV file must be UTF-8 encoded", "invalid_encoding")

    try:
        await run_blocking(request.app.state.user_service.update_users, csv_text)
        audit = getattr(request.app.state, "audit_service", None)
        if audit:
            audit.log_event(
                "user_presence_update",
                user,
                details={"size_bytes": len(contents)},
                ip_address=request.client.host if request.client else None,
            )
        return StatusResponse(status="success", message="updateUser success")
    except ValueError as e:
        return error_response(400, str(e), "invalid_csv")
    except Exception as e:
        logger.exception("updateUsers failed")
        return error_response(500, "Failed to update users", "update_users_failed", {"error": str(e)})
