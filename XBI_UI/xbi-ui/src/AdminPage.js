import React from "react";

// Radio buttons.
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';

// Different tables within admin page.
import OPSV from "./OPSV";
import GenBinCount from "./GenBinCount";
import UpdateSensorCategory from "./UpdateSensorCategory";
import ParadeState from "./ParadeState";
import InsertJson from "./InsertJson";

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
    const tokenName = String(sessionStorage.getItem('token'))
    const tokenString = JSON.parse(tokenName)
    if (tokenString === "II" || tokenString === "Senior II") {
        return (
            <p> You do not have permission to view this page. <br/> Please login with the appropriate account. </p>
        )
    } else if (tokenString === "IA") {
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
                        <FormControlLabel value="OPSV" control={<Radio />} label="Set OPS V" onClick={()=>{setShowOPSV(true); setShowGenBinCount(false); setShowUpdateSensorCategory(false); setShowParadeState(false); setShowInsertJson(false);}} />
                        <FormControlLabel value="GenBinCount" control={<Radio />} label="Generate Bin Count" onClick={()=>{setShowOPSV(false); setShowGenBinCount(true); setShowUpdateSensorCategory(false); setShowParadeState(false); setShowInsertJson(false);}} />
                        <FormControlLabel value="UpdateSensorCategory" control={<Radio />} label="Update Sensor Category" onClick={()=>{setShowOPSV(false); setShowGenBinCount(false); setShowUpdateSensorCategory(true); setShowParadeState(false); setShowInsertJson(false);}} />
                        <FormControlLabel value="ParadeState" control={<Radio />} label="Upload Parade State" onClick={()=>{setShowOPSV(false); setShowGenBinCount(false); setShowUpdateSensorCategory(false); setShowParadeState(true); setShowInsertJson(false);}} />
                        <FormControlLabel value="InsertJson" control={<Radio />} label="Insert JSON" onClick={()=>{setShowOPSV(false); setShowGenBinCount(false); setShowUpdateSensorCategory(false); setShowParadeState(false); setShowInsertJson(true);}} />
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
            </div>
        );
    }
}

export default AdminPage;