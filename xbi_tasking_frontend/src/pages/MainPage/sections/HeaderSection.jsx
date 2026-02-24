import logo from '../../../assets/xbi.png'
import NotificationsPanel from '../../../components/notifications/NotificationsPanel.jsx'

function HeaderSection({ username }) {
  return (
    <header className="app-header">
      <div className="app-header__left">
        <img src={logo} alt="XBI Logo" className="app-logo" />
        <span className="app-title">XBI</span>
  
      </div>
      <div className="app-header__right">
        {username && (
          <>
            <span className="app-title app-user">{username}</span>
          </>
        )}
        <NotificationsPanel />
      </div>
    </header>
  )
}

export default HeaderSection
