import express, {Request, Response} from "express"
import Docker from "dockerode"
import path from "path"
import {generateSlug} from "random-word-slugs";
import Redis from "ioredis";
import { copyFilesFromContainer, uploadToS3 } from "./utils";
import dotenv from "dotenv"
dotenv.config()

const subscriber = new Redis({
    host: '127.0.0.1',
    port: 6379,
})

subscriber.psubscribe("logs:*")
subscriber.subscribe("builds")
subscriber.on("pmessage", (pattern, channel, message) => {    
    console.log(channel + ": " + message);
})

subscriber.on("message", async(channel, message) => {
    const {PROJECT_ID, containerId} = JSON.parse(message)

    const container = await docker.getContainer(containerId);
    await copyFilesFromContainer(container,  '/home/app/output/dist', path.join(__dirname, "/outputs/"+PROJECT_ID));
    await container.stop();
    await container.remove()

    await uploadToS3(PROJECT_ID)
})

const app = express();
const docker = new Docker();

app.use(express.json());

app.post("/project", async(req: Request,res: Response) => {
    const {gitUrl,buildCommand, startCommand, env} = req.body;

    const projectId = generateSlug();

    const containerOptions = {
        Image: "vercel-clone-builder-img",
        Env: [`GIT_REPOSITORY_URL=${gitUrl}`, `PROJECT_ID=${projectId}`],
    }

    const container = await docker.createContainer(containerOptions)
    await container.start()
    console.log("Container started");

    res.json({projectId});
})



app.listen(8000, () => {
    console.log("Listening on port 3000");
})