import { useEffect, useMemo, useRef, useState } from 'react'
import useNotifications from './useNotifications.js'
import notificationIcon from '../../assets/notification.png'

const formatTimestamp = (id) => {
  if (!id) return ''
  const ts = typeof id === 'string' ? id.split('-')[0] : id
  const parsed = Number(ts)
  if (!Number.isFinite(parsed) || parsed < 1e12) return ''
  const date = new Date(parsed)
  if (Number.isNaN(date.getTime())) return ''
  const day = date.getDate()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()} · ${hours}:${minutes}`
}

const getDateLabel = (id) => {
  const ts = typeof id === 'string' ? id.split('-')[0] : id
  const parsed = Number(ts)
  if (!Number.isFinite(parsed) || parsed < 1e12) return null
  const date = new Date(parsed)
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (itemDate.getTime() === today.getTime()) return 'Today'
  if (itemDate.getTime() === yesterday.getTime()) return 'Yesterday'
  const day = date.getDate()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function NotificationsPanel() {
  const { notifications, markAllRead, markRead, removeNotification } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const toggleRef = useRef(null)

  const unreadCount = notifications.filter((item) => !item.read).length

  const grouped = useMemo(() => {
    const groups = []
    let currentLabel = null
    notifications.forEach((item) => {
      const label = getDateLabel(item.id) || 'Older'
      if (label !== currentLabel) {
        currentLabel = label
        groups.push({ label, items: [] })
      }
      groups[groups.length - 1].items.push(item)
    })
    return groups
  }, [notifications])

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
          <div className="notification-panel__header-text">
            <span className="notification-panel__title">Notifications</span>
            <span className="notification-panel__subtitle">
              {unreadCount > 0
                ? `You have ${unreadCount} notification${unreadCount !== 1 ? 's' : ''} today.`
                : 'You are all caught up.'}
            </span>
          </div>
          <button
            className="notification-panel__close"
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="notification-panel__body">
          {notifications.length ? (
            grouped.map((group) => (
              <div className="notification-group" key={group.label}>
                <div className="notification-group__label">
                  {group.label}
                  {group.label === 'Today' || group.label === 'Yesterday' ? null : null}
                </div>
                {group.items.map((item) => {
                  const isReported = item?.title === 'IIR Reported' || item?.title === 'SF Reported'
                  return (
                    <div
                      className={`notification-item${item.read ? '' : ' notification-item--unread'}${isReported ? ' notification-item--reported' : ''}`}
                      key={item.id}
                      onClick={() => markRead(item.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') markRead(item.id)
                      }}
                    >
                      <div className={`notification-item__icon${isReported ? ' notification-item__icon--reported' : ''}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                      </div>
                      <div className="notification-item__content">
                        <div className={`notification-item__title${isReported ? ' notification-item__title--reported' : ''}`}>
                          {item.title}
                        </div>
                        <div className="notification-item__meta">{item.meta}</div>
                        <div className="notification-item__time">{formatTimestamp(item.id)}</div>
                      </div>
                      <button
                        className="notification-item__delete"
                        type="button"
                        aria-label="Delete notification"
                        onClick={(event) => {
                          event.stopPropagation()
                          removeNotification(item.id)
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            ))
          ) : (
            <div className="notification-panel__empty">
              <div className="notification-panel__empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div className="notification-panel__empty-title">No new notifications</div>
              <div className="notification-panel__empty-meta">You are all caught up.</div>
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="notification-panel__footer">
            <button className="notification-panel__footer-btn" type="button" onClick={markAllRead}>
              Mark all as read
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsPanel
