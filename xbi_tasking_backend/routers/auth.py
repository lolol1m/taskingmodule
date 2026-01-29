import logging
import os
import secrets
import urllib.parse

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from api_utils import error_response
from security import KEYCLOAK_ENABLED


logger = logging.getLogger("xbi_tasking_backend.auth")
router = APIRouter()


# Keycloak authentication endpoints - frontend never talks to Keycloak directly
@router.get("/auth/login")
async def auth_login(request: Request):
    """
    Initiates Keycloak login flow by redirecting to Keycloak authorization endpoint.
    Frontend calls this endpoint when user needs to authenticate.
    """
    if not KEYCLOAK_ENABLED:
        return error_response(503, "Keycloak authentication is disabled", "keycloak_disabled")
    
    config = request.app.state.config
    keycloak_url = config.getKeycloakURL()
    realm = config.getKeycloakRealm()
    client_id = config.getKeycloakClientID()
    
    # Get frontend URL from environment or use default
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    
    # Store state in session/cookie (simplified - in production use secure cookies)
    # For now, we'll include it in the redirect URI
    
    # Build Keycloak authorization URL
    auth_url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/auth"
    # Use the request URL to get the correct host and port
    backend_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{backend_url}/auth/callback"
    
    params = {
        "client_id": client_id,
        "redirect_uri": str(redirect_uri),
        "response_type": "code",
        "scope": "openid profile email",
        "state": state,
    }
    
    auth_url_with_params = f"{auth_url}?{urllib.parse.urlencode(params)}"
    
    response = RedirectResponse(url=auth_url_with_params)
    # Store state in an HTTP-only cookie for CSRF protection
    cookie_secure = request.url.scheme == "https" or os.getenv("COOKIE_SECURE", "").lower() == "true"
    response.set_cookie(
        key="kc_state",
        value=state,
        httponly=True,
        samesite="lax",
        secure=cookie_secure,
        max_age=300,
    )
    return response


