import { createContext, useMemo, useState } from 'react'

export const NotificationsContext = createContext(null)

const defaultNotifications = [
  {
    id: 'tasking-summary-update',
    title: 'Tasking Summary updated',
    meta: '2 min ago · 4 new items',
    read: false,
  },
  {
    id: 'upload-complete',
    title: 'Upload completed',
    meta: '10 min ago · parade_state.json',
    read: false,
  },
  {
    id: 'opsv-elevated',
    title: 'OPS V set to Elevated',
    meta: '1 hr ago · opslead',
    read: true,
  },
]

function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(defaultNotifications)

  const addNotification = (next) => {
    setNotifications((prev) => [
      { ...next, id: next.id || `${Date.now()}-${Math.random()}`, read: false },
      ...prev,
    ])
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
