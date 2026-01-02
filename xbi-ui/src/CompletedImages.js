import React, { useEffect, useState } from "react";
import { DataGridPro, GridToolbar } from "@mui/x-data-grid-pro";
import { Button, Box } from "@mui/material";

import { baseURL } from "./App";

import axios from "axios";
let _ = require('lodash');


function CompletedImages({ dateRange }) { // dateRange has "Start Date" and "End Date", to be used to get data
  const refresh = () => window.location.reload(true) // run everytime DOM needs to be refreshed
  const [inputData, setInputData] = useState({}); // stores state of DOM, data taken from complete image data
  const [selectedRow, setSelectedRow] = useState([]); // stores rows that are selected to be uncompleted
  const [rows, setRows] = useState([]); // stores rows to be created based off complete image data

  const [completedImagesData, setCompletedImagesData] = useState([]); // used to set input data

  const [reload, setReload] = useState(false); // refreshes DOM by toggling between true/false

  useEffect(
    () => {


      axios.post('/getCompleteImageData', {
        "Start Date": dateRange['Start Date'],
        "End Date": dateRange['End Date'],
      })
        .then(function (res) {
          setCompletedImagesData(res.data)
        })
        .catch(function (error) {
          console.log(error);
        })
    }, [reload, dateRange]); // when reload changes (reloadCITable() function is run) or dateRange changes, this useEffect runs

  function reloadCITable() {
    setReload(!reload); // toggles reload between true and false to reload the page as "reload" is used as a dependency for useEffect hooks
  }

  useEffect(
    () => {
      if (completedImagesData && completedImagesData !== undefined) { // checks for completedImagesData and that it is not empty
        setInputData(completedImagesData);
        setRows(() => {
          let output = []
          Object.keys(completedImagesData).map((key) => {

            let inputDataByKey = completedImagesData[key]

            // Only show image rows - skip area/task entries (entries with "Parent ID")
            if (inputDataByKey["Child ID"] && !inputDataByKey["Parent ID"]) { // Only image entries (has Child ID, no Parent ID)
              const imageFileName = inputDataByKey["Image File Name"] || `Image_${key}`;
              output.push({
                imageFileName: imageFileName, // Simple field name for display
                sensorName: inputDataByKey["Sensor Name"],
                imageId: inputDataByKey["Image ID"], 
                uploadDate: inputDataByKey["Upload Date"],
                imageDateTime: inputDataByKey["Image Datetime"], 
                areaName: inputDataByKey["Area"],
                assignee: inputDataByKey["Assignee"], 
                vetter: inputDataByKey["Vetter"],
                report: inputDataByKey["Report"], 
                imageCategory: inputDataByKey["Image Category"],
                imageQuality: inputDataByKey["Image Quality"], 
                cloudCover: inputDataByKey["Cloud Cover"],
                id: parseInt(key), 
                childId: inputDataByKey["Child ID"], 
                priority: inputDataByKey["Priority"]
              },)
            }
            // Skip all area/task entries - don't show them in Completed Images
          });
          return output;
        });
      }
    }, [completedImagesData] // is run everytime completedImagesData changes
  )

  const columns = [ // headers for data
    { field: 'imageFileName', headerName: 'Image File Name', width: 200 },
    { field: 'sensorName', headerName: 'Sensor Name' },
    { field: 'imageId', headerName: 'Image ID' },
    { field: 'uploadDate', headerName: 'Upload Date' },
    { field: 'imageDateTime', headerName: 'Image Date Time', minwidth: 180 },
    { field: 'areaName', headerName: 'Area Name' },
    { field: 'assignee', headerName: 'Assignee', width: 100 },
    { field: 'vetter', headerName: 'Vetter', width: 100 },
    { field: 'report', headerName: 'Reports' },
    { field: 'remarks', headerName: 'Remarks' },
    { field: 'imageCategory', headerName: 'Image Category' },
    { field: 'imageQuality', headerName: 'Image Quality' },
    { field: 'cloudCover', headerName: 'Cloud Cover' },
  ]


  const processImage = (apiPath) => { // function is run to uncomplete any images based off selected rows
    let isImage = true // changes to false if fails any checks, if passes all, uncomplete image will proceed
    if (selectedRow.length == 0) { // means no rows are selected
      isImage = false
    }
    selectedRow.forEach((rowId) => {
      let parentIdDictPath = String(rowId).concat(".", "Parent ID")
      if ((_.get(inputData, parentIdDictPath) !== undefined)) {  // ensure that none of the selected rows have parent ID, aka no task row
        isImage = false
      }
    })

    if (isImage) {
      axios.post(apiPath, {
        "SCVU Image ID": selectedRow // SCVU Image ID is an input taken in by API
      })
        .then(function (response) {
          console.log(response);
        })
        .catch(function (error) {
          console.log(error);
        });
      reloadCITable() // reloads the table to reflect new completed images
    };
  }

  return (
    <div style={{ height: 600, width: '100%' }}>
      <Box display="flex" justifyContent="space-evenly" alignItems='center' sx={{ width: "60%", margin: 'auto', paddingBottom: '10px', paddingTop: '10px', }} >
        <Button variant="contained" onClick={() => { reloadCITable() }}>Refresh</Button>
        <Button variant="contained" onClick={refresh}>Change Display Date</Button>
        <Button variant="contained" onClick={() => { processImage('/uncompleteImages') }}>Uncomplete Image</Button>
      </Box>
      {<DataGridPro
        rows={rows}
        columns={columns}
        components={{ Toolbar: GridToolbar }}
        rowHeight={80}
        checkboxSelection
        onSelectionModelChange={ids => setSelectedRow(ids)}
      />}
    </div>
  );
}

export default CompletedImages;
