# Background of XBI Tasking Module UI

XBI is an annotation application developed by DSTA for 68ISU and 68 wants an additional module that allows them to task our work to their NSFs. However, it is a 68 specific requirement and they are not keen in doing such a specific module. Therefore, SCVU was tasked to create such a module for them. Initially, such a module is supposed to be connected to DSTA's XBI via an API, however, they were not keen due to authentication worries. Therefore, XBI is now a separate application, connected by an manual operator that has to export the data from XBI and upload it to the Tasking Module UI.

# Purpose of XBI Tasking Module UI

The UI offers 2 main benefit:

1. One stop place that allows SGTs to task out images and for NSFs to see what images was assigned to them

This makes it less confusing for both party as they can refer back to check what was tasked to them instead of remembering what was verbally tasked to them. It also increases accountability as the images can be traced back to who was it assigned to.

2. Allow regulars to generate an excel with all information of the images that were done

Regulars used to key the images done with its information manually into an excel sheet, however, if all the information are filled on the UI, they can just download the excel report whenever they want.

# Sad Sad Story of XBI Tasking Module

XBI Tasking Module was fully completed in end February 2023. However, we were told that it could not be deployed until 2024. Therefore, it will be sitting in our Gitlab until SAF is ready to deploy applications into JPE. Big fat L.

# How to setup XBI Tasking Module UI

XBI Tasking Module UI is written in Reactjs and hosted on Node.js. It is made with elements from the MUI React library. We then made adjustments to the elements in order to fit our use cases. Therefore, you will need to refer to MUI documentation in order to continue development of the UI.

### Step 1. Setup Node.js

Go to CAERN-7 > E > AIB Resources > Installer > Node

Copy the installer and install Node.js onto your computer. (v16.18.0)

## Important!! > How to manage the node modules for XBI Tasking Module UI

It is a little complicated to manage the node modules as we do not have a NPM mirror in SCVU warehouse. Therefore, we will need to install the node_modules online before bringing it down.

In order to do so, your package.json in warehouse needs to be the same as online. Therefore, it is important to update a copy of the package.json somewhere online and update it everytime you make changes to the node_modules. 

If they are the same, `npm install` the package and bring down both the package.json and the node_modules (remember to update your online copy, I use github to save it).

I used github LFS to upload a .7z node_modules so that whoever who wants to setup project do not need to go up and bring it down. However, if you make changes to the node modules, PLEASE replace the 7z in the git with the latest one that you brought down and remember to disable the license checker on MUI (Note 1).

##### Optional explanation if you do not know how node_modules work:

##### The node modules are built according to the package.json file. Whenever you install/delete packages, npm will edit the package.json accordingly. This means that you can just copy the package.json file and do `npm install` to create the node_modules. 

##### Therefore, someone needs to keep a copy of the package.json file online so that you can add/delete packages online, and after you make the changes, do `npm install` and bring down the node_modules and package.json to warehouse. If there isn't a copy online, you will have to install everything manually then. Hopefully, this gives context to the above explanation.

### Step 2. How to setup the node modules from the 7z file (deston copy)

1. Unzip the node_modules.7z (delete any pre-existing node modules)
2. Make sure it extracts into a folder called "node_modules" and you are done

### Step 3. Edit the .env

Remember to edit the DB API URL to the respective IP that the DB API is hosted at. In the future, this should be edited by docker/kuber in JPE idk. 

######  This env can actually be put into the react-script so that it is possible to `npm start prod/dev` using different env variable, FYI only.

### Step 4. Starting up the UI server

1. Open a CMD in the main file directory of XBI-UI
2. run `npm start` in the CMD

### Note 1: If there are watermarks on the MUI elements on the UI, follow these steps below

This happens because when the person who brought down a new version of node_modules, they did not do the following steps. Therefore, please remember to do it then zip it and upload it to git.

These steps MUST BE DONE BEFORE RUNNING NPM START, right after Step 2, if not you will have to delete the node_modules and do these steps again!

1. Under node_modules/@mui/x-license-pro/verifyLicense/verifyLicense.js, under export function verifyLicense({}) {}, `return 'return LicenseStatus.Valid;'` at line 95

2. Save the file and npm start normally. There should not be anymore watermarks/error message.


### Note 2: Deploying in the future

To whoever is deploying it in the future, please build a production version and deploy that. This is currently a development build. TY

### Note 3: duck is innocent

Roger dodger ask me to document the file structure but theres only 3 folders :/ so I hope he doesnt see this.