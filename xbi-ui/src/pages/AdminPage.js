import React from "react";
import useKeycloakRole from "../components/useKeycloakRole";

// Radio buttons.
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';

// Different tables within admin page.
import OPSV from "../components/OPSV";
import GenBinCount from "../components/GenBinCount";
import UpdateSensorCategory from "../components/UpdateSensorCategory";
import ParadeState from "../components/ParadeState";
import InsertJson from "../components/InsertJson";
import CreateUser from "../components/CreateUser";

/* Admin page is a single page JS file named AdminPage.js. All the other JS files such as
OPSV.js, GenBinCount.js etc... are tables embedded into the AdminPage.js file. There is a 
checkbox for each page to tick and untick to show or hide each page accordingly. */

function AdminPage({ dateRange }) {
    // Toggle show or hide tables accordingly based on what user selected in radio button.
    const [showOPSV,setShowOPSV]=React.useState(false)
    const [showGenBinCount,setShowGenBinCount]=React.useState(false)
    const [showUpdateSensorCategory,setShowUpdateSensorCategory]=React.useState(false)
    const [showParadeState,setShowParadeState]=React.useState(false)
    const [showInsertJson,setShowInsertJson]=React.useState(false)
    const [showCreateUser,setShowCreateUser]=React.useState(false)
    // Get role from Keycloak token
    const role = useKeycloakRole();
    
    if (role === "II" || role === "Senior II") {
        return (
            <p> You do not have permission to view this page. <br/> Please login with the appropriate account. </p>
        )
    } else if (role === "IA") {
        return (
            <div>
                <div>
                    <FormControl>
                    <FormLabel id="demo-row-radio-buttons-group-label">Select Table</FormLabel>
                    <RadioGroup
                        row
                        aria-labelledby="demo-row-radio-buttons-group-label"
                        name="row-radio-buttons-group"
                    >
                        <FormControlLabel value="OPSV" control={<Radio />} label="Set OPS V" onClick={()=>{setShowOPSV(true); setShowGenBinCount(false); setShowUpdateSensorCategory(false); setShowParadeState(false); setShowInsertJson(false); setShowCreateUser(false);}} />
                        <FormControlLabel value="GenBinCount" control={<Radio />} label="Generate Bin Count" onClick={()=>{setShowOPSV(false); setShowGenBinCount(true); setShowUpdateSensorCategory(false); setShowParadeState(false); setShowInsertJson(false); setShowCreateUser(false);}} />
                        <FormControlLabel value="UpdateSensorCategory" control={<Radio />} label="Update Sensor Category" onClick={()=>{setShowOPSV(false); setShowGenBinCount(false); setShowUpdateSensorCategory(true); setShowParadeState(false); setShowInsertJson(false); setShowCreateUser(false);}} />
                        <FormControlLabel value="ParadeState" control={<Radio />} label="Upload Parade State" onClick={()=>{setShowOPSV(false); setShowGenBinCount(false); setShowUpdateSensorCategory(false); setShowParadeState(true); setShowInsertJson(false); setShowCreateUser(false);}} />
                        <FormControlLabel value="InsertJson" control={<Radio />} label="Insert JSON" onClick={()=>{setShowOPSV(false); setShowGenBinCount(false); setShowUpdateSensorCategory(false); setShowParadeState(false); setShowInsertJson(true); setShowCreateUser(false);}} />
                        <FormControlLabel value="CreateUser" control={<Radio />} label="Create User" onClick={()=>{setShowOPSV(false); setShowGenBinCount(false); setShowUpdateSensorCategory(false); setShowParadeState(false); setShowInsertJson(false); setShowCreateUser(true);}} />
                    </RadioGroup>
                    </FormControl>
                </div>

                <div>
                    {showOPSV?<OPSV />:null}
                </div>

                <div>
                    {showGenBinCount?<GenBinCount dateRange={dateRange}/>:null}
                </div>

                <div>
                    {showUpdateSensorCategory?<UpdateSensorCategory />:null}
                </div>

                <div>
                    {showParadeState?<ParadeState />:null}
                </div>

                <div>
                    {showInsertJson?<InsertJson />:null}
                </div>

                <div>
                    {showCreateUser?<CreateUser />:null}
                </div>
            </div>
        );
    }
}

export default AdminPage;