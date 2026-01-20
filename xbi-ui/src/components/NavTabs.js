import { useState, useEffect } from 'react'
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import { Link } from "react-router-dom";
import logo from "../assets/xbi.png";


function LinkTab(props) {
  return (
    <Tab
      component={Link}
      {...props}
    />
  );
}

const NavTabs = ({ tabs, currentTab, handleChange }) => {

  // Get username from localStorage, sessionStorage, or Keycloak
  let username = 'User';
  try {
    // Try localStorage first (persists across sessions)
    let storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      // Fallback to sessionStorage
      storedUsername = sessionStorage.getItem('username');
    }
    if (storedUsername) {
      username = storedUsername.replaceAll(`"`, ``);
    } else {
      // Try to get from user object in localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          username = user.username || 'User';
        } catch (e) {
          console.error('Error parsing user info:', e);
        }
      }
    }
  } catch (e) {
    console.error('Error getting username:', e);
  }

  const handleLogout = () => {
    // Clear all stored tokens
    localStorage.removeItem('keycloak_token');
    localStorage.removeItem('username');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    
    // Redirect to backend logout endpoint which handles Keycloak logout
    window.location.href = `${process.env.REACT_APP_DB_API_URL || 'http://localhost:5000'}/auth/logout`;
  };

  return (

    <Box className='navTabs' sx={{ width: '100%' }}>
      <nav className="navbar">
        <div>
        <img src={logo} className='logo' alt="XBI Logo" />
        <h1 className='navtabTitle'>XBI | {username}</h1>
        </div>
        <Tabs className="tabs" value={currentTab} onChange={(e, newValue) => handleChange(newValue)} aria-label="nav tabs example">
        {tabs.map((route, index) => {
          // Prevent clicking of Landing Page on Nav Tab
          if (index == 4) {
            return ""
          }
          return (
            <LinkTab key={index} label={route.label} to={route.to} />
          )
        })}
      </Tabs>
      <Button 
        variant="outlined" 
        color="error" 
        onClick={handleLogout}
        sx={{ ml: 2 }}
      >
        Logout
      </Button>
      </nav>
    </Box>
  );
}

export default NavTabs