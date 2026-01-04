
/*
 * Hello! This amazing JS file was done by DESTONWASHERE (17)
 * I tried to document as much as possible since as of 02/03/2023 as it is slated to be deployed in 2024
 * So hopefully it is easy to understand and change accordingly! Have fun! 
 * P.S We had not much prior knowledge so it is probably not the best way to do many of the things we needed to 
 * but yeah it was done in 2week+ because they told us to faster do it but then end up need to wait 1 year ._. 
 * but the geist of how we did it was to use MUI elements as much as possible and modify it to fit our needs
 * so you will need to go see MUI documentation on the elements in order to understand :p
*/

import * as React from 'react';
import useKeycloakRole from "./useKeycloakRole";

import { DataGridPro, GridToolbar } from '@mui/x-data-grid-pro';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import { Button } from "@mui/material";

import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import ClickAwayListener from '@mui/material/ClickAwayListener';

import Copy from 'copy-to-clipboard';


import axios from "axios";
let _ = require('lodash'); // lodash is a library to handle nested arrays


const TaskingSummary = (dateRange) => {
  const refresh = () => window.location.reload(true)
  const [inputData, setInputData] = useState({})  // to store the table data from DB API
  const [workingData, setWorkingData] = useState({}) // initially populated using inputData and subsequently changed by the different inputs on the table
  const [selectedRow, setSelectedRow] = useState([]) // a list of rowId that are currently selected on the table
  const [toSendData, setToSendData] = useState({}) // the data that is to be sent to the DB API, based on the selectedRow.
  const [reloadRows, setReloadRows] = useState(false) // a boolean in order to trigger the reloading of the table data
  const [dropdownValues, setDropdownValues] = useState({"Report": [null], "Cloud Cover": [null], "Image Category": [null]}) 
  // ^ dropdown values, predefined with default values and subsequently populated onload by the DB API

  const [rows, setRows] = useState([]); // to store the data that the MUI Datagrid table reads from, therefore a convertion from inputData is needed.
  // NOTE-- The values inside here will be used for the initial render and any subsequent 

  function getDropdownValues(apiPath, valueName) { // function to call DB API and get the dropdown values and assign them to dropdownValues
    axios.get(apiPath)
        .then(function (response) {

          let dataObj = response.data
          _.set(dropdownValues, valueName, dataObj[valueName] ) 
          // ^ access the dict and assign the chosen value according to the key into dropdownValues, _.set is lodash, helps to access dictionaries in JS
          setDropdownValues({ ...dropdownValues })  // place the data from the DB API into dropdownValues
        })
        .catch(function (error) {
          console.log(error);
        });
  }
  useEffect(
    () => {

      axios.post('/getTaskingSummaryData', dateRange.dateRange) // function to call DB API and get the TS data for that daterange
      .then(function (response) {

        setInputData(response.data); // place the data from the DB API into inputData
      })
      .catch(function (error) {
        console.log(error);
      });
    }, [reloadRows, dateRange.dateRange]); // reloadRows is a useState to trigger a refresh of data on the DOM, also refresh when dateRange changes

  useEffect(
    () => {

      if (inputData && inputData !== undefined) {
        setReloadRows(false) // reset the reloadRows value back to false since we have reloaded the rows
        setRows(() => {
          let rows = []
          Object.keys(inputData).map((key) => { // iterate through the dictionary and for each item, reformat it and push it into a list
           
            let inputDataByKey = inputData[key]

            if (inputDataByKey["Child ID"]){
              const imageFileName = inputDataByKey["Image File Name"] || `Image_${key}`;
              rows.push({ groupName: [imageFileName], sensorName: inputDataByKey["Sensor Name"], imageId: inputDataByKey["Image ID"],  
                              uploadDate: inputDataByKey["Upload Date"], imageDateTime: inputDataByKey["Image Datetime"], areaName: inputDataByKey["Area"], 
                              assignee: inputDataByKey["Assignee"], report: inputDataByKey["Report"], taskStatus: inputDataByKey["Task Completed"], 
                              priority: inputDataByKey["Priority"], imageCategory: inputDataByKey["Image Category"], imageQuality: inputDataByKey["Image Quality"],
                              cloudCover: inputDataByKey["Cloud Cover"], ewStatus: inputDataByKey["EW Status"], targetTracing: inputDataByKey["Target Tracing"],
                              v10: inputDataByKey["V10"], opsV: inputDataByKey["OPS V"], remarks: inputDataByKey["Remarks"], id: parseInt(key) , childId: inputDataByKey["Child ID"]},)
            } else if (inputDataByKey["Parent ID"] !== undefined) {
              // Convert Parent ID to integer for dictionary lookup (backend returns it as string or int)
              const parentId = parseInt(inputDataByKey["Parent ID"]);
              let parentDict = inputData[parentId] || inputData[inputDataByKey["Parent ID"]];
              let parentName = parentDict ? (parentDict["Image File Name"] || `Image_${parentId}`) : `Image_${parentId}`;
              let areaName = inputDataByKey["Area Name"] || `Area_${key}`;
              rows.push({ groupName: [parentName, areaName], taskStatus: inputDataByKey["Task Status"], 
                        assignee: inputDataByKey["Assignee"], remarks: inputDataByKey["Remarks"], 
                        id: parseInt(key), parentId: parentId, scvuTaskId: inputDataByKey["SCVU Task ID"] || null},)
            }
          });
          return rows
        });
        setWorkingData(inputData)
        getDropdownValues("/getReport", "Report")
        getDropdownValues("/getCloudCover", "Cloud Cover")
        getDropdownValues("/getImageCategory", "Image Category")
        // ^ call the function to populate dropdownValue for each value, ensure the string is the correct key name according to the DB data
      }
    }, [inputData]); // this useEffect will only run after inputData has changed, which mean that inputData has been populated by the DB call

  function renderImageCategory(params) { // to render image category HTML in the rows
    
    const updateImageCategoryValue = (newValue, imgCatDictPath) => { // define a function to update the workingData with the new value
      _.set(workingData, imgCatDictPath, newValue )
      setWorkingData({ ...workingData })
    }

    let id = String(params.row.id)
    let imgCatDictPath = id.concat(".", "Image Category") // path to access the dict, this is how lodash works
    if (params.row.childId) {
      return ( // html to be rendered
        <Autocomplete // mui's autocomplete
          disablePortal
          id="combo-box-image-category"
          options={dropdownValues["Image Category"]} // get the options from dropdownValues
          value={_.get(workingData, imgCatDictPath )} // get the value from workingData
          onChange={(e, newValue) => updateImageCategoryValue(newValue, imgCatDictPath)}
          sx={{ width: 200 }}
          renderInput={(params) => <TextField {...params} label="Img Category" />}
        />
      );
      } else {
        return ''
    }
  }
  /* memo'd to prevent the element from re-rendering every time there is a change in the DOM for other elements, 
  instead only update this DOM whenever a value related to this element changes. */
  const RenderMemorisedImageCategory = React.memo( 
    renderImageCategory,
    (prevProps, nextProps) => {
      return prevProps.value === nextProps.value;
    }
  )

  function renderCloudCover(params) {

    const updateCloudCoverValue = (newValue, ccDictPath) => { // define a function to update the workingData with the new value
  
        _.set(workingData, ccDictPath, newValue )
        setWorkingData({ ...workingData })
    }

    let id = String(params.row.id)
    let ccDictPath = id.concat(".", "Cloud Cover") // path to access the dict, this is how lodash works
    if (params.row.childId) {
      return ( // html to be rendered
        <Autocomplete // mui's autocomplete
          disablePortal
          id="combo-box-cloud-cover"
          options={dropdownValues["Cloud Cover"]}  // get the options from dropdownValues
          value={_.get(workingData, ccDictPath )}  // get the value from workingData
          onChange={(e, newValue) => updateCloudCoverValue(newValue, ccDictPath)}
          sx={{ width: 200 }}
          renderInput={(params) => <TextField {...params} label="CC" />}
        />
      );
    } else {
      return (
        ''
      )
    }
  }
  /* memo'd to prevent the element from re-rendering every time there is a change in the DOM for other elements, 
  instead only update this DOM whenever a value related to this element changes. */
  const RenderMemorisedCloudCover = React.memo( 
    renderCloudCover,
    (prevProps, nextProps) => {
      return prevProps.value === nextProps.value;
    }
  )

  function renderReport(params) {
    const updateReportValue = (newValue, reportDictPath) => {
      
      _.set(workingData, reportDictPath, newValue )
      setWorkingData({ ...workingData })
    }

    let id = String(params.row.id)
    let reportDictPath = id.concat(".", "Report")
    const reportColor =  (reportValue) => { // return the rgba for the different report value (according to 68 wants)
      if (reportValue == "IIRS") {
        return 'rgba(105, 181, 248, 0.5)'
      } else if (reportValue == "DS(SF)") {
        return 'rgba(105, 248, 139, 0.68)'
      } else if (reportValue == "IIR") {
        return 'rgba(105, 248, 139, 0.68)'
      } else if (reportValue == "Research") {
        return 'rgba(248, 233, 91, 0.8)'
      } else if (reportValue == "Re-DL") {
        return 'rgba(248, 233, 91, 0.8)'
      } else if (reportValue == "TOS") {
        return 'rgba(51, 28, 9, 0.5)'
      } else if (reportValue == "Img Error") {
        return 'rgba(248, 23, 26, 0.75)'
      } else if (reportValue == "Failed") {
        return 'rgba(248, 23, 26, 0.75)'
      } else if (reportValue == "Downgrade") {
        return 'rgba(248, 86, 22, 0.75)'
      } else if (reportValue == "HOTO") {
        return 'rgba(192, 22, 247, 0.7)'
      }
    }
    if (params.row.childId) {

      return (
        <Autocomplete
          disablePortal
          id="combo-box-report"
          options={dropdownValues["Report"]}
          value={_.get(workingData, reportDictPath )}
          onChange={(e, newValue) => updateReportValue(newValue, reportDictPath)}
          sx={{ width: 170, backgroundColor: reportColor(_.get(workingData, reportDictPath) ) }} // get the report value and pass into the func for the rgba
          renderInput={(params) => <TextField {...params} label="Report" />}
        />
      );
    } else{
      return (
        ''
      )
    }
  }
  /* memo'd to prevent the element from re-rendering every time there is a change in the DOM for other elements, 
  instead only update this DOM whenever a value related to this element changes. */
  const RenderMemorisedReport = React.memo(
    renderReport,
    (prevProps, nextProps) => {
      return prevProps.value === nextProps.value;
    }
  )

  function renderTargetTracing(params) {

    const updateTargetTracing = (newValue, ttDictPath) => {
      
      _.set(workingData, ttDictPath, newValue )
      setWorkingData({ ...workingData })
    }

    let id = String(params.row.id)
    let ttDictPath = id.concat(".", "Target Tracing")
    if (params.row.childId) { // check if the row has a childId, if it does, it means it is a parent(image row)
      return ( // return checkbox if it is an image row
        <Checkbox
          checked={_.get(workingData, ttDictPath)}
          onChange={(e, newValue) => updateTargetTracing(newValue, ttDictPath)}
        />
      );
    } else {
      return ( // return empty string if it is not, so it shows an empty cell
        ""
      )
    }
  }
  /* memo'd to prevent the element from re-rendering every time there is a change in the DOM for other elements, 
  instead only update this DOM whenever a value related to this element changes. */
  const RenderMemorisedTargetTracing = React.memo(
    renderTargetTracing,
    (prevProps, nextProps) => {
      return prevProps.value === nextProps.value;
    }
  )
  
  function LinearProgressWithLabel(props) { // mui's linear progress bar with a label
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress variant="determinate" {...props} />
        </Box>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="text.secondary">{`${props.text}`}</Typography>
        </Box>
      </Box>
    );
  }
  
  LinearProgressWithLabel.propTypes = {
    /*
     * The value of the progress indicator for the determinate and buffer variants.
     * Progress Bar Value between 0 and 100.
     */
    value: PropTypes.number.isRequired,
  };

  function renderLinearWithValueLabel(params) {
    let id = String(params.row.id)
    let taskCompletedDictPath = id.concat(".", "Task Completed")
    let taskStatusDictPath = id.concat(".", "Task Status")

    if (params.row.childId){
      
      let taskCompletedString = _.get(workingData, taskCompletedDictPath) // the string will be like 1/4, how many completed, over how many total
      let percentage = eval(taskCompletedString) * 100 // eval converts a string fraction into a decimal so 1/4 = 0.25 * 100 = 25. It will show 25%
      return (
        <Box sx={{ width: '100%' }}>
          <LinearProgressWithLabel value={percentage} text={taskCompletedString} />
        </Box>
      );
    } else {
        return _.get(workingData, taskStatusDictPath)
      }
  }
  /* memo'd to prevent the element from re-rendering every time there is a change in the DOM for other elements, 
  instead only update this DOM whenever a value related to this element changes. */
  const RenderMemorisedLinearWithValueLabel = React.memo( 
    renderLinearWithValueLabel,
    (prevProps, nextProps) => {
      return prevProps.value === nextProps.value;
    }
  )

  const columns = [
    
    { // define a column called imageAreaName that will have values of both imageName and areaName according to whether its an image or area
      field: 'imageAreaName',
      headerName: 'Image/Area Name',
      width: 200 ,
      valueGetter: (params) => {
        const hierarchy = params.row.groupName;
        if (!hierarchy || !Array.isArray(hierarchy) || hierarchy.length === 0) {
          return params.row.id?.toString() || 'Unknown';
        }
        return hierarchy[hierarchy.length - 1]; 
        /* return the last name in groupName, which is where the treePath is. So if its the first row ([image1]), it will return itself
          If it is the 2nd row, it will be the last of [image1, area2].
        */
      }
    },
    { field: 'sensorName', headerName: 'Sensor Name', width: 120 },
    { field: 'imageId', headerName: 'Image ID', width: 120 },
    { field: 'uploadDate', headerName: 'Upload Date', width: 160 },
    { field: 'imageDateTime', headerName: 'Image Date Time', width: 160  },
    { field: 'areaName', headerName: 'Area Name', width: 100  },
    { field: 'assignee', headerName: 'Assignee', width: 120},
    { // define a report column that renders a custom cell according to the return of the function called, which is the memo'd renderReport
      field: 'report',
      headerName: 'Report',
      renderCell: (params) => {
        return <RenderMemorisedReport {...params} />; 
      },
      minWidth: 180,
    },
    { field: 'remarks', headerName: 'Remarks', minWidth: 160,
      editable: true, // enable this cell to be editable via datagrid inbuilt editor, subject to the condition at the bottom, in the datagrid tag, 'isCellEditable'.
    },
    { // define a progress bar column that renders a custom cell according to the return of the function called, which is the memo'd renderLinearWithValueLabel
      field: 'progressBar', headerName: 'Image Status',
      renderCell: (params) => {
        return <RenderMemorisedLinearWithValueLabel {...params} />;
      },
      minWidth: 200
    },
    { field: 'priority', headerName: 'Priority' },
    { // define a progress bar column that renders a custom cell according to the return of the function called, which is the memo'd renderLinearWithValueLabel
      field: 'imageCategory',
      headerName: 'Image Category',
      renderCell: (params) => {
        return <RenderMemorisedImageCategory {...params} />;
      },
      minWidth: 160
    },
    {
      field: 'imageQuality',
      headerName: 'Image Quality',
      minWidth: 160,
      editable: true, // enable this cell to be editable via datagrid inbuilt editor, subjected to the same condition
    },
    {
      field: 'cloudCover',
      headerName: 'Cloud Cover',
      renderCell: (params) => {
        
        return <RenderMemorisedCloudCover {...params} />;
      },
      minWidth: 160
    },
    { field: 'ewStatus', headerName: 'EW Status', width: 100 },
    {
      field: 'targetTracing',
      headerName: 'Target Tracing',
      renderCell: (params) => {
        return <RenderMemorisedTargetTracing {...params} />;
      },
      width: 110
    },
    { field: 'v10', headerName: 'V10', width: 100 },
    { field: 'opsV', headerName: 'OPS V', width: 100 },
  ];

  // handles what happens when there is a edit in the datagrid's cell by row
  const onCellEditCommit = (newRow, oldRow) => { 
    // receives a newRow and oldRow dict value of the row that was edited in the datagrid and update the workingData with the newRow values
    let id = String(newRow.id)
    let remarksDictPath = id.concat(".", "Remarks")
    _.set(workingData, remarksDictPath, newRow.remarks)
    let imgCategoryDictPath = id.concat(".", "Image Quality")
    _.set(workingData, imgCategoryDictPath, newRow.imageQuality)
    setWorkingData({ ...workingData })
    return newRow // needs to return the newRow as it shows the newRow value on the datagrid
  }
  
  const checkIfEditableCell = (params) => { // additional condition to determine if the row is editable, ontop of the editable:true defined at columns
    if (params.row.parentId !== undefined && params.field == "remarks") { // if is childrenRow, show
      return true
    } else if (params.row.childId !== undefined && params.field == "imageQuality") { // if is parentRow, show
      return true
    }
  }

  const [openCopy, setOpenCopy] = useState(false); // handle the state of the tooltip, which is the gray popup when u click copy to clipboard
  const handleTooltipClose = () => {
    setOpenCopy(false);
  };
  const handleTooltipOpen = () => {
    setOpenCopy(true);
  };

  const [clipboardValue, setClipboardValue] = useState("")
  const copyClipboard = () => { // handle the logic of copy to clipboard
    if (selectedRow.length == 0){ //
      alert("Please select a task")
    } else {
      let id = String(selectedRow[0]) // This will be the first row's ID
      let parentIdDictPath = id.concat(".", "Parent ID") // Define the path to access the parent of this row and get the image ID
      let parentId = _.get(workingData, parentIdDictPath) 
      if (parentId == undefined) { // if the ID does not have a parentId, it means its a image, therefore alert
        alert("Please select tasks only")
      } else { 
        let copyImageIdDictPath = String(parentId).concat(".", "Image ID")
        let copyText = String(_.get(workingData, copyImageIdDictPath)) // get imageID of that task's parent

        setClipboardValue(copyText)
        processTask('/startTasks') // call DB API to set state from Incomplete to In Progress
        handleTooltipOpen() // open the popup to show what ID was copied to clipboard
        Copy(copyText) // function to copy the text to the clipboard
      }
    }
  }


  const processTask = (apiPath) => { // function to call the DB for all Task related queries, apiPath will determine the exact DB API to call
    let isTask = true
    console.log("NIMA")
    console.log(apiPath)
    if (selectedRow.length == 0) { // if there are no row selected to be processed
      isTask = false 
      alert("Please select a row")
    } 
    selectedRow.forEach((rowId) => {
      console.log(rowId)
      console.log(selectedRow)
      let childIdDictPath = String(rowId).concat(".", "Child ID")
      console.log(childIdDictPath)
      console.log(workingData)
      if ((_.get(workingData, childIdDictPath) !== undefined)){ // ensure that none of the selected rows have child ID, aka no image row
        isTask = false
        alert("Please select a task row")
      }
    })
    if (isTask){
      // Get the actual task IDs from the selected rows
      let taskIds = [];
      selectedRow.forEach((rowId) => {
        // Find the row in the rows array to get the scvuTaskId
        const row = rows.find(r => r.id === rowId);
        if (row && row.scvuTaskId) {
          taskIds.push(row.scvuTaskId);
        } else {
          console.warn(`Row ${rowId} does not have a task ID, using row ID as fallback`);
          taskIds.push(rowId); // Fallback to row ID if task ID not found
        }
      });
      
      if (taskIds.length === 0) {
        alert("No valid task IDs found. Please select task rows.");
        return;
      }
      
      let json = {
        "SCVU Task ID": taskIds
      }
      console.log("Sending task IDs:", json);
      axios.post(apiPath, json)
      .then(function (response) {
        console.log(response);
        alert("Task(s) completed successfully!");
      })
      .catch(function (error) {
        console.error("Error completing task:", error);
        const errorMsg = error.response?.data?.error || error.response?.data?.detail || error.message || "Unknown error";
        alert("Error completing task: " + errorMsg);
      });
      setReloadRows(true)
    }
  }

  const processImage = (apiPath) => { // function to call the DB for all Image related queries, apiPath will determine the exact DB API to call
    let isImage = true
    if (selectedRow.length == 0) { // if there are no row selected to be processed
      isImage = false
      alert("Please select an Image Row to be completed")
    } else {
      selectedRow.forEach((rowId) => {
        let parentIdDictPath = String(rowId).concat(".", "Parent ID")
        if ((_.get(workingData, parentIdDictPath) !== undefined)){  // ensure that none of the selected rows have parent ID, aka no task row
          isImage = false
        }
      })
      if (isImage == false) alert("Please select only Image Rows")
    }

    if (isImage){ // semi hardcoded to be used for complete image, this means that processImage cant rly be used for other button to process image.
      // First, save any pending changes (image category, cloud cover, remarks, etc.) for the selected images
      let dataToSave = {};
      let hasChanges = false;
      selectedRow.forEach((rowId) => {
        let dataRow = _.get(workingData, rowId);
        if (dataRow && dataRow["Child ID"]) {
          // This is an image row - save its data
          dataToSave[rowId] = dataRow;
          hasChanges = true;
        }
      });
      
      // Also save task remarks for areas under these images
      Object.keys(workingData).forEach((key) => {
        let dataRow = _.get(workingData, key);
        if (dataRow && dataRow["Parent ID"] !== undefined) {
          // This is a task/area row
          let parentId = dataRow["Parent ID"];
          if (selectedRow.includes(parentId)) {
            // This task belongs to one of the selected images - save its remarks
            if (!dataToSave[key]) {
              dataToSave[key] = {};
            }
            dataToSave[key]["Remarks"] = dataRow["Remarks"];
            hasChanges = true;
          }
        }
      });
      
      // Save changes first, then complete the image
      const saveAndComplete = () => {
        let sessionUsername = sessionStorage.getItem('username');
        let usernameString = JSON.parse(sessionUsername);
        let json = {
          "SCVU Image ID": selectedRow,
          "Vetter": usernameString 
        }

        axios.post(apiPath, json)
        .then(function (response) {
          console.log(response);
          // Check for errors in response
          if (response.data) {
            const imageIds = json["SCVU Image ID"];
            for (let i = 0; i < imageIds.length; i++) {
              const imageId = imageIds[i];
              const result = response.data[imageId];
              if (result && result.error) {
                alert(`Image ${imageId}: ${result.error}`);
              } else if (result && result.success) {
                console.log(`Image ${imageId} completed successfully`);
              }
            }
          }
          setReloadRows(true); // refresh the DOM as the row that was completed would be gone and into CI
        })
        .catch(function (error) {
          console.log(error);
          alert("Error completing image: " + (error.response?.data?.detail || error.message));
        });
        console.log("###posted to CI###", json)
      };
      
      if (hasChanges && Object.keys(dataToSave).length > 0) {
        // Save changes first, then complete
        axios.post("/updateTaskingSummaryData", dataToSave)
          .then(function (response) {
            console.log("Changes saved before completing image:", response);
            saveAndComplete();
          })
          .catch(function (error) {
            console.error("Error saving changes:", error);
            alert("Error saving changes. Image will not be completed. Please try again.");
          });
      } else {
        // No changes to save, just complete the image
        saveAndComplete();
      }
    };
  } 

  const processSendData = () => {

    let isNullPresent = false
    selectedRow.forEach((rowId) => { 
      let dataRow = _.get(workingData, rowId)
      if (dataRow["Child ID"]) { 
        if (dataRow["Report"] == null || dataRow["Image Category"] == null || dataRow["Cloud Cover"] == null){ // if any of the fields are null, alert
          isNullPresent = true
        }
      }
      _.set(toSendData, rowId, dataRow)
      setToSendData({ ...toSendData })

    });
    let apiPath = "/updateTaskingSummaryData"
    console.log(toSendData, "tosenddata")
    console.log(isNullPresent)
    if (isNullPresent == false){
      axios.post(apiPath, toSendData)
        .then(function (response) {
          console.log(response);
        })
        .catch(function (error) {
          console.log(error);
        });
      setReloadRows(true)
    } else {
      alert("your selected row(s) has an empty value in the dropdown")
    }
  };
  // Get role from Keycloak token
  const role = useKeycloakRole();
  
  let isShow = {} 
  if (role === "II"){ // control the permission level of each user
    isShow = {"CT": true, "VF": false, "VP": false, "CI": false }
  } else if (role === "Senior II") {
    isShow = {"CT": true, "VF": true, "VP": true, "CI": true }
  } else if (role === "IA"){
    isShow = {"CT": true, "VF": true, "VP": true, "CI": true }
  }

  const [pageSize, setPageSize] = React.useState(10);

  const getTreeDataPath = (row) => {
    // Ensure groupName exists and is an array, filter out undefined values
    if (!row.groupName || !Array.isArray(row.groupName)) {
      return [row.id?.toString() || 'unknown'];
    }
    let path = row.groupName.filter(item => item != null).map(item => item?.toString() || '');
    
    // For image rows (groupName length === 1), append the row ID to ensure uniqueness
    // This prevents errors when multiple images have the same file name
    if (path.length === 1 && row.id !== undefined && row.id !== null) {
      path[0] = `${path[0]}_${row.id}`;
    }
    // For area rows (groupName length === 2), match the parent's path format
    // Parent image's path is [imageFileName_id], so area should be [imageFileName_id, areaName]
    else if (path.length === 2 && row.parentId !== undefined && row.parentId !== null) {
      // Reconstruct the parent's unique path format
      const parentImagePath = `${path[0]}_${row.parentId}`;
      path[0] = parentImagePath;
    }
    
    return path;
  }; // this defines what value should make up the dropdown table. Images get unique paths, areas nest under their parent
  const groupingColDef = {
    headerName: "",
    hideDescendantCount: true,
    valueFormatter: () => "",
    width: 20
  };

  return (
    <div style={{ height: 750, width: '100%', display: 'inline-block', textalign: 'center' }}>
      {/* box to render the buttons ontop of the datagrid */}
      <Box display="flex" justifyContent="space-between" sx={{width: '60%', margin: 'auto', paddingBottom: '10px', paddingTop: '10px', }} >
        {/**
         * ClickAwayListener: add in a listener to check when the user click away and thus, hide the tooltip window
         * Tooltip: responsible for displaying the ID that was copied to the user, its the grey popup whenever u click the button 
         * Tooltip.title: is the value that is displayed on the tooltip
        */}
        <Button variant="contained" onClick={() => {setReloadRows(true)}}>Refresh</Button>
        <Button variant="contained" onClick={refresh}>Change Display Date</Button>
        <ClickAwayListener onClickAway={handleTooltipClose}> 
          <Tooltip 
            PopperProps={{
              disablePortal: true,
            }}
            onClose={handleTooltipClose}
            open={openCopy}
            disableFocusListener
            disableHoverListener
            disableTouchListener
            title={clipboardValue}
            >
            <Button variant="contained" onClick={() => {copyClipboard()}}>Start task</Button>
            </Tooltip>
        </ClickAwayListener> {/* button will show according to the value of each key in isShow. remember to write in the DB api address when ecalling the processTask/Image */}
        { isShow.CT ? <Button variant="contained" onClick={() => {processTask('/completeTasks')}}>Complete Task</Button>  : null} 
        { isShow.VF ? <Button variant="contained" onClick={() => {processTask('/verifyFail')}}>Verify Fail</Button> : null}
        { isShow.VP ? <Button variant="contained" onClick={() => {processTask('/verifyPass')}} >Verify Pass</Button> : null}
        { isShow.CI ? <Button variant="contained" onClick={() => {processImage('/completeImages')}}>Complete Image</Button> : null}
        <Button variant="contained" onClick={processSendData}>Apply Change</Button>
      </Box>

        <DataGridPro
          sx={{'& .MuiDataGrid-cell--editable': {
            bgcolor: 'rgba(222, 239, 240, 0.4)',
          },}} // set those cell that are editable to a certain colour, to show the user that these cells can be editted to write values inside
          onCellClick={() => null}
          onCellDoubleClick={() => null}
          onCellFocusOut={() => null}
          onRowClick={() => null}
          onColumnHeaderClick={() => null}
          disableDensitySelector
          rowsScroll={() => null}
          stateChange={() => null} // all these ^ is just to prevent re-rendering when these happen, preventing unnecessary lag from rerendering.

          treeData // this is to set the datagrid to treeData, which means rows that have the option to dropdown into more rows
          rows={rows} // define where are the rows
          columns={columns} // define where are the columns
          getTreeDataPath={getTreeDataPath} // define what value is used to map the relationship of the rows, whether is it a parent or a children row
          groupingColDef={groupingColDef}  // split the dropdown arrow from within the image/area name cell into a column on its own
          components={{ Toolbar: GridToolbar }} // enable different componenets in MUI datagrid, gridtoolbar is the toolbar on the topleft of the datagrid
          rowHeight={80} // height of each row of data
          checkboxSelection // enable a checkbox selection for each row
          disableSelectionOnClick // disable the selection of the row when clicking on the row, must disable if not clicking the dropdown will select the row
          onSelectionModelChange={ids => setSelectedRow(ids) } // function to handle to selecting of the row's. It is a list of all the rows that are selected
          
          isCellEditable={(params) => checkIfEditableCell(params) } // function that holds the logic to determine whether that cell should be editable or not
          processRowUpdate={onCellEditCommit} // function to be called whenever there is an edit in the cell of a row. It is by row, see the func for more details.
          onProcessRowUpdateError={(params) => console.log(params)} // necessary function to handle if there is an error when saving the new edited value of the cell, currently no error handling as it shouldnt break in our case
          experimentalFeatures={{ newEditingApi: true }} // enable editing of the cells in datagrid

          pageSize={pageSize} // the variable that holds the page size
          onPageSizeChange={(newPageSize) => setPageSize(newPageSize)} // update the new page size value
          rowsPerPageOptions={[10, 15, 20]} // define the different options that you can change the page size to
          pagination // enable page size selection on the datagrid
        />

    </div>
  );
}

export default TaskingSummary