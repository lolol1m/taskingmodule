import { useCallback, useMemo, useState } from 'react'
import Backdrop from '@mui/material/Backdrop'
import Modal from '@mui/material/Modal'
import Fade from '@mui/material/Fade'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateRangeCalendar } from '@mui/x-date-pickers-pro/DateRangeCalendar'
import './DatePicker.css'

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'fit-content',
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: 'calc(100vh - 32px)',
  overflow: 'visible',
  backgroundColor: 'var(--panel, #15161a)',
  border: '1px solid var(--border, #2b2d36)',
  borderRadius: '14px',
  boxShadow: '0 18px 44px rgba(0, 0, 0, 0.45)',
  p: 0,
}

const SELECT_MENU_PROPS = {
  MenuProps: { sx: { zIndex: 1000003 } },
}

const DEFAULT_TIME = { hour: 12, minute: 0, second: 0, meridiem: 'PM' }

const formatDateLabel = (dateValue) => {
  if (!dateValue) return '--'
  return dateValue.format('ddd DD-MM-YY')
}

const parseHour24 = (hour12, meridiem) => {
  if (meridiem === 'AM') return hour12 === 12 ? 0 : hour12
  return hour12 === 12 ? 12 : hour12 + 12
}

const applyTimeToDate = (dateValue, timeValue) => {
  if (!dateValue) return null
  const hour24 = parseHour24(timeValue.hour, timeValue.meridiem)
  return dateValue.hour(hour24).minute(timeValue.minute).second(timeValue.second).millisecond(0)
}

const clamp = (val, min, max) => Math.max(min, Math.min(max, val))

function TimeInput({ value, min, max, onChange }) {
  const display = String(value).padStart(2, '0')

  const step = (delta) => {
    const next = value + delta
    if (next > max) onChange(min)
    else if (next < min) onChange(max)
    else onChange(next)
  }

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (raw === '') return
    onChange(clamp(parseInt(raw, 10), min, max))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); step(1) }
    if (e.key === 'ArrowDown') { e.preventDefault(); step(-1) }
  }

  return (
    <div className="date-picker-modal__time-input-wrap">
      <input
        className="date-picker-modal__time-input"
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <div className="date-picker-modal__time-input-arrows">
        <button type="button" className="date-picker-modal__time-input-arrow" onClick={() => step(1)} tabIndex={-1}>▲</button>
        <button type="button" className="date-picker-modal__time-input-arrow" onClick={() => step(-1)} tabIndex={-1}>▼</button>
      </div>
    </div>
  )
}

