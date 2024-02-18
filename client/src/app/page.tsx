"use client"
import { Box, Button, Container, Input, TextField, Typography } from "@mui/material";
import axios from "axios";
import { FormEvent, useState } from "react";

export default function Home() {

  const [gitUrl, setGitUrl] = useState("")
  const [buildCommand, setBuildCommand] = useState("npm run build");
  const [baseDirectory, setBaseDirectory] = useState("/");

  const [envKeys, setenvKeys] = useState({});

  const handleSubmit = async (e:FormEvent) => {
    e.preventDefault()
    
    const res = await axios.post(process.env.NEXT_PUBLIC_API_URL + "/project",{gitUrl, buildCommand, baseDirectory, env:{PORT_TEST:"80002"}})
    const data = await res.data
    window.location.href = "/deployment/" + data.projectId
  }

  return (
    <Container component={"form"} onSubmit={handleSubmit} sx={{p: 4, height:"100vh", width: "100vw", display:"flex",  justifyContent:"center", alignItems:"center", gap:3, flexDirection:"column" }}>
      <Box sx={{display:"flex", flexDirection:"column", gap:3, width:{xs: "100%", md: "50%",} }} >
        <TextField
          label="Enter React Repository URL"
          variant="outlined"
          sx={{width:"100%" }}
          value={gitUrl}
          onChange={(e) => setGitUrl(e.target.value)}
        />

        <TextField
          label="Enter Build Command"
          variant="outlined"
          sx={{width:"100%" }}
          value={buildCommand}
          onChange={(e) => setBuildCommand(e.target.value)}
        />

        <TextField
          label="Enter Base Directory"
          variant="outlined"
          sx={{width:"100%" }}
          value={baseDirectory}
          onChange={(e) => setBaseDirectory(e.target.value)}
        />

        <Typography>
          Environment Variables
        </Typography>
        <Box sx={{display:"flex", columnGap:1}} >
          <TextField
            label="Enter Key"
            variant="outlined"
            // value={baseDirectory}
            // onChange={(e) => setBaseDirectory(e.target.value)}
          />

          <TextField
            label="Enter Value"
            variant="outlined"
            // value={baseDirectory}
            // onChange={(e) => setBaseDirectory(e.target.value)}
          />

          <Button variant="outlined" color="primary" size="small" >
            Add
          </Button>          
        </Box>

        <Button sx={{width:"fit-content"}} type="submit" variant="contained" color="primary" size="large" >
          Deploy
        </Button>
      </Box>
      
    </Container>
  );
}
