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

const getTokenExpiryMs = (token) => {
  try {
    const decoded = jwtDecode(token)
    return decoded?.exp ? decoded.exp * 1000 : null
  } catch (error) {
    console.error('Error decoding token expiry:', error)
    return null
  }
}

const isTokenExpired = (token, skewSeconds = 30) => {
  const expiryMs = getTokenExpiryMs(token)
  if (!expiryMs) return true
  return expiryMs <= Date.now() + skewSeconds * 1000
}

const applyToken = (token, refreshToken, idToken, fallbackUsername) => {
  try {
    const decoded = jwtDecode(token)
    if (decoded?.exp && decoded.exp * 1000 <= Date.now() + 5000) {
      return false
    }
    const realmRoles = decoded.realm_access?.roles || []
    const clientId = decoded.azp || decoded.aud
    const resourceRoles = decoded.resource_access?.[clientId]?.roles || []
    const allRoles = [...realmRoles, ...resourceRoles]
    const tokenUsername = decoded.preferred_username || decoded.sub || fallbackUsername || 'user'
    const hasAdminRole =
      allRoles.includes('admin') || allRoles.includes('Admin') || allRoles.includes('ADMIN')
    const hasIARole =
      allRoles.includes('IA') || allRoles.includes('ia') || tokenUsername.toLowerCase().includes('iauser')

    localStorage.setItem('access_token', token)
    localStorage.setItem(
      'user',
      JSON.stringify({
        username: tokenUsername,
        roles: allRoles,
        isAdmin: hasAdminRole,
        isIA: hasIARole,
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
    if (!data?.access_token) {
      return false
    }
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
    let expiryTimeoutId
    let refreshTimeoutId

    const clearAuthTokens = () => {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('id_token')
      localStorage.removeItem('user')
      localStorage.removeItem('username')
    }

    const redirectToLogin = () => {
      clearAuthTokens()
      window.location.href = `${BACKEND_URL}/auth/login`
    }

    const scheduleExpiryRedirect = (token) => {
      if (!token) return
      const expiryMs = getTokenExpiryMs(token)
      if (!expiryMs) return
      const msUntilExpiry = expiryMs - Date.now()
      if (msUntilExpiry <= 0) {
        redirectToLogin()
        return
      }
      expiryTimeoutId = window.setTimeout(() => {
        redirectToLogin()
      }, msUntilExpiry)
    }

    const scheduleTokenRefresh = (token) => {
      if (!token) return
      const expiryMs = getTokenExpiryMs(token)
      if (!expiryMs) return
      const bufferMs = 60 * 1000
      const msUntilRefresh = expiryMs - Date.now() - bufferMs
      if (refreshTimeoutId) clearTimeout(refreshTimeoutId)
      refreshTimeoutId = window.setTimeout(async () => {
        const refreshed = await refreshTokens()
        if (!refreshed) {
          redirectToLogin()
          return
        }
        const newToken = localStorage.getItem('access_token')
        scheduleTokenRefresh(newToken)
        scheduleExpiryRedirect(newToken)
      }, Math.max(msUntilRefresh, 0))
    }

    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const errorParam = urlParams.get('error')
      if (errorParam) {
        console.error('Authentication error:', errorParam)
        alert(`Authentication failed: ${errorParam}. Please check the backend console for details.`)
        clearAuthTokens()
        setError(errorParam)
        setIsInitialized(true)
        setIsAuthenticated(false)
        window.history.replaceState(null, '', window.location.pathname)
        redirectToLogin()
        return
      }

      const tokens = storeTokensFromHash()
      if (tokens?.accessToken) {
        if (applyToken(tokens.accessToken, tokens.refreshToken, tokens.idToken, tokens.username)) {
          scheduleExpiryRedirect(tokens.accessToken)
          scheduleTokenRefresh(tokens.accessToken)
          setIsInitialized(true)
          setIsAuthenticated(true)
          return
        }
      }

      const storedToken = localStorage.getItem('access_token')
      if (storedToken) {
        if (isTokenExpired(storedToken)) {
          const refreshed = await refreshTokens()
          if (!refreshed) {
            redirectToLogin()
            return
          }
        } else if (!applyToken(storedToken, localStorage.getItem('refresh_token'), localStorage.getItem('id_token'))) {
          clearAuthTokens()
          redirectToLogin()
          return
        }

        const newToken = localStorage.getItem('access_token')
        scheduleExpiryRedirect(newToken)
        scheduleTokenRefresh(newToken)
        setIsInitialized(true)
        setIsAuthenticated(true)
        return
      }

      const storedRefresh = localStorage.getItem('refresh_token')
      if (storedRefresh) {
        const refreshed = await refreshTokens()
        if (!refreshed) {
          redirectToLogin()
          return
        }
        const newToken = localStorage.getItem('access_token')
        scheduleExpiryRedirect(newToken)
        scheduleTokenRefresh(newToken)
        setIsInitialized(true)
        setIsAuthenticated(true)
        return
      }

      setIsInitialized(true)
      setIsAuthenticated(false)
      redirectToLogin()
    }

    checkAuth()

    return () => {
      if (expiryTimeoutId) {
        clearTimeout(expiryTimeoutId)
      }
      if (refreshTimeoutId) {
        clearTimeout(refreshTimeoutId)
      }
    }
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
