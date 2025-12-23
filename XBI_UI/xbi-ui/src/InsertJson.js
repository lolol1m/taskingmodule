import React, { useState } from "react";
import Axios from "axios";

// Upload json file to database.
function InsertJson() {
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
        
        if (!selectedFile) {
            alert('Please select a file first');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', selectedFile); // Backend expects 'file' as the key
        
        try {
            const response = await Axios({
                method: 'post',
                url: "/insertDSTAData",
                data: formData,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            alert('Data uploaded successfully!');
            console.log('Upload response:', response);
        } catch(error) {
            console.error('Upload error:', error);
            alert('Error uploading file: ' + (error.response?.data?.detail || error.message));
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

export default InsertJson;