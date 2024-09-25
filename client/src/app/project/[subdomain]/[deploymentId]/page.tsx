"use client"
import { Container, Paper, Typography } from '@mui/material'
import axios from 'axios';
import React, { useEffect, useState } from 'react'

const Page = ({ params }: any) => {
  const { subdomain, deploymentId } = params;
  const [logs, setLogs] = useState<{ log: string, time: string }[]>([])

  useEffect(() => {    
    const interval = setInterval(async () => {
      const lastLogTime = encodeURIComponent(logs[logs.length - 1]?.time)
      const res = await axios.get(`http://localhost:8000/api/deployment/${deploymentId}/logs${logs.length ? `?toContinue=true&time=${lastLogTime}` : ''}`)
      const data = res.data
      console.log(data);

      if (data.status)
        setLogs(prev => [...prev, ...data.data.logs])
    }, 5000);

    return () => {
      clearInterval(interval)
    }
  }, [logs])

  return (
    <Container sx={{ minHeight: "100vh" }} >
      <Paper sx={{ my: 7, py: 6, px: 5, width: "100%", bgcolor: "#ffffff80" }} >
        {logs.map((log, index) => {
          return <Typography sx={{ my: 3 }} key={index} >
            {log.log}
          </Typography>
        })}
      </Paper>
    </Container>
  )
}

export default Page