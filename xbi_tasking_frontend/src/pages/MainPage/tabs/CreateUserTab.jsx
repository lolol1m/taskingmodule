import { useState } from 'react'
import { Button } from '@mui/material'
import API from '../../../api/api'
import useNotifications from '../../../components/notifications/useNotifications.js'
import '../styles/CreateUserTab.css'

const api = new API()

const roles = [
  { value: 'II', label: 'II', badge: 'II', description: 'Basic image interpreter' },
  { value: 'Senior II', label: 'Senior II', badge: 'Sr II', description: 'Senior interpreter with admin access' },
  { value: 'IA', label: 'IA', badge: 'IA', description: 'Image analyst with admin access' },
]

function CreateUserTab() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'II',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { addNotification } = useNotifications()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.username.trim() || !formData.password.trim()) {
      addNotification({
        title: 'Validation error',
        meta: 'Username and password are required',
      })
      return
    }

    setLoading(true)

    try {
      await api.createUser(formData)
      addNotification({
        title: 'User created',
        meta: `Just now · ${formData.username} (${formData.role})`,
      })
      setFormData({ username: '', password: '', role: 'II' })
    } catch (err) {
      const message = err.response?.data?.detail || err.response?.data?.message || 'Failed to create user'
      addNotification({
        title: 'User creation failed',
        meta: message,
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedRole = roles.find((r) => r.value === formData.role)

  return (
    <div className="admin-tab create-user-tab">
      <div className="content__topbar">
        <div className="content__heading">
          <div className="content__title">Create User</div>
          <div className="content__subtitle">Add a new user to the system with Keycloak authentication.</div>
        </div>
      </div>

      <div className="create-user__container">
        <form className="create-user__form" onSubmit={handleSubmit}>
          {/* Username Field */}
          <div className="create-user__field">
            <label className="create-user__label" htmlFor="username">
              Username
            </label>
            <div className="create-user__input-wrap">
              <svg className="create-user__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="username"
                name="username"
                type="text"
                className="create-user__input"
                placeholder="Enter username"
                value={formData.username}
                onChange={handleChange}
                autoComplete="off"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="create-user__field">
            <label className="create-user__label" htmlFor="password">
              Password
            </label>
            <div className="create-user__input-wrap">
              <svg className="create-user__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="create-user__input"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="create-user__toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Role Selection */}
          <div className="create-user__field">
            <label className="create-user__label">Role</label>
            <div className="create-user__roles">
              {roles.map((role) => (
                <label
                  key={role.value}
                  className={`create-user__role ${formData.role === role.value ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={formData.role === role.value}
                    onChange={handleChange}
                    className="create-user__role-input"
                  />
                  <span className="create-user__role-indicator" />
                  <div className="create-user__role-content">
                    <span className="create-user__role-name">{role.label}</span>
                    <span className="create-user__role-desc">{role.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="create-user__submit"
            disabled={loading}
            variant="contained"
          >
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </form>

        {/* Info Panel */}
        <div className="create-user__info">
          <div className="create-user__info-title">Role Permissions</div>
          <div className="create-user__info-content">
            <div className="create-user__info-role">
              <span className="create-user__info-badge">{selectedRole?.badge}</span>
              <span className="create-user__info-desc">{selectedRole?.description}</span>
            </div>
            <div className="create-user__info-permissions">
              <div className="create-user__info-heading">Access includes:</div>
              {formData.role === 'II' && (
                <ul className="create-user__info-list">
                  <li>View Tasking Summary</li>
                  <li>View Completed Images</li>
                  <li>Start and complete assigned tasks</li>
                </ul>
              )}
              {formData.role === 'Senior II' && (
                <ul className="create-user__info-list">
                  <li>All II permissions</li>
                  <li>Access Tasking Manager</li>
                  <li>Verify tasks (pass/fail)</li>
                  <li>Admin panel (uploads only)</li>
                </ul>
              )}
              {formData.role === 'IA' && (
                <ul className="create-user__info-list">
                  <li>All Senior II permissions</li>
                  <li>Create new users</li>
                  <li>Full system administration</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateUserTab
