import {useState, useEffect} from 'react';

const useFetch = (url) => {

  const [data, setData] = useState(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState(null);
  console.log('url', url);
  useEffect(() => {
    setTimeout(() => {
      fetch('http://192.168.1.2:3000/data/db.json')
        .then(res => {
          if(!res.ok) {
            throw Error('could not fetch the data for that resource')
          }
          return res.json();
        })
        .then((data) => {
          setData(data);
          setIsPending(false);
          setError(null);
        })
        .catch(err => {
          setIsPending(false);
          setError(err.message);
        })
    }, 1000); 
  }, []);

  return {data, isPending, error}


}



export default useFetch;