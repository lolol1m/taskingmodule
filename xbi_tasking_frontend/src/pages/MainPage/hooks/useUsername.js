import { useEffect, useState } from 'react'

function useUsername() {
  const [username, setUsername] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedUsername = localStorage.getItem('username')

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        if (parsedUser?.username) {
          setUsername(parsedUser.username)
          return
        }
      } catch (error) {
        console.error('Error parsing stored user:', error)
      }
    }

    if (storedUsername) {
      setUsername(storedUsername)
    }
  }, [])

  return username
}

export default useUsername
