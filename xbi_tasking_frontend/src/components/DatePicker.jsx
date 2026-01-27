import { useState } from 'react'
import Backdrop from '@mui/material/Backdrop'
import Modal from '@mui/material/Modal'
import Fade from '@mui/material/Fade'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { StaticDateRangePicker } from '@mui/x-date-pickers-pro/StaticDateRangePicker'
import { DateRangePickerDay as MuiDateRangePickerDay } from '@mui/x-date-pickers-pro/DateRangePickerDay'
import { styled } from '@mui/material/styles'

const DateRangePickerDay = styled(MuiDateRangePickerDay)(
  ({ theme, isHighlighting, isStartOfHighlighting, isEndOfHighlighting, outsideCurrentMonth }) => ({
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
)

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  minHeight: 420,
  overflowY: 'auto',
  bgcolor: 'background.paper',
  border: '1px solid #d1d5db',
  borderRadius: '12px',
  boxShadow: 24,
  p: 4,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
}

function DatePickerModal({ open, onClose, onApply }) {
  const [value, setValue] = useState([null, null])

  const handleApply = () => {
    if (onApply) {
      onApply(value)
    }
    if (onClose) {
      onClose()
    }
  }

  const handleClose = (event, reason) => {
    if (reason && reason === 'backdropClick') {
      return
    }
    if (onClose) {
      onClose()
    }
  }

  return (
    <Modal
      aria-labelledby="date-range-modal-title"
      open={open}
      onClose={handleClose}
      closeAfterTransition
      disableEscapeKeyDown
      BackdropComponent={Backdrop}
      BackdropProps={{ timeout: 500 }}
    >
      <Fade in={open}>
        <Box sx={style}>
          <Grid container spacing={2} direction="column" alignItems="center" justifyContent="center">
            <Grid>
              <Typography id="date-range-modal-title" variant="h6">
                Select Display Date
              </Typography>
            </Grid>
            <Grid>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <StaticDateRangePicker
                  displayStaticWrapperAs="desktop"
                  calendars={2}
                  value={value}
                  onChange={(newValue) => setValue(newValue)}
                  slots={{ day: DateRangePickerDay }}
                  slotProps={{ actionBar: { actions: [] } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid>
              <Button onClick={handleApply}>Submit</Button>
            </Grid>
          </Grid>
        </Box>
      </Fade>
    </Modal>
  )
}

export default DatePickerModal
