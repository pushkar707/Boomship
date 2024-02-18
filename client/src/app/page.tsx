"use client"
import { Button, Container, Input, TextField } from "@mui/material";
import axios from "axios";
import { FormEvent, useState } from "react";

export default function Home() {

  const [gitUrl, setGitUrl] = useState("")

  const handleSubmit = async (e:FormEvent) => {
    e.preventDefault()
    
    const res = await axios.post(process.env.NEXT_PUBLIC_API_URL + "/project",{gitUrl})
    const data = await res.data
    window.location.href = "/deployment/" + data.projectId
  }

  return (
    <Container component={"form"} onSubmit={handleSubmit} sx={{p: 4, height:"100vh", width: "100vw", display:"flex",  justifyContent:"center", alignItems:"center", gap:1 }}>
      <TextField
        label="Enter React Repository URL"
        variant="outlined"
        sx={{width: {xs: "100%", md: "50%",}}}
        value={gitUrl}
        onChange={(e) => setGitUrl(e.target.value)}
      />
      <Button type="submit" variant="contained" color="primary" size="large" >
        Deploy
      </Button>
    </Container>
  );
}
