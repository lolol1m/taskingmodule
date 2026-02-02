import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { DataGridPro, GridToolbar } from '@mui/x-data-grid-pro'
import API from '../../../api/api'
import useNotifications from '../../../components/notifications/useNotifications.js'

const api = new API()

const getErrorMessage = (err, fallback = 'Something went wrong.') =>
  err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback

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

const formatDateRange = (range) => {
  if (!range) return 'Select display date'
  const start = range['Start Date']
  const end = range['End Date']
  if (!start || !end) return 'Select display date'
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 'Select display date'
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`
}

function CompletedImagesTab({ dateRange, onOpenDatePicker }) {
  const [inputData, setInputData] = useState(null)
  const [rows, setRows] = useState([])
  const [selection, setSelection] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [filterModel, setFilterModel] = useState({ items: [], quickFilterValues: [] })
  const { addNotification } = useNotifications()

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
    setFilterModel((prev) => ({
      ...prev,
      quickFilterValues: searchText ? [searchText] : [],
    }))
  }, [searchText])

  useEffect(() => {
    if (!dateRange) return

    const fetchCompletedImages = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getCompleteImageData(dateRange)
        const sampleKey = data ? Object.keys(data)[0] : null
        const sampleEntry = sampleKey != null ? data[sampleKey] : null
        console.log('Completed images sample entry:', { sampleKey, sampleEntry })
        setInputData(data)
        setRows(buildRows(data))
      } catch (err) {
        console.error('Completed images fetch failed:', err)
        const message = getErrorMessage(err, 'Unable to load completed images.')
        setError(message)
        addNotification({
          title: 'Load failed',
          meta: 'Just now · Completed images unavailable',
        })
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
      await api.uncompleteImages({ 'SCVU Image ID': selection })
      addNotification({
        title: 'Images uncompleted',
        meta: `Just now · ${selection.length} images`,
      })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      console.error('Uncomplete images failed:', err)
      const message = getErrorMessage(err, 'Unable to uncomplete images.')
      setError(message)
      addNotification({
        title: 'Uncomplete failed',
        meta: 'Just now · Please try again',
      })
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
            <div className="search">
              <input
                type="text"
                placeholder="Search completed images"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
            <Button className="tasking-summary__button" onClick={() => setRefreshKey((prev) => prev + 1)}>
              Refresh
            </Button>
            <Button className="tasking-summary__button tasking-summary__button--date" onClick={onOpenDatePicker}>
              <img className="date-button__icon" src="/src/assets/calendar.png" alt="" />
              <span className="date-button__label">{formatDateRange(dateRange)}</span>
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
