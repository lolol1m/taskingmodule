import * as React from 'react';
import { useEffect, useState } from 'react';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers-pro';

import Chip from '@mui/material/Chip';
import Autocomplete from '@mui/material/Autocomplete';

import axios from 'axios';

let _ = require('lodash');

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  maxHeight: 450,
  overflowY: 'auto',
  bgcolor: 'background.paper',
  border: '1px solid #909090',
  borderRadius: '8px',
  boxShadow: 24,
  p: 6,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const submitButton = {
  marginTop: 2,
  marginBottom: -4,
};

const toISOLocal = (date) => {
  // https://stackoverflow.com/questions/49330139/date-toisostring-but-local-time-instead-of-utc
  console.log(date);
  let d = new Date(date);
  let z = n => ('0' + n).slice(-2);
  // let zz = n => ('00' + n).slice(-3);
  let off = date.getTimezoneOffset();
  // let sign = off > 0 ? '-' : '+';
  off = Math.abs(off);

  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}.${z(d.getMilliseconds())}Z`
}

const CreateTTGModal = (props) => {

  // For opening and closing of Modal.
  const open = props.open;
  const handleClose = props.handleClose;

  // For selection of Upload Datetime and Image Datetime.
  const handleTTGSubmit = props.handleTTGSubmit;

  // Create TTG Form.
  const [formInput, setFormInput] = useState({
    imageFileName: "",
    sensorName: "",
    uploadDate: null,
    imageDateTime: null,
    areas: [],
  })
  console.log(formInput);

  const handleChange = (e) => {
    // console.log(formInput)
    if (e.target.name !== null) {
      setFormInput(prevState => ({ ...prevState, [e.target.name]: e.target.value }))
    }
    else {
      console.log("didn't work")
    }
  }

  // For selection of Area Name(s).
  // Will be used to create new areas that are inserted into database should the user add a new area not currently in database
  const areaArray = []
  const [areaInputValue, setAreaInputValue] = useState("");
  const [area, setArea] = useState([]);
  const [selectedArea, setSelectedArea] = useState("");
  let selectedAreaArray = formInput["areas"];

  // For extraction of inputs.
  const getTTGInput = () => {
    let newData = { ...formInput };
    newData["imageDateTime"] = toISOLocal(newData["imageDateTime"]);
    newData["uploadDate"] = toISOLocal(newData["uploadDate"]);
    handleTTGSubmit(newData);
  };

  const resetTTGForm = () => {
    setFormInput({
      imageFileName: "",
      sensorName: "",
      uploadDate: NaN,
      imageDateTime: NaN,
      areas: [],
    });
  };

  useEffect( // gets areas to fill in area dropdown in modal
    () => {
      console.log("areas gotten");
      axios.get('/getAreas')
        .then(
          res => {
            // console.log(res);
            let areajson = _.get(res, ['data', 'Areas'])
            console.log(areajson)
            for (let i = 0; i < (areajson.length); i++) {
              areaArray.push(_.get(areajson, [i, 'Area Name']));
            }
          }
        )
        .then(
          res => {
            setArea(_.uniq(areaArray, true))
            console.log(area)
          }
        )
        .catch(
          err => {
            console.log(err)
          }
        );
    }, []
  );

  const SubmitButton = () => { // checks that all input fields are filled with valid data
    if (formInput["imageFileName"] && formInput["sensorName"] && (formInput["uploadDate"] && !isNaN(formInput["uploadDate"].valueOf())) && (formInput["imageDateTime"] && !isNaN(formInput["imageDateTime"].valueOf()))) {
      return <Button sx={submitButton} onClick={() => { getTTGInput(); handleClose(); resetTTGForm(); }}>Submit</Button>
    }
    else {
      return <Button sx={submitButton} disabled>Submit</Button>
    }
  }

  return (
    <div>
      <Modal
        aria-labelledby="transition-modal-title"
        aria-describedby="transition-modal-description"
        open={open}
        onClose={handleClose}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
        disableEscapeKeyDown={true}
      >
        <Fade in={open}>
          <Box sx={style}>
            <Grid
              container
              rowSpacing={3}
              columnSpacing={3}
              justifyContent='center'
              alignItems='center'
            >
              <Grid item xs={12} sm={10.5}>
                <Typography variant="h6" gutterBottom>
                  Create TTG
                </Typography>
              </Grid>
              <Grid item xs={12} sm={1.5}>
                <Button onClick={() => { handleClose(); resetTTGForm(); }}>Close</Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="sensorName"
                  label="Sensor Name"
                  fullWidth
                  variant="standard"
                  onChange={handleChange}
                  value={formInput["sensorName"]}
                  inputProps={{ maxLength: 50 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="imageFileName"
                  label="Image File Name"
                  fullWidth
                  variant="standard"
                  onChange={handleChange}
                  value={formInput["imageFileName"]}
                  inputProps={{ maxLength: 50 }}
                />
              </Grid>
              {/* <Grid item xs={12} sm={6}>
                <TextField
                  required
                  name="imageID"
                  label="Image ID"
                  fullWidth
                  variant="standard"
                  onChange={handleChange}
                  value={formInput["imageID"]}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  name="base"
                  label="Base"
                  fullWidth
                  variant="standard"
                  onChange={handleChange}
                  value={formInput["base"]}
                />
              </Grid> */}
              <Grid item xs={12} sm={6} display={'flex'} justifyContent={'center'}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    required
                    name="uploadDate"
                    label="Upload Date"
                    renderInput={(params) => <TextField {...params} />}
                    variant="standard"
                    value={formInput['uploadDate']}
                    onChange={newValue => { setFormInput(prevState => ({ ...prevState, 'uploadDate': newValue ? newValue["$d"] : NaN })) }}
                    onError={(err) => { console.log(err) }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} display={'flex'} justifyContent={'center'}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    required
                    name="imageDateTime"
                    label="Image Datetime"
                    renderInput={(params) => <TextField {...params} />}
                    variant="standard"
                    value={formInput['imageDateTime']}
                    onChange={newValue => { setFormInput(prevState => ({ ...prevState, 'imageDateTime': newValue ? newValue["$d"] : NaN })) }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={12}>
                <Autocomplete
                  required
                  multiple
                  name="areas"
                  options={area}
                  noOptionsText={"Enter to create a new option '" + areaInputValue + "'"}
                  getOptionLabel={(option) => option}
                  value={formInput["areas"]}
                  onInputChange={(e, newAreaValue) => {
                    setAreaInputValue(newAreaValue)
                  }}
                  onChange={(e, newAreaValue) => {
                    setSelectedArea(newAreaValue);
                    setFormInput(prevState => ({ ...prevState, 'areas': newAreaValue }))
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="standard"
                      label="Area Name"
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          area.findIndex((o) => o === areaInputValue) === -1
                        ) {
                          setArea((o) => o.concat(areaInputValue));
                        }
                      }}
                    />
                  )}
                />
              </Grid>
              <SubmitButton />
            </Grid>
          </Box>
        </Fade>
      </Modal>
    </div>
  );
}

export default CreateTTGModal;