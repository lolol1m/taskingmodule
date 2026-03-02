import { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  ClickAwayListener,
  LinearProgress,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGridPro } from '@mui/x-data-grid-pro'
import API from '../../../api/api'
import { ToastContainer, toast} from 'react-toastify';
import UserService from '../../../auth/UserService';
import useNotifications from '../../../components/notifications/useNotifications.js'
const api = new API()

const getErrorMessage = (err, fallback = 'Something went wrong.') =>
  err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback

const TABLE_AUTO_REFRESH_MS = 5000



const updateWorkingRow = (prev, rowId, field, value, baseData = null) => {
  const key = String(rowId)
  const seed = prev || baseData || {}
  const next = { ...seed }
  const row = { ...(next[key] || {}) }
  row[field] = value
  next[key] = row
  return next
}

const normalizeImageName = (value) => {
  if (!value || typeof value !== 'string') return value
  return value.replace(/(\.(?:jpg|jpeg|png|gif|tif|tiff))_\d+$/i, '$1')
}

const getRemarksValue = (entry) => {
  const raw = entry?.['Remarks'] ?? entry?.remarks ?? entry?.['remarks'] ?? ''
  if (typeof raw !== 'string') return raw ?? ''
  const normalized = raw.replace(/\\n/g, '\n')
  return normalized.trim().length === 0 ? '' : normalized
}

const buildRows = (inputData) => {
  if (!inputData) return []

  const rows = []
  const taskProgress = new Map()

  Object.keys(inputData).forEach((key) => {
    const entry = inputData[key]
    if (!entry || entry['Parent ID'] === undefined) return
    const parentId = Number(entry['Parent ID'])
    if (!Number.isFinite(parentId)) return
    const status = entry['Task Status']
    const normalized = typeof status === 'string' ? status.trim().toLowerCase() : ''
    const current = taskProgress.get(parentId) || { completed: 0, total: 0 }
    current.total += 1
    if (normalized === 'completed') {
      current.completed += 1
    }
    taskProgress.set(parentId, current)
  })

  const resolveTaskCompleted = (entry, key) => {
    const progress = taskProgress.get(Number(key))
    if (progress && progress.total > 0) {
      return `${progress.completed}/${progress.total}`
    }
    return entry['Task Completed']
  }
  Object.keys(inputData).forEach((key) => {
    const entry = inputData[key]
    if (!entry) return

    if (entry['Child ID']) {
      const imageFileName = normalizeImageName(entry['Image File Name'] || `Image_${key}`)
      rows.push({
        id: Number(key),
        groupName: [imageFileName],
        treePath: [`img_${key}`],
        sensorName: entry['Sensor Name'],
        imageId: entry['Image ID'],
        uploadDate: entry['Upload Date'],
        imageDateTime: entry['Image Datetime'],
        areaName: entry['Area'],
        assignee: entry['Assignee'],
        report: entry['Report'],
        taskCompleted: resolveTaskCompleted(entry, key),
        priority: entry['Priority'],
        imageQuality: entry['Image Quality'],
        cloudCover: entry['Cloud Cover'],
        color: entry['Color'] ?? entry['color'] ?? '',
        service: entry['Service'] ?? entry['service'] ?? '',
        exploitStartTime:
          entry['Exploit Start Time'] ?? entry['Expliot Start Time'] ?? entry['exploitStartTime'] ?? '',
        exploitEndTime:
          entry['Exploit End Time'] ?? entry['Expliot End Time'] ?? entry['exploitEndTime'] ?? '',
        irReported: entry['IR Reported'] ?? entry['irReported'] ?? null,
        sfReported: entry['SF Reported'] ?? entry['sfReported'] ?? null,
        remarks: getRemarksValue(entry),
        childId: entry['Child ID'],
      })
      return
    }

    if (entry['Parent ID'] !== undefined) {
      const parentId = Number(entry['Parent ID'])
      const parent = inputData[parentId] || inputData[entry['Parent ID']]
      const parentName = normalizeImageName(parent?.['Image File Name'] || `Image_${parentId}`)
      const areaName = entry['Area Name'] || `Area_${key}`
      rows.push({
        id: Number(key),
        groupName: [parentName, areaName],
        treePath: [`img_${parentId}`, areaName],
        taskStatus: entry['Task Status'],
        assignee: entry['Assignee'],
        areaName,
        color: entry['Color'] ?? entry['color'] ?? '',
        service: entry['Service'] ?? entry['service'] ?? '',
        exploitStartTime:
          entry['Exploit Start Time'] ?? entry['Expliot Start Time'] ?? entry['exploitStartTime'] ?? '',
        exploitEndTime:
          entry['Exploit End Time'] ?? entry['Expliot End Time'] ?? entry['exploitEndTime'] ?? '',
        irReported: entry['IR Reported'] ?? entry['irReported'] ?? null,
        sfReported: entry['SF Reported'] ?? entry['sfReported'] ?? null,
        imageQuality: entry['Image Quality'] ?? parent?.['Image Quality'] ?? '',
        remarks: getRemarksValue(entry),
        parentId,
        areaId: entry['Area ID'] ?? entry['areaId'] ?? entry['SCVU Image Area ID'] ?? null,
        scvuTaskId: entry['SCVU Task ID'] || null,
      })
    }
  })

  return rows
}

const formatBoolean = (value) => (value === true ? 'Yes' : value === false ? 'No' : '')

const parseProgress = (value) => {
  if (!value || typeof value !== 'string' || !value.includes('/')) return null
  const [completed, total] = value.split('/').map((item) => Number(item))
  if (!total || Number.isNaN(completed) || Number.isNaN(total)) return null
  return Math.round((completed / total) * 100)
}

const normalizeStatus = (value) => {
  if (!value) return ''
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'in_progress' || normalized === 'inprogress') return 'in progress'
  return normalized
}

