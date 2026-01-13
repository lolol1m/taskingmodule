import {
  DataGridPro,
  useGridApiRef,
  useKeepGroupedColumnsHidden,
  GridToolbar
} from '@mui/x-data-grid-pro';
import useKeycloakRole from "../components/useKeycloakRole.js";
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { memo, useEffect, useState, useMemo } from 'react';
import { Button, Box, IconButton } from "@mui/material";
import * as React from 'react';

import CreateTTGModal from '../components/CreateTTG.js';
import DatePickerModal from '../components/DatePicker.js'
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
      axios.get('/getUsers')
        .then(
          res => {
            if (res['data']['Users']) {
              // Users are now objects with {id, name}
              // Add "Multiple" as an object too for consistency
              const multipleOption = {id: 'Multiple', name: 'Multiple'};
              setAssignee([multipleOption].concat(res['data']['Users']));
            }
          }
        );
      axios.post('/getTaskingManagerData', dateRange)
        .then(
          res => {
            if (res['data'] && res['data'] !== undefined) {
              setRows(formatData(res['data']));
            }
          }
        )
        .catch(
          err => {
            console.log(err);
          }
        );
    }, [reload, dateRange]); // Refresh when reload changes OR when dateRange changes

  /* Functions */
  /* Reload TM table when the  */
  function reloadTMTable() {
    setReload(!reload);
  }

  /* Format the incoming data from API */
  function formatData(inputData) {
    let formattedData = [];

    formattedData = Object.keys(inputData).map((key) => {
      let inputDataByKey = inputData[key];

      // Determine entry type: area entries have "Area Name" and "Parent ID", image entries have "Image File Name"
      const hasAreaName = inputDataByKey["Area Name"] !== undefined && inputDataByKey["Area Name"] !== null && inputDataByKey["Area Name"] !== "";
      const hasImageFileName = inputDataByKey["Image File Name"] !== undefined && inputDataByKey["Image File Name"] !== null && inputDataByKey["Image File Name"] !== "";
      const hasParentId = inputDataByKey["Parent ID"] !== undefined && inputDataByKey["Parent ID"] !== null;
      
      // Area entries: have Area Name, may or may not have Parent ID
      // Note: Area entries now use negative keys to avoid conflicts with image IDs
      if (hasAreaName && !hasImageFileName) {
        // This is an area/task entry
        if (hasParentId) {
          // Convert Parent ID to integer for dictionary lookup
          const parentId = parseInt(inputDataByKey["Parent ID"]);
          // Look up parent - try both integer and string keys
          let parentDict = inputData[parentId] || inputData[String(parentId)];
          
          // Verify parent is an image entry, not another area entry
          if (parentDict && parentDict["Image File Name"]) {
            let parentName = parentDict["Image File Name"];
            let areaName = inputDataByKey["Area Name"];
            // Parse key as integer (may be negative for area entries)
            const areaId = parseInt(key);
            // Use parent's ID to create unique tree path
            return {
              groupName: [parentName, areaName], // For display
              treePath: [`img_${parentId}`, areaName], // Use parent's unique tree path identifier
              assignee: inputDataByKey['Assignee'] || null,
              parentId: parentId,
              id: areaId, // Use the actual key (negative for area entries) for display
              scvuImageAreaId: inputDataByKey['SCVU Image Area ID'] || null, // Store the actual positive ID for backend
              // Area rows don't have image-specific fields, but we can inherit some from parent for display
              imageName: null,
              imageDatetime: null,
              sensorName: null,
              uploadDate: null,
              priority: null,
              ttg: null
            };
          } else {
            // Parent image not found or parent is also an area entry - skip this area entry
            console.warn(`[TaskingManager] Skipping area entry ${key} - parent image ${parentId} not found or invalid:`, parentDict);
            return null;
          }
        } else {
          // Area entry without Parent ID - this shouldn't happen, but skip it
          console.warn(`[TaskingManager] Skipping area entry ${key} - missing Parent ID:`, inputDataByKey);
          return null;
        }
      }
      // Image entries: have Image File Name
      else if (hasImageFileName) {
        const imageFileName = inputDataByKey["Image File Name"];
        const imageId = parseInt(key);
        return {
          groupName: [imageFileName], // For display
          treePath: [`img_${imageId}`], // Unique path for tree structure (prevents grouping of duplicate filenames)
          assignee: inputDataByKey['Assignee'],
          sensorName: inputDataByKey["Sensor Name"],
          imageName: inputDataByKey["Image File Name"],
          uploadDate: inputDataByKey["Upload Date"],
          imageDatetime: inputDataByKey["Image Datetime"],
          priority: inputDataByKey["Priority"],
          ttg: inputDataByKey["TTG"],
          id: imageId
        };
      }
      else {
        // Unknown entry type - skip it
        console.warn(`[TaskingManager] Skipping entry with key ${key} - missing required fields. Has Area Name: ${hasAreaName}, Has Image File Name: ${hasImageFileName}:`, inputDataByKey);
        return null;
      }
    }).filter(item => item !== null); // Remove null entries

    // Sort data: images first, then areas (so tree structure displays correctly)
    formattedData.sort((a, b) => {
      // If both are images (groupName length === 1), sort by image name
      if (a.groupName.length === 1 && b.groupName.length === 1) {
        return a.groupName[0].localeCompare(b.groupName[0]);
      }
      // If one is image and one is area, image comes first
      if (a.groupName.length === 1) return -1;
      if (b.groupName.length === 1) return 1;
      // Both are areas, sort by parent then area name
      if (a.groupName[0] !== b.groupName[0]) {
        return a.groupName[0].localeCompare(b.groupName[0]);
      }
      return a.groupName[1].localeCompare(b.groupName[1]);
    });

    return formattedData;
  }

  /* Returns assignee row  */
  function Assignee({ params, imgAssignee }) {
    // console.log('RENDER ASSIGNEE');
    
    // Helper to convert value (string ID or object) to option object
    const getValueOption = (value) => {
      if (!value) return null;
      if (typeof value === 'object' && value.id) return value;
      // If value is a string (Keycloak user ID), find matching option
      const found = assignee?.find(opt => {
        if (typeof opt === 'string') return opt === value;
        return opt?.id === value;
      });
      return found || null;
    };
    
    if (params.rowNode.parent === null) {
      return (
        <Autocomplete
          disablePortal
          id="combo-box-assignee"
          options={assignee || []}
          getOptionLabel={(option) => {
            if (typeof option === 'string') return option; // Backward compatibility
            return option?.name || option?.id || '';
          }}
          isOptionEqualToValue={(option, value) => {
            if (typeof option === 'string' && typeof value === 'string') {
              return option === value;
            }
            if (typeof option === 'string' || typeof value === 'string') {
              // One is string, one is object - compare by ID
              const optId = typeof option === 'string' ? option : option?.id;
              const valId = typeof value === 'string' ? value : value?.id;
              return optId === valId;
            }
            return option?.id === value?.id;
          }}
          getOptionDisabled={(option) => {
            if (typeof option === 'string') return option === 'Multiple';
            return option?.id === 'Multiple';
          }}
          sx={{ width: 300 }}
          renderInput={(params) => <TextField {...params} label="Assignee" />}
          value={getValueOption(imgAssignee || params.value)}
          onChange={(event, newValue) => {
            // console.log(newValue);
            if (newValue == null) {
              newValue = "";
            } else if (typeof newValue === 'object' && newValue.id) {
              // Store the ID (Keycloak user ID) for backend compatibility
              newValue = newValue.id;
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
          getOptionLabel={(option) => {
            if (typeof option === 'string') return option; // Backward compatibility
            return option?.name || option?.id || '';
          }}
          isOptionEqualToValue={(option, value) => {
            if (typeof option === 'string' && typeof value === 'string') {
              return option === value;
            }
            if (typeof option === 'string' || typeof value === 'string') {
              // One is string, one is object - compare by ID
              const optId = typeof option === 'string' ? option : option?.id;
              const valId = typeof value === 'string' ? value : value?.id;
              return optId === valId;
            }
            return option?.id === value?.id;
          }}
          getOptionDisabled={(option) => {
            if (typeof option === 'string') return option === 'Multiple';
            return option?.id === 'Multiple';
          }}
          sx={{ width: 300 }}
          renderInput={(params) => <TextField {...params} label="Assignee" />}
          value={getValueOption(params.value)}
          onChange={(event, newValue) => {
            // console.log(newValue);
            if (newValue == null) {
              newValue = "";
            } else if (typeof newValue === 'object' && newValue.id) {
              // Store the ID (Keycloak user ID) for backend compatibility
              newValue = newValue.id;
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

    if (params.row.groupName && params.row.groupName.length === 1) {
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
      // Use the actual positive scvu_image_area_id, not the negative display ID
      const areaId = task.scvuImageAreaId || task.id;
      if (areaId && task.assignee) {
        output['Tasks'].push({ 'SCVU Image Area ID': areaId, 'Assignee': task.assignee });
      }
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
    
    // Check if there are tasks to assign
    if (!postTasks || !postTasks.Tasks || postTasks.Tasks.length === 0) {
      alert("No tasks to assign. Please select areas and assignees first.");
      return;
    }

    // Track if both requests succeed
    let assignTaskSuccess = false;
    let updateTaskSuccess = false;

    // Assign tasks
    // Check if token exists before making request
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      alert("You are not authenticated. Please log in again.");
      window.location.href = `${process.env.REACT_APP_DB_API_URL || 'http://localhost:5000'}/auth/login`;
      return;
    }
    
    axios.post('/assignTask', postTasks)
      .then(
        res => {
          console.log(res);
          assignTaskSuccess = true;
          if (updateTaskSuccess) {
            alert("Tasks assigned successfully! Refreshing data...");
            reloadTMTable(); // Refresh the table after successful assignment
          }
        }
      )
      .catch(
        err => {
          console.error("Error assigning tasks:", err);
          console.error("Full error:", err.response);
          console.error("Error data:", err.response?.data);
          console.error("Error status:", err.response?.status);
          const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || "Unknown error";
          alert("Error assigning tasks: " + errorMsg);
          
          // Log token info for debugging
          const token = localStorage.getItem('access_token');
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              const exp = payload.exp;
              const now = Math.floor(Date.now() / 1000);
              console.log("Token expiry check:", {
                expires: new Date(exp * 1000).toISOString(),
                now: new Date(now * 1000).toISOString(),
                expired: exp < now,
                minutesUntilExpiry: Math.floor((exp - now) / 60)
              });
            } catch (e) {
              console.error("Could not decode token:", e);
            }
          }
          
          // If 401, redirect to login
          if (err.response?.status === 401) {
            console.log("401 error - redirecting to login");
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('id_token');
            localStorage.removeItem('user');
            window.location.href = `${process.env.REACT_APP_DB_API_URL || 'http://localhost:5000'}/auth/login`;
          }
        }
      );
    
    // Update tasking manager data (priority, etc.)
    axios.post('/updateTaskingManagerData', postTm)
      .then(
        res => {
          console.log(res);
          updateTaskSuccess = true;
          if (assignTaskSuccess) {
            alert("Tasks assigned successfully! Refreshing data...");
            reloadTMTable(); // Refresh the table after successful update
          }
        }
      )
      .catch(
        err => {
          console.error("Error updating tasking manager data:", err);
          const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || "Unknown error";
          alert("Error updating tasking manager data: " + errorMsg);
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

  /* Get role from Keycloak token */
  const role = useKeycloakRole();

  /* Tree data path for nesting of areas to each image */
  const getTreeDataPath = (row) => {
    // Use treePath if available (unique identifier), otherwise fall back to groupName
    if (row.treePath && Array.isArray(row.treePath)) {
      return row.treePath.filter(item => item != null).map(item => item?.toString() || '');
    }
    // Fallback to groupName if treePath not available
    if (row.groupName && Array.isArray(row.groupName)) {
      let path = row.groupName.filter(item => item != null).map(item => item?.toString() || '');
      // For image rows, create unique path using ID
      if (path.length === 1 && row.id !== undefined && row.id !== null) {
        return [`img_${row.id}`];
      }
      return path;
    }
    return [row.id?.toString() || 'unknown'];
  };

  /* Customize the grouping column to show clean names */
  const groupingColDef = {
    headerName: "Group",
    width: 200,
    valueGetter: (params) => {
      // Display only the last part of groupName (the actual image/area name)
      // For images: shows just the filename
      // For areas: shows just the area name (not "filename > area")
      if (params.row.groupName && Array.isArray(params.row.groupName)) {
        return params.row.groupName[params.row.groupName.length - 1];
      }
      return params.row.id?.toString() || 'unknown';
    }
  };
  if (role === "II") {
    return (
      <p> You do not have permission to view this page. <br /> Please login with the appropriate account. </p>
    )
  }
  else if (role === "Senior II" || role === "IA") {
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
          groupingColDef={groupingColDef}
          rowHeight={80}
          checkboxSelection
          onSelectionModelChange={(newSelectionModel) => {
            setSelectionModel(newSelectionModel);
          }}
          selectionModel={selectionModel}
          isRowSelectable={(params) => params.row.groupName && params.row.groupName.length === 1}
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
