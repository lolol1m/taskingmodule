from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY
import argparse
import uvicorn
import logging
import time
from fastapi.openapi.docs import (
    get_redoc_html,
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)
from fastapi.staticfiles import StaticFiles
from config import load_config
from main_classes.KeycloakAuth import KeycloakAuth
from app_state import init_app_state
from api_utils import error_response
from security import KEYCLOAK_ENABLED
import os

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("xbi_tasking_backend")

parser = argparse.ArgumentParser(description="runs xbi tasking backend server")
parser.add_argument(
    "config_path",
    nargs="?",
    default=os.getenv("CONFIG_PATH", "dev_server.config"),
    help="file path of the config file to be used",
)
args, _ = parser.parse_known_args()

config = load_config(args.config_path)
app = FastAPI(docs_url=None, redoc_url=None)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.state.config = config
skip_keycloak_init = os.getenv("SKIP_KEYCLOAK_INIT", "").lower() == "true"
app.state.keycloak_auth = KeycloakAuth(config=config, eager=not skip_keycloak_init)
init_app_state(app, config)

raw_origins = os.getenv("CORS_ORIGINS")
if raw_origins:
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
else:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
from routers import auth, images, lookup, notifications, reports, tasking, users

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    logger.warning("Validation error: %s", exc)
    return error_response(
        HTTP_422_UNPROCESSABLE_ENTITY,
        "Request validation failed",
        "validation_error",
        {"errors": exc.errors()},
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return error_response(500, "Internal server error", "internal_error")


# Keycloak authentication - can be enabled/disabled via environment variable
logger.info("Keycloak authentication: %s", "ENABLED" if KEYCLOAK_ENABLED else "DISABLED")

# IMPORTANT: Auth middleware must be registered BEFORE CORS middleware
# Middleware to validate tokens for ALL routes (except excluded ones)
@app.middleware("http")
async def keycloak_auth_middleware(request: Request, call_next):
    """
    Middleware that validates Keycloak tokens for all requests
    Excludes: /docs, /redoc, /openapi.json, /static, / (health check)
    """
    # Handle OPTIONS requests (CORS preflight) - these don't need auth
    if request.method == "OPTIONS":
        logger.debug("Middleware OPTIONS request allowed")
        response = await call_next(request)
        return response
    
    # List of paths that don't require authentication
    # Use exact match for most paths, but /static should match any path starting with /static
    excluded_exact_paths = ["/docs", "/redoc", "/openapi.json", "/", "/auth/login", "/auth/callback", "/auth/logout", "/auth/refresh"]
    excluded_prefix_paths = ["/static"]
    
    # Check if path is excluded (exact match or prefix match)
    if request.url.path in excluded_exact_paths or any(request.url.path.startswith(prefix) for prefix in excluded_prefix_paths):
        logger.debug("Middleware path excluded: %s", request.url.path)
        response = await call_next(request)
        return response
    
    # If Keycloak is disabled, allow all requests but set anonymous user
    if not KEYCLOAK_ENABLED:
        logger.debug("Keycloak disabled; using anonymous user")
        request.state.user = {"sub": "anonymous", "preferred_username": "anonymous"}
        response = await call_next(request)
        return response
    
    # Validate token for all other routes
    keycloak_auth = request.app.state.keycloak_auth
    
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning("Missing or invalid Authorization header for %s", request.url.path)
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=401,
            content={"detail": "Not authenticated. Missing or invalid Authorization header."},
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = auth_header.split(" ")[1]
    if not token:
        logger.warning("Empty token in Authorization header for %s", request.url.path)
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=401,
            content={"detail": "Not authenticated. Empty token."},
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        token_info = await keycloak_auth.verify_token(token)
        
        if not token_info:
            logger.warning("Token validation failed for %s", request.url.path)
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired token"},
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Attach user info to request state for use in route handlers
        request.state.user = token_info
        
        # Continue with the request
        response = await call_next(request)
        return response
        
    except HTTPException as e:
        logger.warning("HTTPException in middleware for %s: %s", request.url.path, e.detail)
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail}, headers=e.headers)
    except Exception as e:
        logger.exception("Exception in middleware for %s", request.url.path)
        raise

@app.middleware("http")
async def request_timing_middleware(request: Request, call_next):
    if logger.isEnabledFor(logging.DEBUG):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        logger.debug("%s %s completed in %.2fms", request.method, request.url.path, duration_ms)
        return response
    return await call_next(request)

app.include_router(auth.router)
app.include_router(images.router)
app.include_router(users.router)
app.include_router(tasking.router)
app.include_router(lookup.router)
app.include_router(reports.router)
app.include_router(notifications.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="/static/swagger-ui-bundle.js",
        swagger_css_url="/static/swagger-ui.css",
    )


@app.get(app.swagger_ui_oauth2_redirect_url, include_in_schema=False)
async def swagger_ui_redirect():
    return get_swagger_ui_oauth2_redirect_html()

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=app.title + " - ReDoc",
        redoc_js_url="/static/redoc.standalone.js",
    )


@app.get("/")
async def index():
    return "it works"


if __name__ == '__main__':
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)