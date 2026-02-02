import adminIcon from '../../../assets/admin.png'
import checkMarkIcon from '../../../assets/check-mark.png'
import checkIcon from '../../../assets/check.png'
import downArrow from '../../../assets/down-arrow.png'
import exitIcon from '../../../assets/exit.png'
import layerIcon from '../../../assets/layer.png'
import nightIcon from '../../../assets/dark-mode.png'
import settingIcon from '../../../assets/gear.png'
import sunIcon from '../../../assets/sun.png'
import useActiveIndicator from '../hooks/useActiveIndicator.js'

function SidebarSection({
  isCollapsed,
  setIsCollapsed,
  activeTab,
  setActiveTab,
  adminOpen,
  setAdminOpen,
  settingsOpen,
  setSettingsOpen,
  isDarkMode,
  setIsDarkMode,
  onLogout,
  userRole,
}) {
  // II role has limited access - no Tasking Manager or Admin
  const isBasicUser = userRole === 'II'
  const { navRef, indicatorStyle } = useActiveIndicator({
    activeTab,
    isCollapsed,
    adminOpen,
    settingsOpen,
  })

  return (
    <aside className="sidebar" style={{ width: isCollapsed ? '72px' : '290px' }}>
      <div className="sidebar__content" ref={navRef}>

        {(adminOpen || !isCollapsed) && <span className="sidebar__active-indicator" style={indicatorStyle} />}
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
            <div className="sidebar__popover-wrap">
              <button
                className={`sidebar__item sidebar__item--toggle ${activeTab.includes("admin") && !adminOpen && "is-active"}`}
                onClick={() => {if(!isCollapsed){
  setAdminOpen(!adminOpen)
                }
                  
                  }}
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
                <button className={`sidebar__popover-item${activeTab === 'admin-presence' ? '-active' : ''}`} onClick={() => setActiveTab("admin-presence")}>User Presence</button>
                <button className={`sidebar__popover-item${activeTab === 'admin-opsv' ? '-active' : ''}`}onClick={() => setActiveTab("admin-opsv")}>Set OPS V</button>
                <button className={`sidebar__popover-item${activeTab === 'admin-bin' ? '-active' : ''}`} onClick={() => setActiveTab("admin-bin")}>Generate Bin Count</button>
                <button className={`sidebar__popover-item${activeTab === 'admin-sensor' ? '-active' : ''}`} onClick={() => setActiveTab("admin-sensor")}>Update Sensor Category</button>
                <button className={`sidebar__popover-item${activeTab === 'admin-uploads' ? '-active' : ''}`} onClick={() => setActiveTab("admin-uploads")}>Uploads</button>
                <button className={`sidebar__popover-item${activeTab === 'admin-create-user' ? '-active' : ''}`} onClick={() => setActiveTab("admin-create-user")}>Create User</button>
              </div>
            </div>
          </div>
        )}
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