const extractAreaIdFromName = (value) => {
  if (!value || typeof value !== 'string') return null
  const match = value.match(/(?:^|[_\-\s])(\d+)\s*$/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeRemarksValue = (value) => {
  if (typeof value !== 'string') return ''
  // Allow users (or backend payloads) using literal "\n" to render as new lines.
  const normalized = value.replace(/\\n/g, '\n')
  // Treat whitespace-only/newline-only values as empty so placeholder works.
  return normalized.trim().length === 0 ? '' : normalized
}

const toBackendTaskId = (rowKey) => {
  const numericKey = Number(rowKey)
  if (!Number.isFinite(numericKey)) return rowKey
  return numericKey < 0 ? Math.abs(numericKey) : numericKey
}

function TaskingSummaryTab({
  dateRange,
  isCollapsed,
  title = 'Tasking Summary',
  subtitle = 'Task status overview for the selected date range.',
  taskStatusFilter = null,
  showVerificationActions = true,
  verificationOnlyActions = false,
  readOnlyInputs = false,
}) {
  const [inputData, setInputData] = useState(null)
  const [workingData, setWorkingData] = useState(null)
  const [dropdownValues, setDropdownValues] = useState(() => {
    try {
      return {
        Report: JSON.parse(localStorage.getItem('tasking_options_report') || '[]'),
        'Cloud Cover': JSON.parse(localStorage.getItem('tasking_options_cloud_cover') || '[]'),
        'Image Category': JSON.parse(localStorage.getItem('tasking_options_image_category') || '[]'),
      }
    } catch {
      return { Report: [], 'Cloud Cover': [], 'Image Category': [] }
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [hasPendingEdits, setHasPendingEdits] = useState(false)
  const [selection, setSelection] = useState([])
  const [searchText, setSearchText] = useState('')
  const [filterModel, setFilterModel] = useState({ items: [], quickFilterValues: [] })
  const [openCopy, setOpenCopy] = useState(false)
  const [clipboardValue, setClipboardValue] = useState('')
  const { addNotification } = useNotifications()
  const handleTooltipClose = () => setOpenCopy(false)
  const applyWorkingDataChange = (updater) => {
    setWorkingData((prev) => updater(prev))
    setHasPendingEdits(true)
  }

  const rows = useMemo(() => buildRows(workingData || inputData), [workingData, inputData])
  const normalizedStatusFilters = useMemo(() => {
    if (!taskStatusFilter) return null
    const values = Array.isArray(taskStatusFilter) ? taskStatusFilter : [taskStatusFilter]
    const normalized = values.map((value) => normalizeStatus(value)).filter(Boolean)
    if (!normalized.length) return null
    return new Set(normalized)
  }, [taskStatusFilter])
  const displayedRows = useMemo(() => {
    if (!normalizedStatusFilters) return rows
    const includedChildIds = new Set(
      rows
        .filter((row) => row?.parentId !== undefined)
        .filter((row) => normalizedStatusFilters.has(normalizeStatus(row?.taskStatus)))
        .map((row) => row.id),
    )
    const parentIds = new Set(
      rows
        .filter((row) => includedChildIds.has(row.id))
        .map((row) => row.parentId)
        .filter((value) => value !== undefined && value !== null),
    )
    return rows.filter((row) => parentIds.has(row.id) || includedChildIds.has(row.id))
  }, [rows, normalizedStatusFilters])

  const reportColor = (value) => {
    switch (value) {
      case 'IIRS':
        return 'rgba(105, 181, 248, 0.5)'
      case 'DS(SF)':
      case 'IIR':
        return 'rgba(105, 248, 139, 0.68)'
      case 'Research':
      case 'Re-DL':
        return 'rgba(248, 233, 91, 0.8)'
      case 'TOS':
        return 'rgba(51, 28, 9, 0.5)'
      case 'Img Error':
      case 'Failed':
        return 'rgba(248, 23, 26, 0.75)'
      case 'Downgrade':
        return 'rgba(248, 86, 22, 0.75)'
      case 'HOTO':
        return 'rgba(192, 22, 247, 0.7)'
      default:
        return 'transparent'
    }
  }

  const dropdownFieldSx = (backgroundColor = 'transparent') => ({
    width: '100%',
    '& .MuiOutlinedInput-root': {
      height: 28,
      minHeight: 28,
      paddingRight: 28,
      alignItems: 'center',
      borderRadius: 6,
      backgroundColor,
      color: 'var(--text)',
    },
    '& .MuiInputBase-input::placeholder': {
      color: 'var(--muted)',
      opacity: 1,
    },
    '& .MuiOutlinedInput-input': {
      padding: '0 10px',
      textAlign: 'center',
      color: 'var(--text)',
    },
    '& .MuiSelect-select': {
      padding: '0 26px 0 10px !important',
      display: 'flex',
      alignItems: 'center',
      height: '28px',
      lineHeight: '28px',
      color: 'var(--text)',
    },
    '& .MuiSvgIcon-root': {
      color: 'var(--muted)',
    },
    '& .MuiAutocomplete-input': {
      color: 'var(--text)',
    },
    '& .MuiAutocomplete-endAdornment': {
      right: 6,
    },
  })

  const inlineTextFieldSx = () => ({
    width: '100%',
    minWidth: 0,
    '& .MuiOutlinedInput-root': {
      width: '100%',
      height: 28,
      minHeight: 28,
      paddingRight: 8,
      alignItems: 'center',
      borderRadius: 6,
      backgroundColor: 'transparent',
      color: 'var(--text)',
    },
    '& .MuiOutlinedInput-input': {
      padding: '0 8px',
      textAlign: 'left',
      fontSize: 12,
      color: 'var(--text)',
      whiteSpace: 'nowrap',
    },
    '& .MuiInputBase-input::placeholder': {
      color: 'var(--muted)',
      opacity: 1,
      fontSize: 11,
    },
  })

  const reportSelectFieldSx = (backgroundColor = 'transparent') => ({
    width: '100%',
    '& .MuiOutlinedInput-root': {
      height: 28,
      minHeight: 28,
      alignItems: 'center',
      borderRadius: 999,
      backgroundColor,
      color: 'var(--text)',
    },
    '& .MuiSelect-select': {
      padding: '0 26px 0 10px !important',
      display: 'flex',
      alignItems: 'center',
      height: '28px',
      lineHeight: '28px',
      fontSize: 13,
    },
    '& .MuiSvgIcon-root': {
      color: 'var(--muted)',
    },
  })

  const cloudCoverSelectSx = () => ({
    width: '100%',
    minWidth: 0,
    '& .MuiOutlinedInput-root': {
      width: '100%',
      minWidth: 0,
      height: 28,
      minHeight: 28,
      alignItems: 'center',
      borderRadius: 999,
      backgroundColor: 'transparent',
      color: 'var(--text)',
    },
    '& .MuiSelect-select': {
      padding: '0 26px 0 10px !important',
      display: 'block',
      textAlign: 'left',
      height: '28px',
      lineHeight: '28px',
      fontSize: 12,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    '& .MuiSvgIcon-root': {
      color: 'var(--muted)',
    },
  })

  const getWorkingValue = (rowId, field) => {
    const source = workingData || inputData
    if (!source) return null
    const row = source[String(rowId)]
    return row ? row[field] : null
  }

  const role = UserService.readUserRoleSingle()
  const canSeeSubImageName = role === 'IA'

  const getSubImageLabel = (row, fallbackName = '') => {
    if (!row?.parentId) return fallbackName || row?.id?.toString() || 'unknown'
    const derivedAreaId = extractAreaIdFromName(row?.areaName || fallbackName)
    const subImageId = row?.areaId ?? derivedAreaId ?? row?.scvuTaskId ?? row?.id
    if (!canSeeSubImageName) return `${subImageId ?? ''}`
    const subImageName = row?.areaName || fallbackName || ''
    return subImageName || `${subImageId ?? ''}`
  }

  const getAggregatedImageQuality = (row) => {
    if (!row?.childId || !Array.isArray(row.childId)) return ''
    const qualityValues = row.childId
      .map((taskId) => {
        const numericTaskId = Number(taskId)
        if (!Number.isFinite(numericTaskId)) return ''
        const taskRowId = -Math.abs(numericTaskId)
        const quality = getWorkingValue(taskRowId, 'Image Quality')
        return typeof quality === 'string' ? quality.trim() : ''
      })
      .filter((value) => value.length > 0)
    if (qualityValues.length === 0) return row?.imageQuality || ''
    return qualityValues.join('\n')
  }

  const parseExploitTimestamp = (value) => {
    if (!value || typeof value !== 'string') return null
    // Backend commonly sends "YYYY-MM-DD, HH:mm:ss".
    const normalized = value.includes(', ') ? value.replace(', ', 'T') : value
    const parsed = new Date(normalized)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const getAggregatedExploitTime = (row, field, mode, gridApi) => {
    if (!row?.childId || !Array.isArray(row.childId)) return row?.[field] || ''
    const dateValues = row.childId
      .map((taskId) => {
        const numericTaskId = Number(taskId)
        if (!Number.isFinite(numericTaskId)) return null
        const taskRowId = -Math.abs(numericTaskId)
        const taskRow = gridApi?.getRow?.(taskRowId)
        if (!taskRow) return null
        const rowValue = taskRow[field]
        const parsed = parseExploitTimestamp(rowValue || '')
        return parsed ? { parsed, raw: rowValue } : null
      })
      .filter(Boolean)

    if (dateValues.length === 0) return row?.[field] || ''
    if (mode === 'min') {
      return dateValues.reduce((acc, curr) => (curr.parsed < acc.parsed ? curr : acc)).raw
    }
    return dateValues.reduce((acc, curr) => (curr.parsed > acc.parsed ? curr : acc)).raw
  }

  const roundDownToHour = (value) => {
    if (!value || typeof value !== 'string') return value
    return value.replace(/(\d{2}):\d{2}:\d{2}$/, '$1:00:00')
  }
  const shouldRoundTime = role === 'II' || role === 'Senior II'
  const dateFormatter = shouldRoundTime ? (value) => roundDownToHour(value) : undefined

  const columns = useMemo(
    () => [
      {
        field: 'imageAreaName',
        headerName: 'Image/Area Name',
        minWidth: 180,
        flex: 1.3,
        valueGetter: (params) => {
          const row = params?.row
          if (!row) return ''
          const hierarchy = row.groupName
          if (!hierarchy || !Array.isArray(hierarchy) || hierarchy.length === 0) {
            return row.id?.toString() || 'Unknown'
          }
          const nameFromGroup = hierarchy[hierarchy.length - 1]
          return getSubImageLabel(row, nameFromGroup)
        },
      },
      { field: 'sensorName', headerName: 'Sensor Name', minWidth: 110, flex: 0.6 },
      { field: 'imageId', headerName: 'Image ID', minWidth: 90, flex: 0.45 },
      { field: 'uploadDate', headerName: 'Upload Date', minWidth: 120, flex: 0.7, valueFormatter: dateFormatter },
      { field: 'imageDateTime', headerName: 'Image Date Time', minWidth: 130, flex: 0.8, valueFormatter: dateFormatter },
      { field: 'areaName', headerName: 'Area Name', minWidth: 110, flex: 0.6 },
      { field: 'assignee', headerName: 'Assignee', minWidth: 110, flex: 0.6 },
      {
        field: 'report',
        headerName: 'Report',
        minWidth: 130,
        flex: 0.6,
        renderCell: (params) => {
          if (!params?.row?.childId) return null
          const rowId = params.row.id
          const currentValue = getWorkingValue(rowId, 'Report') ?? params?.row?.report ?? null
          if (readOnlyInputs) {
            return <Box sx={{ width: '100%' }}>{currentValue || '—'}</Box>
          }
          return (
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
              <TextField
                select
                fullWidth
                size="small"
                value={currentValue ?? ''}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  applyWorkingDataChange((prev) =>
                    updateWorkingRow(prev, rowId, 'Report', event.target.value || null, inputData),
                  )
                }
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => (selected ? selected : 'Report'),
                }}
                sx={reportSelectFieldSx(reportColor(currentValue))}
              >
                <MenuItem value="" sx={{ display: 'none' }} />
                {getDropdownOptions('Report', 'Report').map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )
        },
      },
      {
        field: 'remarks',
        headerName: 'Remarks',
        minWidth: 140,
        flex: 0.9,
        renderCell: (params) => {
          if (!params?.row) return ''
          if (params.row.parentId === undefined) {
            const parentRemarks = normalizeRemarksValue(params?.row?.remarks ?? '')
            return (
              <Box
                className={`tasking-summary__remarks-parent${parentRemarks ? '' : ' is-empty'}`}
                sx={{ width: '100%', whiteSpace: 'pre-wrap', lineHeight: 1.25 }}
              >
                {parentRemarks || '—'}
              </Box>
            )
          }
          const rowId = params.row.id
          const currentValue = normalizeRemarksValue(getWorkingValue(rowId, 'Remarks') ?? params?.row?.remarks ?? '')
          if (readOnlyInputs) {
            return (
              <Box
                className={`tasking-summary__remarks-parent${currentValue ? '' : ' is-empty'}`}
                sx={{ width: '100%', whiteSpace: 'pre-wrap', lineHeight: 1.25 }}
              >
                {currentValue || '—'}
              </Box>
            )
          }
          return (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
              <textarea
                rows={2}
                value={currentValue ?? ''}
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onFocus={(event) => event.stopPropagation()}
                onKeyDownCapture={(event) => event.stopPropagation()}
                onChange={(event) =>
                  applyWorkingDataChange((prev) =>
                    updateWorkingRow(prev, rowId, 'Remarks', normalizeRemarksValue(event.target.value), inputData),
                  )
                }
                placeholder="Add Remarks"
                className="tasking-summary__remarks-input"
              />
            </Box>
          )
        },
      },
      {
        field: 'imageStatus',
        headerName: 'Image Status',
        minWidth: 140,
        flex: 0.8,
        renderCell: (params) => {
          const rowId = params?.row?.id
          const taskCompleted =
            rowId != null
              ? getWorkingValue(rowId, 'Task Completed') ?? params?.row?.taskCompleted ?? null
              : null
          const taskStatus =
            rowId != null ? getWorkingValue(rowId, 'Task Status') ?? params?.row?.taskStatus ?? null : null
          const progressValue = parseProgress(taskCompleted)
          if (progressValue !== null) {
            return (
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 0.5,
                }}
              >
                <LinearProgress
                  variant="determinate"
                  value={progressValue}
                  sx={{ height: 5, borderRadius: 999 }}
                />
                <Typography variant="caption" sx={{ color: 'var(--muted)', lineHeight: 1.2 }}>
                  {taskCompleted}
                </Typography>
              </Box>
            )
          }
          return taskStatus || ''
        },
      },
      { field: 'priority', headerName: 'Priority', minWidth: 90, flex: 0.5 },
      {
        field: 'color',
        headerName: 'Color',
        minWidth: 110,
        flex: 0.55,
        renderCell: (params) => params?.row?.color || '—',
      },
      {
        field: 'service',
        headerName: 'Service',
        minWidth: 120,
        flex: 0.6,
        renderCell: (params) => params?.row?.service || '—',
      },
      {
        field: 'exploitStartTime',
        headerName: 'Exploit Start Time',
        minWidth: 140,
        flex: 0.75,
        renderCell: (params) => {
          if (!params?.row) return '—'
          if (params.row.parentId === undefined) {
            const earliestStart = getAggregatedExploitTime(params.row, 'exploitStartTime', 'min', params.api)
            return earliestStart || '—'
          }
          return params.row.exploitStartTime || '—'
        },
      },
      {
        field: 'exploitEndTime',
        headerName: 'Exploit End Time',
        minWidth: 140,
        flex: 0.75,
        renderCell: (params) => {
          if (!params?.row) return '—'
          if (params.row.parentId === undefined) {
            const latestEnd = getAggregatedExploitTime(params.row, 'exploitEndTime', 'max', params.api)
            return latestEnd || '—'
          }
          return params.row.exploitEndTime || '—'
        },
      },
      {
        field: 'irReported',
        headerName: 'IR Reported',
        minWidth: 95,
        flex: 0.5,
        renderCell: (params) => {
          if (!params?.row || role !== 'IA') return ''
          if (params?.row?.parentId === undefined) return formatBoolean(params?.row?.irReported)
          const rowId = params.row.id
          const currentValue = Boolean(getWorkingValue(rowId, 'IR Reported') ?? params?.row?.irReported)
          if (readOnlyInputs) return formatBoolean(currentValue)
          return (
            <Checkbox
              checked={currentValue}
              onClick={(event) => event.stopPropagation()}
              onChange={(_, newValue) =>
                applyWorkingDataChange((prev) => updateWorkingRow(prev, rowId, 'IR Reported', newValue, inputData))
              }
            />
          )
        },
      },
      {
        field: 'sfReported',
        headerName: 'SF Reported',
        minWidth: 95,
        flex: 0.5,
        renderCell: (params) => {
          if (!params?.row || role !== 'IA') return ''
          if (params?.row?.parentId === undefined) return formatBoolean(params?.row?.sfReported)
          const rowId = params.row.id
          const currentValue = Boolean(getWorkingValue(rowId, 'SF Reported') ?? params?.row?.sfReported)
          if (readOnlyInputs) return formatBoolean(currentValue)
          return (
            <Checkbox
              checked={currentValue}
              onClick={(event) => event.stopPropagation()}
              onChange={(_, newValue) =>
                applyWorkingDataChange((prev) => updateWorkingRow(prev, rowId, 'SF Reported', newValue, inputData))
              }
            />
          )
        },
      },
      {
        field: 'imageQuality',
        headerName: 'Image Quality',
        minWidth: 145,
        flex: 0.72,
        renderCell: (params) => {
          if (!params?.row) return ''
          if (params.row.parentId === undefined) {
            const aggregated = getAggregatedImageQuality(params.row)
            return (
              <Box className="tasking-summary__remarks-parent" sx={{ width: '100%', whiteSpace: 'pre-wrap', lineHeight: 1.25 }}>
                {aggregated || '—'}
              </Box>
            )
          }
          const rowId = params.row.id
          const currentValue = getWorkingValue(rowId, 'Image Quality') ?? params?.row?.imageQuality ?? ''
          if (readOnlyInputs) {
            return (
              <Box className="tasking-summary__remarks-parent" sx={{ width: '100%', whiteSpace: 'pre-wrap', lineHeight: 1.25 }}>
                {currentValue || '—'}
              </Box>
            )
          }
          return (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
              <textarea
                rows={1}
                value={currentValue ?? ''}
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onFocus={(event) => event.stopPropagation()}
                onKeyDownCapture={(event) => event.stopPropagation()}
                onChange={(event) =>
                  applyWorkingDataChange((prev) =>
                    updateWorkingRow(prev, rowId, 'Image Quality', event.target.value, inputData),
                  )
                }
                placeholder="Image quality"
                className="tasking-summary__remarks-input"
              />
            </Box>
          )
        },
      },
      {
        field: 'cloudCover',
        headerName: 'Cloud Cover',
        minWidth: 132,
        flex: 0.68,
        renderCell: (params) => {
          if (!params?.row?.childId) return null
          const rowId = params.row.id
          const currentValue = getWorkingValue(rowId, 'Cloud Cover') ?? params?.row?.cloudCover ?? null
          if (readOnlyInputs) {
            return <Box sx={{ width: '100%' }}>{currentValue || '—'}</Box>
          }
          return (
            <Box sx={{ width: '100%', minWidth: 0, display: 'flex', alignItems: 'center' }}>
              <TextField
                select
                fullWidth
                size="small"
                value={currentValue ?? ''}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  applyWorkingDataChange((prev) =>
                    updateWorkingRow(prev, rowId, 'Cloud Cover', event.target.value || null, inputData),
                  )
                }
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => (selected ? selected : 'CC'),
                }}
                sx={cloudCoverSelectSx()}
              >
                <MenuItem value="" sx={{ display: 'none' }} />
                {getDropdownOptions('Cloud Cover', 'Cloud Cover').map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )
        },
      },
    ],
    [readOnlyInputs, role],
  )

  const columnVisibilityModel = useMemo(
    () => ({
      imageAreaName: false,
      irReported: role === 'IA',
      sfReported: role === 'IA',
    }),
    [role],
  )

  useEffect(() => {
    setFilterModel((prev) => ({
      ...prev,
      quickFilterValues: searchText ? [searchText] : [],
    }))
  }, [searchText])

  useEffect(() => {
    const visibleIds = new Set(displayedRows.map((row) => row.id))
    setSelection((prev) => prev.filter((id) => visibleIds.has(id)))
  }, [displayedRows])

  const getTreeDataPath = (row) => {
    if (row.treePath && Array.isArray(row.treePath)) {
      return row.treePath.filter((item) => item != null).map((item) => item?.toString() || '')
    }
    if (!row.groupName || !Array.isArray(row.groupName)) {
      return [row.id?.toString() || 'unknown']
    }
    return row.groupName.filter((item) => item != null).map((item) => item?.toString() || '')
  }

  const fetchSummary = async () => {
    if (!dateRange) return

    try {
      setLoading(true)
      setError(null)
 
      const data = await api.postTaskingSummaryData(dateRange)

  


      setInputData(data)
    } catch (err) {
      console.error('Tasking Summary fetch failed:', err)
      const message = getErrorMessage(err, 'Unable to load tasking summary data.')
      setError(message)
      addNotification({
        title: 'Load failed',
        meta: 'Just now · Tasking Summary unavailable',
      })
    } finally {
      setLoading(false)
    }
  }

  const normalizeOptions = (data, key) => {
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data[key])) return data[key]
    return []
  }

  const readCachedOptions = (key) => {
    try {
      if (key === 'Report') return JSON.parse(localStorage.getItem('tasking_options_report') || '[]')
      if (key === 'Cloud Cover') return JSON.parse(localStorage.getItem('tasking_options_cloud_cover') || '[]')
      if (key === 'Image Category') return JSON.parse(localStorage.getItem('tasking_options_image_category') || '[]')
    } catch {
      return []
    }
    return []
  }

  const writeCachedOptions = (key, options) => {
    try {
      if (key === 'Report') {
        localStorage.setItem('tasking_options_report', JSON.stringify(options))
      } else if (key === 'Cloud Cover') {
        localStorage.setItem('tasking_options_cloud_cover', JSON.stringify(options))
      } else if (key === 'Image Category') {
        localStorage.setItem('tasking_options_image_category', JSON.stringify(options))
      }
    } catch {
      // ignore storage failures
    }
  }

  const deriveOptionsFromData = (data, field) => {
    if (!data) return []
    const values = new Set()
    Object.values(data).forEach((row) => {
      if (row && row[field] !== undefined && row[field] !== null) {
        values.add(row[field])
      }
    })
    return Array.from(values)
  }

  const deriveOptionsFromRows = (field) => {
    if (!rows || rows.length === 0) return []
    const values = new Set()
    rows.forEach((row) => {
      if (row?.childId && row[field] !== undefined && row[field] !== null) {
        values.add(row[field])
      }
    })
    return Array.from(values)
  }

  const getDropdownOptions = (key, field) => {
    const fromState = Array.isArray(dropdownValues[key]) ? dropdownValues[key] : []
    const cleaned = fromState.filter((opt) => opt != null)
    if (cleaned.length) return cleaned
    const fromWorking = deriveOptionsFromData(workingData, field)
    if (fromWorking.length) return fromWorking
    return deriveOptionsFromRows(field === 'Report' ? 'report' : field === 'Cloud Cover' ? 'cloudCover' : 'imageCategory')
  }

  const fetchDropdownValues = async (path, key) => {
    try {
      const response = await api.client({url: `${path}`, method: "get"})
     
      const data =  response.data
      const normalized = normalizeOptions(data, key)
      if (normalized.length) {
        writeCachedOptions(key, normalized)
      }
      setDropdownValues((prev) => ({
        ...prev,
        [key]: normalized.length ? normalized : readCachedOptions(key),
      }))
    } catch (err) {
      console.warn(`Failed to load ${key} values`, err)
      const message = getErrorMessage(err, `Unable to load ${key} options.`)
      setError(message)
      addNotification({
        title: `${key} options failed`,
        meta: 'Just now · Please try again',
      })
      setDropdownValues((prev) => ({
        ...prev,
        [key]: prev[key]?.length ? prev[key] : readCachedOptions(key),
      }))
    }
  }

  const processTask = async (apiPath) => {
    if (selection.length === 0) {
      addNotification({
        title: 'Selection required',
        meta: 'Please select a row first',
      })
      return
    }

    const taskRows = selection.filter((rowId) => {
      const row = rows.find((item) => item.id === rowId)
      return row?.parentId !== undefined
    })
    if (taskRows.length === 0) {
      addNotification({
        title: 'Selection required',
        meta: 'Please select a task row',
      })
      return
    }

    const allowedStatuses = {
      '/tasking/startTasks': ['incomplete', 'not started'],
      '/tasking/completeTasks': ['in progress'],
      '/tasking/verifyPass': ['verifying'],
      '/tasking/verifyFail': ['verifying'],
    }
    const expected = allowedStatuses[apiPath]
    if (expected) {
      const invalid = taskRows
        .map((rowId) => rows.find((item) => item.id === rowId))
        .filter((row) => {
          const status = normalizeStatus(row?.taskStatus)
          return !expected.includes(status)
        })
      if (invalid.length) {
        const expectedLabel = expected.map((value) => value.replace(/\b\w/g, (c) => c.toUpperCase())).join(', ')
        addNotification({
          title: 'Invalid task status',
          meta: `Expected ${expectedLabel} · ${invalid.length} task(s) not ready`,
        })
        return
      }
    }

    const taskIds = taskRows.map((rowId) => {
      const row = rows.find((item) => item.id === rowId)
      return row?.scvuTaskId || rowId
    })
    try {
      setError(null)
      await api.client({ url: `${apiPath}`, method: 'post', data: { 'SCVU Task ID': taskIds } })
      const actionTitle =
        apiPath === '/tasking/startTasks' ? 'Tasks started' : apiPath === '/tasking/completeTasks' ? 'Tasks completed' : 'Tasks updated'
      addNotification({
        title: actionTitle,
        meta: `Just now · ${taskIds.length} tasks`,
      })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      console.error('Tasking Summary task update failed:', err)
      const message = getErrorMessage(err, 'Unable to update tasks.')
      setError(message)
      addNotification({
        title: 'Task update failed',
        meta: 'Just now · Please try again',
      })
    }
  }

  const processImage = async (apiPath) => {
    if (selection.length === 0) {
      addNotification({
        title: 'Selection required',
        meta: 'Select an image row to complete',
      })
      return
    }

    const imageIds = selection.filter((rowId) => {
      const row = rows.find((item) => item.id === rowId)
      return row?.parentId === undefined && row?.childId
    })

    if (imageIds.length === 0) {
      addNotification({
        title: 'Selection required',
        meta: 'Please select only image rows',
      })
      return
    }

    const incomplete = imageIds
      .map((rowId) => rows.find((item) => item.id === rowId))
      .filter((row) => {
        const progressValue = parseProgress(row?.taskCompleted)
        return progressValue !== null && progressValue < 100
      })
    if (apiPath === '/tasking/completeImages' && incomplete.length) {
      addNotification({
        title: 'Cannot complete image',
        meta: 'All tasks must be completed first',
      })
      return
    }

    const dataToSave = {}
    let hasChanges = false
    imageIds.forEach((rowId) => {
      const dataRow = workingData?.[String(rowId)]
      if (dataRow && dataRow['Child ID']) {
        dataToSave[rowId] = dataRow
        hasChanges = true
      }
    })

    Object.keys(workingData || {}).forEach((key) => {
      const dataRow = workingData?.[key]
      if (dataRow && dataRow['Parent ID'] !== undefined) {
        const parentId = dataRow['Parent ID']
        if (imageIds.includes(parentId)) {
          const taskId = toBackendTaskId(key)
          dataToSave[taskId] = { ...(dataToSave[taskId] || {}), Remarks: normalizeRemarksValue(dataRow['Remarks'] ?? '') }
          hasChanges = true
        }
      }
    })

    const saveAndComplete = async () => {
      const username = localStorage.getItem('username')
      await api.client({
        url: `${apiPath}`,
        method: 'post',
        data: {
          'SCVU Image ID': imageIds,
          Vetter: username || '',
        },
      })
    }

    if (hasChanges && Object.keys(dataToSave).length > 0) {
      try {
        await api.postUpdateTaskingSummaryData(dataToSave)
      } catch (err) {
        console.error('Tasking Summary save failed:', err)
        const message = getErrorMessage(err, 'Error saving changes. Image will not be completed.')
        setError(message)
        addNotification({
          title: 'Save failed',
          meta: 'Just now · Image not completed',
        })
        return
      }
    }
    try {
      setError(null)
      await saveAndComplete()
      addNotification({
        title: 'Images completed',
        meta: `Just now · ${imageIds.length} images`,
      })
    } catch (err) {
      console.error('Tasking Summary complete failed:', err)
      const message = getErrorMessage(err, 'Unable to complete images.')
      setError(message)
      addNotification({
        title: 'Complete failed',
        meta: 'Just now · Please try again',
      })
      return
    }

    setRefreshKey((prev) => prev + 1)
  }

  const processSendData = async () => {
    if (selection.length === 0) {
      addNotification({
        title: 'Selection required',
        meta: 'Please select a row first',
      })
      return
    }

    const payload = {}
    let hasNull = false
    selection.forEach((rowId) => {
      const dataRow = workingData?.[String(rowId)]
      if (!dataRow) return
      if (dataRow['Child ID']) {
        const baseRow = inputData?.[String(rowId)] || {}
        const hasImageChanges = JSON.stringify(dataRow) !== JSON.stringify(baseRow)
        if (!hasImageChanges) return
        if (dataRow['Report'] == null || dataRow['Cloud Cover'] == null) {
          hasNull = true
        }
        payload[rowId] = dataRow
        return
      }
      if (dataRow['Parent ID'] !== undefined) {
        const taskId = dataRow['SCVU Task ID'] ?? toBackendTaskId(rowId)
        const baseRow = inputData?.[String(rowId)] || {}
        const currentRemarks = normalizeRemarksValue(dataRow['Remarks'] ?? '')
        const baseRemarks = normalizeRemarksValue(baseRow['Remarks'] ?? baseRow.remarks ?? '')
        const currentImageQuality = dataRow['Image Quality'] ?? dataRow.imageQuality ?? null
        const baseImageQuality = baseRow['Image Quality'] ?? baseRow.imageQuality ?? null
        const currentIrReported = dataRow['IR Reported'] ?? dataRow.irReported ?? null
        const baseIrReported = baseRow['IR Reported'] ?? baseRow.irReported ?? null
        const currentSfReported = dataRow['SF Reported'] ?? dataRow.sfReported ?? null
        const baseSfReported = baseRow['SF Reported'] ?? baseRow.sfReported ?? null
        const patch = { ...(payload[taskId] || {}) }
        if (currentRemarks !== baseRemarks) patch['Remarks'] = currentRemarks
        if (currentIrReported !== baseIrReported) patch['IR Reported'] = Boolean(currentIrReported)
        if (currentSfReported !== baseSfReported) patch['SF Reported'] = Boolean(currentSfReported)
        if (Object.keys(patch).length > 0) payload[taskId] = patch

        // Image Quality is persisted on the parent image row in backend.
        if (currentImageQuality !== baseImageQuality) {
          const parentId = dataRow['Parent ID']
          const parentRow = workingData?.[String(parentId)] || {}
          if (parentRow['Report'] == null || parentRow['Cloud Cover'] == null) {
            hasNull = true
          }
          payload[parentId] = {
            ...(payload[parentId] || {}),
            Report: parentRow['Report'] ?? null,
            'Image Category': parentRow['Image Category'] ?? null,
            'Cloud Cover': parentRow['Cloud Cover'] ?? null,
            'Target Tracing': parentRow['Target Tracing'] ?? null,
            'Image Quality': currentImageQuality,
          }
        }
      }
    })

    // Always persist edited task remarks, even if the user selected only image rows.
    Object.keys(workingData || {}).forEach((key) => {
      const currentRow = workingData?.[key]
      if (!currentRow || currentRow['Parent ID'] === undefined) return
      const currentRemarks = normalizeRemarksValue(currentRow['Remarks'] ?? '')
      const baseRow = inputData?.[key] || {}
      const baseRemarks = normalizeRemarksValue(baseRow['Remarks'] ?? baseRow.remarks ?? '')
      const currentImageQuality = currentRow['Image Quality'] ?? currentRow.imageQuality ?? null
      const baseImageQuality = baseRow['Image Quality'] ?? baseRow.imageQuality ?? null
      const currentIrReported = currentRow['IR Reported'] ?? currentRow.irReported ?? null
      const baseIrReported = baseRow['IR Reported'] ?? baseRow.irReported ?? null
      const currentSfReported = currentRow['SF Reported'] ?? currentRow.sfReported ?? null
      const baseSfReported = baseRow['SF Reported'] ?? baseRow.sfReported ?? null
      const taskId = currentRow['SCVU Task ID'] ?? toBackendTaskId(key)
      const patch = { ...(payload[taskId] || {}) }
      if (currentRemarks !== baseRemarks) patch['Remarks'] = currentRemarks
      if (currentIrReported !== baseIrReported) patch['IR Reported'] = Boolean(currentIrReported)
      if (currentSfReported !== baseSfReported) patch['SF Reported'] = Boolean(currentSfReported)
      if (Object.keys(patch).length > 0) payload[taskId] = patch

      if (currentImageQuality !== baseImageQuality) {
        const parentId = currentRow['Parent ID']
        const parentRow = workingData?.[String(parentId)] || {}
        if (parentRow['Report'] == null || parentRow['Cloud Cover'] == null) {
          hasNull = true
        }
        payload[parentId] = {
          ...(payload[parentId] || {}),
          Report: parentRow['Report'] ?? null,
          'Image Category': parentRow['Image Category'] ?? null,
          'Cloud Cover': parentRow['Cloud Cover'] ?? null,
          'Target Tracing': parentRow['Target Tracing'] ?? null,
          'Image Quality': currentImageQuality,
        }
      }
    })

    if (Object.keys(payload).length === 0) {
      addNotification({
        title: 'Nothing to update',
        meta: 'No changes detected in selected rows',
      })
      return
    }

    if (hasNull) {
      addNotification({
        title: 'Missing values',
        meta: 'Fill all dropdowns before saving',
      })
      return
    }

    try {
      setError(null)
      await api.postUpdateTaskingSummaryData(payload)
      setHasPendingEdits(false)
      addNotification({
        title: 'Tasking Summary updated',
        meta: `Just now · ${selection.length} rows updated`,
      })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      console.error('Tasking Summary update failed:', err)
      const message = getErrorMessage(err, 'Unable to save changes.')
      setError(message)
      addNotification({
        title: 'Save failed',
        meta: 'Just now · Please try again',
      })
    }
  }

  const isCellEditable = (params) => {
    if (params?.row?.parentId !== undefined && params.field === 'remarks') {
      return true
    }
    if (params?.row?.parentId !== undefined && params.field === 'imageQuality') {
      return true
    }
    return false
  }

  const processRowUpdate = (newRow) => {
    if (!newRow?.id) return newRow
    applyWorkingDataChange((prev) => {
      let next = prev
      if (newRow.remarks !== undefined) {
        next = updateWorkingRow(next, newRow.id, 'Remarks', newRow.remarks)
      }
      if (newRow.imageQuality !== undefined) {
        next = updateWorkingRow(next, newRow.id, 'Image Quality', newRow.imageQuality)
      }
      return next
    })
    return newRow
  }

  const copyClipboard = async () => {
    if (selection.length === 0) {
      addNotification({
        title: 'Selection required',
        meta: 'Please select a task',
      })
      return
    }
    const firstId = selection[0]
    const parentId = workingData?.[String(firstId)]?.['Parent ID']
    if (parentId === undefined || parentId === null) {
      addNotification({
        title: 'Selection required',
        meta: 'Please select task rows only',
      })
      return
    }
    const imageId = workingData?.[String(parentId)]?.['Image ID']
    if (!imageId) {
      addNotification({
        title: 'Image ID missing',
        meta: 'Unable to copy to clipboard',
      })
      return
    }
    setClipboardValue(String(imageId))
    try {
      await navigator.clipboard.writeText(String(imageId))
    } catch (error) {
      console.warn('Clipboard copy failed', error)
      addNotification({
        title: 'Clipboard failed',
        meta: 'Could not copy image ID',
      })
    }
    setOpenCopy(true)
    await processTask('/tasking/startTasks')
  }

  const isShow =
    role === 'II'
      ? { CT: true, VF: false, VP: false, CI: false }
      : role === 'Senior II' || role === 'IA'
        ? { CT: true, VF: showVerificationActions, VP: showVerificationActions, CI: showVerificationActions }
        : { CT: true, VF: showVerificationActions, VP: showVerificationActions, CI: showVerificationActions }

  useEffect(() => {
    const timerId = window.setInterval(() => {
      if (!hasPendingEdits) {
        setRefreshKey((prev) => prev + 1)
      }
    }, TABLE_AUTO_REFRESH_MS)
    return () => window.clearInterval(timerId)
  }, [hasPendingEdits])

  useEffect(() => {
    fetchSummary()
  }, [refreshKey, dateRange])

  useEffect(() => {
    if (inputData) {
      setWorkingData(inputData)
      setHasPendingEdits(false)
    }
  }, [inputData])

  useEffect(() => {
    if (!workingData) return
    setDropdownValues((prev) => ({
      Report:
        prev.Report && prev.Report.length
          ? prev.Report
          : deriveOptionsFromData(workingData, 'Report'),
      'Cloud Cover':
        prev['Cloud Cover'] && prev['Cloud Cover'].length
          ? prev['Cloud Cover']
          : deriveOptionsFromData(workingData, 'Cloud Cover'),
      'Image Category':
        prev['Image Category'] && prev['Image Category'].length
          ? prev['Image Category']
          : deriveOptionsFromData(workingData, 'Image Category'),
    }))
  }, [workingData])

  useEffect(() => {
    fetchDropdownValues('/lookup/getReport', 'Report')
    fetchDropdownValues('/lookup/getCloudCover', 'Cloud Cover')
    fetchDropdownValues('/lookup/getImageCategory', 'Image Category')
  }, [refreshKey, dateRange])

  useEffect(() => {
    const handleRefreshTrigger = () => {
      const refreshTrigger = localStorage.getItem('taskingSummaryRefresh')
      if (refreshTrigger) {
        localStorage.removeItem('taskingSummaryRefresh')
        setRefreshKey((prev) => prev + 1)
      }
    }
    handleRefreshTrigger()
    const handleFocus = () => handleRefreshTrigger()
    const handleStorage = (event) => {
      if (event.key === 'taskingSummaryRefresh') {
        handleRefreshTrigger()
      }
    }
    window.addEventListener('focus', handleFocus)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleStorage)
    }
  }, [dateRange])

  return (
    <div className="tasking-summary">
      <div className="content__topbar">
        <div className="content__heading">
          <div className="content__title">{title}</div>
          <div className="content__subtitle">{subtitle}</div>
        </div>
        <div className="content__controls">
          <div className="action-bar">
            <div className="search">
              <input
                type="text"
                placeholder="Search tasking summary"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
            <Button className="tasking-summary__button" onClick={() => setRefreshKey((prev) => prev + 1)}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="tasking-summary__actions">
        <div className="tasking-summary__actions-left">
          <div className="tasking-summary__action-buttons">
            {!verificationOnlyActions ? (
              <ClickAwayListener onClickAway={handleTooltipClose}>
                <Tooltip
                  PopperProps={{ disablePortal: true }}
                  onClose={handleTooltipClose}
                  open={openCopy}
                  disableFocusListener
                  disableHoverListener
                  disableTouchListener
                  title={clipboardValue}
                >
                  <Button className="tasking-summary__button" onClick={copyClipboard} disabled={!selection.length}>
                    Start Task
                  </Button>
                </Tooltip>
              </ClickAwayListener>
            ) : null}
            {!verificationOnlyActions && isShow.CT ? (
              <Button
                className="tasking-summary__button"
                onClick={() => processTask('/tasking/completeTasks')}
                disabled={!selection.length}
              >
                Complete Task
              </Button>
            ) : null}
            {isShow.VF ? (
              <Button
                className="tasking-summary__button"
                onClick={() => processTask('/tasking/verifyFail')}
                disabled={!selection.length}
              >
                Verify Fail
              </Button>
            ) : null}
            {isShow.VP ? (
              <Button
                className="tasking-summary__button"
                onClick={() => processTask('/tasking/verifyPass')}
                disabled={!selection.length}
              >
                Verify Pass
              </Button>
            ) : null}
            {!verificationOnlyActions && isShow.CI ? (
              <Button
                className="tasking-summary__button"
                onClick={() => processImage('/tasking/completeImages')}
                disabled={!selection.length}
              >
                Complete Image
              </Button>
            ) : null}
            {!verificationOnlyActions ? (
              <Button className="tasking-summary__button" onClick={processSendData} disabled={!selection.length}>
                Apply Change
              </Button>
            ) : null}
          </div>
        </div>








      </div>

      <div className="tasking-summary__grid">
        <DataGridPro
          treeData
          rows={displayedRows}
          columns={columns}
          disableColumnResize
          getTreeDataPath={getTreeDataPath}
          groupingColDef={{
            headerName: 'Image/Area Name',
            minWidth: 200,
            flex: 1.3,
            hideDescendantCount: true,
            valueGetter: (_value, row) => {
              const nameFromGroup =
                row?.groupName && Array.isArray(row.groupName) ? row.groupName[row.groupName.length - 1] : null
              return getSubImageLabel(row, nameFromGroup || row?.areaName || '')
            },
          }}
          checkboxSelection
          disableRowSelectionOnClick
          filterModel={filterModel}
          onFilterModelChange={setFilterModel}
          onRowSelectionModelChange={(model) => {
            if (Array.isArray(model)) {
              setSelection(model)
              return
            }
            if (model?.ids instanceof Set) {
              setSelection(Array.from(model.ids))
              return
            }
            if (model instanceof Set) {
              setSelection(Array.from(model))
              return
            }
            setSelection([])
          }}
          rowHeight={56}
          columnHeaderHeight={40}
          isCellEditable={isCellEditable}
          processRowUpdate={processRowUpdate}
          onProcessRowUpdateError={(err) => console.error(err)}
          columnVisibilityModel={columnVisibilityModel}
          loading={loading}
          hideFooter
          sx={{
            width: '100%',
            height: '100%',
            flex: 1,
            border: 'none',
            color: 'var(--text)',
            backgroundColor: 'transparent',
            '& .MuiDataGrid-columnHeaderTitle': {
              paddingLeft: 0,
              color: 'var(--muted)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
            },
            '& .MuiDataGrid-cell': {
              display: 'flex',
              alignItems: 'center',
              borderColor: 'var(--border-strong)',
              paddingTop: 0,
              paddingBottom: 0,
              fontSize: 13,
            },
            '& .MuiDataGrid-cellContent': {
              width: '100%',
            },
            '& .MuiDataGrid-cell .MuiAutocomplete-root': {
              width: '100%',
              alignSelf: 'center',
            },
            '& .MuiDataGrid-cell .MuiInputBase-root': {
              height: 28,
              minHeight: 28,
              fontSize: 13,
            },
            '& .MuiDataGrid-cell .MuiInputBase-input': {
              paddingTop: 0,
              paddingBottom: 0,
              textAlign: 'center',
            },
            '& .MuiDataGrid-cell .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--border-strong)',
            },
            '& .MuiDataGrid-cell .MuiAutocomplete-root, & .MuiDataGrid-cell .MuiTextField-root': {
              marginTop: 0,
              marginBottom: 0,
            },
            '& .MuiDataGrid-cell .MuiAutocomplete-endAdornment': {
              right: 6,
            },
            '& .MuiDataGrid-columnHeader[data-field="__tree_data_group__"] .MuiDataGrid-columnHeaderTitle': {
              paddingLeft: 0,
            },
            '& .MuiDataGrid-cell[data-field="__tree_data_group__"]': {
              paddingLeft: 0,
            },
            '& .MuiDataGrid-cellCheckbox': {
              justifyContent: 'center',
              paddingLeft: 0,
            },
            '& .MuiDataGrid-row--groupingCriteria .MuiDataGrid-cellCheckbox': {
              paddingLeft: 8,
            },
            '& .MuiDataGrid-row--groupingCriteria .MuiDataGrid-cellCheckbox .MuiCheckbox-root': {
              marginLeft: 0,
              transform: 'translateX(32px)',
            },
            '& .MuiDataGrid-virtualScroller': {
              overflowX: 'auto',
              backgroundColor: 'transparent',
            },
            '& .MuiDataGrid-overlay': {
              backgroundColor: 'transparent',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'transparent',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              fontSize: '11px',
              letterSpacing: '0.04em',
              borderBottom: '1px solid var(--border-strong)',
            },
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: 'transparent',
            },
            '& .MuiDataGrid-columnSeparator': {
              display: 'none',
            },
            '& .MuiDataGrid-scrollbarFiller': {
              backgroundColor: 'transparent',
            },
            '& .MuiDataGrid-scrollbarFiller--header': {
              backgroundColor: 'transparent',
            },
            '& .MuiDataGrid-columnHeaderTitleContainer, & .MuiDataGrid-columnHeaderTitleContainerContent': {
              color: 'var(--muted)',
            },
            '& .MuiDataGrid-row': {
              backgroundColor: 'var(--table-bg)',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'var(--hover)',
            },
          
            '& .MuiDataGrid-row.Mui-selected': {
      
              backgroundColor: '#333f4f',
            },
            '& .MuiDataGrid-iconButtonContainer button, & .MuiDataGrid-menuIconButton, & .MuiDataGrid-sortIcon': {
              color: 'var(--muted)',
            },
            '& .MuiCheckbox-root': {
              color: 'var(--muted)',
            },
            '& .MuiCheckbox-root.Mui-checked': {
              color: 'var(--accent)',
            },
          }}
        />
        <div className="tasking-summary__total-rows">
          <div className="tasking-summary__total-rows-left">
            {selection.length > 0 ? `${selection.length} row(s) selected` : ''}
          </div>
          <div className="tasking-summary__total-rows-right">Total Rows: {displayedRows.length}</div>
        </div>
        {error && <div className="tasking-summary__error">{error}</div>}
      </div>
    </div>
  )
}

export default TaskingSummaryTab
