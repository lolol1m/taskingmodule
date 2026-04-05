import { useEffect, useMemo, useState } from 'react'
import { Autocomplete, Button, IconButton, MenuItem, TextField, Tooltip } from '@mui/material'
import { DataGridPro } from '@mui/x-data-grid-pro'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs from 'dayjs'
import editIcon from '../../../assets/edit.png'
import binIcon from '../../../assets/bin.png'
import API from '../../../api/api'
import UserService from '../../../auth/UserService'
import useNotifications from '../../../components/notifications/useNotifications.js'

const api = new API()
const MAX_DATE_RANGE_DAYS = 90

const getErrorMessage = (err, fallback = 'Something went wrong.') =>
  err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback

const TABLE_AUTO_REFRESH_MS = 5000

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

const extractAreaIdFromName = (value) => {
  if (!value || typeof value !== 'string') return null
  const match = value.match(/(?:^|[_\-\s])(\d+)\s*$/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
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

const normalizeAssigneeValue = (value) => {
  if (value === null || value === undefined) return ''
  const normalized = String(value).trim()
  if (!normalized) return ''
  if (normalized.toLowerCase() === 'unassigned' || normalized.toLowerCase() === 'nil') return ''
  return normalized
}

function TaskingManagerTab({ dateRange, title = 'Tasking Manager', subtitle = 'Manage tasking priorities, assignees, and TTGs.' }) {
  const [rows, setRows] = useState([])
  const [assignees, setAssignees] = useState([{ id: 'Multiple', name: 'Multiple' }])
  const [selectionModel, setSelectionModel] = useState(() => ({ type: 'include', ids: new Set() }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [hasPendingEdits, setHasPendingEdits] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterModel, setFilterModel] = useState({ items: [], quickFilterValues: [] })
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
    const passParentByImageId = new Map()
    const passParentRows = new Map()

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
        const currentAssigneeValue = normalizeAssigneeValue(readValue(entry, ['Assignee']))
        const proposedAssigneeValue = normalizeAssigneeValue(readValue(entry, ['Proposed Assignee']))

        const parentIdValue = readValue(entry, ['Parent ID', 'ParentID', 'parent_id'])
        const areaNameValue = readValue(entry, ['imgName', 'Img Name', 'Area Name', 'Area', 'Area_Name'])
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
          const parentImageId = parentId
          const parentName = normalizeImageName(
            readValue(parent, ['Image File Name', 'Image Filename', 'Image Name', 'Image ID', 'Sensor Name']) ||
              `Image_${parentId}`,
          )
          const mappedParentId = passParentByImageId.get(String(parentId)) ?? parentId
          const areaName = areaNameValue || `Area_${key}`
          const areaId = Number.isNaN(Number(key)) ? key : Number(key)
          const scvuImageAreaId = readValue(entry, ['SCVU Image Area ID']) || null
          const rawTaskStatus = readValue(entry, ['Task Status', 'taskStatus', 'task_status']) || null
          const taskStatus = rawTaskStatus ? String(rawTaskStatus).trim().toLowerCase() : null
          return {
            id: areaId,
            groupName: [parentName, areaName],
            treePath: [`pass_${parentName}_${mappedParentId}`, areaName],
            currentAssignee: currentAssigneeValue,
            proposedAssignee: proposedAssigneeValue,
            areaName,
            imgName: areaName,
            parentId: mappedParentId,
            parentImageId,
            scvuImageAreaId,
            imageName: null,
            imageDatetime: readValue(parent, ['Image Datetime', 'Image Date Time', 'Image DateTime']) || '—',
            sensorName: null,
            uploadDate: readValue(parent, ['Upload Date', 'UploadDate']) || '—',
            priority: readValue(entry, ['Priority', 'priority', 'Priority Level']) || '—',
            taskStatus,
            ttg: null,
          }
        }

        const imageFileName = imageFileNameValue || `Image_${key}`
        const imageId = Number.isNaN(Number(key)) ? key : Number(key)
        const existingParent = passParentRows.get(imageFileName)
        const parentRowId = existingParent?.id ?? imageId
        passParentByImageId.set(String(imageId), parentRowId)
        if (!existingParent) {
          const parentRow = {
            id: parentRowId,
            groupName: [imageFileName],
            treePath: [`pass_${imageFileName}_${parentRowId}`],
            currentAssignee: '',
            proposedAssignee: '',
            sensorName: readValue(entry, ['Sensor Name', 'Sensor']) || null,
            imageName: imageFileName,
            uploadDate: '—',
            imageDatetime: '—',
            priority: '—',
            ttg: readValue(entry, ['TTG']) ?? null,
            childImageIds: [imageId],
          }
          passParentRows.set(imageFileName, parentRow)
          return parentRow
        }
        existingParent.childImageIds = [...new Set([...(existingParent.childImageIds || []), imageId])]
        passParentRows.set(imageFileName, existingParent)
        return null
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
      const nextRows = formatData(data)
      setRows(nextRows)
      setHasPendingEdits(false)
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
    const timerId = window.setInterval(() => {
      if (!hasPendingEdits) {
        setRefreshKey((prev) => prev + 1)
      }
    }, TABLE_AUTO_REFRESH_MS)
    return () => window.clearInterval(timerId)
  }, [hasPendingEdits])

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

  const normalizedSelectedIds = useMemo(
    () => new Set(Array.from(selectionModel?.ids || []).map((id) => String(id))),
    [selectionModel],
  )

  const hasEmptyAssignee = useMemo(() => {
    if (!selectionModel.ids.size) return false
    return rows.some((row) => {
      if (!normalizedSelectedIds.has(String(row.id))) return false
      // Parent rows are display/group rows; validate only task (child) rows.
      if (!row?.parentId) return false
      const proposed = row.proposedAssignee
      const current = row.currentAssignee
      const resolved = proposed === null || proposed === undefined || proposed === '' ? current : proposed
      return resolved === null || resolved === undefined || resolved === '' || resolved === 'NIL'
    })
  }, [rows, selectionModel, normalizedSelectedIds])

  const renderCurrentAssignee = (params) => {
    const isImageRow = params?.row?.groupName?.length === 1
    if (isImageRow) {
      const parentKey = String(params?.row?.id)
      const children = rows.filter((row) => String(row.parentId) === parentKey)
      if (!children.length) return params.row.currentAssignee || 'NIL'
      const first = children[0]?.currentAssignee || ''
      const allSame = children.every((row) => (row.currentAssignee || '') === first)
      if (!allSame) return 'Multiple'
      return first || 'NIL'
    }
    return params.row.currentAssignee || 'NIL'
  }

  const renderProposedAssignee = (params) => {
    const isImageRow = params?.row?.groupName?.length === 1
    const selectableAssignees = (assignees || []).filter((option) => option?.id && option.id !== 'Multiple')
    const getAssigneeLabel = (value) => {
      if (!value) return '—'
      if (value === 'Multiple') return 'Multiple'
      const matched = selectableAssignees.find((option) => option.id === value)
      return matched?.name || value
    }
    if (isImageRow) return '—'

    // Lock assignee editing once a task has been started (anything past incomplete / not-started)
    const taskStatus = params?.row?.taskStatus
    const isAssigneeLocked = taskStatus && !['', 'incomplete'].includes(String(taskStatus).trim().toLowerCase())
    if (isAssigneeLocked) {
      const currentValue = params?.row?.currentAssignee || params?.row?.proposedAssignee || ''
      const statusLabel = String(taskStatus).trim()
      return (
        <Tooltip title={`Assignee cannot be changed — task is ${statusLabel}`}>
          <span style={{ fontSize: 13, color: 'var(--muted)', paddingLeft: 10, userSelect: 'none' }}>
            {getAssigneeLabel(currentValue) || '—'}
          </span>
        </Tooltip>
      )
    }

    const applyAssignee = (nextValue) => {
      const proposedAssigneeValue = nextValue || ''
      setHasPendingEdits(true)
      updateRows(params.id, (row) => ({ ...row, proposedAssignee: proposedAssigneeValue }))
    }

    const currentValue = params?.row?.proposedAssignee || params.value || ''
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
            return getAssigneeLabel(selected)
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
    const isChildRow = params?.row?.groupName?.length > 1
    if (!isChildRow) return '—'
    const currentValue = params?.row?.priority === '—' ? '' : params?.row?.priority || ''
    return (
      <TextField
        select
        size="small"
        fullWidth
        value={currentValue}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onChange={(event) => {
          const nextPriority = event.target.value || ''
          setHasPendingEdits(true)
          // Keep priority editing scoped to this child row's input.
          setRows((prev) =>
            prev.map((row) => {
              if (row.id === params.row.id) return { ...row, priority: nextPriority }
              return row
            }),
          )
        }}
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
    const resolveDeleteImageIds = () => {
      const row = params?.row || {}
      if (Array.isArray(row.childImageIds) && row.childImageIds.length) {
        return [...new Set(row.childImageIds)]
      }
      if (row.parentId !== null && row.parentId !== undefined && row.parentId !== '') {
        const parentRow = rows.find((candidate) => String(candidate.id) === String(row.parentId))
        if (Array.isArray(parentRow?.childImageIds) && parentRow.childImageIds.length) {
          return [...new Set(parentRow.childImageIds)]
        }
        return [row.parentId]
      }
      if (row.parentImageId !== null && row.parentImageId !== undefined && row.parentImageId !== '') {
        return [row.parentImageId]
      }
      return [params.id]
    }

    const isStatusDeletable = (status) => {
      if (!status) return true
      const s = String(status).trim().toLowerCase()
      return s === '' || s === 'incomplete'
    }

    const isChildRow = params?.row?.groupName?.length > 1
    let canDelete = true
    if (isChildRow) {
      canDelete = isStatusDeletable(params?.row?.taskStatus)
    } else {
      // Parent row: deletable only if every child task is incomplete / not started
      const children = rows.filter((r) => String(r.parentId) === String(params?.row?.id))
      canDelete = children.length === 0 || children.every((c) => isStatusDeletable(c.taskStatus))
    }
    const deleteTooltip = canDelete ? 'Delete' : 'Cannot delete — task has been started'

    return (
      <div className="tasking-manager__ttg-actions">
        <Tooltip title="Edit">
          <span className="tasking-manager__ttg">
            <Button
              className="tasking-manager__action-btn tasking-manager__action-btn--icon"
              size="small"
              aria-label="Edit"
              onClick={(event) => event.stopPropagation()}
            >
              <img src={editIcon} alt="" className="tasking-manager__action-icon" />
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={deleteTooltip}>
          <span className="tasking-manager__ttg">
            <Button
              className="tasking-manager__action-btn tasking-manager__action-btn--icon"
              size="small"
              aria-label="Delete"
              disabled={!canDelete}
              onClick={async () => {
                if (!canDelete) return
                try {
                  setError(null)
                  const deleteCount = isChildRow ? 1 : resolveDeleteImageIds().length
                  const shouldDelete = window.confirm(
                    `Delete ${deleteCount} ${isChildRow ? 'child row' : 'image(s)'}? This action cannot be undone.`,
                  )
                  if (!shouldDelete) return
                  if (isChildRow) {
                    const imageAreaId = params?.row?.scvuImageAreaId
                    if (!imageAreaId) {
                      addNotification({
                        title: 'Delete failed',
                        meta: 'Unable to resolve image area ID for this row',
                      })
                      return
                    }
                    await api.postDeleteImageArea({ 'SCVU Image Area ID': imageAreaId })
                  } else {
                    const imageIds = resolveDeleteImageIds()
                    if (!imageIds.length) {
                      addNotification({
                        title: 'Delete failed',
                        meta: 'Unable to resolve image ID for this row',
                      })
                      return
                    }
                    for (const imageId of imageIds) {
                      await api.postDeleteImage({ 'SCVU Image ID': imageId })
                    }
                  }
                  addNotification({
                    title: isChildRow ? 'Child row deleted' : 'TTG deleted',
                    meta: isChildRow ? 'Just now · 1 row removed' : `Just now · ${deleteCount} image(s) removed`,
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
              <img src={binIcon} alt="" className="tasking-manager__action-icon" />
            </Button>
          </span>
        </Tooltip>
      </div>
    )
  }

  const assignTasks = () => {
    const output = { Tasks: [] }
    const selectedRows = rows.filter((row) => normalizedSelectedIds.has(String(row.id)))
    const taskByAreaId = new Map()
    selectedRows.forEach((row) => {
      const isChildRow = row?.parentId !== undefined && row?.parentId !== null
      const candidates = isChildRow
        ? [row]
        : rows.filter((child) => String(child.parentId) === String(row.id))

      candidates.forEach((task) => {
        const areaId = task.scvuImageAreaId || task.id
        let assigneeId = task.proposedAssignee
        if (assigneeId === null || assigneeId === undefined || assigneeId === '') {
          assigneeId = task.currentAssignee
        }
        if (typeof assigneeId === 'object' && assigneeId?.id) {
          assigneeId = assigneeId.id
        }
        if (areaId && assigneeId && assigneeId !== 'Multiple' && assigneeId !== 'NIL') {
          taskByAreaId.set(String(areaId), { 'SCVU Image Area ID': areaId, Assignee: assigneeId })
        }
      })
    })
    output.Tasks = Array.from(taskByAreaId.values())
    return output
  }

  const updateTaskingManager = () => {
    const output = {}
    const validPriorities = new Set(['Low', 'Medium', 'High'])
    rows
      .filter((row) => normalizedSelectedIds.has(String(row.id)))
      .filter((row) => row.groupName?.length > 1)
      .forEach((row) => {
        const rawAreaId = row.scvuImageAreaId
        if (rawAreaId === undefined || rawAreaId === null || rawAreaId === '') return
        const imageAreaId = Number(rawAreaId)
        if (!Number.isFinite(imageAreaId)) return
        const normalizedPriority = row.priority === '—' ? '' : (row.priority || '')
        if (!validPriorities.has(normalizedPriority)) return
        output[imageAreaId] = { Priority: normalizedPriority }
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
      if (hasTasks) {
        await api.postAssignTask(tasksPayload)
        localStorage.setItem('taskingSummaryRefresh', Date.now().toString())
      }

      if (hasPriority) {
        await api.postUpdateTaskingManagerData(prioritiesPayload)
      }

      if (hasTasks) {
        const committedSet = new Set(tasksPayload.Tasks.map((task) => String(task['SCVU Image Area ID'])))
        // Promote proposed assignments to current assignments after confirmation.
        setRows((prev) =>
          prev.map((row) => {
            const areaId = row?.scvuImageAreaId
            const isCommittedRow =
              areaId !== null && areaId !== undefined && areaId !== '' && committedSet.has(String(areaId))
            if (!isCommittedRow) return row
            const nextCurrent =
              row.proposedAssignee === null || row.proposedAssignee === undefined || row.proposedAssignee === ''
                ? row.currentAssignee
                : row.proposedAssignee
            return {
              ...row,
              currentAssignee: nextCurrent,
              proposedAssignee: '',
            }
          }),
        )
      }
      setHasPendingEdits(false)

      const summaryParts = []
      if (hasTasks) summaryParts.push(`${tasksPayload.Tasks.length} tasks assigned`)
      if (hasPriority) summaryParts.push(`${Object.keys(prioritiesPayload).length} priorities updated`)
      addNotification({
        title: 'Tasking updated',
        meta: `Just now · ${summaryParts.join(' · ')}`,
      })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      console.error('Tasking Manager update failed', err)
      const message = getErrorMessage(err, 'Unable to apply changes.')
      addNotification({
        title: 'Update failed',
        meta: message,
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
  const canSeeSubImageName = role === 'IA'

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
        headerName: 'Actions',
        minWidth: 108,
        flex: 0.45,
        renderCell: renderTTG,
      },
    ],
    [rows, assignees],
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
    headerName: 'Pass ID/Image',
    minWidth: 200,
    flex: 1.3,
    hideDescendantCount: true,
    valueGetter: (_value, row) => {
      const nameFromGroup =
        row?.groupName && Array.isArray(row.groupName) ? row.groupName[row.groupName.length - 1] : null
      if (row?.parentId) {
        return row?.imgName || row?.areaName || nameFromGroup || ''
      }
      return nameFromGroup || row?.imageName || row?.id?.toString() || 'unknown'
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
          <div className="content__title">{title}</div>
          <div className="content__subtitle">{subtitle}</div>
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
      </div>

      <div className="tasking-manager__grid">
        <DataGridPro
          treeData
          rows={rows}
          columns={columns}
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
