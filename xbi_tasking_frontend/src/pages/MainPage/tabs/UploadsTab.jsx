import { useState } from 'react'
import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import API from '../../../api/api'
import useNotifications from '../../../components/notifications/useNotifications.js'

const api = new API()

function UploadsTab() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ type: '', msg: '' })
  const [inputKey, setInputKey] = useState(0)
  const { addNotification } = useNotifications()

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
    setStatus({ type: '', msg: '' })
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setStatus({ type: 'error', msg: 'Please select a JSON file to upload.' })
      return
    }

    setLoading(true)
    setStatus({ type: '', msg: '' })

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      const result = await api.insertDSTAData(formData)

      if (result?.success === false || result?.error) {
        throw new Error(result?.error || result?.message || 'Upload failed')
      }

      const imagesInserted = result?.images_inserted
      const areasInserted = result?.areas_inserted
      const meta =
        imagesInserted != null && areasInserted != null
          ? `Just now · ${imagesInserted} images, ${areasInserted} areas`
          : 'Just now · Upload completed'

      addNotification({
        title: 'Upload completed',
        meta,
      })
      setStatus({ type: 'success', msg: result?.message || 'Upload completed successfully.' })
      setSelectedFile(null)
      setInputKey((prev) => prev + 1)
    } catch (error) {
      const message = error?.response?.data?.detail || error?.message || 'Upload failed'
      setStatus({ type: 'error', msg: message })
      addNotification({
        title: 'Upload failed',
        meta: 'Just now · Please try again',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 520,
          p: 4,
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--border-strong)',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
          <CloudUploadOutlinedIcon sx={{ color: 'var(--accent)', fontSize: 32 }} />
          <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600 }}>
            Upload DSTA JSON
          </Typography>
        </Box>

        {status.msg && (
          <Alert severity={status.type} sx={{ mb: 3 }}>
            {status.msg}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="outlined"
            component="label"
            sx={{
              borderColor: 'var(--border-strong)',
              color: 'var(--text)',
              '&:hover': { borderColor: 'var(--accent)' },
            }}
          >
            Select JSON File
            <input
              key={inputKey}
              hidden
              accept="application/json"
              type="file"
              onChange={handleFileChange}
            />
          </Button>
          <Typography variant="body2" sx={{ color: 'var(--muted)' }}>
            {selectedFile ? selectedFile.name : 'No file selected'}
          </Typography>
          <Button
            variant="contained"
            disabled={loading}
            onClick={handleUpload}
            sx={{
              mt: 1,
              py: 1.4,
              backgroundColor: 'var(--accent)',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'var(--accent)',
                filter: 'brightness(1.1)',
              },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'UPLOAD DATA'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default UploadsTab
