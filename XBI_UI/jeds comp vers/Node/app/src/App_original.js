import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from 'react'

let testdata = {'data':[{},{}], 'editeddata':[{},{},{}]}

function App() {
  const [empty, setEmpty] = useState([]);
  const [data, setData] = useState({'data':[{ age: 69, name: 'hentaimc' }, { age: 1, name: 'hentaigirl' }, { age: 96, name: 'dog' }], 'editeddata':[{age:3464654, name:'cat'}]})
  // to use variable in a html, have to use usestate
  const [test, setTest] = useState('I like loli hentai');
  const [toggle, setToggle] = useState(true);

  useEffect(() => {
    console.log(test);
    setTest('JSON DATA');
    setEmpty([{ age: 'hi', name: 'bye' }]);
  }, [toggle]);

  const functionname = () => {
    const newData = [...data.data]
    newData[0].age = 100

    // setData([...newData])

    // [{age:1,name:'hi',house:['','']}]
    setData(prevState => ({
      ...prevState,
      data:newData
    }))
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          {test}
        </a>
        {data.data.map((k) => {
          return (
            <div>
              {k.name}: {k.age}
            </div>
          )
        })}

        {data.editeddata.map((k) => {
          return (
            <div>
              {k.name}: {k.age}
            </div>
          )
        })}
        <button onClick={() => functionname()}>HI</button>
      </header>
    </div>
  );
}

export default App;
