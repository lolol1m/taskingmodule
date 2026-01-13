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
import TaskingManager from "./pages/TaskingManager.js";
import TaskingSummary from "./pages/TaskingSummary.js";
import CompletedImages from "./components/CompletedImages.js";
import AdminPage from "./pages/AdminPage.js";
import { useState, useEffect } from 'react';
import useToken from "./components/useToken.js";
import AuthGuard from "./components/AuthGuard.js";

// Modal for Date Picker Form
import DatePickerModal from "./components/DatePicker.js"

// Routing.
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavTabs from "./components/NavTabs.js";
import axios from "axios";

// Landing Page.
import LandingPage from "./pages/LandingPage.js"

// MUI X License setup (development only - license check is disabled in node_modules)
import { LicenseInfo } from '@mui/x-data-grid-pro';
import { LicenseInfo as DatePickerLicenseInfo } from '@mui/x-date-pickers-pro';

// Set development license key to suppress warnings
// For development: Use a non-empty string to suppress the watermark
// For production: Replace with your actual MUI X Pro license key
LicenseInfo.setLicenseKey('development-license-key');
DatePickerLicenseInfo.setLicenseKey('development-license-key');

// Function to remove MUI X watermark from DOM
const removeMUIWatermark = () => {
  // More aggressive removal function
  const removeWatermark = () => {
    // Method 1: Remove by text content (most reliable)
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    const nodesToRemove = [];
    while (node = walker.nextNode()) {
      const text = node.textContent || '';
      if (text.includes('MUI X') || text.includes('Invalid license') || text.includes('Missing License')) {
        // Remove the parent element containing this text
        let parent = node.parentElement;
        while (parent && parent !== document.body) {
          if (parent.tagName === 'DIV' || parent.tagName === 'SPAN') {
            nodesToRemove.push(parent);
            break;
          }
          parent = parent.parentElement;
        }
      }
    }
    nodesToRemove.forEach(el => el.remove());
    
    // Method 2: Remove all fixed position divs that might be watermarks
    const allDivs = document.querySelectorAll('div');
    allDivs.forEach(div => {
      const text = div.textContent || div.innerText || '';
      const style = div.getAttribute('style') || '';
      const computedStyle = window.getComputedStyle(div);
      
      // Check if this is likely the watermark
      if (
        text.includes('MUI X') || 
        text.includes('Invalid license') || 
        text.includes('Missing License') ||
        (computedStyle.position === 'fixed' && 
         (computedStyle.zIndex === '9999' || computedStyle.zIndex === '99999' || parseInt(computedStyle.zIndex) > 9000) &&
         (text.length < 100)) // Watermark text is usually short
      ) {
        div.remove();
      }
    });
  };

  // Run immediately multiple times to catch it
  removeWatermark();
  setTimeout(removeWatermark, 50);
  setTimeout(removeWatermark, 100);
  setTimeout(removeWatermark, 200);
  setTimeout(removeWatermark, 500);
  
  // Set up interval to catch dynamically added watermarks
  const interval = setInterval(removeWatermark, 200);
  
  // Also use MutationObserver to catch new elements immediately
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(() => {
      removeWatermark();
    });
  });
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    characterData: true,
    attributes: true
  });
  
  // Cleanup function
  return () => {
    clearInterval(interval);
    observer.disconnect();
  };
};

// Get DB API URL from the .env file
export const DB_API_URL = process.env.REACT_APP_DB_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = DB_API_URL;

// Add access token to all axios requests
axios.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
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
      // Token expired or invalid, clear tokens and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('id_token');
      localStorage.removeItem('user');
      window.location.href = `${DB_API_URL}/auth/login`;
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
  // Remove MUI X watermark on component mount and continuously monitor
  useEffect(() => {
    return removeMUIWatermark();
  }, []);


  return (

    <MyApp />

  );
}

export default App;
