import path from "path"
import tar from "tar-fs"
import fs from "fs";
import mime from "mime-types"
import dotenv from "dotenv"
dotenv.config()

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { Container } from "dockerode";
import { exec } from "child_process";

export async function copyFilesFromContainer(container: Container, containerPath: string, hostPath: string) {
    try {
        const tarStream = await container.getArchive({ path: containerPath }); // getting files from docker container in .tar stream
        tarStream.pipe(tar.extract(path.resolve(hostPath)));

        return new Promise<void>((resolve, reject) => {
            tarStream.on('end', () => {
                console.log('Files copied from container successfully');
                resolve();
            });

            tarStream.on('error', (err: any) => {
                console.error('Error copying files from container:', err);
                reject(err);
            });
        });
    }catch(e){
        return false
    }
}

const s3Client = new S3Client({
    region: process.env.AWS_BUCKET_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY || "",
        secretAccessKey: process.env.AWS_SECRET_KEY || ""
    }
})

export const uploadToS3 = async (project_id: string) => {
    // create a class to handle ratelimiting
    async function iterateFiles(directoryPath: string, currentPath = '') {
        try {
            const files = fs.readdirSync(directoryPath);

            for (const file of files) {
                const filePath = path.join(directoryPath, file);
                const fileRelativePath = path.join(currentPath, file);
                const stats = fs.statSync(filePath);

                if (stats.isDirectory()) {
                    // Recursively iterate through subdirectories
                    await iterateFiles(filePath, fileRelativePath);
                } else {
                    // Process the file  
                    const command = new PutObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: `__outputs/${project_id}/${fileRelativePath.replace(/\\/g, '/')}`,
                        Body: fs.createReadStream(filePath),
                        ContentType: mime.lookup(filePath) || ""
                    })

                    await s3Client.send(command)
                    console.log('uploaded', filePath)
                    fs.unlinkSync(filePath);
                }
            }
            fs.rmdirSync(directoryPath)
        } catch (error) {
            console.error('Error:', error);
        }
    }

    const distFolderPath = path.join(__dirname, 'outputs', project_id, 'dist');
    await iterateFiles(distFolderPath)
    fs.rmdirSync(path.join(__dirname, "outputs", project_id));
    console.log('Done...')
}