@router.get("/auth/callback")
async def auth_callback(request: Request, code: str = None, state: str = None, error: str = None):
    """
    Handles Keycloak redirect after user authentication.
    Exchanges authorization code for tokens and redirects to frontend with tokens.
    """
    if not KEYCLOAK_ENABLED:
        return error_response(503, "Keycloak authentication is disabled", "keycloak_disabled")
    
    if error:
        # Keycloak returned an error
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}?error={error}")
    
    if not code:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}?error=no_code")

    # Validate state from cookie to prevent CSRF
    cookie_state = request.cookies.get("kc_state")
    if not state or not cookie_state or state != cookie_state:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        response = RedirectResponse(url=f"{frontend_url}?error=state_mismatch")
        response.delete_cookie("kc_state")
        return response
    
    config = request.app.state.config
    keycloak_url = config.getKeycloakURL()
    realm = config.getKeycloakRealm()
    client_id = config.getKeycloakClientID()
    client_secret = config.getKeycloakClientSecret()
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # Exchange authorization code for tokens
    token_url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/token"
    # Use the request URL to get the correct host and port
    backend_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{backend_url}/auth/callback"
    
    try:
        logger.debug("auth_callback exchanging code for tokens")
        logger.debug("Token URL: %s", token_url)
        logger.debug("Redirect URI: %s", redirect_uri)
        logger.debug("Client ID: %s", client_id)
        logger.debug("Client secret present: %s", client_secret is not None and len(client_secret) > 0)
        logger.debug("Code present: %s", code is not None)
        
        if not client_secret:
            error_msg = "Client secret is missing in configuration. Please check dev_server.config"
            logger.error("auth_callback: %s", error_msg)
            return error_response(
                500,
                error_msg,
                "configuration_error",
                {
                    "help": "Go to Keycloak Admin Console → Clients → xbi-tasking-backend → Credentials tab → Copy the Client secret → Update dev_server.config",
                },
            )
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": str(redirect_uri),
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                timeout=10.0,
            )
            
            logger.debug("auth_callback response status: %s", response.status_code)
            
            if response.status_code != 200:
                error_detail = response.text
                logger.warning("auth_callback token exchange failed: %s", response.status_code)
                logger.warning("auth_callback error response: %s", error_detail)
                
                # Parse error to provide helpful message
                try:
                    error_json = response.json()
                    error_type = error_json.get("error", "unknown")
                    error_desc = error_json.get("error_description", error_detail)
                    
                    if error_type == "unauthorized_client":
                        help_msg = (
                            "The client secret in dev_server.config doesn't match Keycloak.\n"
                            "To fix:\n"
                            "1. Go to Keycloak Admin Console: http://localhost:8080/admin\n"
                            "2. Navigate to: Clients → xbi-tasking-backend → Credentials tab\n"
                            "3. Copy the 'Client secret' value\n"
                            "4. Update 'client_secret' in xbi_tasking_backend/dev_server.config\n"
                            "5. Restart the backend server"
                        )
                    else:
                        help_msg = f"Error: {error_desc}"
                    
                    return error_response(
                        500,
                        error_desc,
                        "token_exchange_failed",
                        {
                            "error_type": error_type,
                            "status_code": response.status_code,
                            "help": help_msg,
                        },
                    )
                except Exception:
                    return error_response(
                        500,
                        error_detail,
                        "token_exchange_failed",
                        {
                            "status_code": response.status_code,
                            "help": "Check that the client_secret in dev_server.config matches the Client secret in Keycloak (Clients → xbi-tasking-backend → Credentials tab)",
                        },
                    )
            
            token_data = response.json()
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            id_token = token_data.get("id_token")
            
            if not access_token:
                logger.error("auth_callback: no access token in response")
                return error_response(
                    500,
                    "Token exchange succeeded but no access token received",
                    "no_access_token",
                )
            
            logger.info("auth_callback token exchange successful")
            
            # Decode token to get user info
            from jose import jwt
            try:
                token_for_claims = id_token or access_token
                if not token_for_claims:
                    raise ValueError("No token available for user info")
                token_info = jwt.get_unverified_claims(token_for_claims)
                username = token_info.get("preferred_username") or token_info.get("sub", "user")
                
                logger.debug("auth_callback username: %s", username)
                
                # Redirect to frontend with tokens in URL fragment (more secure than query params)
                # Frontend will extract tokens from fragment
                fragment_params = {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "id_token": id_token,
                    "username": username,
                }
                
                # Build redirect URL with fragment
                redirect_url = f"{frontend_url}#{urllib.parse.urlencode(fragment_params)}"
                logger.debug("auth_callback redirecting to frontend")
                response = RedirectResponse(url=redirect_url)
                response.delete_cookie("kc_state")
                return response
                
            except Exception as e:
                logger.exception("auth_callback token decode failed: %s", e)
                return error_response(500, str(e), "token_decode_failed")
                
    except Exception as e:
        logger.exception("auth_callback token exchange error: %s", e)
        return error_response(500, str(e), "token_exchange_error")


@router.post("/auth/refresh")
async def auth_refresh(request: Request):
    """
    Refresh access token using a refresh token.
    """
    if not KEYCLOAK_ENABLED:
        return {"detail": "Keycloak authentication is disabled"}

    try:
        data = await request.json()
    except Exception:
        return error_response(400, "Invalid JSON", "invalid_json")
    refresh_token = data.get("refresh_token")
    if not refresh_token:
        return error_response(400, "Missing refresh token", "missing_refresh_token")

    config = request.app.state.config
    keycloak_url = config.getKeycloakURL()
    realm = config.getKeycloakRealm()
    client_id = config.getKeycloakClientID()
    client_secret = config.getKeycloakClientSecret()

    token_url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/token"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            token_url,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret,
            },
            timeout=10.0,
        )
        if response.status_code != 200:
            return error_response(401, response.text, "refresh_failed")
        return response.json()


@router.get("/auth/logout")
async def auth_logout(request: Request):
    """
    Logs out user from Keycloak and redirects to frontend.
    """
    if not KEYCLOAK_ENABLED:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=frontend_url)
    
    config = request.app.state.config
    keycloak_url = config.getKeycloakURL()
    realm = config.getKeycloakRealm()
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # Build Keycloak logout URL
    logout_url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/logout"
    redirect_uri = f"{frontend_url}"
    
    params = {
        "redirect_uri": redirect_uri,
    }
    
    logout_url_with_params = f"{logout_url}?{urllib.parse.urlencode(params)}"
    
    return RedirectResponse(url=logout_url_with_params)
