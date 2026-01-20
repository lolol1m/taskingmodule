import { useState } from 'react'
import { Box, Button } from '@mui/material'
import DatePickerModal from '../components/DatePicker.jsx'
import logo from '../assets/xbi.png'
import layerIcon from '../assets/layer.png'
import checkIcon from '../assets/check.png'
import checkMarkIcon from '../assets/check-mark.png'
import settingIcon from '../assets/setting.png'
import downArrow from '../assets/down-arrow.png'

function MainPage() {
  const [open, setOpen] = useState(true)
  const [dateRange, setDateRange] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [adminOpen, setAdminOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')

  const handleApply = (range) => {
    setDateRange(range)
    setOpen(false)
  }

  return (
    <Box className="app-shell">
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
                  <button className="sidebar__item sidebar__item--toggle" onClick={() => setAdminOpen(!adminOpen)}>
                    <span className="sidebar__icon">
                      <img src={settingIcon} alt="" />
                    </span>
                    <span className="sidebar__text">Admin</span>
                    <span className={`caret ${adminOpen ? 'is-open' : ''}`}>
                      <img className="caret-arrow" src={downArrow} alt="" />
                    </span>
                  </button>
                  <div className={`sidebar__group ${adminOpen ? 'is-open' : ''}`}>
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
