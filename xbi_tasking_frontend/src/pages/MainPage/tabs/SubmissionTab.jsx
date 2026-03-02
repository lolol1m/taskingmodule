import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Checkbox, Typography } from '@mui/material'
import { DataGridPro } from '@mui/x-data-grid-pro'
import API from '../../../api/api'
import UserService from '../../../auth/UserService'
import useNotifications from '../../../components/notifications/useNotifications.js'

const api = new API()
const TABLE_AUTO_REFRESH_MS = 5000

const getErrorMessage = (err, fallback = 'Something went wrong.') =>
  err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback

const normalizeImageName = (value) => {
  if (!value || typeof value !== 'string') return value
  return value.replace(/(\.(?:jpg|jpeg|png|gif|tif|tiff))_\d+$/i, '$1')
}

const normalizeRemarks = (value) => {
  if (typeof value !== 'string') return ''
  return value.replace(/\\n/g, '\n').trim()
}

const readRow = (entry, keys, fallback = '') => {
  if (!entry) return fallback
  for (const key of keys) {
    if (entry[key] !== undefined && entry[key] !== null) return entry[key]
  }
  return fallback
}

const buildRows = (inputData) => {
  if (!inputData) return []
  const rows = []

  Object.keys(inputData).forEach((key) => {
    const entry = inputData[key]
    if (!entry || entry['Parent ID'] !== undefined) return
    const imageId = Number(key)
    if (!Number.isFinite(imageId)) return

    const childTaskIds = (entry['Child ID'] || [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
    const childEntries = childTaskIds
      .map((taskId) => inputData[String(-Math.abs(taskId))] || inputData[String(taskId)])
      .filter(Boolean)

    const hasIr = childEntries.some((child) => Boolean(readRow(child, ['IR Reported', 'irReported'], false)))
    const hasSf = childEntries.some((child) => Boolean(readRow(child, ['SF Reported', 'sfReported'], false)))
    if (!hasIr && !hasSf) return

    const remarks = childEntries
      .map((child) => normalizeRemarks(readRow(child, ['Remarks', 'remarks'], '')))
      .filter((value) => value.length > 0)
      .join('\n')

    rows.push({
      id: imageId,
      imageFileName: normalizeImageName(entry['Image File Name'] || `Image_${key}`),
      sensorName: readRow(entry, ['Sensor Name', 'sensorName']),
      imageRef: readRow(entry, ['Image ID', 'imageId']),
      uploadDate: readRow(entry, ['Upload Date', 'uploadDate']),
      imageDateTime: readRow(entry, ['Image Datetime', 'imageDateTime']),
      assignee: readRow(entry, ['Assignee', 'assignee']),
      vetter: readRow(entry, ['Vetter', 'vetter']),
      irReported: hasIr,
      sfReported: hasSf,
      baseIrReported: hasIr,
      baseSfReported: hasSf,
      remarks,
      taskIds: childTaskIds,
    })
  })

  return rows
}

function SubmissionTab({
  title = 'Submission',
  subtitle = 'Images flagged IR/SF for submission review.',
  dateRange,
}) {
  const role = UserService.readUserRoleSingle()
  const isIaUser = role === 'IA'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selection, setSelection] = useState([])
  const [searchText, setSearchText] = useState('')
  const [filterModel, setFilterModel] = useState({ items: [], quickFilterValues: [] })
  const [isDirty, setIsDirty] = useState(false)
  const { addNotification } = useNotifications()

  useEffect(() => {
    setFilterModel((prev) => ({
      ...prev,
      quickFilterValues: searchText ? [searchText] : [],
    }))
  }, [searchText])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      if (!isDirty) {
        setRefreshKey((prev) => prev + 1)
      }
    }, TABLE_AUTO_REFRESH_MS)
    return () => window.clearInterval(timerId)
  }, [isDirty])

  useEffect(() => {
    if (!dateRange) return
    const fetchSubmissionRows = async () => {
      try {
        setLoading(true)
        setError(null)
        const [summaryData, completedData] = await Promise.all([
          api.postTaskingSummaryData(dateRange),
          api.getCompleteImageData(dateRange),
        ])
        const mergedData = {
          ...(summaryData || {}),
          ...(completedData || {}),
        }
        setRows(buildRows(mergedData))
        setIsDirty(false)
      } catch (err) {
        const message = getErrorMessage(err, 'Unable to load submission data.')
        setError(message)
        addNotification({
          title: 'Load failed',
          meta: 'Just now · Submission data unavailable',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSubmissionRows()
  }, [dateRange, refreshKey])

  const hasChanges = useMemo(
    () => rows.some((row) => row.irReported !== row.baseIrReported || row.sfReported !== row.baseSfReported),
    [rows],
  )

  const handleApplyChange = async () => {
    if (!isIaUser) return
    if (!selection.length) {
      addNotification({
        title: 'Selection required',
        meta: 'Select image rows to apply changes',
      })
      return
    }

    const payload = {}
    rows
      .filter((row) => selection.includes(row.id))
      .forEach((row) => {
        if (row.irReported === row.baseIrReported && row.sfReported === row.baseSfReported) return
        row.taskIds.forEach((taskId) => {
          payload[taskId] = {
            ...(payload[taskId] || {}),
            'IR Reported': Boolean(row.irReported),
            'SF Reported': Boolean(row.sfReported),
          }
        })
      })

    if (Object.keys(payload).length === 0) {
      addNotification({
        title: 'Nothing to update',
        meta: 'No IR/SF changes detected for selected rows',
      })
      return
    }

    try {
      setError(null)
      await api.postUpdateTaskingSummaryData(payload)
      addNotification({
        title: 'Submission flags updated',
        meta: `Just now · ${Object.keys(payload).length} task updates`,
      })
      localStorage.setItem('taskingSummaryRefresh', Date.now().toString())
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to save submission flag changes.')
      setError(message)
      addNotification({
        title: 'Save failed',
        meta: 'Just now · Please try again',
      })
    }
  }

  const columns = useMemo(
    () => [
      { field: 'imageFileName', headerName: 'Image File Name', minWidth: 180, flex: 1.1 },
      { field: 'sensorName', headerName: 'Sensor Name', minWidth: 110, flex: 0.6 },
      { field: 'imageRef', headerName: 'Image ID', minWidth: 90, flex: 0.45 },
      { field: 'uploadDate', headerName: 'Upload Date', minWidth: 125, flex: 0.7 },
      { field: 'imageDateTime', headerName: 'Image Date Time', minWidth: 130, flex: 0.75 },
      { field: 'assignee', headerName: 'Assignee', minWidth: 110, flex: 0.6 },
      { field: 'vetter', headerName: 'Vetter', minWidth: 110, flex: 0.6 },
      {
        field: 'irReported',
        headerName: 'IR Reported',
        minWidth: 95,
        flex: 0.5,
        renderCell: (params) => {
          const rowId = params.row.id
          if (!isIaUser) return params.row.irReported ? 'Yes' : 'No'
          return (
            <Checkbox
              checked={Boolean(params.row.irReported)}
              onClick={(event) => event.stopPropagation()}
              onChange={(_, checked) => {
                setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, irReported: checked } : row)))
                setIsDirty(true)
              }}
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
          const rowId = params.row.id
          if (!isIaUser) return params.row.sfReported ? 'Yes' : 'No'
          return (
            <Checkbox
              checked={Boolean(params.row.sfReported)}
              onClick={(event) => event.stopPropagation()}
              onChange={(_, checked) => {
                setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, sfReported: checked } : row)))
                setIsDirty(true)
              }}
            />
          )
        },
      },
      {
        field: 'remarks',
        headerName: 'Remarks',
        minWidth: 160,
        flex: 1,
        renderCell: (params) => (
          <Box sx={{ width: '100%', whiteSpace: 'pre-wrap', lineHeight: 1.2 }}>{params?.row?.remarks || '—'}</Box>
        ),
      },
    ],
    [isIaUser],
  )

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
                placeholder="Search submission items"
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

      <div className="completed-images__actions">
        {isIaUser ? (
          <Button
            className="tasking-summary__button"
            onClick={handleApplyChange}
            disabled={!selection.length || !hasChanges}
          >
            Apply Change
          </Button>
        ) : null}
        {error ? <Typography className="completed-images__error">{error}</Typography> : null}
      </div>

      <div className="completed-images__grid">
        <DataGridPro
          rows={rows}
          columns={columns}
          disableColumnResize
          checkboxSelection={isIaUser}
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
            setSelection([])
          }}
          rowHeight={56}
          columnHeaderHeight={40}
          hideFooter
          loading={loading}
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
        <div className="completed-images__total-rows">
          <div className="completed-images__total-rows-left">
            {isIaUser && selection.length > 0 ? `${selection.length} row(s) selected` : ''}
          </div>
          <div className="completed-images__total-rows-right">Total Rows: {rows.length}</div>
        </div>
      </div>
    </div>
  )
}

export default SubmissionTab
