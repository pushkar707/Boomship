"use client"
import { Container, Paper, Typography } from '@mui/material'
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react'

interface Log {
  log: string;
  time: string
}

const Page = ({ params }: any) => {
  const { subdomain, deploymentId } = params;
  const [logs, setLogs] = useState<Log[]>([])
  const logsFetchingInterval = useRef<NodeJS.Timeout>();
  const logsRef = useRef<Log[]>()

  useEffect(() => {
    logsRef.current = logs
  }, [logs])

  const fetchLogs = async () => {
    const logs = logsRef.current
    const lastLogTime = logs && encodeURIComponent(logs[logs.length - 1]?.time)
    const res = await axios.get(`http://localhost:8000/api/deployment/${deploymentId}/logs${logs?.length ? `?toContinue=true&time=${lastLogTime}` : ''}`)
    const data = res.data
    console.log(data);

    if (data.status) {
      data.data.logs.length && setLogs(prev => [...prev, ...data.data.logs])
      if (['READY', 'FAIL'].includes(data.data.status)) {
        console.log("FSdxzv df");
        clearInterval(logsFetchingInterval.current)
      }
    }
  }

  useEffect(() => {
    logsFetchingInterval.current = setInterval(async () => {
      fetchLogs()
    }, 5000);

    return () => {
      clearInterval(logsFetchingInterval.current)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [])

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