import {useState, useEffect} from 'react';
import BlogList from './BlogList';
import db from './data/db.json'
import useFetch from './useFetch'

const Home = () => {
  
  const {data: blogs, isPending, error} = useFetch()
  return (  
    <div className="home">
      {error && <div>{error}</div>}
      {isPending && <div>Loading...</div>}
      {blogs && <BlogList blogs={blogs} title="All Blogs "/>}
    </div>
  );
  
}
 
export default Home;