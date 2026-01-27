import { useEffect, useMemo, useState } from 'react'
import { Button, Typography } from '@mui/material'
import { DataGridPro, GridToolbar } from '@mui/x-data-grid-pro'
import API from '../../../api/api'

const api = new API()

const readField = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return undefined
  return keys.reduce((value, key) => {
    if (value !== undefined && value !== null) return value
    return obj[key]
  }, undefined)
}

const buildRows = (users) => {
  if (!Array.isArray(users)) return []
  return users.map((entry, index) => {
    if (typeof entry === 'string') {
      return {
        id: `${entry}-${index}`,
        user: entry,
        role: '—',
        status: 'Unknown',
        lastActive: '—',
      }
    }

    const username = readField(entry, ['username', 'user', 'name', 'User', 'Username', 'Name'])
    const role = readField(entry, ['role', 'Role'])
    const isPresent = readField(entry, ['is_present', 'isPresent', 'present', 'Present'])
    const status = typeof isPresent === 'boolean' ? (isPresent ? 'Online' : 'Offline') : readField(entry, ['status', 'Status'])
    const lastActive = readField(entry, ['lastActive', 'last_active', 'Last Active', 'LastActive'])
    const resolvedUser = username ?? '—'

    return {
      id: entry?.id ?? `${resolvedUser}-${index}`,
      user: resolvedUser,
      role: role ?? '—',
      status: status ?? 'Unknown',
      lastActive: lastActive ?? '—',
    }
  })
}

function UserPresenceTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const columns = useMemo(
    () => [
      { field: 'user', headerName: 'User', minWidth: 180, flex: 1 },
      { field: 'role', headerName: 'Role', minWidth: 140, flex: 0.7 },
      { field: 'status', headerName: 'Status', minWidth: 140, flex: 0.7 },
      { field: 'lastActive', headerName: 'Last Active', minWidth: 160, flex: 0.8 },
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
        setError('Unable to load user presence data.')
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
          <div className="content__subtitle">Monitor active users currently online.</div>
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

      <div className="admin-tab__grid">
        <DataGridPro
          rows={rows}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
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
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid var(--border-strong)',
            },
          }}
        />
      </div>
    </div>
  )
}

export default UserPresenceTab
