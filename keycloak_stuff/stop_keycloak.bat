@echo off
echo ============================================================
echo Stop Keycloak
echo ============================================================
echo.

echo Finding processes using port 8080...
netstat -ano | findstr :8080
if %errorlevel% neq 0 (
    echo No process found using port 8080.
    echo Keycloak may not be running.
    pause
    exit /b
)

echo.
echo Stopping Keycloak processes...
echo.

REM Try to find Java processes that might be Keycloak
tasklist /FI "IMAGENAME eq java.exe" /FO CSV | findstr /I "java.exe" >nul
if %errorlevel% == 0 (
    echo Found Java processes. Attempting to stop Keycloak...
    REM Kill all Java processes (be careful - this will kill ALL Java processes)
    REM Better to kill by port instead
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do (
        echo Stopping process with PID %%a...
        taskkill /F /PID %%a 2>nul
    )
) else (
    echo No Java processes found.
)

timeout /t 2 /nobreak >nul

echo.
echo Verifying port 8080 is free...
netstat -ano | findstr :8080
if %errorlevel% neq 0 (
    echo ✅ Port 8080 is now free.
) else (
    echo ⚠️  Port 8080 is still in use. You may need to manually stop the process.
    echo.
    echo To manually stop:
    echo   1. Run: netstat -ano | findstr :8080
    echo   2. Note the PID (last number)
    echo   3. Run: taskkill /F /PID <PID>
)

echo.
pause


