# XBI Tasking Module (Backend)

Unit: 68 ISU

Development: Oct 2022 - Feb 2023 

Deployment: NIL

Developers: Zhenzhi, Jordan 

Last Updated: 2023-04-06 (code) | 2024-03-21 (documentation)

<br>

XBI Tasking Module is a web-based application for 68 Imagery Analysts (IAs; ME1s) and Senior Imagery Interpreters (Senior IIs; 2/3SGs) to provide tasking information to their IIs. This repository details the backend server + database. Refer to XBI Tasking Module (Frontend) for the UI. 

XBI refers to Crossbeam, the application developed by DSTA (?) for use by 68 ISU for imagery exploitation. XBI Tasking Module is not integrated into XBI. 68 currently (as of early 2023) uses an excel sheet to task their IIs. XBI Tasking Module is commonly referred to simply as XBI in stuff like Ops Briefs.

The project includes functionality for: 
- login for different user privileges 
- input of image data from a JSON file exported from XBI 
- input of image data manually for TTG (another exploitation software)
- display of image data (sensor, base, base categories etc)
- tasking images (and the areas within that image) to other users
- marking image status (in progress, completed etc)
- exporting of data

The project was intended for deployment into JPE (Joint Production Environment) but was blocked as the person who could approve projects into JPE was on course. It has been dormant since then. 

## History

to be finalised

XBI tasking was done mainly within a ~2 week period during late 2022. Originally, it was intended for direct integration into XBI, necessitating research into ORMs to interact with the DB for security purposes. After that idea was dropped, we went back to standard practice. 

## Developer Information

Python FastAPI backend, Postgres database. 

"DB Gen 3"
