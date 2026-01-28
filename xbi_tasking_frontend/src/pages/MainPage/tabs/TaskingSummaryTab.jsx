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
import API from '../../../api/api'
import useNotifications from '../../../components/notifications/useNotifications.js'
const api = new API()

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

const normalizeImageName = (value) => {
  if (!value || typeof value !== 'string') return value
  return value.replace(/(\.(?:jpg|jpeg|png|gif|tif|tiff))_\d+$/i, '$1')
}

const buildRows = (inputData) => {
  if (!inputData) return []

  const rows = []
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
      const parentName = normalizeImageName(parent?.['Image File Name'] || `Image_${parentId}`)
      const areaName = entry['Area Name'] || `Area_${key}`
      rows.push({
        id: Number(key),
        groupName: [parentName, areaName],
        treePath: [`img_${parentId}`, areaName],
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
  const { addNotification } = useNotifications()
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
      height: 28,
      minHeight: 28,
      paddingRight: 8,
      alignItems: 'center',
      borderRadius: 6,
      backgroundColor: 'transparent',
      color: 'var(--text)',
    },
    '& .MuiOutlinedInput-input': {
      padding: '0 10px',
      textAlign: 'left',
      color: 'var(--text)',
    },
    '& .MuiInputBase-input::placeholder': {
      color: 'var(--muted)',
      opacity: 1,
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
      {
        field: 'remarks',
        headerName: 'Remarks',
        minWidth: 140,
        flex: 0.9,
        renderCell: (params) => {
          if (!params?.row) return ''
          const rowId = params.row.id
          const currentValue = getWorkingValue(rowId, 'Remarks') ?? params?.row?.remarks ?? ''
          return (
            <TextField
              value={currentValue ?? ''}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) =>
                setWorkingData((prev) => updateWorkingRow(prev, rowId, 'Remarks', event.target.value, inputData))
              }
              placeholder="Add remarks"
              size="small"
              fullWidth
              sx={inlineTextFieldSx()}
            />
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
      {
        field: 'imageQuality',
        headerName: 'Image Quality',
        minWidth: 140,
        flex: 0.7,
        renderCell: (params) => {
          if (!params?.row?.childId) return ''
          const rowId = params.row.id
          const currentValue = getWorkingValue(rowId, 'Image Quality') ?? params?.row?.imageQuality ?? ''
          return (
            <TextField
              value={currentValue ?? ''}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) =>
                setWorkingData((prev) => updateWorkingRow(prev, rowId, 'Image Quality', event.target.value, inputData))
              }
              placeholder="Image quality"
              size="small"
              fullWidth
              sx={inlineTextFieldSx()}
            />
          )
        },
      },
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
      {
        field: 'ewStatus',
        headerName: 'EW Status',
        minWidth: 100,
        flex: 0.5,
        renderCell: (params) => params?.row?.ewStatus || '—',
      },
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
    try {
      await api.client({ url: `${apiPath}`, method: 'post', data: { 'SCVU Task ID': taskIds } })
      const actionTitle =
        apiPath === '/startTasks' ? 'Tasks started' : apiPath === '/completeTasks' ? 'Tasks completed' : 'Tasks updated'
      addNotification({
        title: actionTitle,
        meta: `Just now · ${taskIds.length} tasks`,
      })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      console.error('Tasking Summary task update failed:', err)
      alert('Unable to update tasks. Please try again.')
    }
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
        alert('Error saving changes. Image will not be completed.')
        return
      }
    }
    try {
      await saveAndComplete()
      addNotification({
        title: 'Images completed',
        meta: `Just now · ${imageIds.length} images`,
      })
    } catch (err) {
      console.error('Tasking Summary complete failed:', err)
      alert('Unable to complete images. Please try again.')
      return
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

    try {
      await api.postUpdateTaskingSummaryData(payload)
      addNotification({
        title: 'Tasking Summary updated',
        meta: `Just now · ${selection.length} rows updated`,
      })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      console.error('Tasking Summary update failed:', err)
      alert('Unable to save changes. Please try again.')
    }
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
          <div className="tasking-summary__action-buttons">
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
              <Button
                className="tasking-summary__button"
                onClick={() => processTask('/verifyFail')}
                disabled={!selection.length}
              >
                Verify Fail
              </Button>
            ) : null}
            {isShow.VP ? (
              <Button
                className="tasking-summary__button"
                onClick={() => processTask('/verifyPass')}
                disabled={!selection.length}
              >
                Verify Pass
              </Button>
            ) : null}
            {isShow.CI ? (
              <Button
                className="tasking-summary__button"
                onClick={() => processImage('/completeImages')}
                disabled={!selection.length}
              >
                Complete Image
              </Button>
            ) : null}
            <Button className="tasking-summary__button" onClick={processSendData} disabled={!selection.length}>
              Apply Change
            </Button>
          </div>
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
            minWidth: showDetails ? 170 : 200,
            flex: showDetails ? 1.05 : 1.3,
            hideDescendantCount: true,
            valueGetter: (_value, row) => {
              const nameFromGroup =
                row?.groupName && Array.isArray(row.groupName) ? row.groupName[row.groupName.length - 1] : null
              return nameFromGroup || row?.areaName || row?.id?.toString() || 'unknown'
            },
          }}
          checkboxSelection
          disableRowSelectionOnClick
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
            backgroundColor: 'var(--table-bg)',
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
              overflowX: 'hidden',
              backgroundColor: 'var(--table-bg)',
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
              borderBottom: '1px solid var(--border-strong)',
            },
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: 'var(--row-bg)',
            },
            '& .MuiDataGrid-scrollbarFiller': {
              backgroundColor: 'var(--row-bg)',
            },
            '& .MuiDataGrid-scrollbarFiller--header': {
              backgroundColor: 'var(--row-bg)',
            },
            '& .MuiDataGrid-columnHeaderTitleContainer, & .MuiDataGrid-columnHeaderTitleContainerContent': {
              color: 'var(--muted)',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              color: 'var(--muted)',
            },
            '& .MuiDataGrid-row': {
              backgroundColor: 'var(--table-bg)',
            },
            '& .MuiDataGrid-row:nth-of-type(even)': {
              backgroundColor: 'var(--row-bg)',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'var(--hover)',
            },
          
            '& .MuiDataGrid-row.Mui-selected': {
      
              backgroundColor: '#333f4f',
            },

            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid var(--border-strong)',
              color: 'var(--muted)',
              backgroundColor: 'var(--panel)',
            },
            '& .MuiDataGrid-toolbarContainer': {
              padding: '10px 12px',
              borderBottom: '1px solid var(--border-strong)',
              color: 'var(--text)',
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
        {error && <div className="tasking-summary__error">{error}</div>}
      </div>
    </div>
  )
}

export default TaskingSummaryTab
