import { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  ClickAwayListener,
  LinearProgress,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGridPro, GridToolbar } from '@mui/x-data-grid-pro'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const refreshAccessToken = async () => {
  const storedRefresh = localStorage.getItem('refresh_token')
  if (!storedRefresh) {
    return null
  }

  const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: storedRefresh }),
  })

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  if (data.access_token) {
    localStorage.setItem('access_token', data.access_token)
  }
  if (data.refresh_token) {
    localStorage.setItem('refresh_token', data.refresh_token)
  }
  if (data.id_token) {
    localStorage.setItem('id_token', data.id_token)
  }

  return data.access_token || null
}

const clearAuthTokens = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('id_token')
  localStorage.removeItem('user')
  localStorage.removeItem('username')
}

const redirectToLogin = () => {
  clearAuthTokens()
  window.location.href = `${BACKEND_URL}/auth/login`
}

const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('access_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const response = await fetch(url, { ...options, headers })
  if (response.status !== 401) {
    return response
  }

  const refreshedToken = await refreshAccessToken()
  if (!refreshedToken) {
    redirectToLogin()
    return response
  }

  const retryHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    Authorization: `Bearer ${refreshedToken}`,
  }

  const retryResponse = await fetch(url, { ...options, headers: retryHeaders })
  if (retryResponse.status === 401) {
    redirectToLogin()
  }
  return retryResponse
}

const readUserRole = () => {
  try {
    const rawUser = localStorage.getItem('user')
    if (!rawUser) return null
    const user = JSON.parse(rawUser)
    const roles = Array.isArray(user?.roles) ? user.roles : []
    if (roles.includes('IA')) return 'IA'
    if (roles.includes('Senior II')) return 'Senior II'
    if (roles.includes('II')) return 'II'
    return roles[0] || null
  } catch (error) {
    console.warn('Unable to read user role', error)
    return null
  }
}

const updateWorkingRow = (prev, rowId, field, value, baseData = null) => {
  const key = String(rowId)
  const seed = prev || baseData || {}
  const next = { ...seed }
  const row = { ...(next[key] || {}) }
  row[field] = value
  next[key] = row
  return next
}

