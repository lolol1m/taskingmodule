import axios from "axios";
import { useState, useEffect } from "react";

// Modify this api url accordingly with the zzcai/yh/jordan backend
axios.defaults.baseURL = 'http://192.168.1.2:5000';

// url is the path after the slash. (e.g. /get_all)
// method is one of these: 'get','post,'put','update','delete'
// body is the stuff that you want to send to the backend (usually in JSON format and used with POST requests to send data to backend)
// params is the stuff after the question mark (e.g. /api/tower_ui/get_directions?sensor=NS, where param sensor is NS)
const useApi = ({ url = '/', method = 'get', body = {}, params = {} }) => {
    const [data, setData] = useState(null);
    const [isPending, setIsPending] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        axios[method](url, { params: params, signal: controller.signal, data: body })
            .then((res) => {
                setData(res.data);
                setError(null);
            })
            .catch((err) => {
                console.log(err);
                if (err.response) {
                    setError(err);
                    console.log(err.response.data);
                    console.log(err.response.status);
                    console.log(err.response.headers);
                }
                else if (err.request) {
                    console.log(err.request);
                }
                else {
                    console.log('Error', err.message);
                }
            })
            .finally(() => {
                setIsPending(false);
            })

        return () => { controller.abort() }
    }, []);

    return { data, isPending, error };
}

export default useApi;