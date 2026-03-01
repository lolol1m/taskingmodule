@echo off
setlocal

REM Start Keycloak
start "Keycloak" cmd /k "cd /d ""%~dp0keycloak_stuff"" && call start_keycloak.bat"

REM Start Backend
start "Backend" cmd /k "cd /d ""%~dp0xbi_tasking_backend"" && call start_backend.bat"

REM Start Frontend
start "Frontend" cmd /k "cd /d ""%~dp0xbi_tasking_frontend"" && npm run dev"

endlocal
