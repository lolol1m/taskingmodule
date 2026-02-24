import { createContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import API from '../../api/api.js'

export const NotificationsContext = createContext(null)

const mergeNotifications = (current, incoming) => {
  const byId = new Map(current.map((item) => [item.id, item]))
  incoming.forEach((item) => {
    if (!item?.id) return
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

  const clearNotifications = () => {
    setNotifications([])
  }

  useEffect(() => {
    const enablePolling = import.meta.env.VITE_NOTIFICATIONS_POLLING === 'true'
    if (!enablePolling) return

    const api = new API()
    let cancelled = false

    const loadNotifications = async () => {
      try {
        const response = await api.client.get('/notifications')
        const items = response?.data?.Notifications
        if (!cancelled && Array.isArray(items)) {
          setNotifications((prev) => mergeNotifications(prev, items))
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
      clearNotifications,
    }),
    [notifications],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export default NotificationsProvider
