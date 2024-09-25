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

function transcodeMedia(cachedTranscodedPath, bitrate, res) {
    let transcodedPartPath = cachedTranscodedPath + '.part';
    console.log('Transcoding to', transcodedPartPath);
    ffmpeg(cachedTranscodedPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(bitrate)
        .outputOptions('-preset ultrafast')
        .on('end', () => {
            console.log('Transcoding finished');
            fs.renameSync(transcodedPartPath, cachedTranscodedPath);
            res.sendFile(cachedTranscodedPath);
        })
        .on('error', (err) => {
            console.log('Error transcoding', err);
            res.status(500).send('Error transcoding');
        })
        .output(transcodedPartPath)
        .run();
};
app.use((req, res) => {
    if (req.url.startsWith('/stream/')) {
        let quality = req.query.quality;
        let bitrate = qualityLevels[quality].bitrate;
        let filename = djb2(req.url + bitrate);
        // 
        console.log('Transcoding');
        let cachedTranscodedPath = path.join(cachePath, "transcoded_" + filename + '.mkv');
        let unfinishedDownloadPath = cachedTranscodedPath + '.part';
        console.log('Downloading from', proxyTarget + req.url);
        if (!fs.existsSync(cachePath)) {
            fs.mkdirSync(cachePath);
        }
        if (fs.existsSync(cachedTranscodedPath)) {
            console.log('Downloaded file already exists, ', cachedTranscodedPath);
        }else{
            console.log('Downloading to', cachedTranscodedPath);
            let downloadStream = fs.createWriteStream(unfinishedDownloadPath);
            http.get(proxyTarget + req.url, (downloadResponse) => {
                downloadResponse.pipe(downloadStream);
            });
            downloadStream.on('finish', () => {
                fs.renameSync(unfinishedDownloadPath, cachedTranscodedPath);
                console.log('Downloaded to', cachedTranscodedPath);
                transcodeMedia(cachedTranscodedPath, bitrate, res);
            });
        }
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

