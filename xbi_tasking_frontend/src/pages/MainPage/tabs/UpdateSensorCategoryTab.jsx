import { useEffect, useMemo, useState } from 'react'
import { Button, MenuItem, TextField, Typography } from '@mui/material'
import { DataGridPro, GridToolbar } from '@mui/x-data-grid-pro'
import API from '../../../api/api'
import useNotifications from '../../../components/notifications/useNotifications.js'

const api = new API()

const getErrorMessage = (err, fallback = 'Something went wrong.') =>
  err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback

const buildRows = (payload) => {
  if (!payload || typeof payload !== 'object') return []
  const rows = []
  Object.entries(payload).forEach(([category, sensors]) => {
    if (!Array.isArray(sensors)) return
    sensors.forEach((name, index) => {
      rows.push({
        id: `${category}-${name}-${index}`,
        sensorName: name,
        currentCategory: category,
        selectedCategory: category,
      })
    })
  })
  return rows
}

function UpdateSensorCategoryTab() {
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [selectionModel, setSelectionModel] = useState(() => ({ type: 'include', ids: new Set() }))
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { addNotification } = useNotifications()

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getSensorCategory()
        setRows(buildRows(data))
        setCategories(Object.keys(data || {}))
      } catch (err) {
        console.error('Sensor category fetch failed:', err)
        const message = getErrorMessage(err, 'Unable to load sensor categories.')
        setError(message)
        addNotification({
          title: 'Load failed',
          meta: 'Just now · Please try again',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [refreshKey, addNotification])

  const handleUpdate = async (row) => {
    if (!row) return
    if (row.selectedCategory === row.currentCategory) {
      addNotification({
        title: 'No changes detected',
        meta: 'Select a new category before updating',
      })
      return
    }
    try {
      setUpdatingId(row.id)
      setError(null)
      await api.updateSensorCategory({
        Sensors: [{ Name: row.sensorName, Category: row.selectedCategory }],
      })
      addNotification({
        title: 'Sensor updated',
        meta: `Just now · ${row.sensorName} → ${row.selectedCategory}`,
      })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      console.error('Sensor category update failed:', err)
      const message = getErrorMessage(err, 'Unable to update sensor category.')
      setError(message)
      addNotification({
        title: 'Update failed',
        meta: 'Just now · Please try again',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const columns = useMemo(
    () => [
      { field: 'sensorName', headerName: 'Sensor', minWidth: 200, flex: 1 },
      { field: 'currentCategory', headerName: 'Current Category', minWidth: 180, flex: 0.8 },
      {
        field: 'selectedCategory',
        headerName: 'New Category',
        minWidth: 200,
        flex: 0.9,
        renderCell: (params) => (
          <TextField
            select
            size="small"
            value={params.row.selectedCategory || ''}
            onChange={(event) => {
              const value = event.target.value
              setRows((prev) =>
                prev.map((row) => (row.id === params.row.id ? { ...row, selectedCategory: value } : row)),
              )
            }}
            fullWidth
          >
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </TextField>
        ),
      },
      {
        field: 'action',
        headerName: 'Action',
        minWidth: 140,
        flex: 0.6,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Button
            className="tasking-summary__button"
            onClick={() => handleUpdate(params.row)}
            disabled={updatingId === params.row.id}
          >
            Update
          </Button>
        ),
      },
    ],
    [categories, updatingId],
  )

  return (
    <div className="admin-tab">
      <div className="content__topbar">
        <div className="content__heading">
          <div className="content__title">Update Sensor Category</div>
          <div className="content__subtitle">Maintain sensor classification data.</div>
        </div>
        <div className="content__controls">
          <div className="action-bar">
            <Button className="tasking-summary__button" onClick={() => setRefreshKey((prev) => prev + 1)}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {error ? <Typography className="admin-tab__error">{error}</Typography> : null}

      <div className="admin-tab__grid admin-tab__grid--with-footer">
        <DataGridPro
          rows={rows}
          columns={columns}
          loading={loading}
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={(model) => {
            if (model?.ids instanceof Set) {
              setSelectionModel(model)
              return
            }
            if (model instanceof Set) {
              setSelectionModel({ type: 'include', ids: model })
              return
            }
            if (Array.isArray(model)) {
              setSelectionModel({ type: 'include', ids: new Set(model) })
              return
            }
            setSelectionModel({ type: 'include', ids: new Set() })
          }}
          hideFooter
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 300 },
            },
          }}
          sx={{
            width: '100%',
            height: '100%',
            flex: 1,
            border: 'none',
            color: 'var(--text)',
            backgroundColor: 'var(--table-bg)',
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
            '& .MuiDataGrid-cell': {
              alignItems: 'center',
            },
            '& .MuiInputBase-root': {
              color: 'var(--text)',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--border-strong)',
            },
          }}
        />
        <div className="admin-tab__grid-footer">
          <div className="admin-tab__grid-footer-left">
            {selectionModel.ids.size > 0 ? `${selectionModel.ids.size} row(s) selected` : ''}
          </div>
          <div className="admin-tab__grid-footer-right">Total Rows: {rows.length}</div>
        </div>
      </div>
    </div>
  )
}

export default UpdateSensorCategoryTab
