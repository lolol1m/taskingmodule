import React, { Fragment, useState, useEffect } from "react";
import './table.css';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import { TextField } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import Axios from "axios";

function UpdateSensorCategory() {
  // Variable to store data read from database.
  // Data that is used to populate the table. data variable stores data read from database. The data is assigned to this variable below.
  const [data, setData] = React.useState([]);  // [ {Category: 'cat_a', Name: ['S1', 'S2']}, {Category: 'cat_b', Name: ['S3', 'S4']} ]  // [ {Category: 'cat_a', Name: ['S1', 'S2']}, {Category: 'cat_b', Name: ['S3', 'S4']} ].
  // Data that is used to populate dropdown selection in modal. categories variable stores data (only key) read from database. The data is assigned to this variable below.
  const [categories, setCategories] = React.useState([]);  // [{value: 'cat_a', label: 'cat_a'}, {value: 'cat_b', label: 'cat_b'}]; 
  const [displayChanges, setDisplayChanges] = React.useState([]);  // Used to detect when to auto reload page to display updated changes.

  // GET request from api to retrieve data from database.
  const getData = () => {  // { data: {'CAT_A': ['sensor 1', 'sensor 2'], 'CAT_B': ['sensor 3', 'sensor 4'], 'UNCATEGORISED': ['sensor 5', 'sensor 6']} }.
    Axios.get('/getSensorCategory').then(
      (response) => {
        setData(formatData(response['data']));  // Set data read from database into data usestate. data = [ {Category: 'cat_a', Name: ['S1', 'S2']}, {Category: 'cat_b', Name: ['S3', 'S4']} ].
        setCategories(categoryList(response['data']));  // Set data read from database into categories usestate. categories = [{value: 'cat_a', label: 'cat_a'}, {value: 'cat_b', label: 'cat_b'}].
      }
    );
  };

  // Onload function to execute GET request to retrieve data from database and pass to usestate variables.
  useEffect(() => {
    getData();
  }, [displayChanges]);  // If displayChanges usestate variable changes, call getData() again. Used to automatically reload page upon updating to display changes.

  // Format data and pass to data variable.
  function formatData(data) {  // data = [ {'CAT_A': ['sensor 1', 'sensor 2'], 'CAT_B': ['sensor 3', 'sensor 4'], 'UNCATEGORISED': ['sensor 5', 'sensor 6']} ].
    var key = Object.keys(data);  // key = [ 'CAT_A', 'CAT_B', 'UNCATEGORISED' ].
    var val = Object.values(data);  // val = [ [ 'sensor 1', 'sensor 2' ], [ 'sensor 3', 'sensor 4' ], [ 'sensor 5', 'sensor 6' ] ].
    // Data variable is used to populate table.
    var data2 = [];  // data2 = [ {Category: 'cat_a', Name: ['S1', 'S2']}, {Category: 'cat_b', Name: ['S3', 'S4']} ].
    for (let i = 0; i < key.length; i++) {
      var obj = {};
      obj['Category'] = key[i];
      obj['Name'] = val[i];
      data2.push(obj);
    }
    return data2;
  }

  // Drop down values for form in modal to update name category.
  function categoryList(data3) {  // data3 = [ {'CAT_A': ['sensor 1', 'sensor 2'], 'CAT_B': ['sensor 3', 'sensor 4'], 'UNCATEGORISED': ['sensor 5', 'sensor 6']} ].
    var key = Object.keys(data3);  // key = [ 'CAT_A', 'CAT_B', 'UNCATEGORISED' ].
    var categories2 = [];  // categories2 = [{value: 'cat_a', label: 'cat_a'}, {value: 'cat_b', label: 'cat_b'}].
    for (let i = 0; i < key.length; i++) {
      var obj = {};
      obj['value'] = key[i];
      obj['label'] = key[i];
      categories2.push(obj);
    }
    return categories2;
  }

  // POST request to api to submit data to database. This function is called in the onClick function in confirm button inside modal.
  // Used to update the category for the selected sensor name.
  const postData = (sensorName, sensorCategory) => {  // { Sensors: [{Name: 'S1', Category: 'cat_a'}] }.
    Axios.post('/updateSensorCategory', {
      Sensors: [{'Name': sensorName, 'Category': sensorCategory}]
    })
    .then((response) => {
      console.log(response);
    }, (error) => {
      console.log(error);
    });
    setTimeout(getData(), 4000);  // Used to auto reload page upon post data to show updates.
  }

  // Modal.
  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
  };

  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const [selectedNameField, setSelectedNameField] = useState();  // Used to pass selected row data (Name) into modal onclick.
  const [selectedCategoryField, setSelectedCategoryField] = useState();  // Used to pass selected row data (Category) into modal onclick.
  const [updateCategoryField, setUpdateCategoryField] = useState();  // Used to pass selected newly selected category value to onClick function to post to database.

  // Click category drop down.
  const [state, setState] = useState(0);

  const handleClick = (index) => {
    const updatedState = data[index];  // data usestate variable used here to populate table with data from database.

    if (updatedState.other) {
      delete updatedState.other;
      setState((pre) => {
        return pre + 1;
      });
    } else {
      updatedState.other = {
        description: updatedState.Name  // Display names under each category. Done via tracking index.
      };
      setState((pre) => {
        return pre + 1;
      });
    }
  };

  return (
    <div className="updatesensorcategory">
      <table style={{margin: 'auto', width: '25vw'}}>
        <thead>
          <tr>
            {/* <th>Name</th> */}
            <th style={{backgroundColor: '#4caf50', color: 'white'}}>Category</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <Fragment key={`${index}${row.Name}`}>
              <tr
                style={{ cursor: "pointer" }}
                onClick={() => handleClick(index)}
              >
                {/* <td>{row.Name}</td> */}
                <td style={{backgroundColor: '#e9ffdb'}}>{row.Category}</td>
              </tr>
              {row.other ? (
                <tr>
                  {row.other.description.map((value) => {
                    return <tr><td colSpan={3} onClick={function () { setSelectedNameField(value); setSelectedCategoryField(row.Category); handleOpen(); }}>{value}</td></tr>  // Set selected table name and category value to usestate variable.
                  })}
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Update
          </Typography>

          <Typography id="modal-modal-description" sx={{ mt: 2 }}>
            {/* Textfield for Name. */}
            <TextField
              id="outlined-read-only-input"
              label="Name"
              defaultValue={selectedNameField}  // Read selected table name value from usestate variable.
              InputProps={{
                readOnly: true,
              }}
            />

            {/* Textfield for Category. */}
            <TextField
              id="outlined-select-currency"
              select
              label="Select"
              defaultValue={selectedCategoryField}  // Read selected table category value from usestate variable.
              helperText="Please select category"
            >
              {categories.map((option) => (  // categories usestate used here to populate drop down select field in modal to list down categories.
                <MenuItem key={option.value} value={option.value} onClick={function () { setUpdateCategoryField(option.value); }}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <Button variant="contained" color="error" onClick={function () { handleClose(); }}>Cancel</Button>
            <Button variant="contained" onClick={function () { postData(selectedNameField, updateCategoryField); setDisplayChanges('s'); handleClose(); }}>Confirm</Button>
          </Typography>
        </Box>
      </Modal>
    </div>
  );
}

export default UpdateSensorCategory;