import { useEffect, useRef, useState } from 'react'
import { Button, LinearProgress } from '@mui/material'
import API from '../../../api/api'
import useNotifications from '../../../components/notifications/useNotifications.js'
import '../styles/UploadsTab.css'

const api = new API()

const getFileType = (fileName) => {
  const ext = fileName.toLowerCase().split('.').pop()
  if (ext === 'json') return 'json'
  if (ext === 'csv') return 'csv'
  return 'unknown'
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function UploadsTab({ userRole }) {
  const [taskFiles, setTaskFiles] = useState([])
  const [psFiles, setPsFiles] = useState([])
  const [activeSection, setActiveSection] = useState('tasks')
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [inputKey, setInputKey] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { addNotification } = useNotifications()
  const inputRef = useRef(null)
  useEffect(() => {
    document.body.classList.toggle('modal-blocked', confirmOpen)
    return () => {
      document.body.classList.remove('modal-blocked')
    }
  }, [confirmOpen])


  // Senior II and IA can upload parade state CSV
  const canUploadCSV = userRole === 'IA' || userRole === 'Senior II'
  const selectedFiles = activeSection === 'ps' ? psFiles : taskFiles

  useEffect(() => {
    if (!canUploadCSV && activeSection === 'ps') {
      setActiveSection('tasks')
    }
  }, [canUploadCSV, activeSection])

  const handleFiles = (fileList, section = activeSection) => {
    let files = Array.from(fileList || [])
    if (!files.length) return

    const expectedType = section === 'ps' ? 'csv' : 'json'
    if (section === 'ps' && !canUploadCSV) return
    files = files.filter((f) => getFileType(f.name) === expectedType)
    if (!files.length) return

    const setFiles = section === 'ps' ? setPsFiles : setTaskFiles
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name))
      const newFiles = files.filter((f) => !existingNames.has(f.name))
      return [...prev, ...newFiles]
    })
  }

  const removeFile = (fileName, section = activeSection) => {
    const setFiles = section === 'ps' ? setPsFiles : setTaskFiles
    setFiles((prev) => prev.filter((f) => f.name !== fileName))
  }

  const clearAllFiles = () => {
    if (activeSection === 'ps') {
      setPsFiles([])
    } else {
      setTaskFiles([])
    }
    setInputKey((prev) => prev + 1)
  }

  const startTaskUpload = async (autoAssign) => {
    if (!taskFiles.length) return

    setLoading(true)
    setUploadProgress(0)

    try {
      const results = []
      const uploadQueue = [...taskFiles]
      const total = uploadQueue.length
      for (let i = 0; i < uploadQueue.length; i++) {
        const file = uploadQueue[i]
        const formData = new FormData()
        formData.append('file', file)
        const result = await api.insertDSTAData(formData, autoAssign)
        if (result?.success === false || result?.error) {
          throw new Error(result?.error || result?.message || 'Upload failed')
        }
        results.push({ file: file.name, type: 'json', result })
        setUploadProgress(Math.round(((i + 1) / total) * 100))
      }

      const jsonResults = results.filter((entry) => entry.type === 'json' && entry.result)
      const totals = jsonResults
        .reduce(
          (acc, entry) => {
            acc.images += entry.result?.images_inserted || 0
            acc.areas += entry.result?.areas_inserted || 0
            return acc
          },
          { images: 0, areas: 0 },
        )
      const existingCount = jsonResults.reduce((acc, entry) => {
        const message = entry.result?.message || ''
        const match = message.match(/(\d+)\s+already existed/i)
        return acc + (match ? Number(match[1]) : 0)
      }, 0)
      const hasWarnings = jsonResults.some((entry) => (entry.result?.errors || []).length > 0)

      let meta = 'Just now · Upload completed'
      const metaParts = []
      if (totals.images || totals.areas) {
        metaParts.push(`${totals.images} images, ${totals.areas} areas`)
      }
      if (existingCount) {
        metaParts.push(`${existingCount} already existed`)
      }
      if (!metaParts.length) {
        metaParts.push('No new data (duplicates skipped)')
      }
      meta = `Just now · ${metaParts.join(', ')}`

      addNotification({ title: hasWarnings ? 'Upload completed with warnings' : 'Upload completed', meta })
      setTaskFiles([])
      setInputKey((prev) => prev + 1)
    } catch (error) {
      addNotification({
        title: 'Upload failed',
        meta: error?.response?.data?.detail || error?.message || 'Please try again',
      })
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const startPSUpload = async () => {
    if (!canUploadCSV || !psFiles.length) return

    setLoading(true)
    setUploadProgress(0)

    try {
      const total = psFiles.length
      for (let i = 0; i < psFiles.length; i++) {
        const file = psFiles[i]
        const formData = new FormData()
        formData.append('file', file)
        await api.client({
          url: '/users/updateUsers',
          method: 'post',
          data: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setUploadProgress(Math.round(((i + 1) / total) * 100))
      }
      addNotification({ title: 'Upload completed', meta: 'Just now · Parade state updated' })
      setPsFiles([])
      setInputKey((prev) => prev + 1)
    } catch (error) {
      addNotification({
        title: 'Upload failed',
        meta: error?.response?.data?.detail || error?.message || 'Please try again',
      })
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const handleUpload = () => {
    if (!selectedFiles.length) return
    if (activeSection === 'tasks') {
      setConfirmOpen(true)
      return
    }
    startPSUpload()
  }

  return (
    <div className="admin-tab uploads-tab">
      <div className="content__topbar">
        <div className="content__heading">
          <div className="content__title">Uploads</div>
          <div className="content__subtitle">
            {activeSection === 'tasks'
              ? 'Upload DSTA JSON files for tasking data.'
              : 'Upload Parade State CSV files.'}
          </div>
        </div>
        <div className="content__controls">
          <div className="action-bar">
            {selectedFiles.length > 0 && (
              <Button className="tasking-summary__button" onClick={clearAllFiles}>
                Clear All
              </Button>
            )}
            <Button
              className="tasking-summary__button"
              disabled={loading || selectedFiles.length === 0}
              onClick={handleUpload}
            >
              {loading
                ? 'Uploading...'
                : `${activeSection === 'tasks' ? 'Upload Tasks' : 'Upload PS'}${selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ''}`}
            </Button>
          </div>
        </div>
      </div>

      <div className="uploads-main">
        <div className="uploads-sections">
          <button
            type="button"
            className={`uploads-section-tab ${activeSection === 'tasks' ? 'is-active' : ''}`}
            onClick={() => setActiveSection('tasks')}
            disabled={loading}
          >
            Tasks
          </button>
          <button
            type="button"
            className={`uploads-section-tab ${activeSection === 'ps' ? 'is-active' : ''}`}
            onClick={() => setActiveSection('ps')}
            disabled={loading || !canUploadCSV}
            title={!canUploadCSV ? 'Only Senior II and IA can upload Parade State CSV' : 'Parade State uploads'}
          >
            Parade State
          </button>
        </div>

        {/* Dropzone */}
        <div
          className={`uploads-dropzone ${isDragging ? 'is-dragging' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            handleFiles(event.dataTransfer.files, activeSection)
          }}
        >
          <img className="uploads-dropzone__icon" src="/src/assets/upload.png" alt="" />
          <div className="uploads-dropzone__text">
            <span className="uploads-dropzone__title">
              Drag & drop {activeSection === 'tasks' ? 'task JSON' : 'PS CSV'} files here
            </span>
            <span className="uploads-dropzone__subtitle">or click to browse</span>
          </div>
          <div className="uploads-dropzone__types">
            {activeSection === 'tasks' ? (
              <span className="uploads-type uploads-type--json">JSON</span>
            ) : (
              <span className="uploads-type uploads-type--csv">CSV</span>
            )}
          </div>
          <input
            ref={inputRef}
            className="uploads-dropzone__input"
            key={inputKey}
            type="file"
            multiple
            accept={activeSection === 'tasks' ? '.json,application/json' : '.csv,text/csv'}
            onChange={(event) => handleFiles(event.target.files, activeSection)}
          />
        </div>

        {/* File List - Always visible */}
        <div className="uploads-files">
          <div className="uploads-files__header">
            <span className="uploads-files__title">Uploaded Files</span>
            {selectedFiles.length > 0 && (
              <span className="uploads-files__count">{selectedFiles.length}</span>
            )}
            {loading && (
              <div className="uploads-files__progress">
                <LinearProgress variant="determinate" value={uploadProgress} />
                <span>{uploadProgress}%</span>
              </div>
            )}
          </div>
          <div className="uploads-files__list">
            <div className="uploads-group">
              <div className="uploads-group__label">
                {activeSection === 'tasks' ? (
                  <span className="uploads-type uploads-type--json">JSON</span>
                ) : (
                  <span className="uploads-type uploads-type--csv">CSV</span>
                )}
                <span>
                  {activeSection === 'tasks' ? `Tasking (${taskFiles.length})` : `Parade State (${psFiles.length})`}
                </span>
              </div>
              <div className="uploads-group__files">
                {selectedFiles.length > 0 ? (
                  selectedFiles.map((file) => (
                    <div className="uploads-file" key={file.name}>
                      <span className="uploads-file__name">{file.name}</span>
                      <span className="uploads-file__size">{formatFileSize(file.size)}</span>
                      <button
                        className="uploads-file__remove"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(file.name, activeSection)
                        }}
                        type="button"
                        disabled={loading}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="uploads-group__empty">
                    {activeSection === 'tasks' ? 'No JSON files selected' : 'No CSV files selected'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`uploads-confirm ${confirmOpen ? 'is-open' : ''}`}>
        <div className="uploads-confirm__backdrop" />
        <div className="uploads-confirm__content">
          <button
            className="uploads-confirm__close"
            type="button"
            onClick={() => setConfirmOpen(false)}
            aria-label="Close"
          >
            <img src="/src/assets/close.png" alt="" />
          </button>
          <div className="uploads-confirm__header">
            <div className="uploads-confirm__icon">
              <img src="/src/assets/warning.png" alt="" />
            </div>
            <div>
              <div className="uploads-confirm__title">Apply auto assignment?</div>
              <div className="uploads-confirm__subtitle">
                Auto assignment will distribute newly uploaded tasks. You can also continue without auto assignment
                and manually assign later.
              </div>
            </div>
          </div>
          <div className="uploads-confirm__actions">
            <Button
              className="uploads-confirm__button uploads-confirm__button--ghost"
              onClick={() => {
                setConfirmOpen(false)
                startTaskUpload(false)
              }}
              disabled={loading}
            >
              No auto assignment
            </Button>
            <Button
              className="uploads-confirm__button uploads-confirm__button--primary"
              onClick={() => {
                setConfirmOpen(false)
                startTaskUpload(true)
              }}
              disabled={loading}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadsTab
