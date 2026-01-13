import * as React from 'react';
import { Dayjs } from 'dayjs';
import Backdrop from '@mui/material/Backdrop';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopDateRangePicker } from '@mui/x-date-pickers-pro/DesktopDateRangePicker';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import axios from "axios";
import { styled } from '@mui/material/styles';
import { StaticDateRangePicker } from '@mui/x-date-pickers-pro/StaticDateRangePicker';
import { DateRangePickerDay as MuiDateRangePickerDay } from '@mui/x-date-pickers-pro/DateRangePickerDay';

// Use the same baseURL as configured in App.js
const BACKEND_URL = process.env.REACT_APP_DB_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = BACKEND_URL;

// Most of these styles are just copy pasted. If you don't understand them...
// Neither do I so have fun

const DateRangePickerDay = styled(MuiDateRangePickerDay)(
  ({
    theme,
    isHighlighting,
    isStartOfHighlighting,
    isEndOfHighlighting,
    outsideCurrentMonth,
  }) => ({
    ...(!outsideCurrentMonth &&
      isHighlighting && {
      borderRadius: 0,
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.common.white,
      '&:hover, &:focus': {
        backgroundColor: theme.palette.primary.dark,
      },
    }),
    ...(isStartOfHighlighting && {
      borderTopLeftRadius: '50%',
      borderBottomLeftRadius: '50%',
    }),
    ...(isEndOfHighlighting && {
      borderTopRightRadius: '50%',
      borderBottomRightRadius: '50%',
    }),
  }),
);

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  minHeight: 450,
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

const DatePickerModal = (props) => {
  // props are used to open/close the modal and to set date range
  const open = props.openDP
  const handleClose = props.handleCloseDP;
  const setDateRange = props.setDateRange;
  const [value, setValue] = React.useState([null, null]); // used to store date values

  const renderWeekPickerDay = (date, dateRangePickerDayProps) => {
    return <DateRangePickerDay {...dateRangePickerDayProps} />;
  };


  const getDates = () => {
    // Check if both dates are selected
    if (!value[0] || !value[1]) {
      alert('Please select both start and end dates');
      return;
    }
    processDate(value[0]["$d"], value[1]["$d"]) // value is some weird thing so data needs to be extracted, can console.log to check
  }

  const toISOLocal = (date) => { // to change format of date to fit our needs
    // https://stackoverflow.com/questions/49330139/date-toisostring-but-local-time-instead-of-utc
    let d = new Date(date);
    let z = n => ('0' + n).slice(-2);
    // let zz = n => ('00' + n).slice(-3);
    let off = date.getTimezoneOffset();
    // let sign = off > 0 ? '-' : '+';
    off = Math.abs(off);

    return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}.${z(d.getMilliseconds())}Z`
  }

  const processDate = (startDate, endDate) => {
    // Check if dates are valid Date objects
    if (!startDate || !endDate || !(startDate instanceof Date) || !(endDate instanceof Date)) {
      alert('Invalid date selection. Please select both dates again.');
      return;
    }

    let json = {
      "Start Date": toISOLocal(startDate),
      "End Date": toISOLocal(endDate)
    }
    setDateRange(json);
    handleClose(); // Close the modal after setting the date range
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
            <Grid container
              spacing={1}
              direction="column"
              alignItems="center"
              justifyContent="center">
              <Grid item xs={12} sm={10.5}>
                <Typography variant="h6" gutterBottom>
                  Select Display Date
                </Typography>
              </Grid>
              <Grid item xs={12} sm={12}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <StaticDateRangePicker
                    displayStaticWrapperAs="desktop"
                    label="date range"
                    value={value}
                    onChange={(newValue) => setValue(newValue)}
                    renderDay={renderWeekPickerDay}
                    renderInput={(startProps, endProps) => (
                      <React.Fragment>
                        <TextField {...startProps} />
                        <Box sx={{ mx: 2 }}> to </Box>
                        <TextField {...endProps} />
                      </React.Fragment>
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item>
                  <Button onClick={getDates}>Submit</Button>
              </Grid>
            </Grid>
          </Box>
        </Fade>
      </Modal>
    </div>
  )
}

export default DatePickerModal;
