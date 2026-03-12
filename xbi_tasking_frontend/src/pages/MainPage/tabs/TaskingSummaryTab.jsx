import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
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
const IMAGE_QUALITY_OPTIONS = ['Low', 'Medium', 'High']



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

const dashIfEmpty = (value) => (value === null || value === undefined || value === '' ? '—' : value)
const normalizeSelectValue = (value) => (value === '—' ? '' : (value ?? ''))
const normalizePassKey = (value) => String(value || '').trim().toLowerCase()

const buildRows = (inputData) => {
  if (!inputData) return []

  const rows = []
  const taskProgress = new Map()
  const passParentByImageId = new Map()
  const passParentRows = new Map()

  Object.keys(inputData).forEach((key) => {
    const entry = inputData[key]
    if (!entry || entry['Parent ID'] === undefined) return
    const parentId = Number(entry['Parent ID'])
    if (!Number.isFinite(parentId)) return
    const status = entry['Task Status']
    const normalized = typeof status === 'string' ? status.trim().toLowerCase() : ''
    const current = taskProgress.get(parentId) || { completed: 0, total: 0 }
    current.total += 1
    // Treat Verifying as completed progress for Image Status bar.
    if (normalized === 'completed' || normalized === 'verifying') {
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
      const numericImageId = Number(key)
      const defaultRowId = Number.isFinite(numericImageId) ? numericImageId : key
      const existingParent = passParentRows.get(imageFileName)
      const passRowId = existingParent?.id ?? defaultRowId
      const passTreeKey = existingParent?.treePath?.[0] || `pass_${imageFileName}_${passRowId}`
      passParentByImageId.set(String(key), { rowId: passRowId, treeKey: passTreeKey })

      if (!passParentRows.has(imageFileName)) {
        passParentRows.set(imageFileName, {
          id: passRowId,
          groupName: [imageFileName],
          treePath: [passTreeKey],
          sensorName: dashIfEmpty(entry['Sensor Name']),
          imageId: '—',
          uploadDate: '—',
          imageDateTime: '—',
          areaName: '—',
          assignee: dashIfEmpty(entry['Assignee']),
          report: '—',
          taskCompleted: '0/0',
          priority: '—',
          imageQuality: '—',
          cloudCover: '—',
          color: entry['Color'] ?? entry['color'] ?? '',
          service: entry['Service'] ?? entry['service'] ?? '',
          exploitStartTime:
            entry['Exploit Start Time'] ?? entry['Expliot Start Time'] ?? entry['exploitStartTime'] ?? '',
          exploitEndTime:
            entry['Exploit End Time'] ?? entry['Expliot End Time'] ?? entry['exploitEndTime'] ?? '',
          remarks: '—',
          childId: [],
          childImageIds: [],
        })
      }

      const parentRow = passParentRows.get(imageFileName)
      const parentChildIds = Array.isArray(parentRow.childId) ? parentRow.childId : []
      const nextChildIds = [...parentChildIds, ...(entry['Child ID'] || [])]
      const uniqueChildIds = [...new Set(nextChildIds)]
      const childImageIds = [...new Set([...(parentRow.childImageIds || []), Number(key)])]
      const progress = taskProgress.get(Number(key))
      const currentCompleted = progress?.completed ?? 0
      const currentTotal = progress?.total ?? 0
      const existingProgress = parseProgress(parentRow.taskCompleted)
      const [prevCompleted, prevTotal] =
        existingProgress === null
          ? [0, 0]
          : parentRow.taskCompleted.split('/').map((item) => Number(item))

      passParentRows.set(imageFileName, {
        ...parentRow,
        taskCompleted: `${(prevCompleted || 0) + currentCompleted}/${(prevTotal || 0) + currentTotal}`,
        childId: uniqueChildIds,
        childImageIds,
      })
      return
    }

    if (entry['Parent ID'] !== undefined) {
      const parentId = Number(entry['Parent ID'])
      const parent = inputData[parentId] || inputData[entry['Parent ID']]
      const parentName = normalizeImageName(parent?.['Image File Name'] || `Image_${parentId}`)
      const parentMeta = passParentByImageId.get(String(parentId))
      const parentPassId = parentMeta?.rowId ?? parentId
      const parentTreeKey = parentMeta?.treeKey ?? `pass_${parentName}_${parentPassId}`
      const subImageName = entry['imgName'] ?? entry['Img Name'] ?? entry['Area Name'] ?? `Area_${key}`
      const areaDisplayName =
        entry['Area ID'] ?? entry['areaId'] ?? entry['SCVU Image Area ID'] ?? entry['Area Name'] ?? `Area_${key}`
      rows.push({
        id: Number(key),
        groupName: [parentName, subImageName],
        treePath: [parentTreeKey, subImageName],
        taskStatus: dashIfEmpty(entry['Task Status']),
        assignee: dashIfEmpty(entry['Assignee']),
        imageId: dashIfEmpty(entry['Image ID'] ?? parent?.['Image ID']),
        uploadDate: dashIfEmpty(parent?.['Upload Date']),
        imageDateTime: dashIfEmpty(parent?.['Image Datetime']),
        report: dashIfEmpty(entry['Report'] ?? parent?.['Report']),
        priority: dashIfEmpty(entry['Priority'] ?? parent?.['Priority']),
        cloudCover: dashIfEmpty(entry['Cloud Cover'] ?? parent?.['Cloud Cover']),
        areaName: areaDisplayName,
        imgName: subImageName,
        color: entry['Color'] ?? entry['color'] ?? '',
        service: entry['Service'] ?? entry['service'] ?? '',
        exploitStartTime:
          entry['Exploit Start Time'] ?? entry['Expliot Start Time'] ?? entry['exploitStartTime'] ?? '',
        exploitEndTime:
          entry['Exploit End Time'] ?? entry['Expliot End Time'] ?? entry['exploitEndTime'] ?? '',
        imageQuality: dashIfEmpty(entry['Image Quality'] ?? parent?.['Image Quality'] ?? ''),
        remarks: getRemarksValue(entry),
        parentId: parentPassId,
        areaId: entry['Area ID'] ?? entry['areaId'] ?? entry['SCVU Image Area ID'] ?? null,
        scvuTaskId: entry['SCVU Task ID'] || null,
      })
    }
  })

  return [...passParentRows.values(), ...rows]
}

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
  const [columnVisibilityModel, setColumnVisibilityModel] = useState({ imageAreaName: false })
  const [openCopy, setOpenCopy] = useState(false)
  const [clipboardValue, setClipboardValue] = useState('')
  const [completedImageCountByPass, setCompletedImageCountByPass] = useState({})
  const completedImageCountByPassRef = useRef({})
  const passBaselineTotalsRef = useRef({})
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

  const getImageVerificationProgress = (row) => {
    const source = workingData || inputData
    if (!source) return null
    const imageIds = new Set(
      (Array.isArray(row?.childImageIds) ? row.childImageIds : [])
        .map((id) => String(id))
        .filter((id) => id && id !== '—'),
    )
    const currentTotal = imageIds.size
    if (!currentTotal) return null
    const passKey = normalizePassKey(row?.groupName?.[0] || row?.id?.toString() || '')
    const completedCount = Number(completedImageCountByPassRef.current[passKey] || 0)
    if (!passBaselineTotalsRef.current[passKey]) {
      passBaselineTotalsRef.current[passKey] = currentTotal
    } else if (currentTotal > passBaselineTotalsRef.current[passKey]) {
      passBaselineTotalsRef.current[passKey] = currentTotal
    }
    const stableTotal =
      verificationOnlyActions && passBaselineTotalsRef.current[passKey]
        ? Math.max(currentTotal + completedCount, Number(passBaselineTotalsRef.current[passKey]) || 0)
        : currentTotal

    let verifiedCurrent = 0
    imageIds.forEach((imageId) => {
      const imageEntry = source[String(imageId)]
      if (!imageEntry) return
      const childTaskIds = Array.isArray(imageEntry['Child ID']) ? imageEntry['Child ID'] : []
      if (childTaskIds.length === 0) return
      const allCompleted = childTaskIds.every((taskId) => {
        const key = String(-Math.abs(Number(taskId)))
        const child = source[key] || source[String(taskId)]
        const status = normalizeStatus(child?.['Task Status'] ?? child?.taskStatus ?? '')
        return status === 'completed'
      })
      if (allCompleted) verifiedCurrent += 1
    })

    // In unverified/verification views, images that have moved out from this pass
    // are treated as already verified so the parent total remains stable.
    const inferredVerified = verificationOnlyActions ? Math.max(stableTotal - currentTotal, 0) : 0
    const verified = Math.min(stableTotal, verifiedCurrent + inferredVerified)

    return {
      verified,
      total: stableTotal,
      ratio: Math.round((verified / stableTotal) * 100),
      label: `${verified}/${stableTotal}`,
    }
  }

  const role = UserService.readUserRoleSingle()
  const getSubImageLabel = (row, fallbackName = '') => {
    if (!row?.parentId) return fallbackName || row?.id?.toString() || 'unknown'
    const subImageName = row?.imgName || row?.areaName || fallbackName || ''
    const derivedAreaId = extractAreaIdFromName(subImageName)
    const subImageId = row?.areaId ?? derivedAreaId ?? row?.scvuTaskId ?? row?.id
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
        headerName: 'Pass ID/Image',
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
      { field: 'uploadDate', headerName: 'Upload Date', minWidth: 145, flex: 0.7, valueFormatter: dateFormatter },
      { field: 'imageDateTime', headerName: 'Image Date Time', minWidth: 145, flex: 0.7, valueFormatter: dateFormatter },
      { field: 'areaName', headerName: 'Area Name', minWidth: 110, flex: 0.6 },
      {
        field: 'assignee',
        headerName: 'Assignee',
        minWidth: 110,
        flex: 0.6,
        renderCell: (params) => {
          if (!params?.row) return '—'
          if (params.row.parentId !== undefined) {
            return params.row.assignee || '—'
          }
          const parentKey = String(params.row.id)
          const children = rows.filter((row) => String(row.parentId) === parentKey)
          if (!children.length) return params.row.assignee || '—'
          const normalized = children
            .map((row) => String(row.assignee || '').trim())
            .filter((value) => value && value !== '—' && value.toLowerCase() !== 'nil')
          if (!normalized.length) return '—'
          const first = normalized[0]
          const allSame = normalized.every((value) => value === first)
          return allSame ? first : 'Multiple'
        },
      },
      {
        field: 'report',
        headerName: 'Report',
        minWidth: 130,
        flex: 0.6,
        renderCell: (params) => {
          if (!params?.row) return null
          if (params.row.parentId === undefined) return '—'
          const rowId = params.row.id
          const currentValue = normalizeSelectValue(
            getWorkingValue(rowId, 'Report') ?? params?.row?.report ?? '',
          )
          if (readOnlyInputs) {
            return <Box sx={{ width: '100%' }}>{currentValue || '—'}</Box>
          }
          return (
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
              <TextField
                select
                fullWidth
                size="small"
                value={currentValue}
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
        minWidth: 250,
        flex: 1.1,
        renderCell: (params) => {
          if (!params?.row) return ''
          if (params.row.parentId === undefined) {
            return '—'
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
          if (params?.row?.parentId === undefined) {
            if (verificationOnlyActions) {
              const verificationProgress = getImageVerificationProgress(params?.row)
              if (!verificationProgress) return '0/0'
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
                    value={verificationProgress.ratio}
                    sx={{ height: 5, borderRadius: 999 }}
                  />
                  <Typography variant="caption" sx={{ color: 'var(--muted)', lineHeight: 1.2 }}>
                    {verificationProgress.label}
                  </Typography>
                </Box>
              )
            }
            // Parent rows are synthetic pass-group rows; use the computed row value
            // instead of looking up by id in workingData/inputData.
            const progressValue = parseProgress(params?.row?.taskCompleted)
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
                    {params?.row?.taskCompleted}
                  </Typography>
                </Box>
              )
            }
            return params?.row?.taskStatus || ''
          }
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
      {
        field: 'priority',
        headerName: 'Priority',
        minWidth: 90,
        flex: 0.5,
        renderCell: (params) => {
          if (!params?.row) return '—'
          if (params.row.parentId === undefined) return '—'
          return params.row.priority || '—'
        },
      },
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
        field: 'imageQuality',
        headerName: 'Image Quality',
        minWidth: 145,
        flex: 0.72,
        renderCell: (params) => {
          if (!params?.row) return ''
          if (params.row.parentId === undefined) {
            return (
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                —
              </Box>
            )
          }
          const rowId = params.row.id
          const rawCurrentValue = getWorkingValue(rowId, 'Image Quality') ?? params?.row?.imageQuality ?? ''
          const currentValue = IMAGE_QUALITY_OPTIONS.find(
            (option) => option.toLowerCase() === String(rawCurrentValue).trim().toLowerCase(),
          ) || ''
          if (readOnlyInputs) {
            return (
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1.25,
                }}
              >
                {currentValue || rawCurrentValue || '—'}
              </Box>
            )
          }
          return (
            <Box sx={{ width: '100%', minWidth: 0, display: 'flex', alignItems: 'center' }}>
              <TextField
                select
                fullWidth
                size="small"
                value={currentValue}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  applyWorkingDataChange((prev) =>
                    updateWorkingRow(prev, rowId, 'Image Quality', event.target.value, inputData),
                  )
                }
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => (selected ? selected : 'Image Quality'),
                }}
                sx={cloudCoverSelectSx()}
              >
                <MenuItem value="" sx={{ display: 'none' }} />
                {IMAGE_QUALITY_OPTIONS.map((option) => (
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
        field: 'cloudCover',
        headerName: 'Cloud Cover',
        minWidth: 132,
        flex: 0.68,
        renderCell: (params) => {
          if (!params?.row) return null
          if (params.row.parentId === undefined) return '—'
          const rowId = params.row.id
          const currentValue = normalizeSelectValue(
            getWorkingValue(rowId, 'Cloud Cover') ?? params?.row?.cloudCover ?? '',
          )
          if (readOnlyInputs) {
            return <Box sx={{ width: '100%' }}>{currentValue || '—'}</Box>
          }
          return (
            <Box sx={{ width: '100%', minWidth: 0, display: 'flex', alignItems: 'center' }}>
              <TextField
                select
                fullWidth
                size="small"
                value={currentValue}
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
    [readOnlyInputs, role, rows],
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

  const fetchCompletedCountsByPass = async () => {
    if (!verificationOnlyActions || !dateRange) return
    try {
      const data = await api.getCompleteImageData(dateRange)
      const counts = {}
      Object.keys(data || {}).forEach((key) => {
        const entry = data?.[key]
        if (!entry || !entry['Child ID']) return
        const passName = normalizePassKey(normalizeImageName(entry['Image File Name'] || ''))
        if (!passName) return
        counts[passName] = (counts[passName] || 0) + 1
      })
      completedImageCountByPassRef.current = counts
      setCompletedImageCountByPass(counts)
    } catch (err) {
      console.warn('Completed image count fetch failed:', err)
      completedImageCountByPassRef.current = {}
      setCompletedImageCountByPass({})
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
    const selectedTaskRows = taskRows
      .map((rowId) => rows.find((item) => item.id === rowId))
      .filter((row) => !!row)

    const expected = allowedStatuses[apiPath]
    const eligibleRows = expected
      ? selectedTaskRows.filter((row) => expected.includes(normalizeStatus(row?.taskStatus)))
      : selectedTaskRows

    if (eligibleRows.length === 0) {
      const expectedLabel = (expected || [])
        .map((value) => value.replace(/\b\w/g, (c) => c.toUpperCase()))
        .join(', ')
      addNotification({
        title: 'No eligible tasks',
        meta: expectedLabel
          ? `Expected ${expectedLabel} for selected rows`
          : 'No selected tasks can be updated',
      })
      return
    }

    if (expected && eligibleRows.length < selectedTaskRows.length) {
      addNotification({
        title: 'Some rows skipped',
        meta: `${selectedTaskRows.length - eligibleRows.length} task(s) not in required status`,
      })
    }

    let actionableRows = eligibleRows
    if (apiPath === '/tasking/completeTasks') {
      const missingInputs = eligibleRows.filter((row) => {
        const rowId = row?.id
        const report = normalizeSelectValue(getWorkingValue(rowId, 'Report') ?? row?.report ?? '')
        const cloudCover = normalizeSelectValue(getWorkingValue(rowId, 'Cloud Cover') ?? row?.cloudCover ?? '')
        const imageQuality = normalizeSelectValue(getWorkingValue(rowId, 'Image Quality') ?? row?.imageQuality ?? '')
        return !report || !cloudCover || !imageQuality
      })

      if (missingInputs.length === eligibleRows.length) {
        addNotification({
          title: 'Missing required inputs',
          meta: 'Fill Report, Cloud Cover, and Image Quality before Complete Task',
        })
        return
      }

      if (missingInputs.length > 0) {
        const missingRowIds = new Set(missingInputs.map((row) => row.id))
        actionableRows = eligibleRows.filter((row) => !missingRowIds.has(row.id))
        addNotification({
          title: 'Some rows skipped',
          meta: `${missingInputs.length} task(s) missing required inputs`,
        })
      }
    }

    if (apiPath === '/tasking/startTasks' || apiPath === '/tasking/completeTasks') {
      const inputPayload = {}
      actionableRows.forEach((row) => {
        const key = String(row.id)
        const baseRow = inputData?.[key] || {}
        const currentRow = workingData?.[key] || {}
        const currentRemarks = normalizeRemarksValue(
          currentRow['Remarks'] ?? currentRow.remarks ?? row.remarks ?? '',
        )
        const baseRemarks = normalizeRemarksValue(baseRow['Remarks'] ?? baseRow.remarks ?? '')
        const currentReport = normalizeSelectValue(
          currentRow['Report'] ?? currentRow.report ?? row.report ?? '',
        )
        const baseReport = normalizeSelectValue(baseRow['Report'] ?? baseRow.report ?? '')
        const currentCloudCover = normalizeSelectValue(
          currentRow['Cloud Cover'] ?? currentRow.cloudCover ?? row.cloudCover ?? '',
        )
        const baseCloudCover = normalizeSelectValue(baseRow['Cloud Cover'] ?? baseRow.cloudCover ?? '')
        const currentImageQuality = normalizeSelectValue(
          currentRow['Image Quality'] ?? currentRow.imageQuality ?? row.imageQuality ?? '',
        )
        const baseImageQuality = normalizeSelectValue(baseRow['Image Quality'] ?? baseRow.imageQuality ?? '')
        const taskId = row['SCVU Task ID'] ?? row?.scvuTaskId ?? toBackendTaskId(row.id)
        const patch = {}
        if (currentRemarks !== baseRemarks) patch['Remarks'] = currentRemarks
        if (currentReport !== baseReport) patch['Report'] = currentReport
        if (currentCloudCover !== baseCloudCover) patch['Cloud Cover'] = currentCloudCover
        if (currentImageQuality !== baseImageQuality) patch['Image Quality'] = currentImageQuality
        if (Object.keys(patch).length > 0) inputPayload[taskId] = patch
      })
      if (Object.keys(inputPayload).length > 0) {
        try {
          await api.postUpdateTaskingSummaryData(inputPayload)
        } catch (err) {
          console.error('Tasking Summary auto-save failed:', err)
          const message = getErrorMessage(err, 'Unable to save task inputs.')
          setError(message)
          addNotification({
            title: 'Auto-save failed',
            meta: 'Status update cancelled',
          })
          return
        }
      }
    }

    const taskIds = actionableRows.map((row) => row?.scvuTaskId || row?.id)
    try {
      setError(null)
      await api.client({ url: `${apiPath}`, method: 'post', data: { 'SCVU Task ID': taskIds } })
      const nextStatusByPath = {
        '/tasking/startTasks': 'In Progress',
        '/tasking/completeTasks': 'Verifying',
        '/tasking/verifyPass': 'Completed',
        '/tasking/verifyFail': 'Incomplete',
      }
      const nextStatusLabel = nextStatusByPath[apiPath]
      if (nextStatusLabel) {
        setWorkingData((prev) => {
          if (!prev) return prev
          const next = { ...prev }
          actionableRows.forEach((row) => {
            const rowKey = String(row.id)
            const taskKey = String(row?.scvuTaskId || '')
            if (next[rowKey]) {
              const updated = { ...next[rowKey], 'Task Status': nextStatusLabel, taskStatus: nextStatusLabel }
              if (apiPath === '/tasking/verifyFail') {
                updated['Remarks'] = ''
                updated.remarks = ''
                updated['Report'] = ''
                updated.report = ''
                updated['Cloud Cover'] = ''
                updated.cloudCover = ''
                updated['Image Quality'] = ''
                updated.imageQuality = ''
              }
              next[rowKey] = updated
            }
            if (taskKey && next[taskKey] && next[taskKey]['Parent ID'] !== undefined) {
              const updated = { ...next[taskKey], 'Task Status': nextStatusLabel, taskStatus: nextStatusLabel }
              if (apiPath === '/tasking/verifyFail') {
                updated['Remarks'] = ''
                updated.remarks = ''
                updated['Report'] = ''
                updated.report = ''
                updated['Cloud Cover'] = ''
                updated.cloudCover = ''
                updated['Image Quality'] = ''
                updated.imageQuality = ''
              }
              next[taskKey] = updated
            }
          })
          return next
        })
      }
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

    const selectedParentRows = selection
      .map((rowId) => rows.find((item) => item.id === rowId))
      .filter((row) => row?.parentId === undefined && row?.childId)

    const imageIds = [...new Set(
      selectedParentRows.flatMap((row) => {
        const values = Array.isArray(row?.childImageIds) ? row.childImageIds : []
        return values.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      }),
    )]

    const selectedParentIds = new Set(
      selectedParentRows.map((row) => row.id),
    )

    if (selectedParentRows.length === 0 || imageIds.length === 0) {
      addNotification({
        title: 'Selection required',
        meta: 'Please select only image rows',
      })
      return
    }

    const incomplete = selectedParentRows
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
    Object.keys(workingData || {}).forEach((key) => {
      const dataRow = workingData?.[key]
      if (dataRow && dataRow['Parent ID'] !== undefined) {
        const uiRow = rows.find((item) => String(item.id) === String(key))
        const passParentId = uiRow?.parentId
        if (passParentId && selectedParentIds.has(passParentId)) {
          const taskId = toBackendTaskId(key)
          const baseRow = inputData?.[key] || {}
          const patch = { ...(dataToSave[taskId] || {}) }
          const currentRemarks = normalizeRemarksValue(dataRow['Remarks'] ?? '')
          const baseRemarks = normalizeRemarksValue(baseRow['Remarks'] ?? baseRow.remarks ?? '')
          const currentReport = normalizeSelectValue(dataRow['Report'] ?? dataRow.report ?? '')
          const baseReport = normalizeSelectValue(baseRow['Report'] ?? baseRow.report ?? '')
          const currentCloudCover = normalizeSelectValue(dataRow['Cloud Cover'] ?? dataRow.cloudCover ?? '')
          const baseCloudCover = normalizeSelectValue(baseRow['Cloud Cover'] ?? baseRow.cloudCover ?? '')
          const currentImageQuality = dataRow['Image Quality'] ?? dataRow.imageQuality ?? null
          const baseImageQuality = baseRow['Image Quality'] ?? baseRow.imageQuality ?? null

          if (currentRemarks !== baseRemarks) patch.Remarks = currentRemarks
          if (currentReport !== baseReport) patch.Report = currentReport
          if (currentCloudCover !== baseCloudCover) patch['Cloud Cover'] = currentCloudCover
          if (currentImageQuality !== baseImageQuality) patch['Image Quality'] = currentImageQuality

          if (Object.keys(patch).length > 0) {
            dataToSave[taskId] = patch
            hasChanges = true
          }
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
    const selectedParentIds = new Set()
    const selectedTaskRowKeys = new Set()
    selection.forEach((rowId) => {
      const dataRow = workingData?.[String(rowId)]
      if (!dataRow) return
      if (dataRow['Child ID']) {
        selectedParentIds.add(Number(rowId))
        const baseRow = inputData?.[String(rowId)] || {}
        const hasImageChanges = JSON.stringify(dataRow) !== JSON.stringify(baseRow)
        if (!hasImageChanges) return
        payload[rowId] = dataRow
        return
      }
      if (dataRow['Parent ID'] !== undefined) {
        selectedTaskRowKeys.add(String(rowId))
        const taskId = dataRow['SCVU Task ID'] ?? toBackendTaskId(rowId)
        const baseRow = inputData?.[String(rowId)] || {}
        const currentRemarks = normalizeRemarksValue(dataRow['Remarks'] ?? '')
        const baseRemarks = normalizeRemarksValue(baseRow['Remarks'] ?? baseRow.remarks ?? '')
        const currentReport = normalizeSelectValue(dataRow['Report'] ?? dataRow.report ?? '')
        const baseReport = normalizeSelectValue(baseRow['Report'] ?? baseRow.report ?? '')
        const currentCloudCover = normalizeSelectValue(dataRow['Cloud Cover'] ?? dataRow.cloudCover ?? '')
        const baseCloudCover = normalizeSelectValue(baseRow['Cloud Cover'] ?? baseRow.cloudCover ?? '')
        const currentImageQuality = dataRow['Image Quality'] ?? dataRow.imageQuality ?? null
        const baseImageQuality = baseRow['Image Quality'] ?? baseRow.imageQuality ?? null
        const patch = { ...(payload[taskId] || {}) }
        if (currentRemarks !== baseRemarks) patch['Remarks'] = currentRemarks
        if (currentReport !== baseReport) patch['Report'] = currentReport
        if (currentCloudCover !== baseCloudCover) patch['Cloud Cover'] = currentCloudCover
        if (currentImageQuality !== baseImageQuality) patch['Image Quality'] = currentImageQuality
        if (Object.keys(patch).length > 0) payload[taskId] = patch
      }
    })

    // If parent image rows are selected, include their child task rows in scope.
    Object.keys(workingData || {}).forEach((key) => {
      const row = workingData?.[key]
      if (!row || row['Parent ID'] === undefined) return
      const parentId = Number(row['Parent ID'])
      if (selectedParentIds.has(parentId)) {
        selectedTaskRowKeys.add(String(key))
      }
    })

    // Persist edited task fields only for selected task scope.
    selectedTaskRowKeys.forEach((key) => {
      const currentRow = workingData?.[key]
      if (!currentRow || currentRow['Parent ID'] === undefined) return
      const currentRemarks = normalizeRemarksValue(currentRow['Remarks'] ?? '')
      const baseRow = inputData?.[key] || {}
      const baseRemarks = normalizeRemarksValue(baseRow['Remarks'] ?? baseRow.remarks ?? '')
      const currentReport = normalizeSelectValue(currentRow['Report'] ?? currentRow.report ?? '')
      const baseReport = normalizeSelectValue(baseRow['Report'] ?? baseRow.report ?? '')
      const currentCloudCover = normalizeSelectValue(currentRow['Cloud Cover'] ?? currentRow.cloudCover ?? '')
      const baseCloudCover = normalizeSelectValue(baseRow['Cloud Cover'] ?? baseRow.cloudCover ?? '')
      const currentImageQuality = currentRow['Image Quality'] ?? currentRow.imageQuality ?? null
      const baseImageQuality = baseRow['Image Quality'] ?? baseRow.imageQuality ?? null
      const taskId = currentRow['SCVU Task ID'] ?? toBackendTaskId(key)
      const patch = { ...(payload[taskId] || {}) }
      if (currentRemarks !== baseRemarks) patch['Remarks'] = currentRemarks
      if (currentReport !== baseReport) patch['Report'] = currentReport
      if (currentCloudCover !== baseCloudCover) patch['Cloud Cover'] = currentCloudCover
      if (currentImageQuality !== baseImageQuality) patch['Image Quality'] = currentImageQuality
      if (Object.keys(patch).length > 0) payload[taskId] = patch
    })

    if (Object.keys(payload).length === 0) {
      addNotification({
        title: 'Nothing to update',
        meta: 'No changes detected in selected rows',
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
    fetchCompletedCountsByPass()
  }, [refreshKey, dateRange])

  useEffect(() => {
    passBaselineTotalsRef.current = {}
    completedImageCountByPassRef.current = {}
    setCompletedImageCountByPass({})
  }, [dateRange])

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
          getTreeDataPath={getTreeDataPath}
          groupingColDef={{
            headerName: 'Pass ID/Image',
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
          onColumnVisibilityModelChange={setColumnVisibilityModel}
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
              display: 'flex',
              visibility: 'visible',
              opacity: 1,
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
