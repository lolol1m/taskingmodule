import { useEffect, useMemo, useState } from 'react'
import { Button, MenuItem, TextField, Tooltip, Typography } from '@mui/material'
import { DataGridPro } from '@mui/x-data-grid-pro'
import API from '../../../api/api'
import UserService from '../../../auth/UserService'
import useNotifications from '../../../components/notifications/useNotifications.js'
import CreateUserTab from './CreateUserTab.jsx'
import addPng from '../../../assets/add.png'
import editIcon from '../../../assets/edit.png'
import binIcon from '../../../assets/bin.png'
import '../styles/CreateUserTab.css'
import '../styles/TaskingManagerTab.css'

const api = new API()

const ROLES = ['II', 'Senior II', 'IA']
const TABLE_AUTO_REFRESH_MS = 5000

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
  return date.toLocaleString('en-GB', { timeZone: 'Asia/Singapore', hour12: false })
}

const buildRows = (users) => {
  if (!Array.isArray(users)) return []
  return users.map((entry, index) => {
    if (typeof entry === 'string') {
      return { id: `${entry}-${index}`, keycloakId: null, user: entry, role: '—', status: 'Absent', lastUpdated: '—' }
    }
    const username = readField(entry, ['name', 'username', 'user', 'User', 'Username', 'Name'])
    const role = readField(entry, ['role', 'Role'])
    const isPresent = readField(entry, ['is_present', 'isPresent', 'present', 'Present'])
    const status = typeof isPresent === 'boolean'
      ? (isPresent ? 'Present' : 'Absent')
      : readField(entry, ['status', 'Status']) || 'Absent'
    const lastUpdated = readField(entry, ['last_updated', 'lastUpdated', 'Last Updated', 'LastUpdated'])
    const resolvedUser = username ?? '—'
    return {
      id: entry?.id ?? `${resolvedUser}-${index}`,
      keycloakId: entry?.id ?? null,
      user: resolvedUser,
      role: role ?? '—',
      status: status ?? 'Unknown',
      lastUpdated: formatTimestamp(lastUpdated),
    }
  })
}

// ── Inline cell components ─────────────────────────────────────────────────────
const textInputStyle = {
  width: '100%',
  background: 'var(--panel-2)',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  color: 'var(--text)',
  fontSize: 13,
  padding: '5px 8px',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const dropdownSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    height: 30,
    minHeight: 30,
    borderRadius: '6px',
    backgroundColor: 'var(--panel-2)',
    color: 'var(--text)',
    '& fieldset': { borderColor: 'var(--border-strong)' },
    '&:hover fieldset': { borderColor: 'var(--muted)' },
    '&.Mui-focused fieldset': { borderColor: 'var(--accent)' },
  },
  '& .MuiSelect-select': {
    padding: '0 26px 0 10px !important',
    display: 'flex',
    alignItems: 'center',
    height: '30px',
    lineHeight: '30px',
    fontSize: 13,
    color: 'var(--text)',
  },
  '& .MuiSvgIcon-root': { color: 'var(--muted)' },
}

function EditableUserCell({ value, rowId, editingRows, setEditingRows }) {
  const pending = editingRows[rowId]
  const displayed = pending?.user !== undefined ? pending.user : value
  return (
    <input
      type="text"
      value={displayed}
      style={textInputStyle}
      onChange={(e) =>
        setEditingRows((prev) => ({ ...prev, [rowId]: { ...(prev[rowId] || {}), user: e.target.value } }))
      }
    />
  )
}

function EditableRoleCell({ value, rowId, editingRows, setEditingRows }) {
  const pending = editingRows[rowId]
  const displayed = pending?.role !== undefined ? pending.role : value
  return (
    <TextField
      select
      size="small"
      fullWidth
      value={displayed}
      onChange={(e) =>
        setEditingRows((prev) => ({ ...prev, [rowId]: { ...(prev[rowId] || {}), role: e.target.value } }))
      }
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      sx={dropdownSx}
    >
      {ROLES.map((r) => (
        <MenuItem key={r} value={r}>{r}</MenuItem>
      ))}
    </TextField>
  )
}

