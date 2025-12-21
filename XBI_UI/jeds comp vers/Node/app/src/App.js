import Navbar from './Navbar'
import Home from './Home'
import TaskingManager from './TaskingManager';

function App() {


    return (
        <div className="App">
            <Navbar />
            <div className="content">
                <Home />
            </div>
            <div> 
                <TaskingManager />
            </div>
        </div>
    );
}

export default App; 