import { createContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import API from '../../api/api.js'

export const NotificationsContext = createContext(null)

const DISMISSED_KEY = 'dismissed_notification_ids'

const readDismissedIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

const persistDismissedId = (id) => {
  const ids = readDismissedIds()
  ids.add(id)
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]))
  } catch { /* ignore */ }
}

const mergeNotifications = (current, incoming, dismissed) => {
  const byId = new Map(current.map((item) => [item.id, item]))
  incoming.forEach((item) => {
    if (!item?.id) return
    if (dismissed.has(item.id)) return
    if (!byId.has(item.id)) {
      byId.set(item.id, { ...item, read: !!item.read })
    }
  })
  return Array.from(byId.values())
}

function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const addNotification = (next) => {
    const notificationId = next?.id || `${Date.now()}-${Math.random()}`
    setNotifications((prev) => [
      { ...next, id: notificationId, read: false },
      ...prev,
    ])
    if (!next?.silent) {
      const content = (
        <div className="toast-notification">
          <div className="toast-notification__title">{next?.title}</div>
          {next?.meta ? <div className="toast-notification__meta">{next.meta}</div> : null}
        </div>
      )
      toast(content, {
        toastId: notificationId,
        className: 'toast-notification-shell',
        bodyClassName: 'toast-notification-body',
        progressClassName: 'toast-notification-progress',
      })
    }
  }

  const markRead = (id) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)))
  }

  const markAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
  }

  const removeNotification = (id) => {
    persistDismissedId(id)
    setNotifications((prev) => prev.filter((item) => item.id !== id))
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  useEffect(() => {
    const api = new API()
    let cancelled = false

    const loadNotifications = async () => {
      try {
        const response = await api.client.get('/notifications')
        const items = response?.data?.Notifications
        if (!cancelled && Array.isArray(items)) {
          const dismissed = readDismissedIds()
          setNotifications((prev) => mergeNotifications(prev, items, dismissed))
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Notification polling failed:', error)
        }
      }
    }

    loadNotifications()
    const intervalId = setInterval(loadNotifications, 30000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [])

  const value = useMemo(
    () => ({
      notifications,
      addNotification,
      markRead,
      markAllRead,
      removeNotification,
      clearNotifications,
    }),
    [notifications],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export default NotificationsProvider
