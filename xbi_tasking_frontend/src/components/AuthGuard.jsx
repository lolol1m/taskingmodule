import { useEffect, useState } from 'react'
import { Box, Button, CircularProgress, Container, CssBaseline, Typography } from '@mui/material'
import { jwtDecode } from 'jwt-decode'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const storeTokensFromHash = () => {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null

  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  if (!accessToken) return null

  const refreshToken = params.get('refresh_token')
  const idToken = params.get('id_token')
  const username = params.get('username')

  localStorage.setItem('access_token', accessToken)
  if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
  if (idToken) localStorage.setItem('id_token', idToken)
  if (username) localStorage.setItem('username', username)

  window.history.replaceState(null, '', window.location.pathname)
  return { accessToken, refreshToken, idToken, username }
}

const applyToken = (token, refreshToken, idToken, fallbackUsername) => {
  try {
    const decoded = jwtDecode(token)
    const realmRoles = decoded.realm_access?.roles || []
    const clientId = decoded.azp || decoded.aud
    const resourceRoles = decoded.resource_access?.[clientId]?.roles || []
    const allRoles = [...realmRoles, ...resourceRoles]
    const tokenUsername = decoded.preferred_username || decoded.sub || fallbackUsername || 'user'

    localStorage.setItem(
      'user',
      JSON.stringify({
        username: tokenUsername,
        roles: allRoles,
      }),
    )

    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken)
    }
    if (idToken) {
      localStorage.setItem('id_token', idToken)
    }
    return true
  } catch (error) {
    console.error('Error decoding token:', error)
    return false
  }
}

const refreshTokens = async () => {
  const storedRefresh = localStorage.getItem('refresh_token')
  if (!storedRefresh) {
    return false
  }
  try {
    const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: storedRefresh }),
    })
    if (!response.ok) {
      return false
    }
    const data = await response.json()
    return applyToken(data.access_token, data.refresh_token || storedRefresh, data.id_token, null)
  } catch (error) {
    console.error('Error refreshing token:', error)
    return false
  }
}

function AuthGuard({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const errorParam = urlParams.get('error')
      if (errorParam) {
        setError(errorParam)
        setIsInitialized(true)
        setIsAuthenticated(false)
        window.history.replaceState(null, '', window.location.pathname)
        return
      }

      const tokens = storeTokensFromHash()
      if (tokens?.accessToken) {
        if (applyToken(tokens.accessToken, tokens.refreshToken, tokens.idToken, tokens.username)) {
          setIsInitialized(true)
          setIsAuthenticated(true)
          return
        }
      }

      const storedToken = localStorage.getItem('access_token')
      if (storedToken) {
        try {
          const decoded = jwtDecode(storedToken)
          const now = Math.floor(Date.now() / 1000)
          if (decoded.exp && decoded.exp < now) {
            const refreshed = await refreshTokens()
            if (!refreshed) {
              localStorage.removeItem('access_token')
              localStorage.removeItem('refresh_token')
              localStorage.removeItem('id_token')
              localStorage.removeItem('user')
              window.location.href = `${BACKEND_URL}/auth/login`
              return
            }
          } else {
            applyToken(storedToken, localStorage.getItem('refresh_token'), localStorage.getItem('id_token'))
          }
          setIsInitialized(true)
          setIsAuthenticated(true)
          return
        } catch (err) {
          console.error('Error validating stored token:', err)
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('id_token')
          localStorage.removeItem('user')
        }
      }

      setIsInitialized(true)
      setIsAuthenticated(false)
      window.location.href = `${BACKEND_URL}/auth/login`
    }

    checkAuth()
  }, [])

  if (!isInitialized) {
    return (
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box display="flex" flexDirection="column" alignItems="center" mt={8}>
          <CircularProgress />
          <Typography variant="h6" mt={2}>
            Authenticating...
          </Typography>
        </Box>
      </Container>
    )
  }

  if (!isAuthenticated) {
    if (error) {
      return (
        <Container component="main" maxWidth="xs">
          <CssBaseline />
          <Box display="flex" flexDirection="column" alignItems="center" mt={8} gap={2}>
            <Typography variant="h6">Authentication failed</Typography>
            <Typography variant="body2" color="text.secondary">
              Error: {error}
            </Typography>
            <Button variant="contained" onClick={() => (window.location.href = `${BACKEND_URL}/auth/login`)}>
              Try again
            </Button>
          </Box>
        </Container>
      )
    }

    return (
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box display="flex" flexDirection="column" alignItems="center" mt={8}>
          <CircularProgress />
          <Typography variant="h6" mt={2}>
            Redirecting to login...
          </Typography>
        </Box>
      </Container>
    )
  }

  return children
}

export default AuthGuard
