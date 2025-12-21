import CollapsibleTable from './CollapseTable.js'
import useApi from "./useApi";
import { useState, useEffect } from "react";

const TaskingManager = () => {
    const { data, isPending, error } = useApi({ url: '/api/tower_ui/get_directions', method: 'get', params: { sensor: 'NS' } });
    console.log()
    console.log(data);
    console.log(isPending);
    console.log(error);

    const [pageData, setPageData] = useState([]);

    useEffect(() => {
        setPageData(data);
        console.log(pageData);
    })

    return (
        <div className="tasking-manager">
            Tasking Manager
            <div className="collapsetable">
                <CollapsibleTable />
            </div>
        </div>
    );
}

export default TaskingManager;