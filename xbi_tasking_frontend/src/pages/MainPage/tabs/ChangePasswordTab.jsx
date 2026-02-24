import { useState, useEffect } from 'react'
import { Button, Autocomplete, TextField } from '@mui/material'
import API from '../../../api/api.js'
import useNotifications from '../../../components/notifications/useNotifications.js'
import infoIcon from '../../../assets/info.png'
import '../styles/ChangePasswordTab.css'

const api = new API()

function ChangePasswordTab({ userRole }) {
  const isAdmin = userRole === 'IA'

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [loading, setLoading] = useState(false)
  const { addNotification } = useNotifications()

  // Admin reset state
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [adminNewPassword, setAdminNewPassword] = useState('')
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('')
  const [showAdminPasswords, setShowAdminPasswords] = useState({ new: false, confirm: false })
  const [adminLoading, setAdminLoading] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      api.getUsers().then((data) => {
        setUsers(data.Users || [])
      }).catch((err) => {
        console.error('Failed to load users:', err)
      })
    }
  }, [isAdmin])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] })
  }

  const validateForm = () => {
    if (!formData.currentPassword.trim()) {
      addNotification({ title: 'Validation error', meta: 'Current password is required' })
      return false
    }
    if (!formData.newPassword.trim()) {
      addNotification({ title: 'Validation error', meta: 'New password is required' })
      return false
    }
    if (formData.newPassword.length < 8) {
      addNotification({ title: 'Validation error', meta: 'New password must be at least 8 characters' })
      return false
    }
    if (formData.newPassword !== formData.confirmPassword) {
      addNotification({ title: 'Validation error', meta: 'Passwords do not match' })
      return false
    }
    if (formData.currentPassword === formData.newPassword) {
      addNotification({ title: 'Validation error', meta: 'New password must be different from current password' })
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)

    try {
      await api.changePassword(formData.currentPassword, formData.newPassword)
      addNotification({
        title: 'Password changed',
        meta: 'Your password has been updated successfully',
      })
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Please try again'
      addNotification({
        title: 'Password change failed',
        meta: errorMsg,
      })
    } finally {
      setLoading(false)
    }
  }

  const validateAdminForm = () => {
    if (!selectedUser) {
      addNotification({ title: 'Validation error', meta: 'Please select a user' })
      return false
    }
    if (!adminNewPassword.trim()) {
      addNotification({ title: 'Validation error', meta: 'New password is required' })
      return false
    }
    if (adminNewPassword.length < 8) {
      addNotification({ title: 'Validation error', meta: 'New password must be at least 8 characters' })
      return false
    }
    if (adminNewPassword !== adminConfirmPassword) {
      addNotification({ title: 'Validation error', meta: 'Passwords do not match' })
      return false
    }
    return true
  }

  const handleAdminReset = async (e) => {
    e.preventDefault()
    if (!validateAdminForm()) return

    setAdminLoading(true)

    try {
      await api.adminResetPassword(selectedUser.name, adminNewPassword)
      addNotification({
        title: 'Password reset',
        meta: `Password has been reset for ${selectedUser.name}`,
      })
      setSelectedUser(null)
      setAdminNewPassword('')
      setAdminConfirmPassword('')
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Please try again'
      addNotification({
        title: 'Password reset failed',
        meta: errorMsg,
      })
    } finally {
      setAdminLoading(false)
    }
  }

  return (
    <div className="admin-tab change-password-tab">
      <div className="content__topbar">
        <div className="content__heading">
          <div className="content__title">Change Password</div>
          <div className="content__subtitle">Update your account password for security.</div>
        </div>
      </div>

      <div className="change-password__container">
        {!isAdmin && (
          <div className="change-password__card">
            <div className="change-password__card-header">
              <svg className="change-password__card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <div className="change-password__card-title">Update Password</div>
            </div>

            <form onSubmit={handleSubmit} className="change-password__form">
              <div className="change-password__field">
                <label className="change-password__label">Current Password</label>
                <div className="change-password__input-wrap">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="change-password__input"
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="change-password__toggle"
                    onClick={() => togglePasswordVisibility('current')}
                    tabIndex={-1}
                  >
                    {showPasswords.current ? (
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

              <div className="change-password__field">
                <label className="change-password__label">New Password</label>
                <div className="change-password__input-wrap">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="change-password__input"
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="change-password__toggle"
                    onClick={() => togglePasswordVisibility('new')}
                    tabIndex={-1}
                  >
                    {showPasswords.new ? (
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

              <div className="change-password__field">
                <label className="change-password__label">Confirm New Password</label>
                <div className="change-password__input-wrap">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="change-password__input"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="change-password__toggle"
                    onClick={() => togglePasswordVisibility('confirm')}
                    tabIndex={-1}
                  >
                    {showPasswords.confirm ? (
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

              <Button
                type="submit"
                className="change-password__button"
                variant="contained"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>

            <div className="change-password__info">
              <img className="change-password__info-icon" src={infoIcon} alt="Info" />
              <div className="change-password__info-text">
                <strong>Password Requirements:</strong>
                <ul>
                  <li>At least 8 characters long</li>
                  <li>Include uppercase and lowercase letters</li>
                  <li>Include at least one number</li>
                  <li>Include at least one special character</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="change-password__card change-password__card--admin">
            <div className="change-password__card-header">
              <svg className="change-password__card-icon change-password__card-icon--admin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <div className="change-password__card-title">Admin Password Reset</div>
              <span className="change-password__admin-badge">IA Only</span>
            </div>

            <p className="change-password__description">
              Reset the password for any user without requiring their current password.
            </p>

            <form onSubmit={handleAdminReset} className="change-password__form">
              <div className="change-password__field">
                <label className="change-password__label">Select User</label>
                <Autocomplete
                  options={users}
                  getOptionLabel={(option) => option.name || ''}
                  value={selectedUser}
                  onChange={(_, newValue) => setSelectedUser(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search users..."
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'var(--panel-2)',
                          borderRadius: '8px',
                          '& fieldset': { borderColor: 'var(--border-strong)' },
                          '&:hover fieldset': { borderColor: 'var(--border-strong)' },
                          '&.Mui-focused fieldset': { borderColor: 'var(--accent)' },
                        },
                        '& .MuiInputBase-input': { color: 'var(--text)', fontSize: '14px' },
                      }}
                    />
                  )}
                  size="small"
                  fullWidth
                  ListboxProps={{
                    sx: {
                      maxHeight: 200,
                      overflow: 'auto',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(255, 255, 255, 0.7) transparent',
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(255, 255, 255, 0.7)',
                        borderRadius: '999px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: 'rgba(255, 255, 255, 0.9)',
                      },
                    },
                  }}
                />
              </div>

              <div className="change-password__field">
                <label className="change-password__label">New Password</label>
                <div className="change-password__input-wrap">
                  <input
                    type={showAdminPasswords.new ? 'text' : 'password'}
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    className="change-password__input"
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="change-password__toggle"
                    onClick={() => setShowAdminPasswords({ ...showAdminPasswords, new: !showAdminPasswords.new })}
                    tabIndex={-1}
                  >
                    {showAdminPasswords.new ? (
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

              <div className="change-password__field">
                <label className="change-password__label">Confirm New Password</label>
                <div className="change-password__input-wrap">
                  <input
                    type={showAdminPasswords.confirm ? 'text' : 'password'}
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    className="change-password__input"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="change-password__toggle"
                    onClick={() => setShowAdminPasswords({ ...showAdminPasswords, confirm: !showAdminPasswords.confirm })}
                    tabIndex={-1}
                  >
                    {showAdminPasswords.confirm ? (
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

              <Button
                type="submit"
                className="change-password__button change-password__button--admin"
                variant="contained"
                disabled={adminLoading}
              >
                {adminLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>

            <div className="change-password__info">
              <img className="change-password__info-icon" src={infoIcon} alt="Info" />
              <div className="change-password__info-text">
                <strong>Password Requirements:</strong>
                <ul>
                  <li>At least 8 characters long</li>
                  <li>Include uppercase and lowercase letters</li>
                  <li>Include at least one number</li>
                  <li>Include at least one special character</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChangePasswordTab
