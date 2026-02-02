import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  MenuItem,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  PersonAddAlt1 as PersonAddIcon, 
  Badge as BadgeIcon,
  Lock as LockIcon 
} from '@mui/icons-material';
import API from '../../../api/api'
import useNotifications from '../../../components/notifications/useNotifications.js'

const api = new API()


const CreateUserTab = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'II',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const { addNotification } = useNotifications()

  const roles = [
    { value: 'II', label: 'II' },

    { value: 'Senior II', label: 'Senior II' },
        { value: 'IA', label: ' IA' },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      const response = await api.createUser(formData);
      setStatus({ type: 'success', msg: response?.message || 'User created successfully!' });
      setFormData({ username: '', password: '', role: 'II' });
      addNotification({
        title: 'User created',
        meta: `Just now · ${formData.username} (${formData.role})`,
      })
    } catch (err) {
      const message = err.response?.data?.detail || err.response?.data?.message || 'Failed to create user';
      setStatus({ type: 'error', msg: message });
      addNotification({
        title: 'User creation failed',
        meta: 'Just now · Please try again',
      })
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 450,
          p: 4,
          backgroundColor: 'var(--panel)', 
          border: '1px solid var(--border-strong)',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
          <PersonAddIcon sx={{ color: 'var(--accent)', fontSize: 32 }} />
          <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600 }}>
            Create New User
          </Typography>
        </Box>

        {status.msg && (
          <Alert severity={status.type} sx={{ mb: 3 }}>
            {status.msg}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>
            USERNAME
          </Typography>
          <TextField
            fullWidth
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="e.g. jdoe_admin"
            variant="outlined"
            required
            autoComplete='new-username'
            sx={inputStyles}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BadgeIcon sx={{ fontSize: 20, color: 'var(--muted)' }} />
                </InputAdornment>
              ),
            }}
          />

          <Typography variant="caption" sx={{ mt: 3, mb: 1, display: 'block' }}>
            PASSWORD
          </Typography>
          <TextField
            fullWidth
            name="password"
            autoComplete='new-password'
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
  
            onChange={handleChange}
            placeholder="••••••••"
            variant="outlined"
            required
            sx={inputStyles}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ fontSize: 20, color: 'var(--muted)' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff sx={{ color: 'var(--muted)' }} /> : <Visibility sx={{ color: 'var(--muted)' }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Typography variant="caption" sx={{ color: 'var(--muted)', mt: 3, mb: 1, display: 'block' }}>
            ASSIGN ROLE
          </Typography>
          <TextField
            select
            fullWidth
            name="role"
            value={formData.role}
            onChange={handleChange}
            variant="outlined"
            sx={inputStyles}
          >
            {roles.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <Button
            fullWidth
            type="submit"
            disabled={loading}
            variant="contained"
            sx={{
              mt: 4,
              py: 1.5,
              backgroundColor: 'var(--accent)',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'var(--accent)',
                filter: 'brightness(1.1)',
              },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'CREATE USER'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

const inputStyles = {
  mb: 2,
  '& .MuiOutlinedInput-root': {

    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  
    color: 'var(--text)',
    '& fieldset': { borderColor: 'var(--border-strong)' },
    '&:hover fieldset': { borderColor: 'var(--muted)' },
    '&.Mui-focused fieldset': { borderColor: 'var(--accent)' },
  },
  '& .MuiInputBase-input::placeholder': {
    color: 'var(--muted)',
    opacity: 0.6,
  },
  

};

export default CreateUserTab;
