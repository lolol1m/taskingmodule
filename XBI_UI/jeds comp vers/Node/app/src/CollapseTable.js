import * as React from 'react';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';

function createData(imgname, sensor, imgdate, uploaddate, priority, assignee) {
  return {
    imgname, sensor, imgdate, uploaddate, priority, assignee,
    area: [
      {
        area: 'Area 1',
        sensor: 'Temp',
        imgdate: '15/10/22',
        uploaddate: '16/10/22',
        priority: 1,
        assignee: "ZZCAI",
      },
      {
        area: 'Area 2',
        sensor: 'Temp',
        imgdate: '15/10/22',
        uploaddate: '16/10/22',
        priority: 1,
        assignee: "SYH",
      },
    ],
  };
}

function BasicSelect() {
    const [age, setAge] = React.useState('');
  
    const handleChange = (event) => {
      setAge(event.target.value);
    };
  
    return (
      <Box sx={{ minWidth: 120 }}>
        <FormControl fullWidth>
          <InputLabel id="demo-simple-select-label">Name</InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={age}
            label="Age"
            onChange={handleChange}
          >
            <MenuItem value={10}>ZZCai</MenuItem>
            <MenuItem value={20}>SYH</MenuItem>
            <MenuItem value={30}>Kurumi</MenuItem>
          </Select>
        </FormControl>
      </Box>
    );
  }
  



function Row(props) {
  const { row } = props;
  const [open, setOpen] = React.useState(false);

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
            {row.imgname}
        </TableCell>
        <TableCell align="right">{row.sensor}</TableCell>
        <TableCell align="right">{row.imgdate}</TableCell>
        <TableCell align="right">{row.uploaddate}</TableCell>
        <TableCell align="right">{row.priority}</TableCell>
        <TableCell align="right">{row.assignee}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>

              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <TableCell>Image Name</TableCell>
                    <TableCell >Sensor</TableCell>
                    <TableCell >Image Date</TableCell>
                    <TableCell >Upload Date</TableCell>
                    <TableCell >Priority</TableCell>
                    <TableCell >Assignee</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.area.map((areaRow) => (
                    <TableRow key={areaRow.area}>
                      <TableCell component="th" scope="row">
                        {areaRow.area}
                      </TableCell>
                        <TableCell>{areaRow.sensor}</TableCell>
                        <TableCell>{areaRow.imgdate}</TableCell>
                        <TableCell>{areaRow.uploaddate}</TableCell>
                        <TableCell>{areaRow.priority}</TableCell>
                        <TableCell>{BasicSelect()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

const rows = [
    createData("Image A", "Temp", "15/10/22", "16/10/22", 1, "SYH"),
    createData("Image C", "Temp", "15/10/22", "16/10/22", 1, "SYH"),
    createData("Image B", "Temp", "15/10/22", "16/10/22", 1, "ZZCAI"),
];

export default function CollapsibleTable() {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="collapsible table">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Image Name</TableCell>
            <TableCell align="right">Sensor</TableCell>
            <TableCell align="right">Image Date</TableCell>
            <TableCell align="right">Upload Date</TableCell>
            <TableCell align="right">Priority</TableCell>
            <TableCell align="right">Assignee</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <Row key={row.imgname} row={row} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}




// import * as React from 'react';
// import { DataGrid } from '@mui/x-data-grid';

// const columns = [
//   { field: 'id', headerName: 'ID', width: 70 },
//   { field: 'firstName', headerName: 'First name', width: 130 },
//   { field: 'lastName', headerName: 'Last name', width: 130 },
//   {
//     field: 'age',
//     headerName: 'Age',
//     type: 'number',
//     width: 90,
//   },
//   {
//     field: 'fullName',
//     headerName: 'Full name',
//     description: 'This column has a value getter and is not sortable.',
//     sortable: false,
//     width: 160,
//     valueGetter: (params) =>
//       `${params.row.firstName || ''} ${params.row.lastName || ''}`,
//   },
// ];

// const rows = [
//   { id: 1, lastName: 'Snow', firstName: 'Jon', age: 35 },
//   { id: 2, lastName: 'Lannister', firstName: 'Cersei', age: 42 },
//   { id: 3, lastName: 'Lannister', firstName: 'Jaime', age: 45 },
//   { id: 4, lastName: 'Stark', firstName: 'Arya', age: 16 },
//   { id: 5, lastName: 'Targaryen', firstName: 'Daenerys', age: null },
//   { id: 6, lastName: 'Melisandre', firstName: null, age: 150 },
//   { id: 7, lastName: 'Clifford', firstName: 'Ferrara', age: 44 },
//   { id: 8, lastName: 'Frances', firstName: 'Rossini', age: 36 },
//   { id: 9, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
// ];

// export default function DataTable() {
//   return (
//     <div style={{ height: 400, width: '100%' }}>
//       <DataGrid
//         rows={rows}
//         columns={columns}
//         pageSize={5}
//         rowsPerPageOptions={[5]}
//         checkboxSelection
//       />
//     </div>
//   );
// }


