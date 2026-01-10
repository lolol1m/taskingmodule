from fastapi import FastAPI, Request, File, UploadFile, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import argparse
import uvicorn
import json
from fastapi.openapi.docs import (
    get_redoc_html,
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from main_classes import MainController, ConfigClass
import os

parser = argparse.ArgumentParser(description="runs xbi tasking backend server")
parser.add_argument("config_path", help="file path of the config file to be used")
args = parser.parse_args()

ConfigClass(args.config_path)
app = FastAPI(docs_url=None, redoc_url=None)
app.mount("/static", StaticFiles(directory="static"), name="static")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
mc = MainController()

# Keycloak authentication - can be enabled/disabled via environment variable
KEYCLOAK_ENABLED = os.getenv('KEYCLOAK_ENABLED', 'false').lower() == 'true'

# Middleware to validate tokens for ALL routes (except excluded ones)
@app.middleware("http")
async def keycloak_auth_middleware(request: Request, call_next):
    """
    Middleware that validates Keycloak tokens for all requests
    Excludes: /docs, /redoc, /openapi.json, /static, / (health check)
    """
    # List of paths that don't require authentication
    excluded_paths = ["/docs", "/redoc", "/openapi.json", "/", "/static"]
    
    # Check if path is excluded
    if any(request.url.path.startswith(path) for path in excluded_paths):
        response = await call_next(request)
        return response
    
    # If Keycloak is disabled, allow all requests
    if not KEYCLOAK_ENABLED:
        response = await call_next(request)
        return response
    
    # Validate token for all other routes
    try:
        from main_classes.KeycloakAuth import keycloak_auth
        
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=401,
                content={"detail": "Not authenticated. Missing or invalid Authorization header."},
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        token = auth_header.split(" ")[1]
        token_info = await keycloak_auth.verify_token(token)
        
        if not token_info:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired token"},
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Attach user info to request state for use in route handlers
        request.state.user = token_info
        
        # Continue with the request
        response = await call_next(request)
        return response
        
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"detail": e.detail},
            headers=e.headers
        )
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=401,
            content={"detail": f"Authentication failed: {str(e)}"},
            headers={"WWW-Authenticate": "Bearer"}
        )

# Optional authentication dependency for routes that need user info
async def get_current_user(request: Request):
    """
    Dependency to get current authenticated user from request state
    (set by middleware)
    """
    if not KEYCLOAK_ENABLED:
        return {"sub": "anonymous", "preferred_username": "anonymous"}
    
    user = getattr(request.state, 'user', None)
    if not user:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="/static/swagger-ui-bundle.js",
        swagger_css_url="/static/swagger-ui.css",
    )


@app.get(app.swagger_ui_oauth2_redirect_url, include_in_schema=False)
async def swagger_ui_redirect():
    return get_swagger_ui_oauth2_redirect_html()

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=app.title + " - ReDoc",
        redoc_js_url="/static/redoc.standalone.js",
    )


@app.get("/")
async def index():
    return "it works"

#TODO: legacy, please remove once confirmed not needed
@app.post("/accountLogin")
async def accountLogin(request: Request):
    '''
    Function: Login to account
    
    Input:
    
        {
            'Password': <str>
        }
    
    Sample:
    
        {
            'Password': 'i_am_not_trolling'
        }
    
    Output:
    
        {
            'Account': <str>
        }
    
    Sample:
    
        {
            'Account': 'II'
        }
        
    '''
    data = await request.json()
    return mc.accountLogin(data)

@app.post("/insertDSTAData")
async def insertDSTAData(file: UploadFile, user: dict = Depends(get_current_user)):
    '''
    Function: Imports data from DSTA (in a json file) and inserts it into db
    
    Input: (as a file)

        {
            'images': [{
                'imgId': <long>,
                'imageFileName': <str>, 
                'sensorName': <str>, 
                'uploadDate': <datetime>, 
                'imageDateTime': <datetime>, 
                'areas': [{ 
                    'areaId': <long>,
                    'areaName': <string>
                },
                ...
                ]
            },
            ...
            ]
        }

        # hello
                {
            'images': [{
                'imgId': <long>,
                'imageFileName': <str>,
                'sensorName': <str>,
                'uploadDate': <datetime>,
                'imageDateTime': <datetime>,
                'areas': [<string>, ...]
            },
            ...
            ]
        }
    
    Sample:
    
        {
            'images': [{
                'imgId': 12345,
                'imageFileName': 'hello.gif',
                'sensorName': 'SB',
                'uploadDate': <datetime>,
                'imageDateTime': <datetime>,
                'areas': [{
                    'areaId': 678910,
                    'areaName': 'area_51'
                },
                ...
                ]
            },
            ...
            ]
        }
        
    '''
    
    contents = await file.read()
    if file.content_type != "application/json":
        return {"error": "File must be JSON format"}
    try:
        json_data = json.loads(contents.decode('utf-8'))
        result = mc.insertDSTAData(json_data)
        return result
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "detail": "Failed to insert data"}
        )

