import { useEffect, useMemo, useState } from 'react'
import { Button, Typography } from '@mui/material'
import { DataGridPro } from '@mui/x-data-grid-pro'
import API from '../../../api/api'
import useNotifications from '../../../components/notifications/useNotifications.js'

const api = new API()

const getErrorMessage = (err, fallback = 'Something went wrong.') =>
  err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback

const readField = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return undefined
  return keys.reduce((value, key) => {
    if (value !== undefined && value !== null) return value
    return obj[key]
  }, undefined)
}

const formatTimestamp = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

const buildRows = (users) => {
  if (!Array.isArray(users)) return []
  return users.map((entry, index) => {
    if (typeof entry === 'string') {
      return {
        id: `${entry}-${index}`,
        user: entry,
        role: '—',
        status: 'Absent',
        lastUpdated: '—',
      }
    }

    const username = readField(entry, ['username', 'user', 'name', 'User', 'Username', 'Name'])
    const role = readField(entry, ['role', 'Role'])
    const isPresent = readField(entry, ['is_present', 'isPresent', 'present', 'Present'])
    const status = typeof isPresent === 'boolean' ? (isPresent ? 'Present' : 'Absent') : readField(entry, ['status', 'Status']) || 'Absent'
    const lastUpdated = readField(entry, ['last_updated', 'lastUpdated', 'Last Updated', 'LastUpdated'])
    const resolvedUser = username ?? '—'

    return {
      id: entry?.id ?? `${resolvedUser}-${index}`,
      user: resolvedUser,
      role: role ?? '—',
      status: status ?? 'Unknown',
      lastUpdated: formatTimestamp(lastUpdated),
    }
  })
}

function UserPresenceTab() {
  const [rows, setRows] = useState([])
  const [selectionModel, setSelectionModel] = useState(() => ({ type: 'include', ids: new Set() }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { addNotification } = useNotifications()

  const columns = useMemo(
    () => [
      { field: 'user', headerName: 'User', minWidth: 180, flex: 1 },
      { field: 'role', headerName: 'Role', minWidth: 140, flex: 0.7 },
      { field: 'status', headerName: 'Status', minWidth: 140, flex: 0.7 },
      { field: 'lastUpdated', headerName: 'Last Updated', minWidth: 180, flex: 0.9 },
    ],
    [],
  )

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getUsers()
        setRows(buildRows(data?.Users || []))
      } catch (err) {
        console.error('User presence fetch failed:', err)
        const message = getErrorMessage(err, 'Unable to load user presence data.')
        setError(message)
        addNotification({
          title: 'User presence failed',
          meta: 'Just now · Please try again',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [refreshKey])

  return (
    <div className="admin-tab">
      <div className="content__topbar">
        <div className="content__heading">
          <div className="content__title">User Presence</div>
          <div className="content__subtitle">Availability from the latest parade state upload.</div>
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
          disableColumnResize
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
          scrollbarSize={0}
          columnHeaderHeight={40}
          hideFooter
          sx={{
            width: '100%',
            height: '100%',
            flex: 1,
            border: 'none',
            color: 'var(--text)',
            backgroundColor: 'transparent',
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
            '& .MuiDataGrid-columnHeaderTitle': {
              color: 'var(--muted)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
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

export default UserPresenceTab
