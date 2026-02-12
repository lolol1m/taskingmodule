import { useEffect, useMemo, useState } from 'react'
import { Button, Typography } from '@mui/material'
import { DataGridPro } from '@mui/x-data-grid-pro'
import API from '../../../api/api'
import useNotifications from '../../../components/notifications/useNotifications.js'

const api = new API()

const getErrorMessage = (err, fallback = 'Something went wrong.') =>
  err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback

const normalizeOpsV = (value) => {
  if (value === true || value === 1) return true
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'yes' || normalized === 'true' || normalized === '1'
  }
  return false
}

const buildRows = (areas) => {
  if (!Array.isArray(areas)) return []
  return areas.map((area) => ({
    id: Number(area['ID']),
    areaName: area['Area Name'],
    opsV: normalizeOpsV(area['OPS V']),
  }))
}

const hasSelection = (ids, rowId) => {
  if (!(ids instanceof Set) || rowId === null || rowId === undefined) return false
  return ids.has(rowId) || ids.has(String(rowId)) || ids.has(Number(rowId))
}

function SetOpsVTab() {
  const [rows, setRows] = useState([])
  const [selectionModel, setSelectionModel] = useState(() => ({ type: 'include', ids: new Set() }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { addNotification } = useNotifications()

  const columns = useMemo(
    () => [
      { field: 'id', headerName: 'ID', minWidth: 90, flex: 0.4 },
      { field: 'areaName', headerName: 'Area Name', minWidth: 200, flex: 1 },
      {
        field: 'opsV',
        headerName: 'OPS V',
        minWidth: 110,
        flex: 0.5,
        renderCell: (params) => (params?.row?.opsV ? 'Yes' : 'No'),
      },
    ],
    [selectionModel],
  )

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getAreas()
        console.log('OPS V raw areas:', data?.Areas)
        const nextRows = buildRows(data?.Areas || [])
        console.log('OPS V rows:', nextRows)
        const initialIds = new Set(nextRows.filter((row) => row.opsV).map((row) => row.id))
        console.log('OPS V initial selection ids:', Array.from(initialIds))
        setSelectionModel({ type: 'include', ids: new Set(initialIds) })
        setRows(
          nextRows.map((row) => ({
            ...row,
            opsV: hasSelection(initialIds, row.id),
          })),
        )
      } catch (err) {
        console.error('OPS V fetch failed:', err)
        const message = getErrorMessage(err, 'Unable to load OPS V areas.')
        setError(message)
        addNotification({
          title: 'OPS V load failed',
          meta: 'Just now · Please try again',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAreas()
  }, [refreshKey])

  const handleApply = async () => {
    if (!rows.length) return
    try {
      setLoading(true)
      const payload = rows.map((row) => ({
        ID: row.id,
        'Area Name': row.areaName,
        'OPS V': hasSelection(selectionModel.ids, row.id),
      }))
      await api.setOpsvAreas({ Areas: payload })
      const selectedCount = selectionModel?.ids?.size || 0
      addNotification({
        title: 'OPS V updated',
        meta: `Just now · ${selectedCount} areas updated`,
      })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      console.error('OPS V update failed:', err)
      const message = getErrorMessage(err, 'Unable to update OPS V areas.')
      setError(message)
      addNotification({
        title: 'OPS V update failed',
        meta: 'Just now · Please try again',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-tab">
      <div className="content__topbar">
        <div className="content__heading">
          <div className="content__title">Set OPS V</div>
          <div className="content__subtitle">Manage OPS V areas for tasking visibility.</div>
        </div>
        <div className="content__controls">
          <div className="action-bar">
            <Button className="tasking-summary__button" onClick={() => setRefreshKey((prev) => prev + 1)}>
              Refresh
            </Button>
            <Button className="tasking-summary__button" onClick={handleApply} disabled={loading}>
              Apply
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
            console.log('OPS V selection change model:', model)
            let nextIds = new Set()
            if (model?.ids instanceof Set) {
              nextIds = new Set(model.ids)
            } else if (model instanceof Set) {
              nextIds = new Set(model)
            } else if (Array.isArray(model)) {
              nextIds = new Set(model)
            }
            setSelectionModel({ type: 'include', ids: nextIds })
            setRows((prevRows) =>
              prevRows.map((row) => ({
                ...row,
                opsV: hasSelection(nextIds, row.id),
              })),
            )
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

export default SetOpsVTab
