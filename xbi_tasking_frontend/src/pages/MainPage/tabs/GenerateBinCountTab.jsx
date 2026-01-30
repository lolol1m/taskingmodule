import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, MenuItem, TextField, Typography } from '@mui/material'
import API from '../../../api/api'
import useNotifications from '../../../components/notifications/useNotifications.js'

const api = new API()

const getErrorMessage = (err, fallback = 'Something went wrong.') =>
  err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback

const formatDateValue = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-CA')
}

const parseFilename = (contentDisposition) => {
  if (!contentDisposition) return 'report.xlsx'
  const match = /filename="?([^"]+)"?/i.exec(contentDisposition)
  return match?.[1] || 'report.xlsx'
}

function GenerateBinCountTab({ dateRange, onOpenDatePicker }) {
  const [reportData, setReportData] = useState(null)
  const [sensorFilter, setSensorFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)
  const [lastRun, setLastRun] = useState(null)
  const { addNotification } = useNotifications()

  const fetchReport = useCallback(async () => {
    if (!dateRange) return
    try {
      setLoading(true)
      setError(null)
      const data = await api.getXbiReportData(dateRange)
      setReportData(data)
      setLastRun(new Date())
      if (data?.Category?.length) {
        setSensorFilter('ALL')
      }
    } catch (err) {
      console.error('Bin count fetch failed:', err)
      const message = getErrorMessage(err, 'Unable to load bin count report.')
      setError(message)
      addNotification({
        title: 'Generate bin count failed',
        meta: 'Just now · Please try again',
      })
    } finally {
      setLoading(false)
    }
  }, [dateRange, addNotification])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleDownload = async () => {
    if (!dateRange) return
    try {
      setDownloading(true)
      const response = await api.getXbiReportDataForExcel(dateRange)
      const blob = response.data
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = parseFilename(response?.headers?.['content-disposition'])
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      addNotification({
        title: 'Report downloaded',
        meta: 'Just now · Excel file saved',
      })
    } catch (err) {
      console.error('Bin count download failed:', err)
      const message = getErrorMessage(err, 'Unable to download report.')
      setError(message)
      addNotification({
        title: 'Download failed',
        meta: 'Just now · Please try again',
      })
    } finally {
      setDownloading(false)
    }
  }

  const { categories, exploitable, unexploitable } = useMemo(() => {
    const baseCategories = reportData?.Category || []
    const baseExploitable = reportData?.Exploitable || []
    const baseUnexploitable = reportData?.Unexploitable || []

    if (sensorFilter === 'ALL') {
      return {
        categories: baseCategories,
        exploitable: baseExploitable,
        unexploitable: baseUnexploitable,
      }
    }

    const index = baseCategories.findIndex((category) => category === sensorFilter)
    if (index === -1) {
      return { categories: [], exploitable: [], unexploitable: [] }
    }

    return {
      categories: [baseCategories[index]],
      exploitable: [baseExploitable[index]],
      unexploitable: [baseUnexploitable[index]],
    }
  }, [reportData, sensorFilter])

  const remarkText = reportData?.Remarks || '—'
  const startDate = formatDateValue(dateRange?.['Start Date'])
  const endDate = formatDateValue(dateRange?.['End Date'])

  return (
    <div className="admin-tab admin-bin">
      <div className="content__topbar">
        <div className="content__heading">
          <div className="content__title">Generate Bin Count</div>
          <div className="content__subtitle">Prepare daily bin count outputs for reporting.</div>
        </div>
        <div className="content__controls">
          <div className="action-bar">
            <Button className="tasking-summary__button" onClick={fetchReport} disabled={loading}>
              Generate
            </Button>
            <Button className="tasking-summary__button" onClick={onOpenDatePicker}>
              Change Display Date
            </Button>
            <Button
              className="tasking-summary__button"
              onClick={handleDownload}
              disabled={downloading || loading}
            >
              Download Excel
            </Button>
          </div>
        </div>
      </div>

      {error ? <Typography className="admin-tab__error">{error}</Typography> : null}

      <div className="content__panel admin-bin__panel">
        <div className="admin-bin__form">
          <TextField
            label="Target Date Range"
            value={`${startDate} → ${endDate}`}
            size="small"
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Sensor Filter"
            select
            value={sensorFilter}
            size="small"
            onChange={(event) => setSensorFilter(event.target.value)}
          >
            <MenuItem value="ALL">All sensors</MenuItem>
            {reportData?.Category?.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </TextField>
        </div>

        <div className="admin-bin__table-wrap">
          <table className="admin-bin__table">
            <thead>
              <tr>
                <th rowSpan={2}>Tasking</th>
                <th colSpan={categories.length || 1}>Exploitable</th>
                <th colSpan={categories.length || 1}>Unexploitable</th>
                <th rowSpan={2}>Remarks</th>
              </tr>
              <tr>
                {(categories.length ? categories : ['—']).map((category, index) => (
                  <th key={`exp-${category}-${index}`}>{category}</th>
                ))}
                {(categories.length ? categories : ['—']).map((category, index) => (
                  <th key={`unexp-${category}-${index}`}>{category}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Coverage</td>
                {(categories.length ? exploitable : [0]).map((value, index) => (
                  <td key={`cov-exp-${index}`}>{value ?? 0}</td>
                ))}
                {(categories.length ? unexploitable : [0]).map((value, index) => (
                  <td key={`cov-unexp-${index}`}>{value ?? 0}</td>
                ))}
                <td className="admin-bin__remarks">{remarkText}</td>
              </tr>
              <tr>
                <td>Total</td>
                {(categories.length ? exploitable : [0]).map((value, index) => (
                  <td key={`total-exp-${index}`}>{value ?? 0}</td>
                ))}
                {(categories.length ? unexploitable : [0]).map((value, index) => (
                  <td key={`total-unexp-${index}`}>{value ?? 0}</td>
                ))}
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>

        {lastRun ? (
          <div className="admin-bin__note">Last run: {lastRun.toLocaleString()}</div>
        ) : (
          <div className="admin-bin__note">Run a report to see results.</div>
        )}
      </div>
    </div>
  )
}

export default GenerateBinCountTab
