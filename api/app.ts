import express, { Request, Response } from "express"
import { generateSlug } from "random-word-slugs";
import Redis from "ioredis";
import cors from "cors"
import dotenv from "dotenv"
import PrismaClient from "./utils/PrismaClient";
import { DeploymentStatus } from "@prisma/client";
dotenv.config()

const redisClient = new Redis(process.env.REDIS_URL || 'localhost:6379')


const app = express();

app.use(express.json());
app.use(cors({
    origin: "http://localhost:3000"
}))

app.post("/project", async (req: Request, res: Response) => {
    // TODO: Body validations
    const { gitUrl, buildCommand, baseDirectory, env } = req.body;
    // In real-world, I would have a db containing all project id, and hence I will check the db to make sure slug generated is unique
    const subdomain = generateSlug();
    const project = await PrismaClient.project.create({
        data: {
            gitUrl,
            subdomain,
            baseDirectory,
            buildCommand,
            envObj: JSON.stringify(env)
        }
    })

    const deployment = await PrismaClient.deployment.create({
        data: {
            status: DeploymentStatus.QUEUE,
            projectId: project.id
        }
    })
    await redisClient.lpush("deployments", JSON.stringify({ subdomain, gitUrl, deploymentId: deployment.id, buildCommand, baseDirectory, usersEnv: env }))
    res.json({ status: true, message: 'Project created successfully', subdomain, deploymentId: deployment.id });
})

app.patch('/api/deployment/:id', async (req: Request, res: Response) => {
    // TODO: Validation to check status matches prisma enum values
    const { status } = req.body
    await PrismaClient.deployment.update({
        where: { id: parseInt(req.params.id) },
        data: { status }
    })
    return res.json({ status: true, message: `Deployment status updated to ${status}` })
})

app.get("/api/deployment/:id/logs", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)
    const { toContinue, time } = req.query as { toContinue: string, time: string }

    const whereQuery: any = {};
    if (toContinue == "true") {
        whereQuery.time = { gt: new Date(time) }
    }

    const deployment = await PrismaClient.deployment.findFirst({
        where: { id },
        select: {
            status: true,
            logs: {
                where: whereQuery,
                select: {
                    time: true, log: true
                }
            }
        }
    })

    if (!deployment)
        return res.json({ status: false, message: 'Deployment not found' })

    const { logs, status } = deployment
    return res.json({ status: true, data: { logs, status } })
})

app.post('/api/deployment/logs', async (req: Request, res: Response) => {
    const { logs } = req.body
    console.log(logs);
    await PrismaClient.log.createMany({
        data: logs
    })
    return res.json({ status: true, message: "Logs added successfully" })
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