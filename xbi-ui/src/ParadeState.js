import React, { useState } from "react";
import Axios from "axios";

// Upload json file to database.
function ParadeState() {
    const [selectedFile, setSelectedFile] = React.useState(null); 

    let formData = new FormData();

    const onFileChange = (e) => {
        console.log(e.target.files[0])
        if(e.target && e.target.files[0]) {
            formData.append('file', e.target.files[0]);
        }
        console.log(formData, 'asdf');
    }

    const handleSubmit = async(event) => {
        event.preventDefault();
        const formData = new FormData();        formData.append('selectedFile', selectedFile);

        console.log('hello', selectedFile);
        
        try {
            const response = await Axios({
                method: 'post',
                url: "/updateUsers",
                data: {'file':selectedFile},
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        } catch(error) {
            console.log(error);
        }
    }

    const handleFileSelect = (event) => {
        setSelectedFile(event.target.files[0]);
    }

    return (
        <form onSubmit={handleSubmit}>
            <input type='file' onChange={handleFileSelect} />
            <input type='submit' value="Upload" />
        </form>
    );
}

export default ParadeState;