@app.post("/insertTTGData")
async def insertTTGData(request: Request, user: dict = Depends(get_current_user)):
    '''
    Function: Inserts TTG Data into DB
    
    Input:
    
        {
            'imageFileName': <str>,
            'sensorName': <str>,
            'uploadDate': <datetime>,
            'imageDateTime': <datetime>,
            'areas': [<list of str>]
        }
    
    Sample:
    
        {
            'imageFileName': 'hello.gif',
            'sensorName': 'SB',
            'uploadDate': <datetime>,
            'imageDateTime': <datetime>,
            'areas': ['area1', 'area2']
        }
        
    '''
    data = await request.json()
    return mc.insertTTGData(data)

@app.get("/getPriority")
async def getPriority():
    '''
    Function: Gets the Priority list from the db
    
    Output:

        {
            'Priority': [<list of String>]
        }
    
    Sample:
    
        {
            "Priority": ["Low", "Medium", "High"]
        }
    '''
    return mc.getPriority()

@app.get("/getCloudCover")
async def getCloudCover():
    '''
    Function: Gets the Cloud Cover list from the db
    
    Output:

        {
            "Cloud Cover": [<list of String>]
        }
    
    Sample:
    
        {
            'Cloud Cover': ['UTC', '0C', '10-90C', '100C']
        }
    '''
    return mc.getCloudCover()

@app.get("/getImageCategory")
async def getImageCategory():
    '''
    Function: Gets the Image Category list from the db
    
    Output:

        {
            'Image Category': [<list of String>]
        }
    
    Sample:
    
        {
            'Image Category': ['Detection', 'Classification', 'Identification', 'Recognition']
        }
    '''
    return mc.getImageCategory()

@app.get("/getReport")
async def getReport():
    '''
    Function: Gets the Report list from the db
    
    Output:

        {
            'Report': [<list of string>]
        }
    
    Sample:
    
        {
            'Report': ['DS(OF)', 'DS(SF)', 'I-IIRS 0', 'IIR', 'Re-DL', 'Research', 'TOS', 'No Findings', 'Downgrade', 'Failed', 'Img Error']
        }
    '''
    return mc.getReport()

@app.get("/getUsers")
async def getUsers():
    '''
    Function: Gets the Users list from the db
    
    Output:

        {
            'Users': [<list of string>]
        }
    
    Sample:
    
        {
            'Users': ['user1', 'user2']
        }
    '''
    return mc.getUsers()

@app.post("/updateUsers")
async def updateUsers(file: UploadFile):
    '''
    Function: Imports parade state from 68 (in a csv file) and inserts it into users
    
    Input: csv file with column 'Name'
    
    '''
    
    if file.content_type not in ("text/csv", "application/vnd.ms-excel"):
        print("invalid file type")
        raise HTTPException(status_code=400, detail="Invalid file type. CSV required.")
        
    # Read file contents
    contents = await file.read()
    if not contents:
        print("empty CSV")
        raise HTTPException(status_code=400, detail="Empty CSV file")
        

    csv_text = contents.decode("utf-8")
    # print(csv_text)

    mc.updateUsers(csv_text)

    return {'status':'updateUser success'}

