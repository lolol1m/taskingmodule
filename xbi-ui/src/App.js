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
import { useState, useEffect } from 'react';
import useToken from "./useToken.js";
import keycloak from "./keycloak";
import AuthGuard from "./AuthGuard.js";

// Modal for Date Picker Form
import DatePickerModal from "./DatePicker.js"

// Routing.
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavTabs from "./NavTabs";
import axios from "axios";

// Landing Page.
import LandingPage from "./LandingPage"

// MUI X License setup (development only - license check is disabled in node_modules)
import { LicenseInfo } from '@mui/x-data-grid-pro';
import { LicenseInfo as DatePickerLicenseInfo } from '@mui/x-date-pickers-pro';

// Set dummy license key to suppress warnings (actual license check is bypassed in verifyLicense.js)
LicenseInfo.setLicenseKey('');
DatePickerLicenseInfo.setLicenseKey('');

// Get DB API URL from the .env file
let DB_API_URL = process.env.REACT_APP_DB_API_URL
axios.defaults.baseURL = DB_API_URL;

// Add Keycloak token to all axios requests
axios.interceptors.request.use(
  (config) => {
    if (keycloak.authenticated && keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses - token might be expired
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, logout user
      keycloak.logout();
    }
    return Promise.reject(error);
  }
);

// Helper function.
function MyApp() {


    // Date Picker Modal.
    const [dateRange, setDateRange] = useState(null);
    const [openDP, setOpenDP] = React.useState(true);
    const handleOpenDP = () => setOpenDP(true);
    const handleCloseDP = (event, reason) => {
      if (reason && reason === "backdropClick")
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
  // Handle invalid tab indices: if -1 (not found) or 4 (landing page, which is hidden), default to 0
  const validTab = (currentTab === -1 || currentTab === 4) ? 0 : currentTab;
  const [tab, setTab] = useState(validTab);
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

  // AuthGuard handles authentication and redirects to Keycloak before UI loads
  return (
    <AuthGuard onAuthSuccess={setToken}>
      {!dateRange ? (
        <DatePickerModal
          openDP={openDP}
          handleCloseDP={handleCloseDP}
          setDateRange={setDateRange}
        />
      ) : (
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
      )}
    </AuthGuard>
  );
}

// Main function being exported.
function App() {


  return (

    <MyApp />

  );
}

export default App;
