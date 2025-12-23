@echo off
TITLE XBI Tasking Backend Server
cd /d "%~dp0"
echo Starting XBI Tasking Backend Server...
echo.
.\venv\Scripts\python.exe main.py dev_server.config
pause