function DatePickerModal({ open, onClose, onApply }) {
  const [value, setValue] = useState([null, null])
  const [fromTime, setFromTime] = useState(DEFAULT_TIME)
  const [toTime, setToTime] = useState(DEFAULT_TIME)
  const [error, setError] = useState('')

  const startDateTime = useMemo(() => applyTimeToDate(value[0], fromTime), [value, fromTime])
  const endDateTime = useMemo(() => applyTimeToDate(value[1], toTime), [value, toTime])

  const handleApply = () => {
    if (!startDateTime || !endDateTime) {
      setError('Please select both start and end date/time.')
      return
    }
    if (endDateTime.isBefore(startDateTime)) {
      setError('End date/time must not be before start date/time.')
      return
    }
    setError('')
    if (onApply) onApply([startDateTime, endDateTime])
    if (onClose) onClose()
  }

  const handleClose = (event, reason) => {
    if (reason && reason === 'backdropClick') return
    if (onClose) onClose()
  }

  const updateTime = useCallback((setter, key, val) => {
    setter((prev) => ({ ...prev, [key]: val }))
  }, [])

  const applyDisabled = !startDateTime || !endDateTime || endDateTime.isBefore(startDateTime)

  return (
    <Modal
      aria-labelledby="date-range-modal-title"
      open={open}
      onClose={handleClose}
      disablePortal
      sx={{ zIndex: 1000002 }}
      closeAfterTransition
      disableEscapeKeyDown
      BackdropProps={{
        timeout: 500,
        sx: { backgroundColor: 'rgba(2, 6, 23, 0.62)' },
      }}
      slots={{ backdrop: Backdrop }}
    >
      <Fade in={open}>
        <Box sx={style} className="date-picker-modal">
          <div className="date-picker-modal__content">
            <div className="date-picker-modal__header">
              <Typography id="date-range-modal-title" variant="h6">
                Select Display Date
              </Typography>
            </div>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <div className="date-picker-modal__calendar">
                <DateRangeCalendar
                  calendars={2}
                  value={value}
                  onChange={(newValue) => setValue(newValue)}
                  disableFuture
                  sx={{
                    color: 'var(--text)',
                    '& .MuiPickersCalendarHeader-root, & .MuiDayCalendar-weekDayLabel': { color: 'var(--muted)' },
                    '& .MuiPickersDay-root': { color: 'var(--text)' },
                    '& .MuiDateRangePickerDay-rangeIntervalDayHighlight': {
                      backgroundColor: 'color-mix(in srgb, var(--accent) 22%, transparent)',
                    },
                    '& .MuiPickersDay-root.Mui-selected, & .MuiDateRangePickerDay-day.Mui-selected': {
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                    },
                    '& .MuiPickersArrowSwitcher-button': { color: 'var(--text)' },
                  }}
                />
              </div>
            </LocalizationProvider>

            <div className="date-picker-modal__time-controls">
              <div className="date-picker-modal__time-half">
                <div className="date-picker-modal__time-half-top">
                  <Typography className="date-picker-modal__time-header">From time</Typography>
                  <Typography className="date-picker-modal__date-text">{formatDateLabel(value[0])}</Typography>
                </div>
                <div className="date-picker-modal__time-half-bottom">
                  <TimeInput value={fromTime.hour} min={1} max={12} onChange={(v) => updateTime(setFromTime, 'hour', v)} />
                  <span className="date-picker-modal__colon">:</span>
                  <TimeInput value={fromTime.minute} min={0} max={59} onChange={(v) => updateTime(setFromTime, 'minute', v)} />
                  <span className="date-picker-modal__colon">:</span>
                  <TimeInput value={fromTime.second} min={0} max={59} onChange={(v) => updateTime(setFromTime, 'second', v)} />
                  <Select
                    size="small"
                    value={fromTime.meridiem}
                    onChange={(e) => updateTime(setFromTime, 'meridiem', e.target.value)}
                    className="date-picker-modal__select date-picker-modal__select--ampm"
                    {...SELECT_MENU_PROPS}
                  >
                    <MenuItem value="AM">AM</MenuItem>
                    <MenuItem value="PM">PM</MenuItem>
                  </Select>
                </div>
              </div>
              <span className="date-picker-modal__time-arrow">→</span>
              <div className="date-picker-modal__time-half">
                <div className="date-picker-modal__time-half-top">
                  <Typography className="date-picker-modal__time-header">To time</Typography>
                  <Typography className="date-picker-modal__date-text">{formatDateLabel(value[1])}</Typography>
                </div>
                <div className="date-picker-modal__time-half-bottom">
                  <TimeInput value={toTime.hour} min={1} max={12} onChange={(v) => updateTime(setToTime, 'hour', v)} />
                  <span className="date-picker-modal__colon">:</span>
                  <TimeInput value={toTime.minute} min={0} max={59} onChange={(v) => updateTime(setToTime, 'minute', v)} />
                  <span className="date-picker-modal__colon">:</span>
                  <TimeInput value={toTime.second} min={0} max={59} onChange={(v) => updateTime(setToTime, 'second', v)} />
                  <Select
                    size="small"
                    value={toTime.meridiem}
                    onChange={(e) => updateTime(setToTime, 'meridiem', e.target.value)}
                    className="date-picker-modal__select date-picker-modal__select--ampm"
                    {...SELECT_MENU_PROPS}
                  >
                    <MenuItem value="AM">AM</MenuItem>
                    <MenuItem value="PM">PM</MenuItem>
                  </Select>
                </div>
              </div>
            </div>

            {error ? <Typography className="date-picker-modal__error">{error}</Typography> : null}

            <div className="date-picker-modal__actions">
              <Button className="date-picker-modal__button date-picker-modal__button--cancel" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                className="date-picker-modal__button date-picker-modal__button--apply"
                onClick={handleApply}
                disabled={applyDisabled}
              >
                Apply
              </Button>
            </div>
          </div>
        </Box>
      </Fade>
    </Modal>
  )
}

export default DatePickerModal
