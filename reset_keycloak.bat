@echo off
echo ============================================================
echo Keycloak Reset Script
echo ============================================================
echo.
echo This will:
echo   1. Stop Keycloak (if running)
echo   2. Delete all Keycloak data (realms, users, clients, etc.)
echo   3. Restart Keycloak with a fresh database
echo.
echo WARNING: This will DELETE ALL Keycloak data!
echo.
set /p confirm="Are you sure you want to reset Keycloak? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo Reset cancelled.
    pause
    exit /b
)

echo.
echo Stopping Keycloak processes...
taskkill /F /IM java.exe /FI "WINDOWTITLE eq *keycloak*" 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Finding Keycloak installation...
set KEYCLOAK_DIR=C:\Users\theol\Downloads\keycloak-26.4.7\keycloak-26.4.7
if not exist "%KEYCLOAK_DIR%" (
    echo ERROR: Keycloak directory not found at %KEYCLOAK_DIR%
    echo Please update the KEYCLOAK_DIR variable in this script.
    pause
    exit /b 1
)

echo Keycloak directory: %KEYCLOAK_DIR%

echo.
echo Deleting Keycloak data directory...
if exist "%KEYCLOAK_DIR%\data" (
    rmdir /S /Q "%KEYCLOAK_DIR%\data"
    echo   Deleted: %KEYCLOAK_DIR%\data
) else (
    echo   Data directory doesn't exist (already clean?)
)

echo.
echo Deleting Keycloak log files...
if exist "%KEYCLOAK_DIR%\*.log" (
    del /Q "%KEYCLOAK_DIR%\*.log"
    echo   Deleted log files
)

echo.
echo ============================================================
echo Keycloak has been reset!
echo ============================================================
echo.
echo Next steps:
echo   1. Run start_keycloak.bat to start Keycloak
echo   2. Go to http://localhost:8080/admin
echo   3. Create the admin user (first time only)
echo   4. Follow KEYCLOAK_SETUP.md to configure the realm
echo.
pause

