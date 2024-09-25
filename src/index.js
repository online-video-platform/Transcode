// # Transcode
// The **Transcoding Proxy** is an essential part of video processing system. 🎥 It performs a crucial role in preparing videos for different devices, formats, and network conditions. Here’s a detailed description:

// ### **🔄 Transcoding Proxy:**

// - **Function**: The Transcoding Proxy converts the original video uploaded by users into multiple formats, resolutions, and bitrates. 📹 This process is called "transcoding."

// - **Why It's Important**: 
//   - It ensures that the video can be viewed on any device (smartphone, tablet, computer, TV) and under different internet speeds. 📱💻📺
//   - Creates multiple versions of the video, like 144p, 240p, 360p, 720p, 1080p, and even up to 4K, so users can select the quality that suits their connection. 📶
let qualityLevels = [
    { resolution: '144p', bitrate: '400k' },
    { resolution: '240p', bitrate: '800k' },
    { resolution: '360p', bitrate: '1.2M' },
    { resolution: '480p', bitrate: '2M' },
    { resolution: '720p', bitrate: '3M' },
    { resolution: '1080p', bitrate: '6M' },
    { resolution: '4K', bitrate: '20M' }
];
// - **How It Works**:
//   1. **Receives Original Video**: Takes the video from the main server after upload.
//   2. **Converts Video**: Transcodes it into multiple formats (e.g., MP4 with H.264 codec) and resolutions.
//   3. **Sends to Other Proxies**: Passes the transcoded versions to the CDN, caching, and other proxies for delivery to users. 🚀

// **Summary**: The Transcoding Proxy ensures that every video is converted into different formats and quality levels, making it accessible and playable for all viewers, regardless of their device or internet speed. 🎬🌟

const express = require('express');
const httpProxy = require('http-proxy');
const ffmpeg = require('fluent-ffmpeg');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();

let port = process.env.PORT;
let proxyTarget = process.env.PROXY_TARGET;
let cachePath = process.env.CACHE_PATH;
const proxy = httpProxy.createProxyServer({ target: proxyTarget });
function djb2 (str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return hash >>> 0;
};

function transcodeMedia(downloadedPath, bitrate, res) {
    let cachedTranscodedPath = downloadedPath + '.mp4';
    let transcodedPartPath = cachedTranscodedPath + '.part.mp4';
    console.log('Transcoding to', transcodedPartPath);
    ffmpeg(downloadedPath)
        .outputFormat('mp4')
        .outputOptions('-y')
        .outputOptions('-c copy')
        .videoBitrate(bitrate)
        .outputOptions('-preset ultrafast')
        .on('end', () => {
            fs.renameSync(transcodedPartPath, cachedTranscodedPath);
            console.log('Transcoded to', cachedTranscodedPath);
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', 'inline');

            res.sendFile(cachedTranscodedPath);
        })
        .on('progress', (progress) => { console.log('Processing: ' + progress.percent + '% done'); })
        .on('error', (err) => {
            console.log('Error transcoding', err);
            res.status(500).send('Error transcoding');
        })
        .output(transcodedPartPath)
        .run();
};
app.use((req, res) => {
    console.log('Request', req.query);
    if (req.url.startsWith('/stream/')) {
        let quality = Number(req.query.quality);
        console.log('Quality', JSON.stringify([quality]));
        let qualityLevel = qualityLevels[quality];
        console.log('Quality level', qualityLevel);
        let bitrate = qualityLevel.bitrate;
        let filename = djb2(req.url + bitrate);
        // 
        console.log('Transcoding');
        let downloadedPath = path.join(cachePath, "downloaded_" + filename + '.mkv');
        let unfinishedDownloadPath = downloadedPath + '.part';
        console.log('Downloading from', proxyTarget + req.url);
        console.log('Downloading to', downloadedPath);
        let downloadStream = fs.createWriteStream(unfinishedDownloadPath);
        http.get(proxyTarget + req.url, (downloadResponse) => {
            downloadResponse.pipe(downloadStream);
        });
        downloadStream.on('finish', () => {
            fs.renameSync(unfinishedDownloadPath, downloadedPath);
            console.log('Downloaded to', downloadedPath);
            transcodeMedia(downloadedPath, bitrate, res);
        });
        downloadStream.on('error', (err) => {
            console.log('Error downloading', err);
            res.status(500).send('Error downloading');
        });
    }else{
        if (req.url === '/health') {
            res.send('OK');
        }else {
            proxy.web(req, res);
        }
    }
});


app.use(express.json());

app.listen(port, () => {
    console.log(`Transcoding proxy listening on port ${port}`);
});

