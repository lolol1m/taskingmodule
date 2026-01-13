@echo off
set JAVA_HOME=C:\Program Files\Java\jdk-25
cd /d "C:\Users\theol\Downloads\keycloak-26.4.7\keycloak-26.4.7\bin"
echo Starting Keycloak with JAVA_HOME=%JAVA_HOME%
echo.
echo Checking if port 8080 is in use...
netstat -ano | findstr :8080 >nul
if errorlevel 1 goto port_free
echo WARNING: Port 8080 is already in use!
echo Please stop the process using port 8080 first.
echo.
echo To find and stop the process:
echo   1. Run: netstat -ano | findstr :8080
echo   2. Note the PID (last number)
echo   3. Run: taskkill /F /PID ^<PID^>
pause
exit /b 1

:port_free
echo Port 8080 is available.
echo.
echo Starting Keycloak...
.\kc.bat start-dev --http-port=8080
pause

