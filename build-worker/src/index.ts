import { createClient } from "redis"
import Docker from "dockerode"
import dotenv from "dotenv"
import path from "path"
import { copyFilesFromContainer, uploadToS3 } from "./utils"
import axios from "axios"
dotenv.config()

const API_SERVER = process.env.API_SERVER
const PROXY_SERVER = process.env.PROXY_SERVER
const LOGS_BATCH_SIZE = 100;

const redisClient = createClient({ url: process.env.REDIS_URL })
const docker = new Docker()
const init = async () => {
    await redisClient.connect()
    console.log("Build server started");

    // Every 4 seconds retrieve logs that are being thrown to redis by docker containers
    setInterval(async () => {
        const replies = await redisClient.multi()
            .lRange('build-logs', 0, LOGS_BATCH_SIZE - 1)
            .lTrim('build-logs', LOGS_BATCH_SIZE, -1).exec()
        const logs = (replies[0] as string[]).map((item: string) => {
            const currLog = JSON.parse(item)
            const { deploymentId, log, time } = currLog
            return { deploymentId: parseInt(deploymentId), log, time: new Date(time) }
        })

        // API to update logs in DB, there's another API that client calls to fetch the logs
        logs.length && await axios.post(`${API_SERVER}/api/deployment/logs`, {
            logs
        })

    }, 4000);

    while (true) {
        // Start docker container for deployments
        const deployment = await redisClient.rPop("deployments")
        if (deployment) {
            const { gitUrl, subdomain, buildCommand, baseDirectory, usersEnv, deploymentId }: any = JSON.parse(deployment)
            axios.patch(`${API_SERVER}/api/deployment/${deploymentId}`, {
                status: 'PROGRESS'
            })
            const envValue = [`GIT_REPOSITORY_URL=${gitUrl}`, `DEPLOYMENT_ID=${deploymentId}`, `REDIS_URL=${process.env.REDIS_URL}`, `API_SERVER=${API_SERVER}`, `SUB_DOMAIN=${subdomain}`, `BUILD_COMMAND=${buildCommand}`, `BASE_DIRECTORY=${baseDirectory}`]

            usersEnv && usersEnv.forEach(({ key, value }: { key: string, value: string }) => {
                envValue.push(`${key}=${value}`)
            });

            const containerOptions = {
                Image: process.env.DOCKER_IMAGE,
                Env: envValue,
            }

            const container = await docker.createContainer(containerOptions)
            await container.start()
            console.log("Container started");
        }

        // Copy build files from container upon build completion, and uploads them to AWS S3
        const build = await redisClient.rPop("builds")
        if (build) {
            const { SUB_DOMAIN, containerId, deploymentId } = JSON.parse(build)

            const container = await docker.getContainer(containerId);
            const files = await copyFilesFromContainer(container, '/home/app/output/dist', path.join(__dirname, "/outputs/" + SUB_DOMAIN));
            if (!files) {
                await axios.post(`${API_SERVER}/api/deployment/logs`, {
                    logs: [{ log: `Could not build the application.`, deploymentId: parseInt(deploymentId), time: new Date(Date.now()) }]
                })
                await axios.patch(`${API_SERVER}/api/deployment/${deploymentId}`, {
                    status: 'FAIL'
                })
            }

            await container.stop();
            await container.remove();

            await uploadToS3(SUB_DOMAIN)
            await axios.post(`${API_SERVER}/api/deployment/logs`, {
                logs: [{ log: `Your service is live at ${SUB_DOMAIN}.${PROXY_SERVER}`, deploymentId: parseInt(deploymentId), time: new Date(Date.now()) }]
            })
            await axios.patch(`${API_SERVER}/api/deployment/${deploymentId}`, {
                status: 'READY'
            })
        }
    }
}

init()