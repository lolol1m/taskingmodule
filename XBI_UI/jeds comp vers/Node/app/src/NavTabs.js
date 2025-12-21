import { useState, useEffect } from 'react'
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Link } from "react-router-dom";

function LinkTab(props) {
  return (
    <Tab
      component={Link}
      {...props}
    />
  );
}

const NavTabs = ({ tabs, currentTab }) => {
  const [value, setValue] = useState(currentTab);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box className='navTabs' sx={{ width: '100%' }}>
      <Tabs value={value} onChange={handleChange} aria-label="nav tabs example">w
        {tabs.map((route, index) => {
          return (
            <LinkTab key={index} label={route.label} to={route.to} />
          )
        })}
      </Tabs>
    </Box>
  );
}

export default NavTabs