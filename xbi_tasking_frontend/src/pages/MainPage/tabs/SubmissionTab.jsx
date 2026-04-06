import { useEffect, useMemo, useState } from 'react'
import { Button, Typography } from '@mui/material'
import { DataGridPro } from '@mui/x-data-grid-pro'
import API from '../../../api/api'
import useNotifications from '../../../components/notifications/useNotifications.js'
import truePng from '../../../assets/true.png'
import '../styles/UploadsTab.css'

const api = new API()
const TABLE_AUTO_REFRESH_MS = 5000

const ACCENT_FILTER =
  'brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(189deg) brightness(118%)'

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

// A task is "submitted" when its primary reporting checkbox is checked.
// IIR tasks → iirReported; DS(SF) tasks → sfReported.
const isSubmitted = (row) => {
  if (row.report === 'IIR') return Boolean(row.iirReported)
  if (row.report === 'DS(SF)') return Boolean(row.sfReported)
  return false
}

const buildRows = (inputData) => {
  if (!inputData) return []

  // Build parent image lookup: scvu_image_id (positive key) -> image entry
  const parentMap = {}
  Object.keys(inputData).forEach((key) => {
    const entry = inputData[key]
    if (!entry || entry['Parent ID'] !== undefined) return
    parentMap[Number(key)] = entry
  })

  const rows = []
  Object.keys(inputData).forEach((key) => {
    const entry = inputData[key]
    if (!entry || entry['Parent ID'] === undefined) return
    const taskStatus = String(readField(entry, ['Task Status', 'taskStatus'], '')).trim().toLowerCase()
    if (taskStatus !== 'verifying' && taskStatus !== 'completed') return
    const report = String(readField(entry, ['Report', 'report'], '')).trim()
    if (!report) return
    if (report !== 'IIR' && report !== 'DS(SF)') return

    const parentId = readField(entry, ['Parent ID'])
    const parentEntry = parentMap[Number(parentId)] || null

    const taskId = readField(entry, ['SCVU Task ID', 'scvuTaskId'], Number(key) < 0 ? Math.abs(Number(key)) : Number(key))
    rows.push({
      id: Number.isFinite(Number(taskId)) ? Number(taskId) : String(taskId),
      taskId: Number.isFinite(Number(taskId)) ? Number(taskId) : String(taskId),
      // Pass ID = parent's Image File Name (COALESCE(pass.pass_id_file_name, image.image_file_name))
      passId: parentEntry
        ? normalizeImageName(readField(parentEntry, ['Image File Name', 'imageFileName']))
        : parentId,
      // Image = area.area_name (named after the child image, e.g. img_52)
      image: readField(entry, ['Area Name', 'areaName'], ''),
      sensorName: parentEntry ? readField(parentEntry, ['Sensor Name', 'sensorName'], '') : '',
      // Image ID = COALESCE(image_area.child_image_id, image.image_id)
      imageId: readField(entry, ['Image ID', 'imageId'], ''),
      uploadDate: parentEntry ? readField(parentEntry, ['Upload Date', 'uploadDate'], '') : '',
      imageDatetime: parentEntry ? readField(parentEntry, ['Image Datetime', 'imageDatetime'], '') : '',
      // Area Name = external_area_id (e.g. B52), fallback to Area Name
      areaName: readField(entry, ['Area ID', 'areaId']) || readField(entry, ['Area Name', 'areaName'], ''),
      assignee: readField(entry, ['Assignee', 'assignee'], ''),
      report,
      remarks: readField(entry, ['Remarks', 'remarks'], ''),
      imageStatus: readField(entry, ['Task Status', 'taskStatus'], ''),
      priority: readField(entry, ['Priority', 'priority'], ''),
      color: readField(entry, ['Color', 'color'], ''),
      service: readField(entry, ['Service', 'service'], ''),
      exploitStartTime: readField(entry, ['Exploit Start Time', 'exploitStartTime'], ''),
      exploitEndTime: readField(entry, ['Exploit End Time', 'exploitEndTime'], ''),
      imageQuality: readField(entry, ['Image Quality', 'imageQuality'], ''),
      cloudCover: readField(entry, ['Cloud Cover', 'cloudCover'], ''),
      sfReported: Boolean(readField(entry, ['SF Reported', 'sfReported'], false)),
      iirReported: Boolean(readField(entry, ['IIR Reported', 'iirReported'], false)),
    })
  })
  return rows
}

