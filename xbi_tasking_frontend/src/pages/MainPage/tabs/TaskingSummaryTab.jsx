import { useEffect, useMemo, useState } from 'react'
import { Box, Button, LinearProgress, Typography } from '@mui/material'
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
    window.location.href = `${BACKEND_URL}/auth/login`
    return response
  }

  const retryHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    Authorization: `Bearer ${refreshedToken}`,
  }

  return fetch(url, { ...options, headers: retryHeaders })
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selection, setSelection] = useState([])
  const [showDetails, setShowDetails] = useState(false)

  const rows = useMemo(() => buildRows(inputData), [inputData])

  const columns = useMemo(
    () => [
      {
        field: 'imageAreaName',
        headerName: 'Image/Area Name',
        minWidth: 220,
        flex: 1.4,
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
      { field: 'sensorName', headerName: 'Sensor Name', minWidth: 120, flex: 0.7 },
      { field: 'imageId', headerName: 'Image ID', minWidth: 110, flex: 0.5 },
      { field: 'uploadDate', headerName: 'Upload Date', minWidth: 140, flex: 0.8 },
      { field: 'imageDateTime', headerName: 'Image Date Time', minWidth: 150, flex: 0.9 },
      { field: 'areaName', headerName: 'Area Name', minWidth: 130, flex: 0.7 },
      { field: 'assignee', headerName: 'Assignee', minWidth: 120, flex: 0.7 },
      { field: 'report', headerName: 'Report', minWidth: 130, flex: 0.7 },
      { field: 'remarks', headerName: 'Remarks', minWidth: 160, flex: 1.1 },
      {
        field: 'imageStatus',
        headerName: 'Image Status',
        minWidth: 180,
        flex: 0.9,
        renderCell: (params) => {
          const progressValue = parseProgress(params.row.taskCompleted)
          if (progressValue !== null) {
            return (
              <Box sx={{ width: '100%' }}>
                <LinearProgress
                  variant="determinate"
                  value={progressValue}
                  sx={{ height: 6, borderRadius: 999 }}
                />
                <Typography variant="caption" sx={{ color: 'var(--muted)' }}>
                  {params.row.taskCompleted}
                </Typography>
              </Box>
            )
          }
          return params.row.taskStatus || ''
        },
      },
      { field: 'priority', headerName: 'Priority', minWidth: 110, flex: 0.6 },
      { field: 'imageCategory', headerName: 'Image Category', minWidth: 150, flex: 0.8 },
      { field: 'imageQuality', headerName: 'Image Quality', minWidth: 140, flex: 0.7 },
      { field: 'cloudCover', headerName: 'Cloud Cover', minWidth: 130, flex: 0.7 },
      { field: 'ewStatus', headerName: 'EW Status', minWidth: 120, flex: 0.6 },
      {
        field: 'targetTracing',
        headerName: 'Target Tracing',
        minWidth: 130,
        flex: 0.6,
        valueGetter: (params) => formatBoolean(params?.row?.targetTracing),
      },
      {
        field: 'v10',
        headerName: 'V10',
        minWidth: 80,
        flex: 0.4,
        valueGetter: (params) => formatBoolean(params?.row?.v10),
      },
      {
        field: 'opsV',
        headerName: 'OPS V',
        minWidth: 80,
        flex: 0.4,
        valueGetter: (params) => formatBoolean(params?.row?.opsV),
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

  const processTask = async (apiPath) => {
    if (selection.length === 0) return

    const taskRows = selection.filter((rowId) => {
      const row = rows.find((item) => item.id === rowId)
      return row?.parentId !== undefined
    })
    if (taskRows.length === 0) return

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
    if (selection.length === 0) return

    const imageIds = selection.filter((rowId) => {
      const row = rows.find((item) => item.id === rowId)
      return row?.parentId === undefined && row?.childId
    })

    if (imageIds.length === 0) return
    await fetchWithAuth(`${BACKEND_URL}${apiPath}`, {
      method: 'POST',
      body: JSON.stringify({ 'SCVU Image ID': imageIds }),
    })

    setRefreshKey((prev) => prev + 1)
  }

  useEffect(() => {
    fetchSummary()
  }, [refreshKey, dateRange])

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
          <Button className="tasking-summary__button" onClick={() => processTask('/startTasks')} disabled={!selection.length}>
            Start Task
          </Button>
          <Button className="tasking-summary__button" onClick={() => processTask('/completeTasks')} disabled={!selection.length}>
            Complete Task
          </Button>
          <Button className="tasking-summary__button" onClick={() => processTask('/verifyFail')} disabled={!selection.length}>
            Verify Fail
          </Button>
          <Button className="tasking-summary__button" onClick={() => processTask('/verifyPass')} disabled={!selection.length}>
            Verify Pass
          </Button>
          <Button className="tasking-summary__button" onClick={() => processImage('/completeImages')} disabled={!selection.length}>
            Complete Image
          </Button>
          <Button className="tasking-summary__button" disabled>
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
            minWidth: 260,
            flex: 1.6,
            hideDescendantCount: true,
          }}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={(ids) => setSelection(ids)}
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
