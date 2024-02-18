const { exec } = require("child_process")
const path = require("path");
const fs = require("fs");
const Redis = require("ioredis");
// const {S3Client, PutObjectCommand} = require("@aws-sdk/client-s3")
// const mime = require("mime-types")
// require("dotenv").config()

// const s3Client = new S3Client({
//     region: process.env.AWS_BUCKET_REGION,
//     credentials:{
//         accessKeyId: process.env.AWS_ACCESS_KEY,
//         secretAccessKey:  process.env.AWS_SECRET_KEY
//     }
// })

const publisher = new Redis({
    host: '192.168.0.104',
    port: 6379,
})

const PROJECT_ID = process.env.PROJECT_ID
const redisChannel = "logs:" + PROJECT_ID

async function init() {
    publisher.publish(redisChannel, "Finished cloning repository");
    console.log("Executing script.js");
    const outDirPath = path.join(__dirname, "output")

    const p = exec(`cd ${outDirPath} && npm install && ${process.env.BUILD_COMMAND || "npm run build"}`)

    p.stdout.on("data" , (data) => {
        publisher.publish(redisChannel, data.toString());
        console.log(data.toString());
    })

    p.stdout.on("error" , (data) => {
        publisher.publish(redisChannel, "Error" + data.toString());
        console.log("Error" + data.toString());
    })
    
    p.stdout.on("close" , async () => {
        publisher.publish(redisChannel, "Build Completed");
        console.log("Build Completed");
        publisher.publish("builds", JSON.stringify({PROJECT_ID, containerId: process.env.HOSTNAME}))
        setTimeout(() => {console.log("Timer completed")}, 100000);
    })
}

init()