@app.post("/getTaskingSummaryData")
async def getTaskingSummaryData(request: Request):
    '''
    Function: Get Data for Tasking Summary page
    
    Input:

        {
            'Start Date': <datetime yyyy-mm-ddT16:00:00.000Z>,
            'End Date': <datetime yyyy-mm-ddT16:00:00.000Z>
        }
    
    Output:
        {

            0: { 
                        "Sensor Name": "s1", 
                        "Image File Name": "abc.png", 
                        "Image ID": 2, 
                        "Upload Date": "29/1/2023 06:14", 
                        "Image Datetime": "29/1/2023 05:14",
                        "Area": "area1", 
                        "Assignee": "multiple", 
                        "Report": None,
                        "Task Completed": "1/3",
                        "Priority": None, 
                        "Image Category": None,
                        "Image Quality": "bad quality",
                        "Cloud Cover": None,
                        "EW Status": "TTG DONE",
                        "Target Tracing": True,
                        "V10": True,
                        "OPS V": False,
                        "Remarks": "image is gone",
                        "Child ID": [1,2]

                    },
            1: { 
                        "Area Name": "area1", 
                        "Assignee": "multiple", 
                        "Task Status": "Completed",
                        "Remarks": "image is gone",
                        "Parent ID": 0 
                    },
        }
    '''
    try:
        data = await request.json()
        return mc.getTaskingSummaryData(data)
    except Exception as e:
        import traceback
        error_msg = f"Error in getTaskingSummaryData: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "detail": error_msg}
        )
    
@app.post("/getTaskingManagerData")
async def getTaskingManagerData(request: Request):
    '''
    Function: Gets tasking manager data (incomplete images) from db between date range
    
    Input:
    
        {
            'Start Date': <datetime yyyy-mm-ddT16:00:00.000Z>,
            'End Date': <datetime yyyy-mm-ddT16:00:00.000Z>
        }
    
    Sample:
    
        {
            'Start Date': '2024-04-04T16:00:00.000Z',
            'End Date': '2024-04-04T16:00:00.000Z'
        }
    
    Output:

        {
            <scvu image id>: {
                'Sensor Name': <str>,
                'Image File Name': <str>,
                'Image ID': <int of dsta image id>,
                'Upload Date': <datetime in dd/mm/yyyy hh:mm>,
                'Image Datetime': <datetime in dd/mm/yyyy hh:mm>,
                'Assignee': <str, 'multiple' or assignee name>,
                'Priority': <str Low Medium High>,
                'TTG': <boolean>
            },
            <scvu image area id>: {
                'Area Name': <str>,
                'Assignee': <str>,
                'Remarks': <str>,
                'Parent ID': <int>
            },
            ...
        }
    
    Sample:
    
        {
            1: {
                'Sensor Name': 'SB',
                'Image File Name': 'hello.gif',
                'Image ID': 493,
                'Upload Date': '04/04/2024 12:00',
                'Image Datetime': '04/04/2024 08:00',
                'Assignee': 'multiple',
                'Priority': 'High'
            },
            2: {
                'Area Name': 'area_554',
                'Assignee': 'pte thanos',
                'Remarks': '',
                'Parent ID': 1
            },
            3: {
                'Area Name': 'area_555',
                'Assignee': 'pte tony',
                'Remarks': '',
                'Parent ID': 1
            },
            ...
        }
        
    '''
    data = await request.json()
    return mc.getTaskingManagerData(data)

@app.post("/updateTaskingManagerData")
async def updateTaskingManagerData(request: Request):
    '''
    Function: Updates the priority of Image
    
    Input:
    
        {
            <scvu_image_id>: {
                'Priority': <string Low Medium High>
            },
            ...
        }
    
    Sample:
    
        {
            1: {
                'Priority': 'Medium'
            },
            ...
        }
    '''
    data = await request.json()
    return mc.updateTaskingManagerData(data)

@app.post("/assignTask")
async def assignTask(request: Request, user: dict = Depends(get_current_user)):
    '''
    Function: Assigns the Task to someone
    
    Input:
    
        {
            'Tasks': [
                {
                    'SCVU Image Area ID': <int>,
                    'Assignee': <string>
                }, ...
            ]
        }
    
    Sample:

        {
            'Tasks': [
                {
                    'SCVU Image Area ID': 1,
                    'Assignee': 'zz'
                }, ...
            ]
        }
    '''
    try:
        data = await request.json()
        return mc.assignTask(data)
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.post("/startTasks")
async def startTasks(request: Request):
    '''
    Function: Starts the Tasks by setting task status to In Progress
    
    Input:

        {
            'SCVU Task ID': <list of int>
        }
    
    Sample:
    
        {
            'SCVU Task ID': [1]
        }
    '''
    data = await request.json()
    return mc.startTasks(data)

