import express from "express"
import httpProxy from "http-proxy";
import dotenv from "dotenv"
dotenv.config();
const app = express();

const BASE_PATH = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/__outputs`

const proxy = httpProxy.createProxy()

app.use((req, res) => {
    const hostname = req.hostname;
    const subdomain = hostname.split('.')[0];

    // Custom Domain - DB Query

    const resolvesTo = `${BASE_PATH}/${subdomain}`
    return proxy.web(req, res, { target: resolvesTo, changeOrigin: true })

})

proxy.on('proxyReq', (proxyReq, req, res) => {
    console.log("FSDxfcsdfcdsx");
    
    const url = req.url;
    console.log(url);
    
    if (url === '/')
        proxyReq.path += 'index.html'

})

const PORT = 9000
app.listen(PORT, () => console.log(`Reverse Proxy Running..${PORT}`))