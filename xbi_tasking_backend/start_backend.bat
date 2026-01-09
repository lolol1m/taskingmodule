@echo off
TITLE XBI Tasking Backend Server
cd /d "%~dp0"
echo Starting XBI Tasking Backend Server...
echo.

REM Set Keycloak environment variables
set KEYCLOAK_URL=http://localhost:8080
set KEYCLOAK_REALM=xbi-tasking
set KEYCLOAK_CLIENT_ID=xbi-tasking-backend
set KEYCLOAK_CLIENT_SECRET=CpYBsLztlLtlTPtHfbzB4w1k3lhSAcgK
set KEYCLOAK_ADMIN_CLIENT_ID=xbi-tasking-admin
set KEYCLOAK_ADMIN_CLIENT_SECRET=nOJMcD30RVTVkBgI1rJCdaGUref818cg
set KEYCLOAK_ENABLED=true

.\venv\Scripts\python.exe main.py dev_server.config
pause





