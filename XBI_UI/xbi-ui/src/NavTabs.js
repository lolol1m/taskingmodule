import { useState, useEffect } from 'react'
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Link } from "react-router-dom";
import logo from "./xbi.png"


function LinkTab(props) {
  return (
    <Tab
      component={Link}
      {...props}
    />
  );
}

const NavTabs = ({ tabs, currentTab, handleChange }) => {

  const username = sessionStorage.getItem('username').replaceAll(`"`, ``)

  return (

    <Box className='navTabs' sx={{ width: '100%' }}>
      <nav className="navbar">
        <div>
        <img src={logo} className='logo'/>
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
      </nav>
    </Box>
  );
}

export default NavTabs