import { createClient } from "redis"
import Docker from "dockerode"
import dotenv from "dotenv"
import path from "path"
import { copyFilesFromContainer, uploadToS3 } from "./utils"
dotenv.config()

const redisClient = createClient({ url: process.env.REDIS_URL })
const docker = new Docker()
const init = async () => {
    await redisClient.connect()
    console.log("BUild server started");

    while (true) {
        const deployment = await redisClient.lPop("deployments")
        if (deployment) {
            const { gitUrl, projectId, buildCommand, baseDirectory, usersEnv }: any = JSON.parse(deployment)
            const envValue = [`GIT_REPOSITORY_URL=${gitUrl}`, `PROJECT_ID=${projectId}`, `BUILD_COMMAND=${buildCommand}`, `BASE_DIRECTORY=${baseDirectory}`]

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

        const build = await redisClient.lPop("builds")
        if (build) {
            const { PROJECT_ID, containerId } = JSON.parse(build)

            const container = await docker.getContainer(containerId);
            await copyFilesFromContainer(container, '/home/app/output/dist', path.join(__dirname, "/outputs/" + PROJECT_ID));
            await container.stop();
            await container.remove()

            await uploadToS3(PROJECT_ID)
        }
    }
}

init()