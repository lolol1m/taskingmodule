import { useState } from 'react'
import { Box, Button } from '@mui/material'
import DatePickerModal from '../../components/DatePicker.jsx'
import logo from '../../assets/xbi.png'
import layerIcon from '../../assets/layer.png'
import checkIcon from '../../assets/check.png'
import checkMarkIcon from '../../assets/check-mark.png'
import adminIcon from '../../assets/admin.png'
import settingIcon from '../../assets/gear.png'
import downArrow from '../../assets/down-arrow.png'
import exitIcon from '../../assets/exit.png'
import sunIcon from '../../assets/sun.png'
import nightIcon from '../../assets/dark-mode.png'
import './MainPage.css'

function MainPage() {
  const [open, setOpen] = useState(true)
  const [dateRange, setDateRange] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [adminOpen, setAdminOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

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
    setDateRange(range)
    setOpen(false)
  }

  return (
    <Box className={`app-shell ${isDarkMode ? '' : 'is-light'}`}>
      {!dateRange && <DatePickerModal open={open} onClose={() => setOpen(false)} onApply={handleApply} />}
      {dateRange && (
        <>
          <header className="app-header">
            <div className="app-header__left">
              <img src={logo} alt="XBI Logo" className="app-logo" />
              <span className="app-title">XBI</span>
            </div>
            <div className="app-header__right">
              <button className="icon-button" aria-label="Notifications">
                🔔
                <span className="icon-badge">3</span>
              </button>
            </div>
          </header>

          <main className={`layout ${isCollapsed ? 'is-collapsed' : ''}`}>
            <aside
              className="sidebar"
              style={{ width: isCollapsed ? '72px' : '290px' }}
            >
              <div className="sidebar__content">
                <div className="sidebar__section">
                  <div className="sidebar__title">
                    <button
                      className={`sidebar__collapse-toggle ${isCollapsed ? 'is-collapsed' : ''}`}
                      onClick={() => setIsCollapsed(!isCollapsed)}
                      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                      style={{ left: isCollapsed ? '0px' : '242px' }}
                    >
                      <img className="collapse-arrow" src={downArrow} alt="" />
                    </button>
                    <span className="sidebar__title-text">Navigation</span>
                  </div>
                  <button
                    className={`sidebar__item ${activeTab === 'summary' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('summary')}
                  >
                    <span className="sidebar__icon">
                      <img src={checkIcon} alt="" />
                    </span>
                    <span className="sidebar__text">Tasking Summary</span>
                  </button>
                  <button
                    className={`sidebar__item ${activeTab === 'completed' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                  >
                    <span className="sidebar__icon">
                      <img src={checkMarkIcon} alt="" />
                    </span>
                    <span className="sidebar__text">Completed Images</span>
                  </button>
                  <button
                    className={`sidebar__item ${activeTab === 'manager' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('manager')}
                  >
                    <span className="sidebar__icon">
                      <img src={layerIcon} alt="" />
                    </span>
                    <span className="sidebar__text">Tasking Manager</span>
                  </button>
                </div>

                <div className="sidebar__section">
                  <div className="sidebar__popover-wrap">
                    <button
                      className="sidebar__item sidebar__item--toggle"
                      onClick={() => setAdminOpen(!adminOpen)}
                      aria-expanded={adminOpen}
                    >
                      <span className="sidebar__icon">
                        <img src={adminIcon} alt="" />
                      </span>
                      <span className="sidebar__text">Admin</span>
                      <span className={`caret ${adminOpen ? 'is-open' : ''}`}>
                        <img className="caret-arrow" src={downArrow} alt="" />
                      </span>
                    </button>
                    <div className={`sidebar__group ${adminOpen && !isCollapsed ? 'is-open' : ''}`}>
                      <button
                        className={`sidebar__item sidebar__item--sub ${activeTab === 'admin-presence' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('admin-presence')}
                      >
                        <span className="sidebar__text">User Presence</span>
                      </button>
                      <button
                        className={`sidebar__item sidebar__item--sub ${activeTab === 'admin-opsv' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('admin-opsv')}
                      >
                        <span className="sidebar__text">Set OPS V</span>
                      </button>
                      <button
                        className={`sidebar__item sidebar__item--sub ${activeTab === 'admin-bin' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('admin-bin')}
                      >
                        <span className="sidebar__text">Generate Bin Count</span>
                      </button>
                      <button
                        className={`sidebar__item sidebar__item--sub ${activeTab === 'admin-sensor' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('admin-sensor')}
                      >
                        <span className="sidebar__text">Update Sensor Category</span>
                      </button>
                      <button
                        className={`sidebar__item sidebar__item--sub ${activeTab === 'admin-uploads' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('admin-uploads')}
                      >
                        <span className="sidebar__text">Uploads</span>
                      </button>
                      <button
                        className={`sidebar__item sidebar__item--sub ${activeTab === 'admin-create-user' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('admin-create-user')}
                      >
                        <span className="sidebar__text">Create User</span>
                      </button>
                    </div>
                    <div className="sidebar__popover sidebar__popover--admin">
                      <div className="sidebar__popover-title">Admin</div>
                      <button className="sidebar__popover-item">User Presence</button>
                      <button className="sidebar__popover-item">Set OPS V</button>
                      <button className="sidebar__popover-item">Generate Bin Count</button>
                      <button className="sidebar__popover-item">Update Sensor Category</button>
                      <button className="sidebar__popover-item">Uploads</button>
                      <button className="sidebar__popover-item">Create User</button>
                    </div>
                  </div>
                </div>
                <div className="sidebar__section sidebar__section--bottom">
                  <div className="sidebar__popover-wrap">
                    <button
                      className="sidebar__item sidebar__item--settings sidebar__item--toggle"
                      onClick={() => setSettingsOpen((prev) => !prev)}
                      aria-expanded={settingsOpen}
                    >
                      <span className="sidebar__icon">
                        <img src={settingIcon} alt="" />
                      </span>
                      <span className="sidebar__text">Settings</span>
                      <span className={`caret ${settingsOpen ? 'is-open' : ''}`}>
                        <img className="caret-arrow" src={downArrow} alt="" />
                      </span>
                    </button>
                    <div className="sidebar__popover sidebar__popover--settings">
                      <div className="sidebar__popover-title">Settings</div>
                      <button className="sidebar__popover-item">Help</button>
                      <button className="sidebar__popover-item">Change Password</button>
                      <button className="sidebar__popover-item">About</button>
                    </div>
                  </div>
                  <div className={`sidebar__settings ${settingsOpen && !isCollapsed ? 'is-open' : ''}`}>
                    <button className="sidebar__item sidebar__item--sub">Help</button>
                    <button className="sidebar__item sidebar__item--sub">Change Password</button>
                    <button className="sidebar__item sidebar__item--sub">About</button>
                  </div>
                  <button
                    className="sidebar__item sidebar__item--toggle-row"
                    onClick={() => setIsDarkMode((prev) => !prev)}
                    aria-pressed={!isDarkMode}
                  >
                    <span className="sidebar__icon">
                      <span className="mode-toggle mode-toggle--icon">
                        <img
                          className={`mode-icon mode-icon--sun ${isDarkMode ? '' : 'is-active'}`}
                          src={sunIcon}
                          alt=""
                        />
                        <img
                          className={`mode-icon mode-icon--night ${isDarkMode ? 'is-active' : ''}`}
                          src={nightIcon}
                          alt=""
                        />
                      </span>
                    </span>
                    <span className="sidebar__text">Light/Dark Mode</span>
                  </button>
                  <button className="sidebar__item sidebar__item--logout" onClick={handleLogout}>
                    <span className="sidebar__icon">
                      <img className="logout-icon" src={exitIcon} alt="" />
                    </span>
                    <span className="sidebar__text">Logout</span>
                  </button>
                </div>
              </div>
            </aside>

            <section className="content" />
          </main>
        </>
      )}
    </Box>
  )
}

export default MainPage
