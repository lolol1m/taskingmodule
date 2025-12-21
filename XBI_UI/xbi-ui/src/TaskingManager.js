import {
  DataGridPro,
  useGridApiRef,
  useKeepGroupedColumnsHidden,
  GridToolbar
} from '@mui/x-data-grid-pro';
import { useAxios } from "./useAxios";
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { memo, useEffect, useState, useMemo } from 'react';
import { Button, Box, IconButton } from "@mui/material";
import * as React from 'react';

import CreateTTGModal from './CreateTTG.js';
import DatePickerModal from './DatePicker.js'
import axios from 'axios';

import DeleteIcon from "@mui/icons-material/Delete";

export default function TaskingManager({ dateRange }) {
  /* variables and useState */
  // console.log(dateRange);
  const refresh = () => window.location.reload(true)
  const [reload, setReload] = useState(false);
  const [assignee, setAssignee] = useState(['Multiple']);
  // console.log(assignee);

  const [rows, setRows] = useState([]);

  const [actions, setActions] = useState(false);

  const MemoizedAssigneeCellRenderer = memo(
    renderAssignee,
    (prevProps, nextProps) => {
      return prevProps.value === nextProps.value;
    }
  );

  /* Columns for the Tasking Manager table */
  const columns = [
    { field: 'imageName', headerName: 'Image File Name', width: 200 },
    { field: 'imageDatetime', headerName: 'Image Datetime', width: 200 },
    { field: 'sensorName', headerName: 'Sensor Name', width: 200 },
    {
      field: 'priority',
      headerName: 'Priority',
      renderCell: renderPriority,
      minWidth: 160
    },
    {
      field: 'assignee',
      headerName: 'Assignee',
      renderCell: (params) => <MemoizedAssigneeCellRenderer {...params} />,
      minWidth: 160

    },
    { field: 'uploadDate', headerName: 'Upload Date', width: 200 },
    {
      field: 'ttg',
      headerName: 'Action',
      width: 150,
      minWidth: 150,
      renderCell: renderTTG
    }
  ];

  const [selectionModel, setSelectionModel] = useState([]);

  /* useEffect for initialising stuff */
  useEffect(
    () => {
      console.log("USEEFFECT TM");
      axios.get('/getUsers')
        .then(
          res => {
            console.log(res);
            if (res['data']['Users']) {
              setAssignee(['Multiple'].concat(res['data']['Users']));
            }
          }
        );
      axios.post('/getTaskingManagerData', dateRange)
        .then(
          res => {
            console.log(res);
            if (res['data'] && res['data'] !== undefined) {
              console.log(res['data']);
              setRows(formatData(res['data']));
            };
          }
        )
        .catch(
          err => {
            console.log(err);
          }
        );
    }, [reload]);

  /* Functions */
  /* Reload TM table when the  */
  function reloadTMTable() {
    console.log("refreshed")
    setReload(!reload);
  }

  /* Format the incoming data from API */
  function formatData(inputData) {
    let formattedData = [];

    formattedData = Object.keys(inputData).map((key) => {
      let inputDataByKey = inputData[key];

      if (inputDataByKey["Parent ID"]) {
        let parentDict = inputData[inputDataByKey["Parent ID"]];
        let parentName = parentDict["Image File Name"];
        return {
          groupName: [`${parentName} (${inputDataByKey["Parent ID"]})`, inputDataByKey["Area Name"]],
          assignee: inputDataByKey['Assignee'],
          parentId: inputDataByKey["Parent ID"],
          id: parseInt(key)
        };
      }
      else {
        return {
          groupName: [`${inputDataByKey["Image File Name"]} (${parseInt(key)})`],
          assignee: inputDataByKey['Assignee'],
          sensorName: inputDataByKey["Sensor Name"],
          imageName: inputDataByKey["Image File Name"],
          uploadDate: inputDataByKey["Upload Date"],
          imageDatetime: inputDataByKey["Image Datetime"],
          priority: inputDataByKey["Priority"],
          ttg: inputDataByKey["TTG"],
          id: parseInt(key)
        };
      };
    });

    console.log(formattedData);
    return formattedData;
  }

  /* Returns assignee row  */
  function Assignee({ params, imgAssignee }) {
    // console.log('RENDER ASSIGNEE');
    if (params.rowNode.parent === null) {
      return (
        <Autocomplete
          disablePortal
          id="combo-box-assignee"
          options={assignee || []}
          getOptionDisabled={(option) =>
            ['Multiple'].includes(option)
          }
          sx={{ width: 300 }}
          renderInput={(params) => <TextField {...params} label="Assignee" />}
          value={imgAssignee || params.value || null}
          onChange={(event, newValue) => {
            // console.log(newValue);
            if (newValue == null) {
              newValue = "";
            }
            let newRows = [...rows];
            // newRows[params.id] = { ...params.row, assignee: newValue };
            newRows = newRows.map(
              row => {
                if (row.id === params.id) {
                  return { ...row, assignee: newValue };
                }
                else {
                  return row;
                }
              });
            if (params.rowNode.children) {
              for (let childId of params.rowNode.children) {
                // newRows[index] = { ...newRows[index], assignee: newValue };
                newRows = newRows.map(
                  row => {
                    if (row.id === childId) {
                      return { ...row, assignee: newValue };
                    }
                    else {
                      return row;
                    }
                  }
                );
              }
            }
            setRows(newRows);
          }}
        />
      )
    }
    else {
      return (
        <Autocomplete
          disablePortal
          id="combo-box-assignee"
          options={assignee || null}
          getOptionDisabled={(option) =>
            option === 'Multiple'
          }
          sx={{ width: 300 }}
          renderInput={(params) => <TextField {...params} label="Assignee" />}
          value={params.value || null}
          onChange={(event, newValue) => {
            // console.log(newValue);
            if (newValue == null) {
              newValue = "";
            }
            let newRows = [...rows];
            newRows = newRows.map(
              row => {
                if (row.id === params.id) {
                  return { ...params.row, assignee: newValue };
                }
                else {
                  return row;
                }
              });
            setRows(newRows);
          }}
        />
      );
    }
  }

  /* Rendering assignee in TM table */
  function renderAssignee(params) {
    // console.log(params);
    let imgAssignee = '';
    let checkMultiple = null;
    console.log('RENDER ASSIGNEE');
    if (params.rowNode.parent === null && params.rowNode.children) {
      // check if all children has the same assignee
      // let checkMultiple = params.rowNode.children.every(val => rows[val].assignee === rows[params.rowNode.children[0]].assignee);
      // let checkMultiple = params.row.childID.every(val => {console.log(rows[val], rows[params.row.childID[0]]);return rows[val].assignee === rows[params.row.childID[0]].assignee});
      checkMultiple = params.rowNode.children.every(val => {
        let firstChild = rows.find(row => row.id === params.rowNode.children[0]);
        let child = rows.find(row => row.id === val);
        return child.assignee === firstChild.assignee;
      });
      if (checkMultiple) {
        imgAssignee = rows.find(row => row.id === params.rowNode.children[0]).assignee;
      }
      else {
        imgAssignee = "Multiple";
      };
    }
    // console.log(rows[0]);
    return (
      <Assignee params={params} imgAssignee={imgAssignee} />
    )
  }

  // function Priority({ params }) {
  //   return (
  //     <Autocomplete
  //       disablePortal
  //       id="combo-box-demo"
  //       options={['Low', 'Medium', 'High']}
  //       sx={{ width: 300 }}
  //       value={params.value}
  //       renderInput={(params) => <TextField {...params} label="Movie" />}
  //     />
  //   )
  // }


  const [priorityValue, setPriorityValue] = useState({})

  /* Rendering priority dropdown select */
  function renderPriority(params) {
    const priority = ['Low', 'Medium', 'High'];

    const updatePriorityValue = (newValue, rowId) => {
      // console.log(newValue, rowId); //testing
      let newRows = [...rows];
      newRows = newRows.map(
        row => {
          if (row.id === rowId) {
            return { ...row, priority: newValue };
          }
          else {
            return row;
          };
        }
      )
      setRows(newRows);
    }

    if (params.row.groupName.length === 1) {
      return (
        <Autocomplete
          disablePortal
          id="combo-box-priority"
          options={priority}
          value={params.row.priority}
          onChange={(e, newValue) => updatePriorityValue(newValue, params.row.id)}
          sx={{ width: 150 }}
          renderInput={(params) => <TextField {...params} label="Priority" />}
        />
      );
    } else {
      return (
        ''
      )
    }
  }

  /* Rendering Delete TTG button if it is created on the UI */
  function renderTTG(params) {

    const deleteTTG = (id) => {
      axios.post('/deleteImage', {
        'SCVU Image ID': id
      })
        .then(
          res => {
            console.log(res);
          }
        )
        .catch(
          err => {
            console.log(err);
          }
        )
      setReload(!reload);
    }

    if (params.rowNode.parent === null) {
      // console.log(params);
      // console.log(actions);
      if (actions) {
        if (params.value) {
          return (
            <Button variant='outlined' color='error' startIcon={<DeleteIcon />} onClick={() => deleteTTG(params.id)}>
              Delete TTG
            </Button>
          )
        }
        else {
          return (
            <Button variant='outlined' startIcon={<DeleteIcon />} disabled>
              Delete TTG
            </Button>
          )
        }
      }
      else {
        return <Button variant='outlined' startIcon={<DeleteIcon />} disabled>
          Delete TTG
        </Button>
      }
    }
    else {
      return null
    }
  }

  /* Handle disabling for TTG button */
  function handleClassName(params) {
    if (params.field === 'ttg' && actions === false) {
      return 'disabled'
    }
  }

  // function renderRemarks(params) {
  //   // console.log(params);
  //   return (
  //     <TextField
  //       label={'Remarks'}
  //       value={params.row.remarks}
  //       onInput={(e) => {
  //         // console.log(e.target.value);
  //         let newRows = [...rows];
  //         newRows = newRows.map(
  //           row => {
  //             if (row.id === params.rowNode.id) {
  //               return { ...params.row, remarks: e.target.value };
  //             }
  //             else {
  //               return row;
  //             }
  //           });
  //         setRows(newRows);
  //       }}
  //     />
  //   );
  // }

  /* Returns task object */
  function assignTasks() {
    let output = { 'Tasks': [] };
    let tasks = rows.filter(row => {
      return row.parentId && selectionModel.includes(row.parentId);
    });
    for (let task of tasks) {
      console.log(task);
      output['Tasks'].push({ 'SCVU Image Area ID': task.id, 'Assignee': task.assignee });
    };
    return output;
  }

  /* Returns priority of images object */
  function updateTaskingManager() {
    let output = {};
    let images = rows.filter(row => {
      return selectionModel.includes(row.id);
    });
    for (let image of images) {
      output[image.id] = { 'Priority': image.priority };
    };
    return output;
  }

  /* Send data to the backend */
  function postData(postTasks, postTm) {
    console.log(postTasks, postTm);
    axios.post('/assignTask', postTasks)
      .then(
        res => {
          console.log(res);
        }
      )
      .catch(
        err => {
          console.log(err);
        }
      );
    axios.post('/updateTaskingManagerData', postTm)
      .then(
        res => {
          console.log(res);
        }
      )
      .catch(
        err => {
          console.log(err);
        }
      );
  }

  // Open Create TTG Modal.
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = (event, reason) => {
    if (reason && reason === "backdropClick")
      return;
    setOpen(false);
  }

  // Datetime Picker
  // const [uploadDate, setUploadDate] = React.useState(null);
  // const [imageDatetime, setImageDatetime] = React.useState(null);

  // const handleUploadDate = (newUploadDate) => {
  //   setUploadDate(newUploadDate);
  // };

  // const handleImageDatetime = (newImageDatetime) => {
  //   setImageDatetime(newImageDatetime);
  // };

  // const handleChange = (e) => {
  //   // console.log(formInput)
  //   if (e.target.name !== null) {
  //     setFormInput(prevState => ({ ...prevState, [e.target.name]: e.target.value }))
  //   }
  //   else {
  //     console.log("didn't work")
  //   }
  // }

  /* Handling submit when user creates a new TTG */
  const handleTTGSubmit = (data) => {
    console.log(data);
    data['areas'] = data['areas'].map(
      area => area
    )
    axios.post('/insertTTGData', data)
      .then(
        res => {
          console.log(res);
        }
      )
      .catch(
        err => {
          console.log(err);
        }
      )
    reloadTMTable();
  }

  /* Token stuff to check if user is authorised  */
  const tokenName = String(sessionStorage.getItem('token'))
  const tokenString = JSON.parse(tokenName)

  /* Tree data path for nesting of areas to each image */
  const getTreeDataPath = (row) => row.groupName;
  if (tokenString === "II") {
    return (
      <p> You do not have permission to view this page. <br /> Please login with the appropriate account. </p>
    )
  }
  else if (tokenString === "Senior II" || tokenString === "IA") {
    return (
      <div style={{ height: 600, width: '100%' }}>
        <Box display="flex" justifyContent="space-evenly" alignItems='center' sx={{ width: "60%", margin: 'auto', paddingBottom: '10px', paddingTop: '10px', }} >
          <Button variant="contained" onClick={reloadTMTable}>Refresh</Button>
          <Button variant="contained" onClick={refresh}>Change Display Date</Button>
          <Button variant="contained" onClick={handleOpen}>Create TTG</Button>
          <Button variant="contained" onClick={(e) => { postData(assignTasks(), updateTaskingManager()); }}>Apply Change</Button>
          <Button variant="contained" color='warning' onClick={() => setActions(!actions)}>Toggle Actions</Button>
        </Box>
        <DataGridPro
          sx={{
            '.disabled': {
              'backgroundColor': '#F0F0F0'
            }
          }}
          treeData
          rows={rows}
          columns={columns}
          components={{ ToolBar: GridToolbar }}
          getTreeDataPath={getTreeDataPath}
          rowHeight={80}
          checkboxSelection
          onSelectionModelChange={(newSelectionModel) => {
            setSelectionModel(newSelectionModel);
          }}
          selectionModel={selectionModel}
          isRowSelectable={(params) => params.row.groupName.length === 1}
          disableSelectionOnClick
          getCellClassName={(params) => handleClassName(params)}
        />
        <CreateTTGModal
          open={open}
          handleClose={handleClose}
          handleTTGSubmit={handleTTGSubmit}
        />
      </div>
    );
  }
}
