const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const APPID = '896c5d2b';
const APISecret = 'YzRlNzI4ZjEwZGE5YTQ4OGM0YTY4OWM0';
const APIKey = '3a3868d51a0f7f8cb48df18c8bd88210';

function getAuthUrl() {
    const host = 'tts-api.xfyun.cn';
    const date = new Date().toUTCString();
    const algorithm = 'hmac-sha256';
    const headers = 'host date request-line';
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/tts HTTP/1.1`;
    const signatureSha = crypto.createHmac('sha256', APISecret)
        .update(signatureOrigin)
        .digest('base64');
    const authorizationOrigin = `api_key="${APIKey}", algorithm="${algorithm}", headers="${headers}", signature="${signatureSha}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');
    return `wss://tts-api.xfyun.cn/v2/tts?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;
}

app.post('/api/tts', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    const wsUrl = getAuthUrl();
    const ws = new WebSocket(wsUrl);

    let audioBuffers = [];
    let responded = false;

    ws.on('open', () => {
        const frame = {
            common: { app_id: APPID },
            business: {
                aue: 'lame', // mp3
                auf: 'audio/L16;rate=16000',
                vcn: 'x4_lingfeizhe_zl', // 发音人
                tte: 'utf8',
                speed: 40
            },
            data: {
                status: 2,
                text: Buffer.from(text).toString('base64')
            }
        };
        ws.send(JSON.stringify(frame));
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.code !== 0) {
            if (!responded) {
                responded = true;
                ws.close();
                return res.status(500).json({ error: msg.message });
            }
        }
        if (msg.data && msg.data.audio) {
            audioBuffers.push(Buffer.from(msg.data.audio, 'base64'));
        }
        if (msg.data && msg.data.status === 2) {
            if (!responded) {
                responded = true;
                ws.close();
                // 合并音频buffer并返回
                const audioBuffer = Buffer.concat(audioBuffers);
                res.set('Content-Type', 'audio/mpeg');
                res.send(audioBuffer);
            }
        }
    });

    ws.on('error', (err) => {
        if (!responded) {
            responded = true;
            res.status(500).json({ error: err.message });
        }
    });

    ws.on('close', () => {
        if (!responded) {
            responded = true;
            res.status(500).json({ error: 'WebSocket closed unexpectedly' });
        }
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`TTS proxy server running at http://localhost:${PORT}`);
});