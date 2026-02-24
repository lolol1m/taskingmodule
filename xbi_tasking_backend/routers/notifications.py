import logging

from fastapi import APIRouter, Depends, Request

from api_utils import error_response
from schemas import NotificationsResponse
from security import get_current_user


router = APIRouter()
logger = logging.getLogger("xbi_tasking_backend.notifications")


@router.get("/notifications")
async def get_notifications(request: Request, user: dict = Depends(get_current_user)) -> NotificationsResponse:
    try:
        return NotificationsResponse(Notifications=request.app.state.notification_service.list_all())
    except Exception:
        logger.exception("get_notifications failed")
        return error_response(500, "Failed to load notifications", "notifications_failed")
