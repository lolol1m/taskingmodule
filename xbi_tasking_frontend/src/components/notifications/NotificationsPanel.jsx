import { useEffect, useRef, useState } from 'react'
import useNotifications from './useNotifications.js'
import notificationIcon from '../../assets/notification.png'

function NotificationsPanel() {
  const { notifications, markAllRead, markRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const toggleRef = useRef(null)

  const unreadCount = notifications.filter((item) => !item.read).length

  useEffect(() => {
    const handleClick = (event) => {
      if (!open) return
      const panelEl = panelRef.current
      const toggleEl = toggleRef.current
      if (panelEl?.contains(event.target) || toggleEl?.contains(event.target)) {
        return
      }
      setOpen(false)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open])

  return (
    <div className="notification-shell">
      <button
        ref={toggleRef}
        className="icon-button is-clickable"
        aria-label="Notifications"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((prev) => !prev)
        }}
      >
        <img className="notification-icon" src={notificationIcon} alt="" />
        {unreadCount ? <span className="icon-badge">{unreadCount}</span> : null}
      </button>
      <div ref={panelRef} className={`notification-panel ${open ? '' : 'is-hidden'}`}>
        <div className="notification-panel__header">
          <span>Notifications</span>
          <button className="link-button is-clickable" onClick={markAllRead} type="button">
            Mark all read
          </button>
        </div>
        {notifications.length ? (
          notifications.map((item) => (
            <div
              className="notification-item"
              key={item.id}
              onClick={() => markRead(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  markRead(item.id)
                }
              }}
            >
              <div className="notification-item__title">{item.title}</div>
              <div className="notification-item__meta">{item.meta}</div>
            </div>
          ))
        ) : (
          <div className="notification-item">
            <div className="notification-item__title">No new notifications</div>
            <div className="notification-item__meta">You are all caught up.</div>
          </div>
        )}
        <button className="notification-panel__footer is-clickable" type="button">
          View all
        </button>
      </div>
    </div>
  )
}

export default NotificationsPanel
