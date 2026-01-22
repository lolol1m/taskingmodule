import { useEffect, useRef, useState } from 'react'

function useActiveIndicator({ activeTab, isCollapsed, adminOpen, settingsOpen }) {
  const navRef = useRef(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ opacity: 0, top: 0, height: 0 })

  useEffect(() => {
    const updateIndicator = () => {
      if (!navRef.current) {
        return
      }

      const activeItem = navRef.current.querySelector('.sidebar__item.is-active')
      if (!activeItem) {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }))
        return
      }

      const containerRect = navRef.current.getBoundingClientRect()
      const activeRect = activeItem.getBoundingClientRect()
      const top = activeRect.top - containerRect.top + 8
      const height = Math.max(6, activeRect.height - 16)

      setIndicatorStyle({ top, height, opacity: 1 })
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)

    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeTab, isCollapsed, adminOpen, settingsOpen])

  return { navRef, indicatorStyle }
}

export default useActiveIndicator