function SubmissionTab({
  dateRange,
  userRole,
  title = 'Submission',
  subtitle = 'Track SF and IIR reporting before verification.',
}) {
  const canViewIIR = userRole === 'IA'
  const [tab, setTab] = useState(canViewIIR ? 'iir' : 'sf')
  const [allRows, setAllRows] = useState([])
  const [editingRows, setEditingRows] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selection, setSelection] = useState([])
  const { addNotification } = useNotifications()
  const hasPendingEdits = useMemo(() => Object.keys(editingRows).length > 0, [editingRows])

  const displayedRows = useMemo(() => {
    if (tab === 'submitted') {
      return allRows.filter((row) => {
        if (!isSubmitted(row)) return false
        // Senior II only sees SF submitted tasks
        if (!canViewIIR && row.report === 'IIR') return false
        return true
      })
    }
    if (tab === 'iir') return allRows.filter((row) => row.report === 'IIR' && !isSubmitted(row))
    // SF tab: only unsubmitted DS(SF) tasks
    return allRows.filter((row) => row.report === 'DS(SF)' && !isSubmitted(row))
  }, [allRows, tab, canViewIIR])

  const columns = useMemo(() => {
    const baseColumns = [
      { field: 'passId', headerName: 'Pass ID', minWidth: 130, flex: 0.7 },
      { field: 'image', headerName: 'Image', minWidth: 140, flex: 0.8 },
      { field: 'sensorName', headerName: 'Sensor Name', minWidth: 130, flex: 0.7 },
      { field: 'imageId', headerName: 'Image ID', minWidth: 100, flex: 0.6 },
      { field: 'uploadDate', headerName: 'Upload Date', minWidth: 160, flex: 0.9 },
      { field: 'imageDatetime', headerName: 'Image Date Time', minWidth: 160, flex: 0.9 },
      { field: 'areaName', headerName: 'Area Name', minWidth: 110, flex: 0.6 },
      { field: 'assignee', headerName: 'Assignee', minWidth: 120, flex: 0.7 },
      { field: 'report', headerName: 'Report', minWidth: 100, flex: 0.6 },
      { field: 'remarks', headerName: 'Remarks', minWidth: 130, flex: 0.7 },
      { field: 'imageStatus', headerName: 'Image Status', minWidth: 120, flex: 0.7 },
      { field: 'priority', headerName: 'Priority', minWidth: 100, flex: 0.6 },
      { field: 'color', headerName: 'Color', minWidth: 90, flex: 0.5 },
      { field: 'service', headerName: 'Service', minWidth: 90, flex: 0.5 },
      { field: 'exploitStartTime', headerName: 'Exploit Start Time', minWidth: 160, flex: 0.9 },
      { field: 'exploitEndTime', headerName: 'Exploit End Time', minWidth: 160, flex: 0.9 },
      { field: 'imageQuality', headerName: 'Image Quality', minWidth: 120, flex: 0.7 },
      { field: 'cloudCover', headerName: 'Cloud Cover', minWidth: 110, flex: 0.6 },
    ]

    // Submitted tab: read-only tick indicators, no editable checkboxes
    if (tab === 'submitted') {
      const makeReadonlyCheck = (field, header) => ({
        field,
        headerName: header,
        minWidth: 120,
        flex: 0.6,
        renderCell: (params) =>
          params.value ? (
            <img src={truePng} alt="✓" style={{ width: 16, height: 16, filter: ACCENT_FILTER }} />
          ) : null,
      })
      const submittedCols = [...baseColumns, makeReadonlyCheck('sfReported', 'SF Reported')]
      if (canViewIIR) submittedCols.push(makeReadonlyCheck('iirReported', 'IIR Reported'))
      return submittedCols
    }

    const isLocked = (row) =>
      String(row?.imageStatus || '').trim().toLowerCase() === 'completed'

    const sfColumn = {
      field: 'sfReported',
      headerName: 'SF Reported',
      minWidth: 120,
      flex: 0.6,
      renderCell: (params) => {
        const locked = isLocked(params.row)
        const pending = editingRows[params.row.taskId]
        const checked = pending?.sfReported !== undefined ? pending.sfReported : Boolean(params.value)
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled={locked}
            title={locked ? 'Task is verified — uncomplete to edit' : undefined}
            style={{ cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.45 : 1 }}
            onChange={(event) => {
              if (locked) return
              const next = Boolean(event.target.checked)
              setEditingRows((prev) => ({ ...prev, [params.row.taskId]: { ...(prev[params.row.taskId] || {}), sfReported: next } }))
            }}
          />
        )
      },
    }

    const iirColumn = {
      field: 'iirReported',
      headerName: 'IIR Reported',
      minWidth: 120,
      flex: 0.6,
      renderCell: (params) => {
        const locked = isLocked(params.row)
        const pending = editingRows[params.row.taskId]
        const checked = pending?.iirReported !== undefined ? pending.iirReported : Boolean(params.value)
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled={locked}
            title={locked ? 'Task is verified — uncomplete to edit' : undefined}
            style={{ cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.45 : 1 }}
            onChange={(event) => {
              if (locked) return
              const next = Boolean(event.target.checked)
              setEditingRows((prev) => ({ ...prev, [params.row.taskId]: { ...(prev[params.row.taskId] || {}), iirReported: next } }))
            }}
          />
        )
      },
    }

    if (tab === 'iir') return [...baseColumns, sfColumn, iirColumn]
    // SF tab: always show SF column only
    return [...baseColumns, sfColumn]
  }, [tab, canViewIIR, editingRows])

  useEffect(() => {
    if (!dateRange) return
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.postTaskingSummaryData(dateRange)
        setAllRows(buildRows(data))
        setEditingRows({})
        setSelection([])
      } catch (err) {
        const message = getErrorMessage(err, 'Unable to load submission data.')
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [dateRange, refreshKey])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      const hasSelection = selection.length > 0
      // Pause auto-refresh while user is selecting rows or editing checkboxes.
      if (hasPendingEdits || hasSelection) return
      setRefreshKey((prev) => prev + 1)
    }, TABLE_AUTO_REFRESH_MS)
    return () => window.clearInterval(timerId)
  }, [hasPendingEdits, selection])

  const applyChanges = async () => {
    const selectedSet = new Set(selection.map((id) => String(id)))
    const payload = {}
    displayedRows
      .filter((row) => selectedSet.has(String(row.id)))
      .filter((row) => String(row.imageStatus || '').trim().toLowerCase() !== 'completed')
      .forEach((row) => {
        const patch = editingRows[row.taskId]
        if (!patch) return
        payload[row.taskId] = {}
        if (patch.sfReported !== undefined) payload[row.taskId]['SF Reported'] = Boolean(patch.sfReported)
        if (patch.iirReported !== undefined) payload[row.taskId]['IIR Reported'] = Boolean(patch.iirReported)
        if (Object.keys(payload[row.taskId]).length === 0) delete payload[row.taskId]
      })

    if (!Object.keys(payload).length) {
      addNotification({
        title: 'Nothing to update',
        meta: 'Select row(s) and toggle checkbox values first',
      })
      return
    }

    try {
      await api.postUpdateTaskingSummaryData(payload)
      addNotification({
        title: 'Submission updated',
        meta: `Just now · ${Object.keys(payload).length} task(s)`,
      })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to save submission updates.')
      setError(message)
      addNotification({
        title: 'Submission update failed',
        meta: 'Please try again',
      })
    }
  }

  const unsubmit = async () => {
    const selectedSet = new Set(selection.map((id) => String(id)))
    const payload = {}
    displayedRows
      .filter((row) => selectedSet.has(String(row.id)))
      .forEach((row) => {
        payload[row.taskId] = {}
        if (row.report === 'IIR') payload[row.taskId]['IIR Reported'] = false
        if (row.report === 'DS(SF)') payload[row.taskId]['SF Reported'] = false
      })

    if (!Object.keys(payload).length) {
      addNotification({ title: 'Nothing to unsubmit', meta: 'Select row(s) first' })
      return
    }

    try {
      await api.postUpdateTaskingSummaryData(payload)
      addNotification({
        title: 'Tasks unsubmitted',
        meta: `Just now · ${Object.keys(payload).length} task(s) moved back to pending`,
      })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to unsubmit tasks.')
      setError(message)
      addNotification({ title: 'Unsubmit failed', meta: 'Please try again' })
    }
  }

  const gridSx = {
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
    '& .MuiDataGrid-cellContent': { width: '100%' },
    '& .MuiDataGrid-cellCheckbox': { justifyContent: 'center', paddingLeft: 0 },
    '& .MuiDataGrid-virtualScroller': { overflowX: 'auto', backgroundColor: 'transparent' },
    '& .MuiDataGrid-overlay': { backgroundColor: 'transparent' },
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: 'transparent',
      color: 'var(--muted)',
      textTransform: 'uppercase',
      fontSize: '11px',
      letterSpacing: '0.04em',
      borderBottom: '1px solid var(--border-strong)',
    },
    '& .MuiDataGrid-columnHeader': { backgroundColor: 'transparent' },
    '& .MuiDataGrid-columnSeparator': { display: 'flex', visibility: 'visible', opacity: 1 },
    '& .MuiDataGrid-scrollbarFiller': { backgroundColor: 'transparent' },
    '& .MuiDataGrid-scrollbarFiller--header': { backgroundColor: 'transparent' },
    '& .MuiDataGrid-columnHeaderTitleContainer, & .MuiDataGrid-columnHeaderTitleContainerContent': {
      color: 'var(--muted)',
    },
    '& .MuiDataGrid-row': { backgroundColor: 'var(--table-bg)' },
    '& .MuiDataGrid-row:hover': { backgroundColor: 'var(--hover)' },
    '& .MuiDataGrid-row.Mui-selected': { backgroundColor: '#333f4f' },
    '& .MuiDataGrid-iconButtonContainer button, & .MuiDataGrid-menuIconButton, & .MuiDataGrid-sortIcon': {
      color: 'var(--muted)',
    },
    '& .MuiCheckbox-root': { color: 'var(--muted)' },
    '& .MuiCheckbox-root.Mui-checked': { color: 'var(--accent)' },
  }

  return (
    <div className="admin-tab uploads-tab">
      <div className="content__topbar">
        <div className="content__heading">
          <div className="content__title">{title}</div>
          <div className="content__subtitle">{subtitle}</div>
        </div>
        <div className="content__controls">
          <div className="action-bar">
            <Button className="tasking-summary__button" onClick={() => setRefreshKey((prev) => prev + 1)}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="uploads-main">
        <div className="uploads-sections">
          {canViewIIR && (
            <button
              type="button"
              className={`uploads-section-tab ${tab === 'iir' ? 'is-active' : ''}`}
              onClick={() => setTab('iir')}
              disabled={loading}
            >
              IIR
            </button>
          )}
          <button
            type="button"
            className={`uploads-section-tab ${tab === 'sf' ? 'is-active' : ''}`}
            onClick={() => setTab('sf')}
            disabled={loading}
          >
            SF
          </button>
          <button
            type="button"
            className={`uploads-section-tab ${tab === 'submitted' ? 'is-active' : ''}`}
            onClick={() => setTab('submitted')}
            disabled={loading}
          >
            Submitted
          </button>
        </div>

        <div>
          {tab === 'submitted' ? (
            <Button
              className="tasking-summary__button"
              disabled={!selection.length}
              onClick={unsubmit}
            >
              Unsubmit
            </Button>
          ) : (
            <Button
              className="tasking-summary__button"
              disabled={!selection.length}
              onClick={applyChanges}
            >
              Apply Change
            </Button>
          )}
        </div>

        <div className="completed-images__grid">
          <DataGridPro
            rows={displayedRows}
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
              setSelection([])
            }}
            rowHeight={52}
            columnHeaderHeight={40}
            loading={loading}
            hideFooter
            sx={gridSx}
          />
        </div>
        {error ? <Typography className="completed-images__error">{error}</Typography> : null}
      </div>
    </div>
  )
}

export default SubmissionTab
