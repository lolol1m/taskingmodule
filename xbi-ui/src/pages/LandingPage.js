import "../styles/LandingPage.css";
import TaskingSummary from "./TaskingSummary";
import { Link } from "react-router-dom";
import { Button, Box } from "@mui/material";
import logo from "../assets/xbi2.png";

const LandingPage = ({dateRange, handleTabChange}) => {

  // Get username from localStorage (stored by AuthGuard) or sessionStorage (backward compatibility)
  let username = 'User'; // Default fallback
  try {
    // Try localStorage first (from AuthGuard)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      username = user.username || 'User';
    } else {
      // Fallback to sessionStorage (backward compatibility)
      const storedUsername = sessionStorage.getItem('username');
      if (storedUsername) {
        try {
          // Try parsing as JSON first
          username = JSON.parse(storedUsername).replaceAll(`"`, ``);
        } catch {
          // If not JSON, use as-is and remove quotes
          username = storedUsername.replaceAll(`"`, ``);
        }
      }
    }
  } catch (e) {
    console.error('Error getting username:', e);
    username = 'User'; // Fallback to default
  }

  // const handleTabChange = (event, newValue) => {
  //   setValue(newValue);
  //   console.log(value)
  // };
  
  return (
    <div className="landing">
      <div>
        <img className='mainLogo' src={logo} alt="XBI Logo" />
      </div>
      <div className="titleBody">
        <h2 className="title">Welcome to XBI, {username}</h2>
        <Button variant="contained" component={Link} to={'/tasking-summary'} onClick={() => handleTabChange(1)}>Proceed to tasking summary</Button>
      </div>

    </div>


  );
}

export default LandingPage