const buildRows = (inputData) => {
  if (!inputData) return []

  const rows = []
  Object.keys(inputData).forEach((key) => {
    const entry = inputData[key]
    if (!entry) return

    if (entry['Child ID']) {
      const imageFileName = entry['Image File Name'] || `Image_${key}`
      rows.push({
        id: Number(key),
        groupName: [imageFileName],
        sensorName: entry['Sensor Name'],
        imageId: entry['Image ID'],
        uploadDate: entry['Upload Date'],
        imageDateTime: entry['Image Datetime'],
        areaName: entry['Area'],
        assignee: entry['Assignee'],
        report: entry['Report'],
        taskCompleted: entry['Task Completed'],
        priority: entry['Priority'],
        imageCategory: entry['Image Category'],
        imageQuality: entry['Image Quality'],
        cloudCover: entry['Cloud Cover'],
        ewStatus: entry['EW Status'],
        targetTracing: entry['Target Tracing'],
        v10: entry['V10'],
        opsV: entry['OPS V'],
        remarks: entry['Remarks'],
        childId: entry['Child ID'],
      })
      return
    }

    if (entry['Parent ID'] !== undefined) {
      const parentId = Number(entry['Parent ID'])
      const parent = inputData[parentId] || inputData[entry['Parent ID']]
      const parentName = parent?.['Image File Name'] || `Image_${parentId}`
      const areaName = entry['Area Name'] || `Area_${key}`
      rows.push({
        id: Number(key),
        groupName: [parentName, areaName],
        taskStatus: entry['Task Status'],
        assignee: entry['Assignee'],
        remarks: entry['Remarks'],
        parentId,
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

function TaskingSummaryTab({ dateRange, onOpenDatePicker, isCollapsed }) {
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
  const [selection, setSelection] = useState([])
  const [showDetails, setShowDetails] = useState(false)
  const [openCopy, setOpenCopy] = useState(false)
  const [clipboardValue, setClipboardValue] = useState('')
  const handleTooltipClose = () => setOpenCopy(false)

  const rows = useMemo(() => buildRows(workingData || inputData), [workingData, inputData])

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
    '& .MuiOutlinedInput-root': {
      height: 28,
      minHeight: 28,
      paddingRight: 28,
      alignItems: 'center',
      borderRadius: 6,
      backgroundColor,
      marginTop: '20px',
    },
    '& .MuiOutlinedInput-input': {
      padding: '0 10px',
      textAlign: 'center',
    },
    '& .MuiAutocomplete-endAdornment': {
      right: 6,
    },
  })

  const getWorkingValue = (rowId, field) => {
    const source = workingData || inputData
    if (!source) return null
    const row = source[String(rowId)]
    return row ? row[field] : null
  }

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
          return hierarchy[hierarchy.length - 1]
        },
      },
      { field: 'sensorName', headerName: 'Sensor Name', minWidth: 110, flex: 0.6 },
      { field: 'imageId', headerName: 'Image ID', minWidth: 90, flex: 0.45 },
      { field: 'uploadDate', headerName: 'Upload Date', minWidth: 120, flex: 0.7 },
      { field: 'imageDateTime', headerName: 'Image Date Time', minWidth: 130, flex: 0.8 },
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
          return (
            <Autocomplete
              disablePortal
              options={getDropdownOptions('Report', 'Report')}
              value={currentValue ?? null}
              onChange={(_, newValue) =>
                setWorkingData((prev) => updateWorkingRow(prev, rowId, 'Report', newValue, inputData))
              }
              size="small"
              fullWidth
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(inputParams) => (
                <TextField
                  {...inputParams}
                  placeholder="Report"
                  size="small"
                  variant="outlined"
                  sx={dropdownFieldSx(reportColor(currentValue))}
                />
              )}
            />
          )
        },
      },
      { field: 'remarks', headerName: 'Remarks', minWidth: 140, flex: 0.9, editable: true },
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
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
                <LinearProgress
                  variant="determinate"
                  value={progressValue}
                  sx={{ height: 6, borderRadius: 999, marginTop: 3   }}
                />
                <Typography variant="caption" sx={{ color: 'var(--muted)', lineHeight: 1 }}>
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
        field: 'imageCategory',
        headerName: 'Image Category',
        minWidth: 140,
        flex: 0.7,
        renderCell: (params) => {
          if (!params?.row?.childId) return null
          const rowId = params.row.id
          const currentValue = getWorkingValue(rowId, 'Image Category') ?? params?.row?.imageCategory ?? null
          return (
            <Autocomplete
              disablePortal
              options={getDropdownOptions('Image Category', 'Image Category')}
              value={currentValue ?? null}
              onChange={(_, newValue) =>
                setWorkingData((prev) => updateWorkingRow(prev, rowId, 'Image Category', newValue, inputData))
              }
              size="small"
              fullWidth
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(inputParams) => (
                <TextField
                  {...inputParams}
                  placeholder="Img Category"
                  size="small"
                  variant="outlined"
                  sx={dropdownFieldSx()}
                />
              )}
            />
          )
        },
      },
      { field: 'imageQuality', headerName: 'Image Quality', minWidth: 120, flex: 0.6, editable: true },
      {
        field: 'cloudCover',
        headerName: 'Cloud Cover',
        minWidth: 120,
        flex: 0.6,
        renderCell: (params) => {
          if (!params?.row?.childId) return null
          const rowId = params.row.id
          const currentValue = getWorkingValue(rowId, 'Cloud Cover') ?? params?.row?.cloudCover ?? null
          return (
            <Autocomplete
              disablePortal
              options={getDropdownOptions('Cloud Cover', 'Cloud Cover')}
              value={currentValue ?? null}
              onChange={(_, newValue) =>
                setWorkingData((prev) => updateWorkingRow(prev, rowId, 'Cloud Cover', newValue, inputData))
              }
              size="small"
              fullWidth
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(inputParams) => (
                <TextField {...inputParams} placeholder="CC" size="small" variant="outlined" sx={dropdownFieldSx()} />
              )}
            />
          )
        },
      },
      { field: 'ewStatus', headerName: 'EW Status', minWidth: 100, flex: 0.5 },
      {
        field: 'targetTracing',
        headerName: 'Target Tracing',
        minWidth: 110,
        flex: 0.5,
        renderCell: (params) => {
          if (!params?.row?.childId) return ''
          const rowId = params.row.id
          const currentValue = Boolean(getWorkingValue(rowId, 'Target Tracing') ?? params?.row?.targetTracing)
          return (
            <Checkbox
              checked={currentValue}
              onClick={(event) => event.stopPropagation()}
              onChange={(_, newValue) =>
                setWorkingData((prev) => updateWorkingRow(prev, rowId, 'Target Tracing', newValue, inputData))
              }
            />
          )
        },
      },
      {
        field: 'v10',
        headerName: 'V10',
        minWidth: 70,
        flex: 0.4,
        renderCell: (params) => {
          if (!params?.row?.childId) return ''
          const rowId = params.row.id
          const currentValue = Boolean(getWorkingValue(rowId, 'V10') ?? params?.row?.v10)
          return (
            <Checkbox
              checked={currentValue}
              onChange={(_, newValue) => setWorkingData((prev) => updateWorkingRow(prev, rowId, 'V10', newValue, inputData))}
            />
          )
        },
      },
      {
        field: 'opsV',
        headerName: 'OPS V',
        minWidth: 70,
        flex: 0.4,
        renderCell: (params) => {
          if (!params?.row?.childId) return ''
          const rowId = params.row.id
          const currentValue = Boolean(getWorkingValue(rowId, 'OPS V') ?? params?.row?.opsV)
          return (
            <Checkbox
              checked={currentValue}
              onChange={(_, newValue) =>
                setWorkingData((prev) => updateWorkingRow(prev, rowId, 'OPS V', newValue, inputData))
              }
            />
          )
        },
      },
    ],
    [],
  )

  const columnVisibilityModel = useMemo(
    () => ({
      imageAreaName: false,
      sensorName: !showDetails,
      imageId: !showDetails,
      uploadDate: !showDetails,
      imageDateTime: !showDetails,
      assignee: !showDetails,
      report: !showDetails,
      remarks: !showDetails,
      imageStatus: !showDetails,
      priority: !showDetails,
      areaName: showDetails,
      imageCategory: showDetails,
      imageQuality: showDetails,
      cloudCover: showDetails,
      ewStatus: showDetails,
      targetTracing: showDetails,
      v10: showDetails,
      opsV: showDetails,
    }),
    [showDetails],
  )

  const [visibilityModel, setVisibilityModel] = useState(columnVisibilityModel)

  useEffect(() => {
    setVisibilityModel(columnVisibilityModel)
  }, [columnVisibilityModel])

  const getTreeDataPath = (row) => {
    if (!row.groupName || !Array.isArray(row.groupName)) {
      return [row.id?.toString() || 'unknown']
    }

    const path = row.groupName.filter((item) => item != null).map((item) => item?.toString() || '')
    if (path.length === 1 && row.id !== undefined && row.id !== null) {
      path[0] = `${path[0]}_${row.id}`
    } else if (path.length === 2 && row.parentId !== undefined && row.parentId !== null) {
      const parentImagePath = `${path[0]}_${row.parentId}`
      path[0] = parentImagePath
    }
    return path
  }

  const fetchSummary = async () => {
    if (!dateRange) return

    try {
      setLoading(true)
      setError(null)
      const response = await fetchWithAuth(`${BACKEND_URL}/getTaskingSummaryData`, {
        method: 'POST',
        body: JSON.stringify(dateRange),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch (${response.status})`)
      }

      const data = await response.json()
      setInputData(data)
    } catch (err) {
      console.error('Tasking Summary fetch failed:', err)
      setError('Unable to load tasking summary data.')
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
      const response = await fetchWithAuth(`${BACKEND_URL}${path}`)
      if (!response.ok) return
      const data = await response.json()
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
      setDropdownValues((prev) => ({
        ...prev,
        [key]: prev[key]?.length ? prev[key] : readCachedOptions(key),
      }))
    }
  }

  const processTask = async (apiPath) => {
    if (selection.length === 0) {
      alert('Please select a row')
      return
    }

    const taskRows = selection.filter((rowId) => {
      const row = rows.find((item) => item.id === rowId)
      return row?.parentId !== undefined
    })
    if (taskRows.length === 0) {
      alert('Please select a task row')
      return
    }

    const taskIds = taskRows.map((rowId) => {
      const row = rows.find((item) => item.id === rowId)
      return row?.scvuTaskId || rowId
    })
    await fetchWithAuth(`${BACKEND_URL}${apiPath}`, {
      method: 'POST',
      body: JSON.stringify({ 'SCVU Task ID': taskIds }),
    })

    setRefreshKey((prev) => prev + 1)
  }

  const processImage = async (apiPath) => {
    if (selection.length === 0) {
      alert('Please select an Image Row to be completed')
      return
    }

    const imageIds = selection.filter((rowId) => {
      const row = rows.find((item) => item.id === rowId)
      return row?.parentId === undefined && row?.childId
    })

    if (imageIds.length === 0) {
      alert('Please select only Image Rows')
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
          dataToSave[key] = { ...(dataToSave[key] || {}), Remarks: dataRow['Remarks'] }
          hasChanges = true
        }
      }
    })

    const saveAndComplete = async () => {
      const username = localStorage.getItem('username')
      await fetchWithAuth(`${BACKEND_URL}${apiPath}`, {
        method: 'POST',
        body: JSON.stringify({
          'SCVU Image ID': imageIds,
          Vetter: username || '',
        }),
      })
    }

    if (hasChanges && Object.keys(dataToSave).length > 0) {
      const saveResponse = await fetchWithAuth(`${BACKEND_URL}/updateTaskingSummaryData`, {
        method: 'POST',
        body: JSON.stringify(dataToSave),
      })
      if (!saveResponse.ok) {
        alert('Error saving changes. Image will not be completed.')
        return
      }
      await saveAndComplete()
    } else {
      await saveAndComplete()
    }

    setRefreshKey((prev) => prev + 1)
  }

  const processSendData = async () => {
    if (selection.length === 0) {
      alert('Please select a row')
      return
    }

    const payload = {}
    let hasNull = false
    selection.forEach((rowId) => {
      const dataRow = workingData?.[String(rowId)]
      if (!dataRow) return
      if (dataRow['Child ID']) {
        if (dataRow['Report'] == null || dataRow['Image Category'] == null || dataRow['Cloud Cover'] == null) {
          hasNull = true
        }
      }
      payload[rowId] = dataRow
    })

    if (hasNull) {
      alert('Your selected row(s) has an empty value in the dropdown')
      return
    }

    await fetchWithAuth(`${BACKEND_URL}/updateTaskingSummaryData`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    setRefreshKey((prev) => prev + 1)
  }

  const isCellEditable = (params) => {
    if (params?.row?.parentId !== undefined && params.field === 'remarks') {
      return true
    }
    if (params?.row?.childId && params.field === 'imageQuality') {
      return true
    }
    return false
  }

  const processRowUpdate = (newRow) => {
    if (!newRow?.id) return newRow
    setWorkingData((prev) => {
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
      alert('Please select a task')
      return
    }
    const firstId = selection[0]
    const parentId = workingData?.[String(firstId)]?.['Parent ID']
    if (parentId === undefined || parentId === null) {
      alert('Please select tasks only')
      return
    }
    const imageId = workingData?.[String(parentId)]?.['Image ID']
    if (!imageId) {
      alert('Unable to find image ID')
      return
    }
    setClipboardValue(String(imageId))
    try {
      await navigator.clipboard.writeText(String(imageId))
    } catch (error) {
      console.warn('Clipboard copy failed', error)
    }
    setOpenCopy(true)
    await processTask('/startTasks')
  }

  const role = readUserRole()
  const isShow =
    role === 'II'
      ? { CT: true, VF: false, VP: false, CI: false }
      : role === 'Senior II' || role === 'IA'
        ? { CT: true, VF: true, VP: true, CI: true }
        : { CT: true, VF: true, VP: true, CI: true }

  useEffect(() => {
    fetchSummary()
  }, [refreshKey, dateRange])

  useEffect(() => {
    if (inputData) {
      setWorkingData(inputData)
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
    fetchDropdownValues('/getReport', 'Report')
    fetchDropdownValues('/getCloudCover', 'Cloud Cover')
    fetchDropdownValues('/getImageCategory', 'Image Category')
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
          <div className="content__title">Tasking Summary</div>
          <div className="content__subtitle">Task status overview for the selected date range.</div>
        </div>
        <div className="content__controls">
          <div className="action-bar">
            <Button className="tasking-summary__button" onClick={() => setRefreshKey((prev) => prev + 1)}>
              Refresh
            </Button>
            <Button className="tasking-summary__button" onClick={onOpenDatePicker}>
              Change Display Date
            </Button>
          </div>
        </div>
      </div>

      <div className="tasking-summary__actions">
        <div className="tasking-summary__actions-left">
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
          {isShow.CT ? (
            <Button
              className="tasking-summary__button"
              onClick={() => processTask('/completeTasks')}
              disabled={!selection.length}
            >
              Complete Task
            </Button>
          ) : null}
          {isShow.VF ? (
            <Button className="tasking-summary__button" onClick={() => processTask('/verifyFail')} disabled={!selection.length}>
              Verify Fail
            </Button>
          ) : null}
          {isShow.VP ? (
            <Button className="tasking-summary__button" onClick={() => processTask('/verifyPass')} disabled={!selection.length}>
              Verify Pass
            </Button>
          ) : null}
          {isShow.CI ? (
            <Button className="tasking-summary__button" onClick={() => processImage('/completeImages')} disabled={!selection.length}>
              Complete Image
            </Button>
          ) : null}
          <Button className="tasking-summary__button" onClick={processSendData} disabled={!selection.length}>
            Apply Change
          </Button>
        </div>
        <div className="tasking-summary__actions-right">
          <div className="tasking-summary__segmented" role="group" aria-label="Column view toggle">
            <button
              type="button"
              className={`tasking-summary__segment ${!showDetails ? 'is-active' : ''}`}
              onClick={() => setShowDetails(false)}
            >
              Primary Columns
            </button>
            <button
              type="button"
              className={`tasking-summary__segment ${showDetails ? 'is-active' : ''}`}
              onClick={() => setShowDetails(true)}
            >
              Secondary Columns
            </button>
          </div>
        </div>
      </div>

      <div className="tasking-summary__grid">
        <DataGridPro
          treeData
          rows={rows}
          columns={columns}
          getTreeDataPath={getTreeDataPath}
          groupingColDef={{
            headerName: 'Image/Area Name',
            minWidth: 200,
            flex: 1.3,
            hideDescendantCount: true,
          }}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={(ids) => setSelection(ids)}
          rowHeight={70}
          isCellEditable={isCellEditable}
          processRowUpdate={processRowUpdate}
          onProcessRowUpdateError={(err) => console.error(err)}
          columnVisibilityModel={visibilityModel}
          loading={loading}
          slots={{ toolbar: GridToolbar }}
          sx={{
            width: '100%',
            height: '100%',
            border: 'none',
            color: 'var(--text)',
            '& .MuiDataGrid-columnHeaderTitle': {
              paddingLeft: 0,
            },
            '& .MuiDataGrid-cell': {
              display: 'flex',
              alignItems: 'center',
              borderColor: 'var(--border-strong)',
              paddingTop: 4,
              paddingBottom: 4,
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
              fontSize: 12,
            },
            '& .MuiDataGrid-cell .MuiInputBase-input': {
              paddingTop: 0,
              paddingBottom: 0,
              textAlign: 'center',
            },
            '& .MuiDataGrid-cell .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
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
              overflowX: 'hidden',
            },
            '& .MuiDataGrid-overlay': {
              backgroundColor: 'transparent',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'var(--row-bg)',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              fontSize: '11px',
              letterSpacing: '0.04em',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'var(--hover)',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid var(--border-strong)',
            },
            '& .MuiDataGrid-toolbarContainer': {
              padding: '10px 12px',
              borderBottom: '1px solid var(--border-strong)',
            },
          }}
        />
        {error && <div className="tasking-summary__error">{error}</div>}
      </div>
    </div>
  )
}

export default TaskingSummaryTab
