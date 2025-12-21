import * as React from "react";
import './App.css';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";


// Toggle dark mode.
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import { useTheme, ThemeProvider, createTheme } from "@mui/material/styles";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

const ColorModeContext = React.createContext({ toggleColorMode: () => { } });

// Helper function.
function MyApp() {
  console.log(require("os").userInfo().username)

  const title = "welcome to the new blog";
  const likes = 50;
  const person = { name: "deston", age: 30 }

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
          <Routes>
          </Routes>
        </div>
      </Box>
    </Router>
  );
}

function Table() {
  return (
    <div className="Table">

    </div>
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

{/* <h2> { title }</h2>
<p>Liked {likes} times</p>
{ <p>hi {person}</p> }
<p> {10}, {"hello people"}, {[1,2,3,4,5]}, {Math.random() * 10}</p>  */}
