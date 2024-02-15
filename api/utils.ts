import path from "path"
import tar from "tar-fs"

export async function copyFilesFromContainer(container:any, containerPath:string, hostPath:string) {
    const tarStream = await container.getArchive({ path: containerPath });

    const extractPath = path.resolve(hostPath);
    tarStream.pipe(tar.extract(extractPath));

    return new Promise<void>((resolve, reject) => {
        tarStream.on('end', () => {
            console.log('Files copied from container successfully');
            resolve();
        });

        tarStream.on('error', (err:any) => {
            console.error('Error copying files from container:', err);
            reject(err);
        });
    });
}

// export const uploadToS3()