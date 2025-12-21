import React, { useMemo, useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import {DataGridPro, GridToolbarQuickFilter, GridLinkOperator} from '@mui/x-data-grid-pro';
import Button from '@mui/material/Button';
import Axios from "axios";

function OPSV() {
        // usestate variable used to store data read from database used to populate table.
        const [tableData, setTableData] = React.useState([]); 
        // usestate variable used to store formatted data read from database to populate table rows.
        // no usestate variable for table columns as it is hardcoded as it will never change.
        const [rows, setRows] = React.useState([]); 
        // usestate variable to store ID of fields with OPSV==True to auto select specified rows checkbox based on value read from database onload.
        // This usestate variable will also be resubmitted when apply button is click to update database with new/less selected rows.
        const [readSelectedRows, readSelectedRowsSetter] = React.useState([]);  // Read database data (row ID only) into this variable.

        // GET request from api to retrieve data from database.
        const getData = () => {
                Axios.get('/getAreas').then(
                        (response) => {  // { data: { 'Areas': [ {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False}, {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False} ] } }
                                // data from database with an additional key named 'id' with same value as 'ID' appended to fix unique table row id problem.  { data: { 'Areas': [ {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False, id: 1024362}, {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False, id: 1024362} ] } }
                                let data = response['data']['Areas'];
                                data = data.map(
                                        x => {
                                                return {...x, id: x['ID']}
                                        }
                                )
                                setTableData(response['data']);  // Set data read from database into tableData usestate variable. { 'Areas': [ {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False}, {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False} ] }
                                setRows(data);  // [ {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False}, {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False} ]
                                readSelectedRowsSetter(getTrueFields(data));  // [1, 2, 3, 4].
                                setSelectionModel(getTrueFields(data));  // Used to onload tick true fields checkbox.
                                console.log(response['data'], 'get data return')
                        }
                );
        };

        // Onload function to execute GET request to retrieve data from database and pass to tableData usestate variable.
        useEffect(() => {
                getData();
        }, []);

        // Table header name. Can hardcode here as it will never change.
        const columns = [
                { field: 'ID', headerName: 'ID', width: 180 },
                { field: 'Area Name', headerName: 'Area Name', width: 280 },
                { field: 'OPS V', headerName: 'OPS V', width: 62 },
        ];

        // Function to extract out ID of fields with OPSV==True and append to a list which will be set to readSelectedRows variable.
        // This is for the function to auto tick checkbox for fields that have OPSV as True.
        function getTrueFields(data8) {  // [ {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False}, {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False} ]
                var trueFields = [];  // Stores ID of fields with OPSV==True. [1, 2, 3, 4].
                for (let i = 0; i < data8.length; i++) {
                        if (data8[i]['OPS V'] == true) {
                                trueFields.push(data8[i]['ID']);
                        }
                }
                return trueFields;
        }

        // Search function.
        function QuickSearchToolbar() {
                return (
                        <Box
                        sx={{
                        p: 0.5,
                        pb: 0,
                        }}
                        >
                        <GridToolbarQuickFilter
                        quickFilterParser={(searchInput) =>
                                searchInput
                                .split(',')
                                .map((value) => value.trim())
                                .filter((value) => value !== '')
                        }
                        />
                        </Box>
                );
        }

        // POST request to api to submit data to database. This function is called in the onClick function in apply button.
        // Used to update fields OPSV True or False.
        const postData = (trueList) => {  // trueList = { 'Areas': [ {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False}, {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False} ] }
                console.log(trueList, 'opsv id true');
                Axios.post('/setOpsvAreas', trueList)
                .then((response) => {
                console.log(response);
                }, (error) => {
                console.log(error);
                });
                setTimeout(getData(), 4000);  // Used to auto reload page upon post data to show updates.
        }

        function formatUpdate(data7) {  // data7 = [1, 2, 3], array containing ID of OPSV==true fields.
                var temp = tableData;  // { 'Areas': [ {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False}, {'ID': 1024362, 'Area Name': 'G074', 'OPS V': False} ] }
                for (let i = 0; i < temp['Areas'].length; i++) {
                        if (data7.includes(temp['Areas'][i]['ID']) == true) {  // Set opsv to true else false
                                temp['Areas'][i]['OPS V'] = true;
                        }

                        else {
                                temp['Areas'][i]['OPS V'] = false;
                        }
                }
                return temp;
        }

        // Onload auto select specified rows checkbox aka row ID that exist in the readSelectedRows array.
        // This selectionModel variable is a list of field ID that have OPSV==True.
        var [selectionModel, setSelectionModel] = React.useState(() =>
        rows.filter((r) => readSelectedRows.indexOf(r.id) > -1).map((r) => r.id),
        );

        return (
                <div style={{ height: 550, width: '40%', margin: 'auto' }}>
                        <DataGridPro
                        rows={rows}
                        columns={columns}
                        initialState={{
                                filter: {
                                filterModel: {
                                items: [],
                                quickFilterLogicOperator: GridLinkOperator.Or,
                                },
                                },
                        }}
                        components={{ Toolbar: QuickSearchToolbar }}
                        pageSize={100}
                        rowsPerPageOptions={[100]}
                        checkboxSelection
                        // Onload auto select specified rows checkbox.
                        selectionModel={selectionModel}  // selectionModel={[1, 2, 3]}
                        // Update selectionModel with new/less selected rows.
                        onSelectionModelChange={setSelectionModel}
                        />

                        <br></br>
                        <Button variant="contained" onClick={function() { postData(formatUpdate(selectionModel)); }}>Apply</Button>
                        
                        {/* Display selected rows id aka rows with OPSV True. */}
                        {/* <pre style={{ fontSize: 18 }}>
                                {JSON.stringify(selectionModel, null, 4)}
                        </pre> */}
                </div>
        );
}

export default OPSV;