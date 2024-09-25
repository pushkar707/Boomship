import express, { Request, Response } from "express"
import { generateSlug } from "random-word-slugs";
import Redis from "ioredis";
import cors from "cors"
import { Server } from "socket.io"
import dotenv from "dotenv"
dotenv.config()

const subscriber = new Redis({
    host: '127.0.0.1',
    port: 6379,
})

const redisClient = new Redis({
    host: '127.0.0.1',
    port: 6379,
})

const io = new Server({
    cors: {
        origin: "http://localhost:3000"
    }
})

io.on("connection", socket => {
    socket.on("subscribe", channel => {
        console.log("subscribed to " + channel);

        socket.join(channel)
        socket.emit("message", "Creating service at " + channel);
    })
})

io.listen(8001)

subscriber.psubscribe("logs:*")
subscriber.subscribe("builds")
subscriber.on("pmessage", (pattern, channel, message) => {
    console.log(channel + ": " + message);
    io.to(channel).emit("message", message);
})

subscriber.on("message", async (channel, message) => {
    // io.to("logs:" + PROJECT_ID).emit("message", "Your Service is live at " + PROJECT_ID + ".localhost:9000")

})

const app = express();

app.use(express.json());
app.use(cors({
    origin: "http://localhost:3000"
}))

app.post("/project", async (req: Request, res: Response) => {
    const { gitUrl, buildCommand, baseDirectory, env } = req.body;

    // In real-world, I would have a db containing all project id, and hence I will check the db to make sure slug generated is unique
    const projectId = generateSlug();
    await redisClient.lpush("deployments", JSON.stringify({ projectId, gitUrl, buildCommand, baseDirectory, usersEnv: env }))
    res.json({ projectId });
})



app.listen(8000, () => {
    console.log("Listening on port 8000");
})

// TODO:
// Add a limit of number of files that cn be uploaded to AWS S3 at once, like 300/s
// error handling including deployment status
// Add cloudfront for reverse proxy, instead of having a reverse-proxy nodejs server
// zod vaalidations
// avoid websockets unless very much needed 