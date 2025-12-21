from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


origins = [
    "http://localhost.tiangolo.com",
    "https://localhost.tiangolo.com",
    "http://localhost",
    "http://localhost:8080",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return "hi"

@app.get("/get_priority")
async def get_priority():
    '''
    Function:   gets the priority for the priority column

    Input:      nothing

    Sample:     

    Output:

                {
                    "Priority": [<List of string that represents priority>]
                }

    Sample:

                {
                    "Priority": ["", "Low", "Medium", "High"]
                }     

    '''
    return {"Priority":["", "Low", "Medium", "High"]}

@app.get("/get_tasking_manager_data")
async def get_tasking_manager_data():
    '''
    Function:   gets the data for the tasking manager table

    Input:      nothing

    Sample:     

    Output:

                {
                    "Images": [
                        {
                            "SCVU Image ID": <integer that represents a hidden id to update the image>,
                            "Pass ID": <integer that represents pass id>,
                            "Sensor Name": <string that represents sensor name>,
                            "Image File Name": <string that represents image file name>,
                            "Image ID": <integer that represents the id of the image>,
                            "Upload Date": <string that represents the upload date>,
                            "Image Datetime": <string that represents the imaging datetime>,
                            "Assignee": <string that represents the first assignee or multiple>,
                            "Priority": <string that represents the priority or empty if not assigned">,
                            "Remarks": <string that represents the remarks of the image">
                        },
                        {
                            ...
                        }
                    ]
                }

    Sample:
    
                { 
                    "Images": [ 
                        { 
                            "SCVU Image ID": 1, 
                            "Pass ID": 12, 
                            "Sensor Name": "s1", 
                            "Image File Name": "abc.png", 
                            "Image ID": 2, 
                            "Upload Date": "29/1/2023 06:14", 
                            "Image Datetime": "29/1/2023 05:14", 
                            "Assignee": "multiple", 
                            "Priority": "", 
                            "Remarks": "image gone" 
                        },
                        { 
                            "SCVU Image ID": 2, 
                            "Pass ID": 12, 
                            "Sensor Name": "s1", 
                            "Image File Name": "abcd.png", 
                            "Image ID": 3, 
                            "Upload Date": "29/1/2023 06:14", 
                            "Image Datetime": "29/1/2023 05:14", 
                            "Assignee": "", 
                            "Priority": "Low", 
                            "Remarks": "image gone" 
                        }
                    ]
                }

    '''
    return { 
                    "Images": [ 
                        { 
                            "SCVU Image ID": 1, 
                            "Pass ID": 12, 
                            "Sensor Name": "s1", 
                            "Image File Name": "abc.png", 
                            "Image ID": 2, 
                            "Upload Date": "29/1/2023 06:14", 
                            "Image Datetime": "29/1/2023 05:14", 
                            "Assignee": "multiple", 
                            "Priority": "", 
                            "Remarks": "image gone" 
                        },
                        { 
                            "SCVU Image ID": 2, 
                            "Pass ID": 12, 
                            "Sensor Name": "s1", 
                            "Image File Name": "abcd.png", 
                            "Image ID": 3, 
                            "Upload Date": "29/1/2023 06:14", 
                            "Image Datetime": "29/1/2023 05:14", 
                            "Assignee": "", 
                            "Priority": "Low", 
                            "Remarks": "image gone" 
                        }
                    ]
                }

@app.post("/get_area_for_image")
async def get_area_for_image(json):
    '''
    Function:   gets the data for the area for the tasking manager

    Input:      

    Sample:     

        {
            "SCVU Image ID": 2
        }

    Output:

    Sample:
    
        {
            "Areas":[
                {"SCVU Area ID":4,"Area Name":"area1"},
                {"SCVU Area ID":5,"Area Name":"area3"}
                ]
        }

    '''
    return {
            "Areas":[
                {"SCVU Area ID":4,"Area Name":"area1"},
                {"SCVU Area ID":5,"Area Name":"area3"}
                ]
        }

@app.post("/update_tasking_manager_data")
async def update_tasking_manager_data(json):
    '''
    Function:   updates the data in tasking manager

    Input:      

    Sample:     

        {
            "Priority": "Low",
            "Remarks": ???
        }

    Output:

    Sample:
    
        {}

    '''
    return {}

@app.post("/assign_task")
async def assign_task(json):
    '''
    Function:   assigns a task given a image and area

    Input:      

    Sample:     

        {
            "SCVU Image ID": 1,
            "SCVU Area ID": 3
        }

    Output:

    Sample:
    
        {}

    '''
    return {}

@app.get("/get_tasking_summary_data")
async def get_tasking_summary_data():
    '''
    Function:   gives the data for tasking summary

    Input:      

    Sample:     

    Output:

    Sample:
    
        { 
            "Images": [ 
                { 
                    "SCVU Image ID": 1, 
                    "Sensor Name": "s1", 
                    "Image File Name": "abc.png", 
                    "Image ID": 2, 
                    "Upload Date": "29/1/2023 06:14", 
                    "Image Datetime": "29/1/2023 05:14",
                    "Area": "area1", 
                    "Assignee": "multiple", 
                    "Report": "",
                    "Task Completed": "1/3",
                    "Child ID": [3,4],
                    "Tasks":[
                        {"SCVU Task ID":3,"Area Name":"area1", "Assignee": "ZZ", "Task Status": "Completed", "Remarks":"", "parentID": 1},
                        {"SCVU Task ID":4,"Area Name":"area3", "Assignee": "Fermin", "Task Status": "Verifying", "Remarks":"hi", "parentID": 1}
                        ],
                    "Priority": "", 
                    "Image Category": "",
                    "Image Quality": "bad quality",
                    "Cloud Cover": "100C",
                    "EW Status": "DONE",
                    "Target Tracing": True,
                    "V10": True,
                    "OPS V": False,
                    "Remarks": "image gone" 
                },
                { 
                    "SCVU Image ID": 2, 
                    "Sensor Name": "s1", 
                    "Image File Name": "abdc.png", 
                    "Image ID": 3, 
                    "Upload Date": "29/1/2023 06:14", 
                    "Image Datetime": "29/1/2023 05:14",
                    "Area": "area1", 
                    "Assignee": "multiple", 
                    "Report": "report 1",
                    "Task Completed": "3/3",
                    "Child ID": [5,6],
                    "Tasks":[
                        {"SCVU Task ID":5,"Area Name":"area1", "Assignee": "Deston", "Remarks":"", "parentID": 1},
                        {"SCVU Task ID":6,"Area Name":"area3", "Assignee": "Duck","Remarks":"hi6", "parentID": 1}
                        ],
                    "Priority": "low", 
                    "Image Category": "cat 1",
                    "Image Quality": "bad quality",
                    "Cloud Cover": "100C",
                    "EW Status": "DONE",
                    "Target Tracing": True,
                    "V10": True,
                    "OPS V": False,
                    "Remarks": "image gone" 
                }

    '''
    # return { 
    #         "Images": [ 
    #             { 
    #                 "SCVU Image ID": 1, 
    #                 "Sensor Name": "s1", 
    #                 "Image File Name": "abc.png", 
    #                 "Image ID": 2, 
    #                 "Upload Date": "29/1/2023 06:14", 
    #                 "Image Datetime": "29/1/2023 05:14",
    #                 "Area": "area1", 
    #                 "Assignee": "multiple", 
    #                 "Report": "",
    #                 "Task Completed": "1/3",
    #                 "Child ID": [3,4],
    #                 "Tasks":[
    #                     {"SCVU Task ID":3,"Area Name":"area1", "Assignee": "ZZ", "Task Status": "Completed", "Remarks":"", "parentID": 1},
    #                     {"SCVU Task ID":4,"Area Name":"area3", "Assignee": "Fermin", "Task Status": "Verifying", "Remarks":"hi", "parentID": 1}
    #                     ],
    #                 "Priority": "", 
    #                 "Image Category": "",
    #                 "Image Quality": "bad quality",
    #                 "Cloud Cover": "100C",
    #                 "EW Status": "DONE",
    #                 "Target Tracing": True,
    #                 "V10": True,
    #                 "OPS V": False,
    #                 "Remarks": "image gone" 
    #             },
    #             { 
    #                 "SCVU Image ID": 2, 
    #                 "Sensor Name": "s1", 
    #                 "Image File Name": "abdc.png", 
    #                 "Image ID": 3, 
    #                 "Upload Date": "29/1/2023 06:14", 
    #                 "Image Datetime": "29/1/2023 05:14",
    #                 "Area": "area1", 
    #                 "Assignee": "multiple", 
    #                 "Report": "report 1",
    #                 "Task Completed": "3/3",
    #                 "Child ID": [5,6],
    #                 "Tasks":[
    #                     {"SCVU Task ID":5,"Area Name":"area1", "Assignee": "Deston", "Remarks":"", "parentID": 1},
    #                     {"SCVU Task ID":6,"Area Name":"area3", "Assignee": "Duck","Remarks":"hi6", "parentID": 1}
    #                     ],
    #                 "Priority": "low", 
    #                 "Image Category": "cat 1",
    #                 "Image Quality": "bad quality",
    #                 "Cloud Cover": "100C",
    #                 "EW Status": "DONE",
    #                 "Target Tracing": True,
    #                 "V10": True,
    #                 "OPS V": False,
    #                 "Remarks": "image gone" 
    #             }
    #         ]
    #     }
    return {
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
                            "Priority": "High", 
                            "Image Category": None,
                            "Image Quality": "bad quality",
                            "Cloud Cover": None,
                            "EW Status": "TTG DONE",
                            "Target Tracing": True,
                            "V10": True,
                            "OPS V": False,
                            "Remarks": "image is gone",
                            "Child ID": [1,2],
                        },
                        1: { 
                            "Area Name": "area1", 
                            "Assignee": "multiple", 
                            "Task Status": "Completed",
                            "Remarks": "image is gone",
                            "Parent ID": 0
                        }
            

        }

