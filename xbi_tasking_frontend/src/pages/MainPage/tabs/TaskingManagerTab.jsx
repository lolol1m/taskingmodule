import { useEffect, useMemo, useState } from 'react'
import { Autocomplete, Button, IconButton, MenuItem, TextField, Tooltip } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { DataGridPro } from '@mui/x-data-grid-pro'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs from 'dayjs'
import API from '../../../api/api'
import UserService from '../../../auth/UserService'
import useNotifications from '../../../components/notifications/useNotifications.js'

const api = new API()
const MAX_DATE_RANGE_DAYS = 90

const getErrorMessage = (err, fallback = 'Something went wrong.') =>
  err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback

const isDateRangeTooLarge = (range, maxDays) => {
  if (!range) return false
  const start = range['Start Date']
  const end = range['End Date']
  if (!start || !end) return false
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return false
  const diffMs = endDate - startDate
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays > maxDays
}


const normalizeImageName = (value) => {
  if (!value || typeof value !== 'string') return value
  return value.replace(/(\.(?:jpg|jpeg|png|gif|tif|tiff))_\d+$/i, '$1')
}

const toISOLocal = (date) => {
  if (!date) return null
  const d = new Date(date)
  const pad = (value) => String(value).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}.${ms}Z`
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

function TaskingManagerTab({ dateRange, onOpenDatePicker }) {
  const [rows, setRows] = useState([])
  const [assignees, setAssignees] = useState([{ id: 'Multiple', name: 'Multiple' }])
  const [selectionModel, setSelectionModel] = useState(() => ({ type: 'include', ids: new Set() }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [filterModel, setFilterModel] = useState({ items: [], quickFilterValues: [] })
  const [actionsEnabled, setActionsEnabled] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [areaOptions, setAreaOptions] = useState([])
  const { addNotification } = useNotifications()
  const [formInput, setFormInput] = useState({
    imageFileName: '',
    sensorName: '',
    uploadDate: null,
    imageDateTime: null,
    areas: [],
  })

  const resetForm = () => {
    setFormInput({
      imageFileName: '',
      sensorName: '',
      uploadDate: null,
      imageDateTime: null,
      areas: [],
    })
  }

  const formatData = (inputData) => {
    if (!inputData) return []

    const entries = Array.isArray(inputData)
      ? inputData.map((entry, index) => {
          const key =
            entry?.id ||
            entry?.ID ||
            entry?.['SCVU Image ID'] ||
            entry?.['SCVU Image Area ID'] ||
            entry?.['Image ID'] ||
            index
          return { key, entry }
        })
      : Object.keys(inputData).map((key) => ({ key, entry: inputData[key] }))

    const entryMap = new Map(entries.map(({ key, entry }) => [String(key), entry]))

    const readValue = (entry, keys) => {
      if (!entry) return null
      const lowerMap = Object.entries(entry).reduce((acc, [key, value]) => {
        acc[key.toLowerCase()] = value
        return acc
      }, {})
      for (const key of keys) {
        if (entry[key] !== undefined && entry[key] !== null) return entry[key]
        const lowerKey = key.toLowerCase()
        if (lowerMap[lowerKey] !== undefined && lowerMap[lowerKey] !== null) return lowerMap[lowerKey]
      }
      return null
    }

    const formatted = entries
      .map(({ key, entry }) => {
        if (!entry) return null

        const parentIdValue = readValue(entry, ['Parent ID', 'ParentID', 'parent_id'])
        const areaNameValue = readValue(entry, ['Area Name', 'Area', 'Area_Name'])
        const imageFileNameValue = normalizeImageName(
          readValue(entry, [
          'Image File Name',
          'Image Filename',
          'Image Name',
          'Image ID',
          'Image',
          ]),
        )

        if (parentIdValue !== null && parentIdValue !== undefined && areaNameValue) {
          const parentId = Number.isNaN(Number(parentIdValue)) ? parentIdValue : Number(parentIdValue)
          const parent = entryMap.get(String(parentId)) || entryMap.get(String(parentIdValue))
          const parentName = normalizeImageName(
            readValue(parent, ['Image File Name', 'Image Filename', 'Image Name', 'Image ID', 'Sensor Name']) ||
              `Image_${parentId}`,
          )
          const areaName = areaNameValue || `Area_${key}`
          const areaId = Number.isNaN(Number(key)) ? key : Number(key)
          return {
            id: areaId,
            groupName: [parentName, areaName],
            treePath: [`img_${parentId}`, areaName],
            currentAssignee: readValue(entry, ['Assignee']) || '',
            proposedAssignee: readValue(entry, ['Assignee']) || '',
            areaName,
            parentId,
            scvuImageAreaId: readValue(entry, ['SCVU Image Area ID', 'SCVU Image Area ID']) || null,
            imageName: null,
            imageDatetime: null,
            sensorName: null,
            uploadDate: null,
            priority: null,
            ttg: null,
          }
        }

        const imageFileName = imageFileNameValue || `Image_${key}`
        const imageId = Number.isNaN(Number(key)) ? key : Number(key)
        return {
          id: imageId,
          groupName: [imageFileName],
          treePath: [`img_${imageId}`],
          currentAssignee: readValue(entry, ['Assignee']) || '',
          proposedAssignee: readValue(entry, ['Assignee']) || '',
          sensorName: readValue(entry, ['Sensor Name', 'Sensor']) || null,
          imageName: imageFileName,
          uploadDate: readValue(entry, ['Upload Date', 'UploadDate']) || null,
          imageDatetime: readValue(entry, ['Image Datetime', 'Image Date Time', 'Image DateTime']) || null,
          priority: readValue(entry, ['Priority', 'priority', 'Priority Level']) || null,
          ttg: readValue(entry, ['TTG']) ?? null,
        }
      })
      .filter(Boolean)

    formatted.sort((a, b) => {
      if (a.groupName.length === 1 && b.groupName.length === 1) {
        return a.groupName[0].localeCompare(b.groupName[0])
      }
      if (a.groupName.length === 1) return -1
      if (b.groupName.length === 1) return 1
      if (a.groupName[0] !== b.groupName[0]) {
        return a.groupName[0].localeCompare(b.groupName[0])
      }
      return a.groupName[1].localeCompare(b.groupName[1])
    })

    return formatted
  }

  const fetchUsers = async () => {
    try {
      setError(null)
      const data = await api.getUsers()
      if (data?.Warning) {
        addNotification({
          title: 'User list warning',
          meta: data.Warning,
        })
      }
      if (Array.isArray(data?.Users) && data.Users.length) {
        setAssignees([{ id: 'Multiple', name: 'Multiple' }, ...data.Users])
      } else {
        setAssignees([{ id: 'Multiple', name: 'Multiple' }])
      }
    } catch (err) {
      console.warn('Failed to load users', err)
      const message = getErrorMessage(err, 'Unable to load users.')
      setError(message)
      addNotification({
        title: 'User list failed',
        meta: 'Just now · Please try again',
      })
    }
  }

  const fetchTaskingManager = async () => {
    if (!dateRange) return
    try {
      setLoading(true)
      setError(null)
      if (isDateRangeTooLarge(dateRange, MAX_DATE_RANGE_DAYS)) {
        const message = `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days.`
        setError(message)
        addNotification({
          title: 'Date range too large',
          meta: `Just now · ${message}`,
        })
        return
      }
     
      var response = await api.postTaskingManagerData(dateRange)
      
      const data = response
      if (!fetchTaskingManager.hasLogged) {
        console.log('[TaskingManager] Raw response sample:', data)
        fetchTaskingManager.hasLogged = true
      }
      setRows(formatData(data))
    } catch (err) {
      console.error('Tasking Manager fetch failed:', err)
      const message = getErrorMessage(err, 'Unable to load tasking manager data.')
      setError(message)
      addNotification({
        title: 'Load failed',
        meta: 'Just now · Tasking Manager unavailable',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAreas = async () => {
    try {
      setError(null)
      const data = await api.getAreas()
      const areas = Array.isArray(data?.Areas) ? data.Areas : []
      const names = Array.from(new Set(areas.map((area) => area?.['Area Name']).filter(Boolean)))
      setAreaOptions(names)
    } catch (err) {
      console.warn('Unable to load areas', err)
      const message = getErrorMessage(err, 'Unable to load areas.')
      setError(message)
      addNotification({
        title: 'Area list failed',
        meta: 'Just now · Please try again',
      })
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    fetchTaskingManager()
  }, [refreshKey, dateRange])

  useEffect(() => {
    if (modalOpen) {
      fetchAreas()
    }
  }, [modalOpen])

  const updateRows = (rowId, updater) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? updater(row) : row)))
  }

  const normalizeSelection = (model) => {
    if (model?.ids instanceof Set) return model
    if (Array.isArray(model)) return { type: 'include', ids: new Set(model) }
    return { type: 'include', ids: new Set() }
  }

  const hasEmptyAssignee = useMemo(() => {
    if (!selectionModel.ids.size) return false
    return rows.some((row) => {
      if (!selectionModel.ids.has(row.id)) return false
      const value = row.proposedAssignee
      return value === null || value === undefined || value === ''
    })
  }, [rows, selectionModel])

  const renderCurrentAssignee = (params) => {
    const isImageRow = params?.row?.groupName?.length === 1
    if (isImageRow) {
      const children = rows.filter((row) => row.parentId === params.row.id)
      if (!children.length) return params.row.currentAssignee || 'NIL'
      const first = children[0]?.currentAssignee || ''
      const allSame = children.every((row) => (row.currentAssignee || '') === first)
      if (!allSame) return 'Multiple'
      return first || 'NIL'
    }
    return params.row.currentAssignee || 'NIL'
  }

  const renderProposedAssignee = (params) => {
    let imgProposedAssignee = ''
    const rowNode = params.rowNode || { parent: null, children: [] }
    if (rowNode.parent === null && rowNode.children?.length) {
      const firstChildId = rowNode.children[0]
      const firstChild = rows.find((row) => row.id === firstChildId)
      const allMatch = rowNode.children.every((childId) => {
        const child = rows.find((row) => row.id === childId)
        return child?.proposedAssignee === firstChild?.proposedAssignee
      })
      imgProposedAssignee = allMatch ? firstChild?.proposedAssignee : 'Multiple'
    }

    const selectableAssignees = (assignees || []).filter((option) => option?.id && option.id !== 'Multiple')
    const applyAssignee = (nextValue) => {
      const proposedAssigneeValue = nextValue || ''
      if (isImageRow) {
        setRows((prev) =>
          prev.map((row) => {
            if (row.id === params.id || row.parentId === params.id) {
              return { ...row, proposedAssignee: proposedAssigneeValue }
            }
            return row
          }),
        )
        return
      }

      updateRows(params.id, (row) => ({ ...row, proposedAssignee: proposedAssigneeValue }))
      const parentId = params?.row?.parentId
      if (parentId === undefined || parentId === null) return
      setRows((prev) => {
        const next = prev.map((row) => {
          if (row.id === params.id) {
            return {
              ...row,
              proposedAssignee: proposedAssigneeValue,
            }
          }
          return row
        })
        const children = next.filter((row) => row.parentId === parentId)
        if (!children.length) return next
        const first = children[0]?.proposedAssignee
        const allSame = children.every((row) => row.proposedAssignee === first)
        return next.map((row) => {
          if (row.id === parentId) {
            return { ...row, proposedAssignee: allSame ? first : 'Multiple' }
          }
          return row
        })
      })
    }

    const isImageRow = params?.row?.groupName?.length === 1
    const currentValue = isImageRow
      ? imgProposedAssignee || params?.row?.proposedAssignee || params.value || ''
      : params?.row?.proposedAssignee || params.value || ''
    return (
      <TextField
        select
        size="small"
        fullWidth
        value={currentValue}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onChange={(event) => applyAssignee(event.target.value)}
        SelectProps={{
          displayEmpty: true,
          renderValue: (selected) => {
            if (!selected) return 'Proposed assignee'
            if (selected === 'Multiple') return 'Multiple'
            const matched = selectableAssignees.find((option) => option.id === selected)
            return matched?.name || selected
          },
        }}
        sx={{
          width: '100%',
          '& .MuiOutlinedInput-root': {
            height: 28,
            minHeight: 28,
            borderRadius: 999,
            backgroundColor: 'transparent',
            color: 'var(--text)',
          },
          '& .MuiSelect-select': {
            padding: '0 26px 0 10px !important',
            display: 'flex',
            alignItems: 'center',
            height: '28px',
            lineHeight: '28px',
            fontSize: 13,
          },
          '& .MuiSvgIcon-root': {
            color: 'var(--muted)',
          },
        }}
      >
        <MenuItem value="" sx={{ display: 'none' }} />
        {currentValue === 'Multiple' ? (
          <MenuItem value="Multiple" disabled>
            Multiple
          </MenuItem>
        ) : null}
        {selectableAssignees.map((option) => (
          <MenuItem key={option.id} value={option.id}>
            {option.name || option.id}
          </MenuItem>
        ))}
      </TextField>
    )
  }

  const renderPriority = (params) => {
    const options = ['Low', 'Medium', 'High']
    const isImageRow = params?.row?.groupName?.length === 1
    if (!isImageRow) return ''
    return (
      <TextField
        select
        size="small"
        fullWidth
        value={params.row.priority || ''}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onChange={(event) => updateRows(params.row.id, (row) => ({ ...row, priority: event.target.value }))}
        SelectProps={{
          displayEmpty: true,
          renderValue: (selected) => (selected ? selected : 'Priority'),
        }}
        sx={{
          width: '100%',
          '& .MuiOutlinedInput-root': {
            height: 28,
            minHeight: 28,
            borderRadius: 999,
            backgroundColor: 'transparent',
            color: 'var(--text)',
          },
          '& .MuiSelect-select': {
            padding: '0 26px 0 10px !important',
            display: 'flex',
            alignItems: 'center',
            height: '28px',
            lineHeight: '28px',
            fontSize: 13,
          },
          '& .MuiSvgIcon-root': {
            color: 'var(--muted)',
          },
        }}
      >
        <MenuItem value="" sx={{ display: 'none' }} />
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    )
  }

  const renderTTG = (params) => {
    const isImageRow = params?.row?.groupName?.length === 1
    if (!isImageRow) return null
    const isEnabled = actionsEnabled
    return (
      <Tooltip title={isEnabled ? '' : 'Enable actions to delete'}>
        <span className="tasking-manager__ttg">
          <Button
            className="tasking-manager__button tasking-manager__button--danger"
            size="small"
            variant={isEnabled ? 'outlined' : 'text'}
            disabled={!isEnabled}
            startIcon={isEnabled ? <DeleteOutlineIcon fontSize="small" /> : <LockOutlinedIcon fontSize="small" />}
            onClick={async () => {
              if (!isEnabled) return
              try {
                setError(null)
                await api.postDeleteImage({ 'SCVU Image ID': params.id })
                addNotification({
                  title: 'TTG deleted',
                  meta: 'Just now · Image removed',
                })
                setRefreshKey((prev) => prev + 1)
              } catch (err) {
                console.error('TTG delete failed', err)
                const message = getErrorMessage(err, 'Unable to delete TTG.')
                setError(message)
                addNotification({
                  title: 'TTG delete failed',
                  meta: 'Just now · Please try again',
                })
              }
            }}
          >
            Delete TTG
          </Button>
        </span>
      </Tooltip>
    )
  }

  const assignTasks = () => {
    const output = { Tasks: [] }
    const selectedRows = rows.filter((row) => selectionModel.ids.has(row.id))
    const tasksToAssign = []
    selectedRows.forEach((row) => {
      if (row.parentId) {
        tasksToAssign.push(row)
      } else {
        const childAreas = rows.filter((child) => child.parentId === row.id)
        tasksToAssign.push(...childAreas)
      }
    })
    tasksToAssign.forEach((task) => {
      const areaId = task.scvuImageAreaId || task.id
      let assigneeId = task.proposedAssignee
      if (typeof assigneeId === 'object' && assigneeId?.id) {
        assigneeId = assigneeId.id
      }
      if (areaId && assigneeId && assigneeId !== 'Multiple') {
        output.Tasks.push({ 'SCVU Image Area ID': areaId, Assignee: assigneeId })
      }
    })
    return output
  }

  const updateTaskingManager = () => {
    const output = {}
    rows
      .filter((row) => selectionModel.ids.has(row.id))
      .filter((row) => row.groupName?.length === 1)
      .forEach((row) => {
        output[row.id] = { Priority: row.priority }
      })
    return output
  }

  const postData = async () => {
    const tasksPayload = assignTasks()
    const prioritiesPayload = updateTaskingManager()
    const hasTasks = tasksPayload.Tasks.length > 0
    const hasPriority = Object.keys(prioritiesPayload).length > 0

    if (!hasTasks && !hasPriority) {
      addNotification({
        title: 'Nothing to update',
        meta: 'Select tasks or priorities first',
      })
      return
    }

    try {
      setError(null)
      if (hasTasks) {
        await api.postAssignTask(tasksPayload)
        localStorage.setItem('taskingSummaryRefresh', Date.now().toString())
      }

      if (hasPriority) {
        await api.postUpdateTaskingManagerData(prioritiesPayload)
      }

      if (hasTasks) {
        // Promote proposed assignments to current assignments after confirmation.
        setRows((prev) =>
          prev.map((row) => ({
            ...row,
            currentAssignee: row.proposedAssignee || '',
          })),
        )
      }

      const summaryParts = []
      if (hasTasks) summaryParts.push(`${tasksPayload.Tasks.length} tasks assigned`)
      if (hasPriority) summaryParts.push(`${Object.keys(prioritiesPayload).length} priorities updated`)
      addNotification({
        title: 'Tasking Manager updated',
        meta: `Just now · ${summaryParts.join(' · ')}`,
      })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      console.error('Tasking Manager update failed', err)
      const message = getErrorMessage(err, 'Unable to apply changes.')
      setError(message)
      addNotification({
        title: 'Update failed',
        meta: 'Just now · Please try again',
      })
    }
  }

  const handleCreateTTG = async () => {
    const payload = {
      imageFileName: formInput.imageFileName,
      sensorName: formInput.sensorName,
      uploadDate: toISOLocal(formInput.uploadDate),
      imageDateTime: toISOLocal(formInput.imageDateTime),
      areas: formInput.areas || [],
    }
    try {
      setError(null)
      await api.postInsertTTGData(payload)
      resetForm()
      setModalOpen(false)
      addNotification({
        title: 'TTG created',
        meta: `Just now · ${payload.areas.length} areas`,
      })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      console.error('TTG create failed', err)
      const message = getErrorMessage(err, 'Unable to create TTG.')
      setError(message)
      addNotification({
        title: 'TTG creation failed',
        meta: 'Just now · Please try again',
      })
    }
  }

  const role = UserService.readUserRoleSingle()
  if (role === 'II') {
    return <div className="tasking-manager__notice">You do not have permission to view this tab.</div>
  }

  const roundDownToHour = (value) => {
    if (!value || typeof value !== 'string') return value
    // Format: "YYYY-MM-DD, HH:MM:SS" → "YYYY-MM-DD, HH:00:00"
    return value.replace(/(\d{2}):\d{2}:\d{2}$/, '$1:00:00')
  }

  const shouldRoundTime = role === 'II' || role === 'Senior II'
  const dateFormatter = shouldRoundTime ? (value) => roundDownToHour(value) : undefined

  const columns = useMemo(
    () => [
      { field: 'sensorName', headerName: 'Sensor Name', minWidth: 140, flex: 0.7 },
      { field: 'imageDatetime', headerName: 'Image Datetime', minWidth: 170, flex: 0.9, valueFormatter: dateFormatter },
      {
        field: 'priority',
        headerName: 'Priority',
        minWidth: 130,
        flex: 0.7,
        renderCell: renderPriority,
      },
      {
        field: 'uploadDate',
        headerName: 'Upload Date',
        minWidth: 170,
        flex: 0.9,
        valueFormatter: dateFormatter,
      },
      {
        field: 'currentAssignee',
        headerName: 'Current Assignee',
        minWidth: 170,
        flex: 0.9,
        renderCell: renderCurrentAssignee,
      },
      {
        field: 'proposedAssignee',
        headerName: 'Proposed Assignee',
        minWidth: 170,
        flex: 0.9,
        renderCell: renderProposedAssignee,
      },
      {
        field: 'ttg',
        headerName: 'Action',
        minWidth: 140,
        flex: 0.7,
        renderCell: renderTTG,
      },
    ],
    [rows, assignees, actionsEnabled],
  )

  const getTreeDataPath = (row) => {
    if (row.treePath && Array.isArray(row.treePath)) {
      return row.treePath.filter((item) => item != null).map((item) => item?.toString() || '')
    }
    if (row.groupName && Array.isArray(row.groupName)) {
      const path = row.groupName.filter((item) => item != null).map((item) => item?.toString() || '')
      if (path.length === 1 && row.id !== undefined && row.id !== null) {
        return [`img_${row.id}`]
      }
      return path
    }
    return [row.id?.toString() || 'unknown']
  }

  const groupingColDef = {
    headerName: 'Image/Area Name',
    minWidth: 200,
    flex: 1.3,
    hideDescendantCount: true,
    valueGetter: (_value, row) => {
      const nameFromGroup =
        row?.groupName && Array.isArray(row.groupName) ? row.groupName[row.groupName.length - 1] : null
      return nameFromGroup || row?.areaName || row?.imageName || row?.id?.toString() || 'unknown'
    },
  }

  useEffect(() => {
    setFilterModel((prev) => ({
      ...prev,
      quickFilterValues: searchText ? [searchText] : [],
    }))
  }, [searchText])

  return (
    <div className="tasking-manager">
      <div className="content__topbar">
        <div className="content__heading">
          <div className="content__title">Tasking Manager</div>
          <div className="content__subtitle">Manage tasking priorities, assignees, and TTGs.</div>
        </div>
           <div className="content__controls">
          <div className="action-bar">
            <div className="search">
              <input
                type="text"
                placeholder="Search tasking manager"
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
      <div className="tasking-manager__actions">
        <div className="tasking-manager__actions-left">
       
          <Button className="tasking-manager__button" onClick={() => setModalOpen(true)}>
            Create TTG
          </Button>
          <Button
            className="tasking-manager__button"
            onClick={postData}
            disabled={!selectionModel.ids.size || hasEmptyAssignee}
          >
            Apply Change
          </Button>
        </div>
        <div className="tasking-manager__actions-right">
          <Button className="tasking-manager__button" onClick={() => setActionsEnabled((prev) => !prev)}>
            {actionsEnabled ? 'Disable Actions' : 'Enable Actions'}
          </Button>
        </div>
      </div>

      <div className="tasking-manager__grid">
        <DataGridPro
          treeData
          rows={rows}
          columns={columns}
          disableColumnResize
          getTreeDataPath={getTreeDataPath}
          groupingColDef={groupingColDef}
          filterModel={filterModel}
          onFilterModelChange={setFilterModel}
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={(model) => setSelectionModel(normalizeSelection(model))}
          checkboxSelectionVisibleOnly={false}
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
            '& .MuiDataGrid-cell .MuiAutocomplete-root': {
              width: '100%',
              alignSelf: 'center',
            },
            '& .MuiDataGrid-cell .MuiInputBase-root': {
              height: 30,
              minHeight: 30,
              fontSize: 13,
              color: 'var(--text)',
            },
            '& .MuiDataGrid-cell .MuiInputBase-input': {
              paddingTop: 0,
              paddingBottom: 0,
              textAlign: 'center',
              color: 'var(--text)',
            },
            '& .MuiDataGrid-cell .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--border-strong)',
            },
            '& .MuiDataGrid-cell .MuiAutocomplete-root, & .MuiDataGrid-cell .MuiTextField-root': {
              marginTop: 0,
              marginBottom: 0,
            },
            '& .MuiDataGrid-columnHeader[data-field="__tree_data_group__"] .MuiDataGrid-columnHeaderTitle': {
              paddingLeft: 0,
            },
            '& .MuiDataGrid-cell[data-field="__tree_data_group__"]': {
              paddingLeft: 0,
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
        <div className="tasking-manager__total-rows">
          <div className="tasking-manager__total-rows-left">
            {selectionModel.ids.size > 0 ? `${selectionModel.ids.size} row(s) selected` : ''}
          </div>
          <div className="tasking-manager__total-rows-right">Total Rows: {rows.length}</div>
        </div>
        {error && <div className="tasking-manager__error">{error}</div>}
      </div>

      <div className={`tasking-manager__modal ${modalOpen ? 'is-open' : ''}`}>
        <div className="tasking-manager__modal-backdrop" onClick={() => setModalOpen(false)} />
        <div className="tasking-manager__modal-content">
          <div className="tasking-manager__modal-header">
            <div className="tasking-manager__modal-title">Create TTG</div>
            <IconButton onClick={() => setModalOpen(false)} size="small">
              X
            </IconButton>
          </div>
          <div className="tasking-manager__modal-body">
            <TextField
              label="Sensor Name"
              value={formInput.sensorName}
              onChange={(event) => setFormInput((prev) => ({ ...prev, sensorName: event.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Image File Name"
              value={formInput.imageFileName}
              onChange={(event) => setFormInput((prev) => ({ ...prev, imageFileName: event.target.value }))}
              fullWidth
              size="small"
            />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Upload Date"
                value={formInput.uploadDate ? dayjs(formInput.uploadDate) : null}
                onChange={(value) =>
                  setFormInput((prev) => ({ ...prev, uploadDate: value ? value.toDate() : null }))
                }
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <DateTimePicker
                label="Image Datetime"
                value={formInput.imageDateTime ? dayjs(formInput.imageDateTime) : null}
                onChange={(value) =>
                  setFormInput((prev) => ({ ...prev, imageDateTime: value ? value.toDate() : null }))
                }
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </LocalizationProvider>
            <Autocomplete
              multiple
              freeSolo
              options={areaOptions}
              value={formInput.areas}
              onChange={(_, newValue) => setFormInput((prev) => ({ ...prev, areas: newValue }))}
              renderInput={(inputParams) => <TextField {...inputParams} label="Areas" size="small" fullWidth />}
            />
          </div>
          <div className="tasking-manager__modal-actions">
            <Button className="tasking-manager__button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="tasking-manager__button tasking-manager__button--primary"
              disabled={
                !formInput.sensorName ||
                !formInput.imageFileName ||
                !formInput.uploadDate ||
                !formInput.imageDateTime
              }
              onClick={handleCreateTTG}
            >
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskingManagerTab
