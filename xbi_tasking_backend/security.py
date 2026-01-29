import logging
import os
from fastapi import HTTPException, Request, status


logger = logging.getLogger("xbi_tasking_backend.security")

KEYCLOAK_ENABLED = os.getenv("KEYCLOAK_ENABLED", "true").lower() == "true"


def is_admin_user(user: dict) -> bool:
    roles = user.get("roles", []) or []
    account_type = user.get("account_type")
    return account_type == "IA" or "IA" in roles


async def get_current_user(request: Request):
    """
    Dependency to get current authenticated user from request state
    (set by middleware)
    """
    if not KEYCLOAK_ENABLED:
        return {"sub": "anonymous", "preferred_username": "anonymous"}
    
    user = getattr(request.state, "user", None)
    if not user:
        logger.warning("No user in request.state for %s", request.url.path)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