@app.post("/update_tasking_manager_data")
async def update_tasking_manager_data(json):
    '''
    Function:   Updates the data in tasking manager

    Input:      

    Sample:     

        {
            "Report": "report 1",
            "Remarks": "image gone",
            "Image Category": "cat 1",
            "Image Quality": "bad quality",
            "Cloud Cover": "100C",
            "Target Tracing": True
        }

    Output:

    Sample:
    
        {}

    '''
    return {}

@app.post("/get_task_for_image")
async def get_task_for_image(json):
    '''
    Function:   Gives the task for an image

    Input:      

    Sample:     

        {
            "SCVU Image ID": 1
        }

    Output:

    Sample:
    
        {
            "Tasks":[
                {"SCVU Task ID":6,"Area Name":"area1","Remarks":""},
                {"SCVU Task ID":7,"Area Name":"area3","Remarks":"hi"}
                ]
        }

    '''
    return {
        "Tasks":[
            {"SCVU Task ID":6,"Area Name":"area1","Remarks":""},
            {"SCVU Task ID":7,"Area Name":"area3","Remarks":"hi"}
            ]
    }

@app.post("/start_task")
async def start_task(json):
    '''
    Function:  starts the task

    Input:      

    Sample:     

        {
            "SCVU Task ID": 1
        }

    Output:

    Sample:
    
        {}

    '''
    return {}

