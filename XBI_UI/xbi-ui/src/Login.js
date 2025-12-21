import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useState, useEffect } from 'react';
import Autocomplete from '@mui/material/Autocomplete';

import axios from "axios";



function Copyright(props) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      {'SCVU '} 
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const theme = createTheme();


export default function Login({ toSetToken }) { // receives the setToken function (that is from useToken.js) from login page

  const [usernameValues, setUsernameValues] = useState([]);
  useEffect(
    () =>{
      axios.get('/getUsers') // DB API Address
      .then(function (response) {
        let data = response.data
        setUsernameValues(data.Users) // call the DB API and get the list of users in order to show on the user dropdown
      })
      .catch(function (error) {
        console.log(error);
      });
    }
  , [])

  async function loginUser(credentials, username) { // handle the login logic by verifying the pw with the DB API
    axios.post("/accountLogin", credentials)
      .then(function (response) {

        if (response.data === "") {
          alert("Wrong password")
        } else {
          toSetToken([response.data, username]) ; // call the function in useToken.js (saveToken) to set the session with the token and username
        }
      })
      .catch(function (error) {
        console.log(error);
      });
      };
  
  

  const handleSubmit = async e => { // when the user click on the sign in button
    e.preventDefault();
    if (selectedUser === null) {
      alert("Please select a username")
    } else {
      loginUser({
        "Password": password
      }, selectedUser);
    }
  }


  const [selectedUser, setSelectedUser] = useState(null)
  const [password, setPassword] = useState();


  const updateSelectedUser = (newValue) => {
    setSelectedUser(newValue)
  }

  return (
    <ThemeProvider theme={theme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Login Page
          </Typography>
          <Typography component="h2" variant="h5">
            XBI Tasking Module
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <Autocomplete
                id="combo-box-image-category"
                options={usernameValues} // list of usernames from the DB
                value={selectedUser} // current selected user
                onChange={(e, newValue) => updateSelectedUser(newValue)} // changes the useState value when user select an option to ensure the DOM updates live
                renderInput={(params) => <TextField {...params} label="Username" />}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              onChange={e => setPassword(e.target.value)} // changes the useState value for every keypress to ensure the DOM updates live
            />
    
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign In
            </Button>
            
          </Box>
        </Box>
        <Copyright sx={{ mt: 8, mb: 4 }} />
      </Container>
    </ThemeProvider>
  );
}