function EditableStatusCell({ value, rowId, editingRows, setEditingRows }) {
  const pending = editingRows[rowId]
  const displayed = pending?.status !== undefined ? pending.status : value
  return (
    <TextField
      select
      size="small"
      fullWidth
      value={displayed}
      onChange={(e) =>
        setEditingRows((prev) => ({ ...prev, [rowId]: { ...(prev[rowId] || {}), status: e.target.value } }))
      }
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      sx={dropdownSx}
    >
      <MenuItem value="Present">Present</MenuItem>
      <MenuItem value="Absent">Absent</MenuItem>
    </TextField>
  )
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function CreateUserModal({ open, onClose, onSuccess, resetKey }) {
  return (
    <div
      className={`tasking-manager__modal${open ? ' is-open' : ''}`}
      style={{ alignItems: 'flex-start', overflowY: 'auto', padding: '40px 16px' }}
    >
      <div className="tasking-manager__modal-backdrop" onClick={onClose} />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'min(820px, 94vw)',
          background: 'var(--panel)',
          border: '1px solid var(--border-strong)',
          borderRadius: 16,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 16, right: 16, zIndex: 2,
            width: 32, height: 32, padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, lineHeight: 1, color: 'var(--muted)',
            borderRadius: 6,
          }}
        >
          ✕
        </button>
        <div style={{ padding: '24px 20px 24px' }}>
          <CreateUserTab key={resetKey} onSuccess={onSuccess} />
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
function UserPresenceTab({ userRole }) {
  const [rows, setRows] = useState([])
  const [editingRows, setEditingRows] = useState({})
  const [selectionModel, setSelectionModel] = useState(() => ({ type: 'include', ids: new Set() }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [modalKey, setModalKey] = useState(0)
  const { addNotification } = useNotifications()

  const canCreateUsers = userRole === 'IA'
  const canEditUsers = userRole === 'IA'
  const hasPendingEdits = useMemo(() => Object.keys(editingRows).length > 0, [editingRows])
  const hasSelectedPendingEdits = useMemo(() => {
    if (!selectionModel?.ids || selectionModel.ids.size === 0) return false
    return Object.keys(editingRows).some((id) => selectionModel.ids.has(id))
  }, [editingRows, selectionModel])

  const columns = useMemo(
    () => [
      {
        field: 'user',
        headerName: 'User',
        minWidth: 180,
        flex: 1,
        renderCell: (params) => {
          if (!editingRows[params.row.id]) return <span>{params.value}</span>
          return (
            <EditableUserCell
              value={params.value}
              rowId={params.row.id}
              editingRows={editingRows}
              setEditingRows={setEditingRows}
            />
          )
        },
      },
      {
        field: 'role',
        headerName: 'Role',
        minWidth: 140,
        flex: 0.7,
        renderCell: (params) => {
          if (!editingRows[params.row.id]) return <span>{params.value}</span>
          return (
            <EditableRoleCell
              value={params.value}
              rowId={params.row.id}
              editingRows={editingRows}
              setEditingRows={setEditingRows}
            />
          )
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 140,
        flex: 0.7,
        renderCell: (params) => {
          if (!editingRows[params.row.id]) return <span>{params.value}</span>
          return (
            <EditableStatusCell
              value={params.value}
              rowId={params.row.id}
              editingRows={editingRows}
              setEditingRows={setEditingRows}
            />
          )
        },
      },
      { field: 'lastUpdated', headerName: 'Status Last Updated', minWidth: 180, flex: 0.9 },
      ...(canEditUsers
        ? [
            {
              field: 'actions',
              headerName: 'Actions',
              minWidth: 100,
              width: 100,
              sortable: false,
              filterable: false,
              disableColumnMenu: true,
              renderCell: (params) => {
                const isEditing = Boolean(editingRows[params.row.id])
                return (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Tooltip title={isEditing ? 'Cancel edit' : 'Edit user'}>
                      <Button
                        className="tasking-manager__action-btn tasking-manager__action-btn--icon"
                        size="small"
                        onClick={() => {
                          if (isEditing) {
                            setEditingRows((prev) => {
                              const next = { ...prev }
                              delete next[params.row.id]
                              return next
                            })
                          } else {
                            setEditingRows((prev) => ({
                              ...prev,
                              [params.row.id]: {
                                user: params.row.user,
                                role: params.row.role,
                                status: params.row.status,
                              },
                            }))
                          }
                        }}
                      >
                        {isEditing ? (
                          <span style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1 }}>✕</span>
                        ) : (
                          <img src={editIcon} alt="Edit" className="tasking-manager__action-icon" />
                        )}
                      </Button>
                    </Tooltip>
                    <Tooltip title="Delete user">
                      <Button
                        className="tasking-manager__action-btn tasking-manager__action-btn--icon"
                        size="small"
                        onClick={() => handleDelete(params.row)}
                      >
                        <img src={binIcon} alt="Delete" className="tasking-manager__action-icon" />
                      </Button>
                    </Tooltip>
            </div>
                )
              },
            },
          ]
        : []),
    ],
    [editingRows, canEditUsers],
  )

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getUsers()
        setRows(buildRows(data?.Users || []))
        setEditingRows({})
      } catch (err) {
        const message = getErrorMessage(err, 'Unable to load attendance data.')
        setError(message)
        addNotification({ title: 'Attendance load failed', meta: 'Just now · Please try again' })
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [refreshKey])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      if (!hasPendingEdits) {
        setRefreshKey((prev) => prev + 1)
      }
    }, TABLE_AUTO_REFRESH_MS)
    return () => window.clearInterval(timerId)
  }, [hasPendingEdits])

  const handleDelete = async (row) => {
    if (!row.keycloakId) {
      addNotification({ title: 'Cannot delete', meta: 'No Keycloak ID for this user' })
      return
    }
    const isSelf = row.keycloakId === UserService.getTokenParsed()?.sub
    const confirmMessage = isSelf
      ? `You are about to delete your own account ("${row.user}"). You will be logged out immediately. Continue?`
      : `Delete user "${row.user}"? This cannot be undone.`
    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) return
    try {
      const result = await api.deleteUser({ user_id: row.keycloakId })
      if (result?.error) throw new Error(result.error)
      if (isSelf) {
        UserService.doLogout()
        return
      }
      addNotification({ title: 'User deleted', meta: `Just now · ${row.user}` })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      addNotification({ title: 'Delete failed', meta: getErrorMessage(err, 'Unable to delete user.') })
    }
  }

  const applyChanges = async () => {
    if (!hasPendingEdits) {
      addNotification({ title: 'Nothing to save', meta: 'Click Edit on a row first' })
      return
    }
    if (!selectionModel?.ids || selectionModel.ids.size === 0) {
      addNotification({ title: 'No rows selected', meta: 'Select the edited row(s) using checkboxes first' })
      return
    }
    const pendingIds = Object.keys(editingRows).filter((id) => selectionModel.ids.has(id))
    if (!pendingIds.length) {
      addNotification({ title: 'No selected edits', meta: 'Only checked rows are applied' })
      return
    }

    const rowMap = Object.fromEntries(rows.map((r) => [r.id, r]))
    const warnings = []
    const results = await Promise.allSettled(
      pendingIds.map(async (rowId) => {
        const original = rowMap[rowId]
        if (!original?.keycloakId) throw new Error(`No Keycloak ID for row ${rowId}`)
        const pending = editingRows[rowId]
        const payload = { user_id: original.keycloakId }
        if (pending.user !== undefined && pending.user !== original.user) payload.username = pending.user
        if (pending.role !== undefined && pending.role !== original.role) payload.role = pending.role
        if (pending.status !== undefined && pending.status !== original.status) payload.status = pending.status
        const result = await api.editUser(payload)
        if (result?.error) throw new Error(result.error)
        if (result?.warning) warnings.push(result.warning)
      }),
    )

    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length) {
      addNotification({
        title: 'Some edits failed',
        meta: failed.map((f) => f.reason?.message).join('; '),
      })
    } else {
      addNotification({
        title: 'Changes saved',
        meta: `Just now · ${pendingIds.length} user(s) updated`,
      })
      if (warnings.length) {
        addNotification({
          title: 'Some fields were skipped',
          meta: warnings.join('; '),
        })
      }
    }
    setRefreshKey((prev) => prev + 1)
  }

  const gridSx = {
    width: '100%',
    height: '100%',
    flex: 1,
    border: 'none',
    color: 'var(--text)',
    backgroundColor: 'transparent',
    '& .MuiDataGrid-virtualScroller': { overflowX: 'hidden', backgroundColor: 'transparent' },
    '& .MuiDataGrid-overlay': { backgroundColor: 'transparent' },
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: 'transparent',
      color: 'var(--muted)',
      textTransform: 'uppercase',
      fontSize: '11px',
      letterSpacing: '0.04em',
      borderBottom: '1px solid var(--border-strong)',
    },
    '& .MuiDataGrid-columnHeaderTitle': { color: 'var(--muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' },
    '& .MuiDataGrid-columnHeader': { backgroundColor: 'transparent' },
    '& .MuiDataGrid-columnSeparator': { display: 'flex', visibility: 'visible', opacity: 1 },
    '& .MuiDataGrid-scrollbarFiller': { backgroundColor: 'transparent' },
    '& .MuiDataGrid-scrollbarFiller--header': { backgroundColor: 'transparent' },
    '& .MuiDataGrid-columnHeaderTitleContainer, & .MuiDataGrid-columnHeaderTitleContainerContent': { color: 'var(--muted)' },
    '& .MuiDataGrid-row': { backgroundColor: 'var(--table-bg)' },
    '& .MuiDataGrid-row:hover': { backgroundColor: 'var(--hover)' },
    '& .MuiDataGrid-row.Mui-selected': { backgroundColor: '#333f4f' },
    '& .MuiDataGrid-iconButtonContainer button, & .MuiDataGrid-menuIconButton, & .MuiDataGrid-sortIcon': { color: 'var(--muted)' },
    '& .MuiCheckbox-root': { color: 'var(--muted)' },
    '& .MuiCheckbox-root.Mui-checked': { color: 'var(--accent)' },
    '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', borderColor: 'var(--border-strong)', fontSize: 13 },
  }

  return (
    <>
      <CreateUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false)
          setRefreshKey((prev) => prev + 1)
        }}
        resetKey={modalKey}
      />

      <div className="admin-tab">
        <div className="content__topbar">
          <div className="content__heading">
            <div className="content__title">Users</div>
            <div className="content__subtitle">Manage system users and their roles.</div>
          </div>
          <div className="content__controls">
            <div className="action-bar">
              <Button className="tasking-summary__button" onClick={() => setRefreshKey((prev) => prev + 1)}>
                Refresh
              </Button>
              {canCreateUsers && (
                <Button
                  className="tasking-summary__button"
                  onClick={() => { setModalKey((prev) => prev + 1); setCreateModalOpen(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <img src={addPng} alt="" style={{ width: 16, height: 16, filter: 'brightness(0) invert(1)', opacity: 0.8 }} />
                  Create User
                </Button>
              )}
            </div>
          </div>
        </div>

        {error ? <Typography className="admin-tab__error">{error}</Typography> : null}

        {canEditUsers && (
          <div>
            <Button
              className="tasking-summary__button"
              disabled={!hasSelectedPendingEdits}
              onClick={applyChanges}
            >
              Apply Change
            </Button>
          </div>
        )}

        <div className="admin-tab__grid admin-tab__grid--with-footer">
          <DataGridPro
            rows={rows}
            columns={columns}
            loading={loading}
            checkboxSelection
            disableRowSelectionOnClick
            rowSelectionModel={selectionModel}
            onRowSelectionModelChange={(model) => {
              if (model?.ids instanceof Set) { setSelectionModel(model); return }
              if (model instanceof Set) { setSelectionModel({ type: 'include', ids: model }); return }
              if (Array.isArray(model)) { setSelectionModel({ type: 'include', ids: new Set(model) }); return }
              setSelectionModel({ type: 'include', ids: new Set() })
            }}
            scrollbarSize={0}
            columnHeaderHeight={40}
            rowHeight={52}
            hideFooter
            sx={gridSx}
          />
          <div className="admin-tab__grid-footer">
            <div className="admin-tab__grid-footer-left">
              {selectionModel.ids.size > 0 ? `${selectionModel.ids.size} row(s) selected` : ''}
            </div>
            <div className="admin-tab__grid-footer-right">Total Rows: {rows.length}</div>
          </div>
        </div>
      </div>
    </>
  )
}

export default UserPresenceTab
