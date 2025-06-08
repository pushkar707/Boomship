import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import Redis from 'ioredis';

const redisClient = new Redis({
  host: 'host.docker.internal',
  port: 6379
});

const SUB_DOMAIN = process.env.SUB_DOMAIN;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;

const publishLog = (log: string) => {
  redisClient.rpush(
    'build-logs',
    JSON.stringify({ deploymentId: DEPLOYMENT_ID, log, time: Date.now() })
  );
  console.log(log);
};

async function init() {
  publishLog('Finished cloning repository');
  console.log('Executing script.js');
  const outDirPath = path.join(__dirname, 'output');

  const p = exec(
    `cd ${outDirPath} && npm install && ${process.env.BUILD_COMMAND || 'npm run build'
    }`
  );

  p?.stdout?.on('data', async (data) => {
    publishLog(data.toString());
  });

  p?.stdout?.on('error', async (data) => {
    publishLog('Error: ' + data.toString());
  });

  p?.stdout?.on('close', async () => {
    publishLog('Build Completed');
    await redisClient.lpush(
      'builds',
      JSON.stringify({ SUB_DOMAIN, containerId: process.env.HOSTNAME, deploymentId: DEPLOYMENT_ID })
    );
    // @ts-ignore
    p?.stdin?.resume(); // to allow workers to copy files before container closes
  });
}

init();
