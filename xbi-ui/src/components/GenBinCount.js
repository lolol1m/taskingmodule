import React, { useMemo, useState, useEffect } from 'react';
import { useTable } from 'react-table';
import '../styles/table.css';
import { CSVLink } from "react-csv";
import Button from '@mui/material/Button';
import Axios from "axios";

function GenBinCount({ dateRange }) {
    // console.log(dateRange)  // usestate variable that contains user selected date.
    // usestate variable used to store data retrieved from database after POST. Data is used to populate table ROWS dynamically.
    const [genBinCountData, setGenBinCountData] = React.useState([]);  // [ { Category: ['S1', 'S2'], Exploitable: [1, 2], Unexploitable: [11, 22], Remarks: "Lorem ipsum" } ]
    // usestate variable used to store formatted data using data retrieved from database after POST. Data is used to populate table HEADER NAME dynamically.
    const [exploitableColumnsData, setExploitableColumnsData] = React.useState([]);  // [{Header: 'S1'}, {Header: 'S2'}, {Header: 'S3'}, {Header: 'S4'}].
    // usestate variable used to store formatted data using data retrieved from database after POST. Data is used to populate unexploitable table HEADER NAME dynamically.
    const [unexploitableColumnsData, setUnexploitableColumnsData] = React.useState([]);  // [{Header: 'S1 '}, {Header: 'S2 '}, {Header: 'S3 '}, {Header: 'S4 '}].
    // usestate variable used to store formatted remarks.
    const [formatRemarks, setFormatRemarks] = React.useState([]);
    // usestate variable used to store formatted data for downloading into csv file.
    const [downloadData, setDownloadData] = React.useState([]); 

    // POST request to api to submit user selected date to database to retrieve respective data. This function is called in the onload useeffect function.
    // Data will be automatically GET upon posting.
    const postData = () => {  // dateRange = { 'Start Date': date, 'End Date': date }.
        Axios.post('/getXBIReportData', dateRange)
        .then((response) => {  // { data: { Category: ['S1', 'S2'], Exploitable: [1, 2], Unexploitable: [11, 22], Remarks: "Lorem ipsum" } } 
            setGenBinCountData([response['data']]);  // [ { Category: ['S1', 'S2'], Exploitable: [1, 2], Unexploitable: [11, 22], Remarks: "Lorem ipsum" } ]
            // Exploitable and Unexploitable array order must follow order of Category
            setExploitableColumnsData(get_exploitable_columns_data([response['data']]));  // [{Header: 'S1'}, {Header: 'S2'}, {Header: 'S3'}, {Header: 'S4'}].
            setUnexploitableColumnsData(get_unexploitable_columns_data([response['data']]));  // [{Header: 'S1 '}, {Header: 'S2 '}, {Header: 'S3 '}, {Header: 'S4 '}].
            // Split Remarks string using below function into smaller chunks and render with line breaks for formatting.
            setFormatRemarks(chunkSubstr([response['data']][0]['Remarks'],20));
            // Format data for downloading into csv file.
            setDownloadData(format_download_data([response['data']]));  // [{Category: 'S1', Exploitable: 1, Unexploitable: 11}, {Category: 'S2', Exploitable: 2, Unexploitable: 22}]
        }, (error) => {
        console.log(error);
        });
    }

    // Download button call backend to get excel file to download.
    const downloadExcel = () => {  // dateRange = { 'Start Date': date, 'End Date': date }.
        Axios.post('/getXBIReportDataForExcel', dateRange, {responseType: 'blob'})
        .then(({data: blob}) => {
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            console.log(url);
            link.href = url;
            link.download = 'report.xlsx';
            link.click();
        }, (error) => {
            console.log(error);
        });
    }

    // Onload function to execute POST request to retrieve data from database used to populate table.
    useEffect(() => {
        postData();
    }, []);

    // Append sensor names into an array to be used to dynamically display grouped header names for Exploitable.
    function get_exploitable_columns_data(data) {  // [ { Category: ['S1', 'S2'], Exploitable: [1, 2], Unexploitable: [11, 22], Remarks: "Lorem ipsum" } ]
        var exploitable_columns_data = [];  // [{Header: 'S1'}, {Header: 'S2'}, {Header: 'S3'}, {Header: 'S4'}].
        for (let i = 0; i < data[0]['Category'].length; i++) {
            exploitable_columns_data.push({'Header': data[0]['Category'][i]});
        }
        return exploitable_columns_data;
    }
    
    // Append sensor names into an array to be used to dynamically display grouped header names for Unexploitable.
    function get_unexploitable_columns_data(data2) {  // [ { Category: ['S1', 'S2'], Exploitable: [1, 2], Unexploitable: [11, 22], Remarks: "Lorem ipsum" } ]
        var unexploitable_columns_data = [];  // [{Header: 'S1 '}, {Header: 'S2 '}, {Header: 'S3 '}, {Header: 'S4 '}].
        for (let i = 0; i < data2[0]['Category'].length; i++) {
            unexploitable_columns_data.push({'Header': data2[0]['Category'][i]+' '});  // Additional spacing added behind each sensor name here to prevent conflicting id with exploitable_columns_data.
        }
        return unexploitable_columns_data;
    }

    // Function to split a long string up into smaller chunks with line breaks.
    // Maximum size is 20 characters per split.
    function chunkSubstr(str, size) {
        const numChunks = Math.ceil(str.length / size)
        const chunks = new Array(numChunks)
        for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
                chunks[i] = str.substr(o, size) + '\n'
        }
        return chunks
    }

    // Reformat data to make it suitable when downloading into csv file. 
    function format_download_data(data3) {  // [ { Category: ['S1', 'S2'], Exploitable: [1, 2], Unexploitable: [11, 22], Remarks: "Lorem ipsum" } ]
        var download_table_data = [];  // [{Category: 'S1', Exploitable: 1, Unexploitable: 11}, {Category: 'S2', Exploitable: 2, Unexploitable: 22}]
        for (let i = 0; i < data3[0]['Category'].length; i++) {
            if (i == 0) {
                download_table_data.push({'Category': data3[0]['Category'][i], 'Exploitable': data3[0]['Exploitable'][i], 'Unexploitable': data3[0]['Unexploitable'][i], 'Remarks': data3[0]['Remarks']});
            }

            else {
                download_table_data.push({'Category': data3[0]['Category'][i], 'Exploitable': data3[0]['Exploitable'][i], 'Unexploitable': data3[0]['Unexploitable'][i]});
            }
        }
        return download_table_data;
    }
    
    var groupedColumns = [
        {
            Header: 'Tasking',
        },
        {
            Header: 'Exploitable',
            columns: exploitableColumnsData  // [{}, {}].
        },
        {
            Header: 'Unexploitable',
            columns: unexploitableColumnsData  // [{}, {}].
        },
        {
            Header: 'Remarks',
        },
    ];

    var columns = useMemo(() => groupedColumns, [exploitableColumnsData, unexploitableColumnsData])  // columns.
    var data = useMemo(() => genBinCountData, [])  // rows.

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        footerGroups,
        rows,
        prepareRow
    } = useTable({
        columns,
        data
    })

    return (
        <> 
        <table {...getTableProps()} className='genbincountpage'>
            <thead>
                {headerGroups.map(headerGroup => (
                    <tr {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map(column => (
                            <th {...column.getHeaderProps()}>{column.render('Header')}</th>
                        ))}
                    </tr>
                ))}
            </thead>

            <tbody>
                <tr>
                    <td>Coverage</td>
                    
                    {/* Loop through array and dynamically display data. */}
                    {genBinCountData[0] && genBinCountData[0]['Exploitable'].map((value)=>{
                        return <td>{value}</td>
                    })}

                    {genBinCountData[0] && genBinCountData[0]['Unexploitable'].map((value)=>{
                        return <td>{value}</td>
                    })}

                    <td style={{whiteSpace: "pre-wrap"}}>{formatRemarks}</td>
                </tr>

                <tr>
                    <td>Total</td>

                    {/* Loop through array and dynamically display data. */}
                    {genBinCountData[0] && genBinCountData[0]['Exploitable'].map((value)=>{
                        return <td>{value}</td>
                    })}

                    {genBinCountData[0] && genBinCountData[0]['Unexploitable'].map((value)=>{
                        return <td>{value}</td>
                    })}
                </tr>
            </tbody>
        </table>
        
        <br></br>
        <Button variant="contained" onClick={function () { downloadExcel(); }}>Download</Button>
        </>
    )
}

export default GenBinCount;



//         <Button variant="contained" onClick={function () { downloadExcel(); }}><CSVLink style={{color:'white'}}>Download</CSVLink></Button>
