@echo off

call "..\venv\Scripts\activate.bat"

uvicorn main:app --host 192.168.1.2 --port 8000 --reload
pause