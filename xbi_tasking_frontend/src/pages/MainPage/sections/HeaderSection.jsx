import logo from '../../../assets/xbi.png'

function HeaderSection({ username }) {
  return (
    <header className="app-header">
      <div className="app-header__left">
        <img src={logo} alt="XBI Logo" className="app-logo" />
        <span className="app-title">XBI</span>
        {username && (
          <>
            <span className="app-title app-title--separator">·</span>
            <span className="app-title app-user">{username}</span>
          </>
        )}
      </div>
      <div className="app-header__right">
        <button className="icon-button" aria-label="Notifications">
          🔔
          <span className="icon-badge">3</span>
        </button>
      </div>
    </header>
  )
}

export default HeaderSection
