from fastapi import APIRouter, Depends, Request

from schemas import NotificationsResponse
from security import get_current_user


router = APIRouter()


@router.get("/notifications")
async def get_notifications(request: Request, user: dict = Depends(get_current_user)) -> NotificationsResponse:
    return NotificationsResponse(Notifications=request.app.state.notification_service.list_all())
