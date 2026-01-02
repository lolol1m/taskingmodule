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
import TaskExplorer from "./TaskExplorer.js";

// Routing.
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavTabs from "./NavTabs";

const ColorModeContext = React.createContext({ toggleColorMode: () => { } });

// Helper function.
function MyApp() {
  // Routing.
  const tabs = [
    {
      label: "Tasking Manager",
      to: "/",
      element: <TaskingManager />
    },
    {
      label: "Tasking Summary",
      to: "/tasking-summary",
      element: <TaskingSummary />,
    },
    {
      label: "Completed Images",
      to: "/completed-images",
      element: <CompletedImages />,
    },
    {
      label: "Task Explorer",
      to: "/task-explorer",
      element: <TaskExplorer />
    },
  ];

  const currentTab = () => {
    let path = window.location.pathname;
    return tabs.findIndex((tab) => {
      // future improvement, if -1 then return 404 page index s
      return tab.to === path;
    });
  };

  // Toggle dark mode.
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);

  return (
    <Router>
      <Box
        sx={{
          height: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
          borderRadius: 1,
          p: 3,
        }}
      >
        <div className="App">
          {/* Dark mode icon. */}
          {theme.palette.mode} mode
          <IconButton
            sx={{ ml: 1 }}
            onClick={colorMode.toggleColorMode}
            color="inherit"
          >
            {theme.palette.mode === "dark" ? (
              <Brightness7Icon />
            ) : (
              <Brightness4Icon />
            )}
          </IconButton>
          {/* Routing. */}
          <NavTabs tabs={tabs} currentTab={currentTab} />
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
  const [mode, setMode] = React.useState("light");
  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
      },
    }),
    []
  );

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <MyApp />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
