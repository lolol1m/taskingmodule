import React, { useState } from "react";
import { Box, Button, TextField, MenuItem, Typography, Alert } from "@mui/material";
import axios from "axios";

const roles = [
  { label: "II", value: "II" },
  { label: "Senior II", value: "Senior II" },
  { label: "IA", value: "IA" },
];

function CreateUser() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("II");
  const [status, setStatus] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (!username.trim() || !password.trim()) {
      setStatus({ type: "error", message: "Username and password are required." });
      return;
    }

    try {
      const res = await axios.post("/createUser", {
        username: username.trim(),
        password: password.trim(),
        role,
      });
      if (res.data?.success) {
        setStatus({ type: "success", message: `User ${username} created.` });
        setUsername("");
        setPassword("");
        setRole("II");
      } else {
        setStatus({ type: "error", message: res.data?.error || "Failed to create user." });
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Failed to create user.";
      setStatus({ type: "error", message: msg });
    }
  };

  return (
    <Box sx={{ maxWidth: 420, margin: "24px auto", display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6">Create User</Typography>
      {status && <Alert severity={status.type}>{status.message}</Alert>}
      <TextField
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        fullWidth
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
      />
      <TextField
        label="Role"
        select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        fullWidth
      >
        {roles.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>
      <Button variant="contained" onClick={handleSubmit}>
        Create User
      </Button>
    </Box>
  );
}

export default CreateUser;
