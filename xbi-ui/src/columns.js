import { format } from 'date-fns'

export const COLUMNS = [
  {
    Header: 'Id',
    Footer: 'Id',
    accessor: 'id',
    disableFilters: true,
    sticky: 'left'
  },
  {
    Header: 'First Name',
    Footer: 'First Name',
    accessor: 'first_name',
    sticky: 'left'
  },
  {
    Header: 'Last Name',
    Footer: 'Last Name',
    accessor: 'last_name',
    sticky: 'left'
  },
  {
    Header: 'Date of Birth',
    Footer: 'Date of Birth',
    accessor: 'date_of_birth',
    Cell: ({ value }) => {
      return format(new Date(value), 'dd/MM/yyyy')
    }
  },
  {
    Header: 'Country',
    Footer: 'Country',
    accessor: 'country'
  },
  {
    Header: 'Phone',
    Footer: 'Phone',
    accessor: 'phone'
  },
  {
    Header: 'Email',
    Footer: 'Email',
    accessor: 'email'
  },
  {
    Header: 'Age',
    Footer: 'Age',
    accessor: 'age'
  },
]

export const GROUPED_COLUMNS = [
  {
    Header: 'Id',
    Footer: 'Id',
    accessor: 'id'
  },
  {
    Header: 'Exploitable',
    Footer: 'Exploitable',
    columns: [
      {
        Header: 'S1',
        Footer: 'S1',
        accessor: 'first_name'
      },
      {
        Header: 'S2',
        Footer: 'S2',
        accessor: 'last_name'
      },
      {
        Header: 'S3',
        Footer: 'S3',
        accessor: 'email'
      },
//       {
//         Header: 'S4',
//         Footer: 'S4',
//         accessor: 'first_name'
//       },
    ]
  },
  {
    Header: 'Unexploitable',
    Footer: 'Unexploitable',
    columns: [
      {
        Header: 'S1',
        Footer: 'S1',
        accessor: 'date_of_birth'
      },
      {
        Header: 'S2',
        Footer: 'S2',
        accessor: 'country'
      },
      {
        Header: 'S3',
        Footer: 'S3',
        accessor: 'phone'
      },
      {
        Header: 'S4',
        Footer: 'S4',
        accessor: 'age'
      },
    ]
  }
]