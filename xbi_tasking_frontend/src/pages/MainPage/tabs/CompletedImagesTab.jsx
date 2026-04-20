import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { DataGridPro } from '@mui/x-data-grid-pro'
import API from '../../../api/api'
import UserService from '../../../auth/UserService'
import useNotifications from '../../../components/notifications/useNotifications.js'

const api = new API()

const getErrorMessage = (err, fallback = 'Something went wrong.') =>
  err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback

const TABLE_AUTO_REFRESH_MS = 5000

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
      passId: readField(entry, ['Pass ID', 'passId']),
      imageFileName: normalizeImageName(
        readField(entry, ['Image Filename', 'imageFilename']) ||
        entry['Image File Name'] ||
        `Image_${key}`
      ),
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

function CompletedImagesTab({
  dateRange,
  title = 'Completed Images',
  subtitle = 'Review completed imagery for the selected date range.',
}) {
  const [inputData, setInputData] = useState(null)
  const [rows, setRows] = useState([])
  const [selection, setSelection] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [filterModel, setFilterModel] = useState({ items: [], quickFilterValues: [] })
  const [columnsPanelOpen, setColumnsPanelOpen] = useState(false)
  const { addNotification } = useNotifications()

  const role = UserService.readUserRoleSingle()
  const canUncomplete = role === 'IA' || role === 'Senior II'
  const roundDownToHour = (value) => {
    if (!value || typeof value !== 'string') return value
    return value.replace(/(\d{2}):\d{2}:\d{2}$/, '$1:00:00')
  }
  const shouldRoundTime = role === 'II' || role === 'Senior II'
  const dateFormatter = shouldRoundTime ? (value) => roundDownToHour(value) : undefined

  const columns = useMemo(
    () => [
      { field: 'passId', headerName: 'Pass ID', minWidth: 120, flex: 0.7 },
      { field: 'imageFileName', headerName: 'Image Filename', minWidth: 180, flex: 1.2 },
      { field: 'sensorName', headerName: 'Sensor Name', minWidth: 120, flex: 0.7 },
      { field: 'imageId', headerName: 'Image ID', minWidth: 90, flex: 0.5 },
      { field: 'uploadDate', headerName: 'Upload Date', minWidth: 140, flex: 0.8, valueFormatter: dateFormatter },
      { field: 'imageDateTime', headerName: 'Image Date Time', minWidth: 160, flex: 0.9, valueFormatter: dateFormatter },
      { field: 'areaName', headerName: 'Area Name', minWidth: 120, flex: 0.7 },
      { field: 'assignee', headerName: 'Assignee', minWidth: 120, flex: 0.7 },
      { field: 'vetter', headerName: 'Vetter', minWidth: 110, flex: 0.6 },
      { field: 'report', headerName: 'Report', minWidth: 120, flex: 0.6 },
      { field: 'remarks', headerName: 'Remarks', minWidth: 160, flex: 0.9 },
      { field: 'imageQuality', headerName: 'Image Quality', minWidth: 130, flex: 0.7 },
      { field: 'cloudCover', headerName: 'Cloud Cover', minWidth: 120, flex: 0.7 },
      { field: 'priority', headerName: 'Priority', minWidth: 100, flex: 0.6 },
    ],
    [dateFormatter],
  )
  const defaultColumnOrder = useMemo(() => columns.map((column) => column.field), [columns])
  const [columnOrder, setColumnOrder] = useState(defaultColumnOrder)
  const [columnVisibilityModel, setColumnVisibilityModel] = useState(() =>
    Object.fromEntries(defaultColumnOrder.map((field) => [field, true])),
  )
  const columnLookup = useMemo(() => new Map(columns.map((column) => [column.field, column])), [columns])
  const orderedColumns = useMemo(() => {
    const ordered = columnOrder
      .map((field) => columnLookup.get(field))
      .filter(Boolean)
    const missing = columns.filter((column) => !columnOrder.includes(column.field))
    return [...ordered, ...missing]
  }, [columnLookup, columnOrder, columns])

  useEffect(() => {
    setColumnOrder((prev) => {
      const preserved = prev.filter((field) => defaultColumnOrder.includes(field))
      const missing = defaultColumnOrder.filter((field) => !preserved.includes(field))
      return [...preserved, ...missing]
    })
    setColumnVisibilityModel((prev) => {
      const next = { ...prev }
      defaultColumnOrder.forEach((field) => {
        if (next[field] === undefined) {
          next[field] = true
        }
      })
      return next
    })
  }, [defaultColumnOrder])

  useEffect(() => {
    setFilterModel((prev) => ({
      ...prev,
      quickFilterValues: searchText ? [searchText] : [],
    }))
  }, [searchText])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setRefreshKey((prev) => prev + 1)
    }, TABLE_AUTO_REFRESH_MS)
    return () => window.clearInterval(timerId)
  }, [])

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
      localStorage.setItem('taskingSummaryRefresh', Date.now().toString())
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

  const escapeCsvCell = (value) => {
    if (value === null || value === undefined) return ''
    const text = String(value)
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const handleExportCsv = async () => {
    if (!rows.length) {
      addNotification({
        title: 'Nothing to export',
        meta: 'No completed image data available for selected range',
      })
      return
    }

    try {
      setExporting(true)
      const exportColumns = [
        { field: 'passId', headerName: 'Pass ID' },
        { field: 'imageFileName', headerName: 'Image Filename' },
        { field: 'sensorName', headerName: 'Sensor Name' },
        { field: 'imageId', headerName: 'Image ID' },
        { field: 'uploadDate', headerName: 'Upload Date' },
        { field: 'imageDateTime', headerName: 'Image Date Time' },
        { field: 'areaName', headerName: 'Area Name' },
        { field: 'assignee', headerName: 'Assignee' },
        { field: 'vetter', headerName: 'Vetter' },
        { field: 'report', headerName: 'Report' },
        { field: 'remarks', headerName: 'Remarks' },
        { field: 'imageQuality', headerName: 'Image Quality' },
        { field: 'cloudCover', headerName: 'Cloud Cover' },
        { field: 'priority', headerName: 'Priority' },
      ]

      const header = exportColumns.map((col) => escapeCsvCell(col.headerName)).join(',')
      const body = rows
        .map((row) => {
          const values = exportColumns.map((col) => {
            const raw = row[col.field]
            if ((col.field === 'uploadDate' || col.field === 'imageDateTime') && dateFormatter) {
              return escapeCsvCell(dateFormatter(raw))
            }
            return escapeCsvCell(raw)
          })
          return values.join(',')
        })
        .join('\n')

      const csvContent = `${header}\n${body}`
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.href = url
      link.download = `completed-images-${stamp}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      addNotification({
        title: 'CSV exported',
        meta: `Just now · ${rows.length} rows downloaded`,
      })
    } catch (err) {
      console.error('CSV export failed:', err)
      addNotification({
        title: 'Export failed',
        meta: 'Just now · Unable to generate CSV',
      })
    } finally {
      setExporting(false)
    }
  }

  const moveColumn = (field, direction) => {
    setColumnOrder((prev) => {
      const index = prev.indexOf(field)
      if (index === -1) return prev
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  return (
    <div className="completed-images">
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
                placeholder="Search completed images"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
            <Button className="tasking-summary__button" onClick={() => setRefreshKey((prev) => prev + 1)}>

              <span>Refresh</span>
               
            </Button>
          </div>
        </div>
      </div>

      <div className="completed-images__actions">
        {canUncomplete && (
          <Button
            className="tasking-summary__button"
            disabled={!selection.length}
            onClick={handleUncomplete}
          >
            Uncomplete Image
          </Button>
        )}
        {error ? <Typography className="completed-images__error">{error}</Typography> : null}
        <Box sx={{ marginLeft: 'auto', display: 'flex', gap: 1, position: 'relative' }}>
          <Button className="tasking-summary__button" onClick={() => setColumnsPanelOpen((prev) => !prev)}>
            {columnsPanelOpen ? 'Close Columns' : 'Manage Columns'}
          </Button>
          <Button className="tasking-summary__button" onClick={handleExportCsv} disabled={!rows.length || exporting}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          {columnsPanelOpen ? (
            <Box
              sx={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                zIndex: 30,
                minWidth: 280,
                maxHeight: 360,
                overflowY: 'auto',
                border: '1px solid var(--border-strong)',
                borderRadius: '10px',
                backgroundColor: 'var(--panel)',
                padding: 1,
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              }}
            >
              {columnOrder.map((field, index) => {
                const column = columnLookup.get(field)
                if (!column) return null
                return (
                  <Box
                    key={field}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      alignItems: 'center',
                      gap: 0.5,
                      paddingY: 0.4,
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={columnVisibilityModel[field] !== false}
                        onChange={() =>
                          setColumnVisibilityModel((prev) => ({
                            ...prev,
                            [field]: prev[field] === false,
                          }))
                        }
                      />
                      {column.headerName}
                    </label>
                    <Button
                      size="small"
                      className="tasking-summary__button"
                      onClick={() => moveColumn(field, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      size="small"
                      className="tasking-summary__button"
                      onClick={() => moveColumn(field, 'down')}
                      disabled={index === columnOrder.length - 1}
                    >
                      ↓
                    </Button>
                  </Box>
                )
              })}
            </Box>
          ) : null}
        </Box>
      </div>

      <div className="completed-images__grid">
        <DataGridPro
          rows={rows}
          columns={orderedColumns}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={setColumnVisibilityModel}
          checkboxSelection={canUncomplete}
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
          scrollbarSize={0}
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
            '& .MuiDataGrid-cellCheckbox': {
              justifyContent: 'center',
              paddingLeft: 0,
            },
            '& .MuiDataGrid-virtualScroller': {
              overflowX: 'hidden',
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
        <div className="completed-images__total-rows">
          <div className="completed-images__total-rows-left">
            {selection.length > 0 ? `${selection.length} row(s) selected` : ''}
          </div>
          <div className="completed-images__total-rows-right">Total Rows: {rows.length}</div>
        </div>
      </div>
    </div>
  )
}

export default CompletedImagesTab
