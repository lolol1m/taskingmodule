import * as React from 'react'
import Box from '@mui/material/Box'
import {DataGrid, GridToolbar} from '@mui/x-data-grid'


const columns = [
    {
        field: 'id',
        headerName: 'Image ID',
        width: 150,
        editable: true,
    },
    {
        field: 'passId',
        headerName: 'Pass ID',
        width: 150,
        editable: true,
    },
    {
        field: 'imgFileName',
        headerName: 'Image File Name',
        width: 150,
        editable: true,
    },
    {
        field: 'assignee',
        headerName: 'Assignee',
        width: 150,
        editable: true,
    },
    {
        field: 'priority',
        headerName: 'Priority',
        width: 150,
        editable: true,
    },
]

const rows = [
    { id: 1, passId: 121, imgFileName: "Image 1", assignee: "Deston", priority: "Low"},
    { id: 2, passId: 122, imgFileName: "Image 2", assignee: "Zhenzhi", priority: "Medium"},
    { id: 3, passId: 123, imgFileName: "Image 3", assignee: "Yuhong", priority: "High"},
    { id: 4, passId: 124, imgFileName: "Image 4", assignee: "Zhenzhi", priority: "Low"},
    { id: 5, passId: 125, imgFileName: "Image 5", assignee: "Deston", priority: "Medium"},
    { id: 6, passId: 126, imgFileName: "Image 6", assignee: "Yuhong", priority: "High"},
    { id: 7, passId: 127, imgFileName: "Image 7", assignee: "Zhenzhi", priority: "Low"},
    { id: 8, passId: 128, imgFileName: "Image 8", assignee: "Yuhong", priority: "Medium"},
    { id: 9, passId: 129, imgFileName: "Image 9", assignee: "Deston", priority: "High"},
    { id: 10, passId: 130, imgFileName: "Image 10", assignee: "Deston", priority: "Low"},
]

export default function DataGridDemo() {
    return(
        <Box sx={{height: '400px', width: '100%'}}>
            <DataGrid
                rows={rows}
                columns={columns}
                pageSize={5}
                rowsPerPageOptions={[5]}
                
                components={{Toolbar: GridToolbar}}
            />
        </Box>
    );
};