@app.post("/completeTasks")
async def completeTasks(request: Request):
    '''
    Function: Completes the Tasks for user by setting task status to Verifying
    
    Input:

        {
            'SCVU Task ID': <list of int>
        }
    
    Sample:
    
        {
            'SCVU Task ID': [1]
        }
    '''
    data = await request.json()
    return mc.completeTasks(data)
    
@app.post("/verifyPass")
async def verifyPass(request: Request):
    '''
    Function: Verifies the Tasks as passed and sets task status to Complete
    
    Input:

        {
            'SCVU Task ID': <list of int>
        }
    
    Sample:
    
        {
            'SCVU Task ID': [1]
        }
    '''
    data = await request.json()
    return mc.verifyPass(data)

@app.post("/verifyFail")
async def verifyFail(request: Request):
    '''
    Function: Verifies the Tasks as Failed and resets task status to In Progress
    
    Input:

        {
            'SCVU Task ID': <list of int>
        }
    
    Sample:
    
        {
            'SCVU Task ID': [1]
        }
    '''
    data = await request.json()
    return mc.verifyFail(data)

@app.post("/completeImages")
async def completeImages(request: Request, user: dict = Depends(get_current_user)):
    '''
    Function: Checks if all tasks for images have Completed status, then updates completed_date of image to current datetime
    
    Input:
        {
            'SCVU Image ID': <list of int>,
            'Vetter': <string>
        }
    
    Sample:
    
        {
            'SCVU Image ID': [1],
            'Vetter': 'hi'
        }
    '''
    data = await request.json()
    return mc.completeImages(data)

@app.post("/uncompleteImages")
async def uncompleteImages(request: Request):
    '''
    Function: Sets the completed date of images to None
    
    Input:
        {
            'SCVU Image ID': <list of int>
        }
    
    Sample:
    
        {
            'SCVU Image ID': [1]
        }
    '''
    data = await request.json()
    return mc.uncompleteImages(data)

@app.post("/getCompleteImageData")
async def getCompleteImageData(request: Request):
    '''
    Function: Gets data for completed images including their areas
    Input:
    
        {
            'Start Date': <datetime yyyy-mm-ddT16:00:00.000Z>,
            'End Date': <datetime yyyy-mm-ddT16:00:00.000Z>
        }
    
    Sample:
    
        {
            'Start Date': '2024-04-04T16:00:00.000Z',
            'End Date': '2024-04-05T16:00:00.000Z'
        }
    
    Output:
    
        {
            <scvu image id>: {
                'Sensor Name' : <str>,
                'Image File Name' : <str>,
                'Image ID' : <int or null>,
                'Upload Date' : <str>,
                'Image Datetime' : <datetime>,
                'Area' : <str of first area name>,
                'Assignee' : <str of first area assignee>,
                'Report' : <str>,
                'Priority' : <str>,
                'Image Category' : <str>,
                'Image Quality' : <str>,
                'Cloud Cover' : <str>,
                'EW Status' : <boolean>,
                'Vetter': <str>,
                'Remarks': <str of all area remarks>
            },
            <scvu area id>: {
                "Area Name" : <str>,
                "Remarks" : <str>,
                "Assignee" : <str>,
                "Parent ID" : <int of parent scvu image id>,
            },
            ...
        }
    
    '''

    data = await request.json()
    return mc.getCompleteImageData(data)

@app.post("/updateTaskingSummaryData")
async def updateTaskingSummaryData(request: Request):
    '''
    Function: Updates the report, image category, image quality, cloud cover & target tracing of image
    
    Input:
    
        {
            <scvu_image_id>: {
                'Report': <str>,
                'Image Category': <str>,
                'Image Quality': <str>,
                'Cloud Cover': <str>,
                'Target Tracing': <boolean>
            },
            ...
        }
    
    Sample:
        
        {
            <scvu_image_id>: {
                'Report': <str>,
                'Image Category': <str>,
                'Image Quality': <str>,
                'Cloud Cover': <str>,
                'Target Tracing': <boolean>
            },
            ...
        }
        
    '''
    data = await request.json()
    return mc.updateTaskingSummaryData(data)

