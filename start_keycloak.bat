@echo off
set JAVA_HOME=C:\Program Files\Java\jdk-25
cd /d "C:\Users\theol\Downloads\keycloak-26.4.7\keycloak-26.4.7\bin"
echo Starting Keycloak with JAVA_HOME=%JAVA_HOME%
.\kc.bat start-dev --http-port=8080
pause


