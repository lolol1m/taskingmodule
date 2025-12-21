// Styling.
import * as React from "react";
import "./App.css";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

// Toggle dark mode.
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import { useTheme, ThemeProvider, createTheme } from "@mui/material/styles";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

// Tab pages.
import TaskingManager from "./TaskingManager";
import TaskingSummary from "./TaskingSummary";

import CompletedImages from "./CompletedImages";
import AdminPage from "./AdminPage.js";
import Login from "./Login.js";
import { useState } from 'react';
import useToken from "./useToken.js";

// Modal for Date Picker Form
import DatePickerModal from "./DatePicker.js"

// Routing.
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavTabs from "./NavTabs";
import axios from "axios";

// Landing Page.
import LandingPage from "./LandingPage"

// Get DB API URL from the .env file
let DB_API_URL = process.env.REACT_APP_DB_API_URL
axios.defaults.baseURL = DB_API_URL;

// Helper function.
function MyApp() {


    // Date Picker Modal.
    const [dateRange, setDateRange] = useState(null);
    const [openDP, setOpenDP] = React.useState(true);
    const handleOpenDP = () => setOpenDP(true);
    const handleCloseDP = (event, reason) => {
      if (reason && reason == "backdropClick")
        return;
      setOpenDP(false);
    }

  // {tabs.location.pathname ===''}
  // Routing.
  let path = window.location.pathname;
  const tabs1 = [
    {
      label: "Tasking Manager",
      to: "/tasking-manager"
    },
    {
      label: "Tasking Summary",
      to: "/tasking-summary"
    },
    {
      label: "Completed Images",
      to: "/completed-images"
    },
    {
      label: "Admin Page",
      to: "/admin-page"
    },
    {
      label: "",
      to: "/"
    }
  ];
  const currentTab = tabs1.findIndex((tab) => tab.to === path);
  const [tab, setTab] = useState(currentTab);
    // future improvement, if -1 then return 404 page index s
  const tabs = [
    {
      label: "Tasking Manager",
      to: "/tasking-manager",
      element: <TaskingManager dateRange={dateRange} />,
    },
    {
      label: "Tasking Summary",
      to: "/tasking-summary",
      element: <TaskingSummary dateRange={dateRange} />,
    },
    {
      label: "Completed Images",
      to: "/completed-images",
      element: <CompletedImages dateRange={dateRange} />,
    },
    {
      label: "Admin Page",
      to: "/admin-page",
      element: <AdminPage dateRange={dateRange} />,
    },
    {
      label: "",
      to: "/",
      element: <LandingPage dateRange={dateRange} handleTabChange={setTab} />
    }
  ];

  const {token, setToken} = useToken(); // this useToken() is from useToken.js and it will return, the token (if any) & a func to set the sessionStorage
  if(!token) { // return login page if there is no token set
    return <Login toSetToken={setToken} /> // pass in the setToken function into the login component 
  }

  if (!dateRange) {
    return <DatePickerModal
      openDP={openDP}
      handleCloseDP={handleCloseDP}
      setDateRange={setDateRange}
    />
  }

  return (
    <Router>
      <Box
        sx={{
          width: 'auto',
          bgcolor: "background.default",
          color: "text.primary",
          p: 3,
        }}
      >
        <div className="App">

          {/* Routing. */}
          <NavTabs tabs={tabs} currentTab={tab} handleChange={setTab} />
          <Routes>
            {tabs.map((route, index) => {
              return (
                <Route
                  key={index}
                  exact
                  path={route.to}
                  element={route.element}
                />
              );
            })}
          </Routes>
        </div>
      </Box>
    </Router>
  );
}

// Main function being exported.
function App() {


  return (

    <MyApp />

  );
}

export default App;
