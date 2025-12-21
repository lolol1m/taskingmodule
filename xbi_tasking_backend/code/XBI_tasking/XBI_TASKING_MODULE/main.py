from fastapi import FastAPI, Request
import requests

from main_classes import FrontendController

app = FastAPI()

fc = FrontendController()

@app.post("/")
async def index():
    return "it works"

@app.post("/get_assignees")
async def get_assignees(request: Request):
    '''
    '''
    data = await request.json()
    temp = fc.getAssignees(data)
    return temp