@app.get("/getSensorCategory")
async def getSensorCategory():
    '''
    Function: gets the category of the sensors
    
    Output:
    
        {
            'CAT_A': ['sensor 1', 'sensor 2'],
            'CAT_B': ['sensor 3', 'sensor 4'],
            'UNCATEGORISED': ['sensor 5', 'sensor 6']
        }
    
    Sample:
        
        {
            <category name str>: [<sensor name str>, <sensor name str>],
            <category name str>: [<sensor name str>, <sensor name str>],
            'UNCATEGORISED': [<sensor name str>, <sensor name str>]
        }
        
    '''
    return mc.getSensorCategory()


@app.post("/updateSensorCategory")
async def updateSensorCategory(request: Request):
    '''
    Function: Updates the category of the sensors
    
    Input:
    
        {
            'Sensors': [{
                'Name': <str>,
                'Category': <str>
            },
            ...
            ]
        }
    
    Sample:
        
        {
            'Sensors': [{
                'Name': 'sensor a',
                'Category': 'CAT_A'
            },
            ...
            ]
        }
        
    '''
    data = await request.json()
    return mc.updateSensorCategory(data)

@app.get("/getAreas")
async def getAreas():
    '''
    Function: Get all the areas for the UI
    
    Output:
    
        {
            'Areas': [{
                'ID': <int of ID>, 
                'Area Name': <string of area name>, 
                'OPS V': <boolean whether it is ops v or not>
            },
            ...
            ]
        }
    
    Sample:
        
        {
            'Areas': [{
                'ID': 1024362, 
                'Area Name': 'G074', 
                'OPS V': False
            },
            ...
            ]
        }
        
    '''
    return mc.getAreas()

@app.post("/setOpsvAreas")
async def setOpsvAreas(request: Request):
    '''
    Function: Updates the area for those that are OpsV
    
    Input:
    
        {
            'Areas': [{
                'ID': <int of ID>, 
                'Area Name': <string of area name>, 
                'OPS V': <boolean whether it is ops v or not>
            },
            ...
            ]
        }
    
    Sample:
        
        {
            'Areas': [{
                'ID': 1024362, 
                'Area Name': 'G074', 
                'OPS V': True
            },
            ...
            ]
        }
        
    '''
    data = await request.json()
    return mc.setOpsvAreas(data)

@app.post("/getXBIReportData")
async def getXBIReportData(request: Request):
    '''
    Function: gets the XBI report data to display on UI

    Input:
    
        {
            'Start Date': <datetime yyyy-mm-ddT16:00:00.000Z>,
            'End Date': <datetime yyyy-mm-ddT16:00:00.000Z>
        }
    
    Sample:
    
        {
            'Start Date': '2024-04-04T16:00:00.000Z',
            'End Date': '2024-04-05T16:00:00.000Z'
        }

    Output:
    
        {
            'Category': [<string>, <string>, <string>, <string>], 
            'Exploitable': [<int>, <int>, <int>, <int>], 
            'Unexploitable': [<int>, <int>, <int>, <int>], 
            'Remarks': <string>
        }
    
    Sample:
        
        {
            'Category': ['UAV', 'AB', 'HB', 'AVIS'], 
            'Exploitable': [1, 1, 0, 0], 
            'Unexploitable': [2, 0, 0, 0], 
            'Remarks': 'UAV\nImg Error - 1\nFailed - 1\n'
        }
        
    '''
    data = await request.json()
    return mc.getXBIReportData(data)

@app.post("/getXBIReportDataForExcel")
async def getXBIReportDataForExcel(request: Request):
    '''
    Function: gets the XBI report data to display on UI

    Input:
    
        {
            'Start Date': <datetime yyyy-mm-ddT16:00:00.000Z>,
            'End Date': <datetime yyyy-mm-ddT16:00:00.000Z>
        }
    
    Sample:
    
        {
            'Start Date': '2024-04-04T16:00:00.000Z',
            'End Date': '2024-04-05T16:00:00.000Z'
        }
    '''
    data = await request.json()
    excel_file_path = mc.getXBIReportDataForExcel(data)
    return FileResponse(path=excel_file_path, filename=excel_file_path)

@app.post("/deleteImage")
async def deleteImage(request: Request, user: dict = Depends(get_current_user)):
    '''
    Function: Deletes an image and its associated image_areas and tasks from db
    Input:
    
        {
            'SCVU Image ID': <int>
        }
    
    Sample:
    
        {
            'SCVU Image ID': 12
        }
    '''
    data = await request.json()
    return mc.deleteImage(data)


if __name__ == '__main__':
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)