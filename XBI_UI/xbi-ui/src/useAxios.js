import { useState, useEffect } from 'react';
import axios from "axios";

// HOW TO USE EXAMPLES

// GET REQUEST
// const { data, loading, error } = useAxios({
//   method: 'get',
//   url: '/posts',
//   headers: JSON.stringify({ accept: '*/*' }),
// });

// POST REQUEST
// const { data, loading, error } = useAxios({
//   method: 'post',
//   url: '/posts',
//   headers: JSON.stringify({ accept: '*/*' }),
//   body: JSON.stringify({
//       userId: 1,
//       id: 19392,
//       title: 'title',
//       body: 'Sample text',
//   }),
// });


// backend baseURL - will be overridden by App.js if REACT_APP_DB_API_URL is set
axios.defaults.baseURL = process.env.REACT_APP_DB_API_URL || 'http://localhost:5000/';

export const useAxios = (axiosParams) => {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const operation = async (params) => {
    try {
      console.log("why he fk am i running", params)
      const result = await axios.request(params);
      // console.log(result);
      if (result.statusText !== "OK") { // error coming back from server
        throw Error('could not fetch the data for that resource');
      }
      setData(result.data);
      console.log(result.data, "wy the fkl d  ihavae this")
      setError(null);
    } catch (error) {
      // auto catches network / connection error
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    operation(axiosParams);
  }, []); // execute once only

  return { data, error, loading , operation};
}

