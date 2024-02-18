"use client"
import { Container, Paper, Typography } from '@mui/material'
import React, { useEffect, useState } from 'react'
import {io} from "socket.io-client"

const Page = ({params}:any) => {
  const {projectId} = params;
  const [logs, setLogs] = useState<string[]>([])
  
  const socket = io("http://localhost:8001");
  useEffect(() => {
    socket.emit("subscribe","logs:" +projectId);

    const handleMessage = (message:string) => {
      setLogs((prev) => [...prev, message]);
    };

    socket.on("message", handleMessage);

    return () => {
      socket.off("message", handleMessage);
    }
  },[])

  return (
    <Container sx={{minHeight: "100vh"}} >
      <Paper sx={{my:7, py:6, px:5, width:"100%", bgcolor:"#ffffff80"}} >
        {logs.map((log , index) => {
          return <Typography sx={{my:3}} key={index} >
          {log}
        </Typography>
        })}
      </Paper>
    </Container>
  )
}

export default Page