import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { DataGridPro, GridToolbar } from '@mui/x-data-grid-pro'
import API from '../../../api/api'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
const api = new API()
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

const normalizeImageName = (value) => {
  if (!value || typeof value !== 'string') return value
  return value.replace(/(\.(?:jpg|jpeg|png|gif|tif|tiff))_\d+$/i, '$1')
}

const readField = (entry, keys, fallback = '') => {
  if (!entry) return fallback
  for (const key of keys) {
    if (entry[key] !== undefined && entry[key] !== null) {
      return entry[key]
    }
  }
  return fallback
}

const buildRows = (inputData) => {
  if (!inputData) return []
  const rows = []

  Object.keys(inputData).forEach((key) => {
    const entry = inputData[key]
    if (!entry) return
    if (entry['Parent ID']) return
    if (!entry['Child ID']) return

    rows.push({
      id: Number(key),
      imageFileName: normalizeImageName(entry['Image File Name'] || `Image_${key}`),
      sensorName: readField(entry, ['Sensor Name', 'sensorName']),
      imageId: readField(entry, ['Image ID', 'imageId']),
      uploadDate: readField(entry, ['Upload Date', 'uploadDate']),
      imageDateTime: readField(entry, ['Image Datetime', 'imageDateTime']),
      areaName: readField(entry, ['Area', 'Area Name', 'areaName']),
      assignee: readField(entry, ['Assignee', 'assignee']),
      vetter: readField(entry, ['Vetter', 'vetter']),
      report: readField(entry, ['Report', 'Reports', 'report']),
      remarks: readField(entry, ['Remarks', 'remarks']),
      imageCategory: readField(entry, ['Image Category', 'imageCategory']),
      imageQuality: readField(entry, ['Image Quality', 'imageQuality']),
      cloudCover: readField(entry, ['Cloud Cover', 'cloudCover']),
      priority: readField(entry, ['Priority', 'priority']),
      childId: entry['Child ID'],
    })
  })

  return rows
}

function CompletedImagesTab({ dateRange, onOpenDatePicker }) {
  const [inputData, setInputData] = useState(null)
  const [rows, setRows] = useState([])
  const [selection, setSelection] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const columns = useMemo(
    () => [
      { field: 'imageFileName', headerName: 'Image File Name', minWidth: 180, flex: 1.2 },
      { field: 'sensorName', headerName: 'Sensor Name', minWidth: 120, flex: 0.7 },
      { field: 'imageId', headerName: 'Image ID', minWidth: 90, flex: 0.5 },
      { field: 'uploadDate', headerName: 'Upload Date', minWidth: 140, flex: 0.8 },
      { field: 'imageDateTime', headerName: 'Image Date Time', minWidth: 160, flex: 0.9 },
      { field: 'areaName', headerName: 'Area Name', minWidth: 120, flex: 0.7 },
      { field: 'assignee', headerName: 'Assignee', minWidth: 120, flex: 0.7 },
      { field: 'vetter', headerName: 'Vetter', minWidth: 110, flex: 0.6 },
      { field: 'report', headerName: 'Report', minWidth: 120, flex: 0.6 },
      { field: 'remarks', headerName: 'Remarks', minWidth: 160, flex: 0.9 },
      { field: 'imageCategory', headerName: 'Image Category', minWidth: 140, flex: 0.8 },
      { field: 'imageQuality', headerName: 'Image Quality', minWidth: 130, flex: 0.7 },
      { field: 'cloudCover', headerName: 'Cloud Cover', minWidth: 120, flex: 0.7 },
      { field: 'priority', headerName: 'Priority', minWidth: 100, flex: 0.6 },
    ],
    [],
  )

  useEffect(() => {
    if (!dateRange) return

    const fetchCompletedImages = async () => {
      try {
        setLoading(true)
        setError(null)
        



        const data = api.postGetCompleteImageData(dateRange)
        const sampleKey = data ? Object.keys(data)[0] : null
        const sampleEntry = sampleKey != null ? data[sampleKey] : null
        console.log('Completed images sample entry:', { sampleKey, sampleEntry })
        setInputData(data)
        setRows(buildRows(data))
      } catch (err) {
        console.error('Completed images fetch failed:', err)
        setError(err?.message || 'Unable to load completed images.')
      } finally {
        setLoading(false)
      }
    }

    fetchCompletedImages()
  }, [dateRange, refreshKey])

  const handleUncomplete = async () => {
    if (!selection.length) return
    try {
      setLoading(true)
      const response = await api.postUncompleteImages({ 'SCVU Image ID': selection })

      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      console.error('Uncomplete images failed:', err)
      setError(err?.message || 'Unable to uncomplete images.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="completed-images">
      <div className="content__topbar">
        <div className="content__heading">
          <div className="content__title">Completed Images</div>
          <div className="content__subtitle">Review completed imagery for the selected date range.</div>
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

      <div className="completed-images__actions">
        <Button
          className="tasking-summary__button"
          disabled={!selection.length}
          onClick={handleUncomplete}
        >
          Uncomplete Image
        </Button>
        {error ? <Typography className="completed-images__error">{error}</Typography> : null}
      </div>

      <div className="completed-images__grid">
        <DataGridPro
          rows={rows}
          columns={columns}
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
          rowHeight={64}
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
            '& .MuiDataGrid-cellCheckbox': {
              justifyContent: 'center',
              paddingLeft: 0,
            },
            '& .MuiDataGrid-virtualScroller': {
              overflowX: 'hidden',
              backgroundColor: 'var(--table-bg)',
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
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'var(--hover)',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid var(--border-strong)',
            },
          }}
        />
      </div>
    </div>
  )
}

export default CompletedImagesTab
