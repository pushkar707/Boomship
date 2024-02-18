import express, {Request, Response} from "express"
import Docker from "dockerode"
import path from "path"
import {generateSlug} from "random-word-slugs";
import Redis from "ioredis";
import { copyFilesFromContainer, uploadToS3 } from "./utils";
import cors from "cors"
import {Server} from "socket.io"
import dotenv from "dotenv"
dotenv.config()

const subscriber = new Redis({
    host: '127.0.0.1',
    port: 6379,
})

const io = new Server({ cors:{
    origin:"http://localhost:3000"
} })

io.on("connection",socket => {
    socket.on("subscribe", channel => {
        console.log("subscribed to "+ channel);
        
        socket.join(channel)
        socket.emit("message", "Creating service at "+channel);
    })
})

io.listen(8001)

subscriber.psubscribe("logs:*")
subscriber.subscribe("builds")
subscriber.on("pmessage", (pattern, channel, message) => {    
    console.log(channel + ": " + message);
    io.to(channel).emit("message",message);
})

subscriber.on("message", async(channel, message) => {
    const {PROJECT_ID, containerId} = JSON.parse(message)

    const container = await docker.getContainer(containerId);
    await copyFilesFromContainer(container,  '/home/app/output/dist', path.join(__dirname, "/outputs/"+PROJECT_ID));
    await container.stop();
    await container.remove()

    await uploadToS3(PROJECT_ID)
    io.to("logs:"+PROJECT_ID).emit("message","Your Service is live at " + PROJECT_ID + ".localhost:9000")

})

const app = express();
const docker = new Docker();

app.use(express.json());
app.use(cors({
    origin:"http://localhost:3000"
}))

app.post("/project", async(req: Request,res: Response) => {
    const {gitUrl,buildCommand, baseDirectory, env} = req.body;

    // In real-world, I would have a db containing all project id, and hence I will check the db to make sure slug generated is unique
    const projectId = generateSlug();

    const envValue = [`GIT_REPOSITORY_URL=${gitUrl}`, `PROJECT_ID=${projectId}`, `BUILD_COMMAND=${buildCommand}`, `BASE_DIRECTORY=${baseDirectory}`]

    env && Object.keys(env).forEach(key => {
        envValue.push(`${key}=${env[key]}`)
    });
    

    const containerOptions = {
        Image: "vercel-clone-builder-img",
        Env: envValue,
    }

    const container = await docker.createContainer(containerOptions)
    await container.start()
    console.log("Container started");

    res.json({projectId});
})



app.listen(8000, () => {
    console.log("Listening on port 3000");
})