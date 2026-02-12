import { useEffect, useRef, useState } from 'react'
import adminIcon from '../../../assets/admin.png'
import addUserIcon from '../../../assets/add-user.png'
import checkMarkIcon from '../../../assets/check-mark.png'
import checkIcon from '../../../assets/check.png'
import downArrow from '../../../assets/down-arrow.png'
import exitIcon from '../../../assets/exit.png'
import layerIcon from '../../../assets/layer.png'
import layoutIcon from '../../../assets/layouting.png'
import nightIcon from '../../../assets/dark-mode.png'
import reportIcon from '../../../assets/report.png'
import sensorIcon from '../../../assets/sensor.png'
import settingIcon from '../../../assets/gear.png'
import sunIcon from '../../../assets/sun.png'
import uploadIcon from '../../../assets/upload_2.png'
import logoIcon from '../../../assets/xbi.png'

function SidebarSection({
  isCollapsed,
  setIsCollapsed,
  activeTab,
  setActiveTab,
  settingsOpen,
  setSettingsOpen,
  isDarkMode,
  setIsDarkMode,
  onLogout,
  userRole,
  username,
}) {
  // II role has limited access - no Tasking Manager or Admin
  const isBasicUser = userRole === 'II'
  // Only IA can create users
  const canCreateUsers = userRole === 'IA'
  const settingsButtonRef = useRef(null)
  const settingsPopoverRef = useRef(null)
  const settingsCloseTimerRef = useRef(null)
  const [settingsPopoverStyle, setSettingsPopoverStyle] = useState(null)
  const clearSettingsCloseTimer = () => {
    if (settingsCloseTimerRef.current) {
      clearTimeout(settingsCloseTimerRef.current)
      settingsCloseTimerRef.current = null
    }
  }
  const openSettingsPopover = () => {
    if (!isCollapsed) {
      return
    }
    clearSettingsCloseTimer()
    setSettingsOpen(true)
  }
  const closeSettingsPopoverWithDelay = () => {
    if (!isCollapsed) {
      return
    }
    clearSettingsCloseTimer()
    settingsCloseTimerRef.current = setTimeout(() => {
      setSettingsOpen(false)
      settingsCloseTimerRef.current = null
    }, 180)
  }
  const handleSettingsToggle = () => {
    if (isCollapsed) {
      return
    }
    setSettingsOpen((prev) => !prev)
  }

  useEffect(() => () => clearSettingsCloseTimer(), [])

  useEffect(() => {
    if (!isCollapsed || !settingsOpen) {
      return
    }

    const updatePopoverPosition = () => {
      if (!settingsButtonRef.current) {
        return
      }

      const rect = settingsButtonRef.current.getBoundingClientRect()
      setSettingsPopoverStyle({
        position: 'fixed',
        left: `${rect.right + 12}px`,
        top: `${rect.top + rect.height * 0.4}px`,
        transform: 'translateY(-35%)',
        zIndex: 3000,
      })
    }

    updatePopoverPosition()
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)

    return () => {
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [isCollapsed, settingsOpen])

  useEffect(() => {
    if (!isCollapsed || !settingsOpen) {
      return
    }

    const handleOutsideClick = (event) => {
      if (
        settingsButtonRef.current?.contains(event.target) ||
        settingsPopoverRef.current?.contains(event.target)
      ) {
        return
      }
      setSettingsOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isCollapsed, settingsOpen, setSettingsOpen])

  return (
    <aside className="sidebar" style={{ width: isCollapsed ? '68px' : '272px' }}>
      <div className="sidebar__content">
        <div className="sidebar__brand">
          <img className="sidebar__brand-logo" src={logoIcon} alt="Tasking Module logo" />
          <div className="sidebar__brand-meta">
            <div className="sidebar__brand-title">Tasking Module</div>
            <div className="sidebar__brand-id">ID: {username || '-'}</div>
          </div>
          <button
            className={`sidebar__collapse-toggle ${isCollapsed ? 'is-collapsed' : ''}`}
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            <img className="collapse-arrow" src={layoutIcon} alt="" />
          </button>
        </div>

        <div className="sidebar__section">
          <div className="sidebar__title">
            <span className="sidebar__title-text">Home</span>
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
          {!isBasicUser && (
            <button
              className={`sidebar__item ${activeTab === 'manager' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('manager')}
            >
              <span className="sidebar__icon">
                <img src={layerIcon} alt="" />
              </span>
              <span className="sidebar__text">Tasking Manager</span>
            </button>
          )}
        </div>

        {!isBasicUser && (
          <div className="sidebar__section">
            <div className="sidebar__title">
              <span className="sidebar__title-text">Admin</span>
            </div>
            <button
              className={`sidebar__item ${activeTab === 'admin-presence' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('admin-presence')}
            >
              <span className="sidebar__icon">
                <img src={checkIcon} alt="" />
              </span>
              <span className="sidebar__text">User Presence</span>
            </button>
            <button
              className={`sidebar__item ${activeTab === 'admin-opsv' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('admin-opsv')}
            >
              <span className="sidebar__icon">
                <img src={adminIcon} alt="" />
              </span>
              <span className="sidebar__text">Set OPS V</span>
            </button>
            <button
              className={`sidebar__item ${activeTab === 'admin-bin' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('admin-bin')}
            >
              <span className="sidebar__icon">
                <img src={reportIcon} alt="" />
              </span>
              <span className="sidebar__text">Generate Bin Count</span>
            </button>
            <button
              className={`sidebar__item ${activeTab === 'admin-sensor' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('admin-sensor')}
            >
              <span className="sidebar__icon">
                <img src={sensorIcon} alt="" />
              </span>
              <span className="sidebar__text">Update Sensor Category</span>
            </button>
            <button
              className={`sidebar__item ${activeTab === 'admin-uploads' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('admin-uploads')}
            >
              <span className="sidebar__icon">
                <img src={uploadIcon} alt="" />
              </span>
              <span className="sidebar__text">Uploads</span>
            </button>
            {canCreateUsers && (
              <button
                className={`sidebar__item ${activeTab === 'admin-create-user' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('admin-create-user')}
              >
                <span className="sidebar__icon">
                  <img src={addUserIcon} alt="" />
                </span>
                <span className="sidebar__text">Create User</span>
              </button>
            )}
          </div>
        )}
        <div className="sidebar__section sidebar__section--bottom">
          <div
            className={`sidebar__popover-wrap ${settingsOpen ? 'is-open' : ''}`}
            onMouseEnter={openSettingsPopover}
            onMouseLeave={closeSettingsPopoverWithDelay}
          >
            <button
              ref={settingsButtonRef}
              className="sidebar__item sidebar__item--settings sidebar__item--toggle"
              onClick={handleSettingsToggle}
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
            <div
              ref={settingsPopoverRef}
              className={`sidebar__popover sidebar__popover--settings ${settingsOpen && isCollapsed ? 'is-open' : ''}`}
              style={isCollapsed && settingsOpen ? settingsPopoverStyle || undefined : undefined}
              onMouseEnter={openSettingsPopover}
              onMouseLeave={closeSettingsPopoverWithDelay}
            >
              <div className="sidebar__popover-title">Settings</div>
              <button className="sidebar__popover-item">Help</button>
              <button className={`sidebar__popover-item${activeTab === 'settings-password' ? '-active' : ''}`} onClick={() => setActiveTab('settings-password')}>Change Password</button>
              <button className="sidebar__popover-item">About</button>
            </div>
          </div>
          <div className={`sidebar__settings ${settingsOpen && !isCollapsed ? 'is-open' : ''}`}>
            <button className="sidebar__item sidebar__item--sub">Help</button>
            <button
              className={`sidebar__item sidebar__item--sub ${activeTab === 'settings-password' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('settings-password')}
            >
              Change Password
            </button>
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
          <button className="sidebar__item sidebar__item--logout" onClick={onLogout}>
            <span className="sidebar__icon">
              <img className="logout-icon" src={exitIcon} alt="" />
            </span>
            <span className="sidebar__text">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

export default SidebarSection
