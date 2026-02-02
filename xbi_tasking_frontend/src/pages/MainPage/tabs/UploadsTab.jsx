import { useRef, useState } from 'react'
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

function UploadsTab() {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [inputKey, setInputKey] = useState(0)
  const { addNotification } = useNotifications()
  const inputRef = useRef(null)

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name))
      const newFiles = files.filter((f) => !existingNames.has(f.name))
      return [...prev, ...newFiles]
    })
  }

  const removeFile = (fileName) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== fileName))
  }

  const clearAllFiles = () => {
    setSelectedFiles([])
    setInputKey((prev) => prev + 1)
  }

  const handleUpload = async () => {
    if (!selectedFiles.length) return

    setLoading(true)
    setUploadProgress(0)

    try {
      const results = []
      const total = selectedFiles.length
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const formData = new FormData()
        formData.append('file', file)
        if (file.name.toLowerCase().endsWith('.csv')) {
          await api.client({
            url: '/users/updateUsers',
            method: 'post',
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          results.push({ file: file.name, type: 'parade' })
        } else {
          const result = await api.insertDSTAData(formData)
          if (result?.success === false || result?.error) {
            throw new Error(result?.error || result?.message || 'Upload failed')
          }
          results.push({ file: file.name, type: 'json', result })
        }
        setUploadProgress(Math.round(((i + 1) / total) * 100))
      }

      const totals = results
        .filter((entry) => entry.type === 'json' && entry.result)
        .reduce(
          (acc, entry) => {
            acc.images += entry.result?.images_inserted || 0
            acc.areas += entry.result?.areas_inserted || 0
            return acc
          },
          { images: 0, areas: 0 },
        )
      const meta =
        totals.images || totals.areas
          ? `Just now · ${totals.images} images, ${totals.areas} areas`
          : 'Just now · Upload completed'
      addNotification({ title: 'Upload completed', meta })
      setSelectedFiles([])
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

  const jsonFiles = selectedFiles.filter((f) => getFileType(f.name) === 'json')
  const csvFiles = selectedFiles.filter((f) => getFileType(f.name) === 'csv')

  return (
    <div className="admin-tab uploads-tab">
      <div className="content__topbar">
        <div className="content__heading">
          <div className="content__title">Uploads</div>
          <div className="content__subtitle">Upload DSTA JSON files for tasking data and/or CSV files for parade state.</div>
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
              {loading ? 'Uploading...' : `Upload${selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ''}`}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="uploads-main">
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
            handleFiles(event.dataTransfer.files)
          }}
        >
          <img className="uploads-dropzone__icon" src="/src/assets/upload.png" alt="" />
          <div className="uploads-dropzone__text">
            <span className="uploads-dropzone__title">Drag & drop files here</span>
            <span className="uploads-dropzone__subtitle">or click to browse</span>
          </div>
          <div className="uploads-dropzone__types">
            <span className="uploads-type uploads-type--json">JSON</span>
            <span className="uploads-type uploads-type--csv">CSV</span>
          </div>
          <input
            ref={inputRef}
            className="uploads-dropzone__input"
            key={inputKey}
            type="file"
            multiple
            accept=".json,.csv,application/json,text/csv"
            onChange={(event) => handleFiles(event.target.files)}
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
            {/* JSON Tasking Group - Always visible */}
            <div className="uploads-group">
              <div className="uploads-group__label">
                <span className="uploads-type uploads-type--json">JSON</span>
                <span>Tasking ({jsonFiles.length})</span>
              </div>
              <div className="uploads-group__files">
                {jsonFiles.length > 0 ? (
                  jsonFiles.map((file) => (
                    <div className="uploads-file" key={file.name}>
                      <span className="uploads-file__name">{file.name}</span>
                      <span className="uploads-file__size">{formatFileSize(file.size)}</span>
                      <button
                        className="uploads-file__remove"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(file.name)
                        }}
                        type="button"
                        disabled={loading}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="uploads-group__empty">No JSON files selected</div>
                )}
              </div>
            </div>

            {/* CSV Parade State Group - Always visible */}
            <div className="uploads-group">
              <div className="uploads-group__label">
                <span className="uploads-type uploads-type--csv">CSV</span>
                <span>Parade State ({csvFiles.length})</span>
              </div>
              <div className="uploads-group__files">
                {csvFiles.length > 0 ? (
                  csvFiles.map((file) => (
                    <div className="uploads-file" key={file.name}>
                      <span className="uploads-file__name">{file.name}</span>
                      <span className="uploads-file__size">{formatFileSize(file.size)}</span>
                      <button
                        className="uploads-file__remove"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(file.name)
                        }}
                        type="button"
                        disabled={loading}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="uploads-group__empty">No CSV files selected</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadsTab
