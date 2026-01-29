import React, { useState } from "react";
import Axios from "axios";

// Upload json file to database.
function InsertJson() {
    const [selectedFile, setSelectedFile] = React.useState(null); 

    let formData = new FormData();

    const onFileChange = (e) => {
        if(e.target && e.target.files[0]) {
            formData.append('file', e.target.files[0]);
        }
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
                url: "/images/insertDSTAData",
                data: formData,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data) {
                if (response.data.success) {
                    const msg = response.data.message || 'Data uploaded successfully!';
                    alert(msg);
                } else {
                    alert('Upload failed: ' + (response.data.error || 'Unknown error'));
                }
            } else {
                alert('Data uploaded successfully!');
            }
        } catch(error) {
            const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message || 'Unknown error';
            alert('Error uploading file: ' + errorMsg);
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