@app.post("/complete_task")
async def complete_task(request: Request):
    '''
    Function:  completes the task (set to verify)

    Input:      

    Sample:     

        {
            "SCVU Task ID": 1
        }

    Output:

    Sample:
    
        {}

    '''
    data = await request.json()
    print(data)
    return data

@app.post("/verify_pass")
async def verify_pass(request: Request):
    '''
    Function:  completes the task (from verify to completed)

    Input:      

    Sample:     

        {
            "SCVU Task ID": 1
        }

    Output:

    Sample:
    
        {}

    '''
    data = await request.json()
    print(data)
    return data


@app.post("/verify_fail")
async def verify_fail(request: Request):
    '''
    Function:  fails the task (from verify to in progress)

    Input:      

    Sample:     

        {
            "SCVU Task ID": 1
        }

    Output:

    Sample:
    
        {}

    '''
    data = await request.json()
    print(data)
    return data

@app.post("/complete_image")
async def complete_image(request: Request):
    '''
    Function:  completes the image

    Input:      

    Sample:     

        {
            "SCVU Image ID": 1
        }

    Output:

    Sample:
    
        {}

    '''
    data = await request.json()
    print(data)
    return data

@app.get("/get_complete_image_data")
async def get_complete_image_data():
    '''
    Function:  gets the data for complete image page

    Input:      

    Sample:     

    Output:

    Sample:
    
        { 
            "Images": [ 
                { 
                    "SCVU Image ID": 1, 
                    "Pass ID": 12, 
                    "Sensor Name": "s1", 
                    "Image File Name": "abc.png", 
                    "Image ID": 2, 
                    "Upload Date": "29/1/2023 06:14", 
                    "Image Datetime": "29/1/2023 05:14",
                    "Area": "area1", 
                    "Assignee": "multiple", 
                    "Report": "",
                    "Priority": "", 
                    "Image Category": "",
                    "Image Quality": "bad quality",
                    "Cloud Cover": "100C",
                    "EW Status": "DONE",
                    "Remarks": "image gone" 
                }
            ]
        }

    '''
    return {
                0:
                    {
                        "SCVU Image ID": 0,
                        "Sensor Name": "hi",
                        "Image File Name": "Image 1234567890",
                        "Image ID": 0,
                        "Upload Date": "12/12/12 12:12",
                        "Image Datetime": "11/11/11 11:11",
                        "Area": "Area1",
                        "Assignee": "Jed",
                        "Vetter": "Jed",
                        "Report": "IMG ERROR",
                        "Remarks": "couldn't have been worse",
                        "Priority": "High",
                        "Image Category": "Love XBI",
                        "Image Quality": "bad",
                        "Cloud Cover": "",
                        "EW Status": "",
                        "Child ID": [1, 2]
                    },
                1:  {
                        "Group Name": ["Image1", "Area1"],
                        "Area": "Area1",
                        "Assignee": "Jed",
                        "Vetter": "Jed",
                        "Remarks": "what?",
                        "Parent ID": 0
                    },
                2:  {
                        "Group Name": ["Image1", "Area2"],
                        "Area": "Area2",
                        "Assignee": "Jed",
                        "Vetter": "Jed",
                        "Remarks": "you should retire",
                        "ID": 2,
                        "Parent ID": 0
                    },
                3:  {
                        "SCVU Image ID": 1,
                        "Sensor Name": "hey",
                        "Image File Name": "Image 0987654321",
                        "Image ID": 3,
                        "Upload Date": "12/12/12",
                        "Image Datetime": "11/11/11 11:11",
                        "Area": "Area2",
                        "Assignee": "Jed",
                        "Vetter": "Jed",
                        "Reports": "IMG ERROR",
                        "Remarks": "couldn't have been worse",
                        "Priority": "High",
                        "Image Category": "Love XBI",
                        "Image Quality": "bad",
                        "Cloud Cover": "",
                        "EW Status": "",
                        "Child ID": [4]
                    },
                4:  {
                        "Group Name": ["Image2", "Area1"],
                        "Area": "Area1",
                        "Assignee": "Jed",
                        "Vetter": "Jed",
                        "Remarks": "please try harder",
                        "Parent ID": 3
                    }
        }

@app.post("/un_complete_image")
async def un_complete_image(request: Request):
    data = await request.json()
    print(data)
    return data

@app.post("/test")
async def testing(request: Request):
    data = await request.json()
    print(data)
    return data