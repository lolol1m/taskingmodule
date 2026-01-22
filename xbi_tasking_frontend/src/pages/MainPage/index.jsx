import { useEffect, useState } from 'react'
import { Box } from '@mui/material'
import DatePickerModal from '../../components/DatePicker.jsx'
import ContentSection from './sections/ContentSection.jsx'
import HeaderSection from './sections/HeaderSection.jsx'
import SidebarSection from './sections/SidebarSection.jsx'
import useUsername from './hooks/useUsername.js'
import './styles/index.css'

function MainPage() {
  const [open, setOpen] = useState(true)
  const [dateRange, setDateRange] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [adminOpen, setAdminOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const username = useUsername()

  const handleLogout = () => {
    localStorage.removeItem('keycloak_token')
    localStorage.removeItem('username')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('id_token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('username')
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
    window.location.href = `${backendUrl}/auth/logout`
  }

  const handleApply = (range) => {
    setDateRange(formatDateRange(range))
    setOpen(false)
  }

  const formatDateRange = (range) => {
    if (!range || !Array.isArray(range) || !range[0] || !range[1]) {
      return null
    }

    const toISOLocal = (date) => {
      const d = new Date(date)
      const pad = (value) => String(value).padStart(2, '0')
      const ms = String(d.getMilliseconds()).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}Z`
    }

    return {
      'Start Date': toISOLocal(range[0].toDate ? range[0].toDate() : range[0]),
      'End Date': toISOLocal(range[1].toDate ? range[1].toDate() : range[1]),
    }
  }

  useEffect(() => {
    if (isCollapsed) {
      setAdminOpen(false)
      setSettingsOpen(false)
    }
  }, [isCollapsed])

  return (
    <Box className={`app-shell ${isDarkMode ? '' : 'is-light'}`}>
      <DatePickerModal open={open} onClose={() => setOpen(false)} onApply={handleApply} />
      {dateRange && (
        <>
          <HeaderSection username={username} />

          <main className={`layout ${isCollapsed ? 'is-collapsed' : ''}`}>
            <SidebarSection
              isCollapsed={isCollapsed}
              setIsCollapsed={setIsCollapsed}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              adminOpen={adminOpen}
              setAdminOpen={setAdminOpen}
              settingsOpen={settingsOpen}
              setSettingsOpen={setSettingsOpen}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              onLogout={handleLogout}
            />

            <ContentSection
              activeTab={activeTab}
              dateRange={dateRange}
              onOpenDatePicker={() => setOpen(true)}
              isCollapsed={isCollapsed}
            />
          </main>
        </>
      )}
    </Box>
  )
}

export default MainPage
