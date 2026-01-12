import "../styles/LandingPage.css";
import TaskingSummary from "./TaskingSummary";
import { Link } from "react-router-dom";
import logo from "../assets/xbi2.png"
import { Button, Box } from "@mui/material";

const LandingPage = ({dateRange, handleTabChange}) => {

  const username = sessionStorage.getItem('username').replaceAll(`"`, ``) // formats username to be displayed

  // const handleTabChange = (event, newValue) => {
  //   setValue(newValue);
  //   console.log(value)
  // };
  
  return (
    <div className="landing">
      <div>
        <img className='mainLogo' src={logo}></img>
      </div>
      <div className="titleBody">
        <h2 className="title">Welcome to XBI, {username}</h2>
        <Button variant="contained" component={Link} to={'/tasking-summary'} onClick={() => handleTabChange(1)}>Proceed to tasking summary</Button>
      </div>

    </div>


  );
}

export default LandingPage