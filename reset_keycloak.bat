@echo off
echo ========================================
echo Keycloak Fresh Reset Script
echo ========================================
echo.
echo This will:
echo 1. Stop all Keycloak/Java processes
echo 2. Delete ALL Keycloak data (realms, users, clients)
echo 3. Start fresh Keycloak server
echo.
pause

echo.
echo Stopping Keycloak processes...
taskkill /F /IM java.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Deleting Keycloak data...
set "KEYCLOAK_DIR=C:\Users\theol\Downloads\keycloak-26.4.7\keycloak-26.4.7"
if exist "%KEYCLOAK_DIR%\data" (
    echo Found data directory, deleting...
    rmdir /s /q "%KEYCLOAK_DIR%\data"
    echo Data directory deleted.
) else (
    echo Data directory not found (may already be fresh).
)

echo.
echo Keycloak has been reset to fresh state!
echo.
echo To start Keycloak, run: start_keycloak.bat
echo.
pause
