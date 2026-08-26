const http = require('http');
const https = require('https');
const url = require('url');
const WebSocket = require('ws');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';

const DISCORD_IDS = ['216738682852343818', '287243601262542849'];

const PORT = Number(process.env.PORT) || 5500;
const HOST = process.env.HOST || '0.0.0.0';
const API_ONLY = process.env.API_ONLY === '1' || process.env.API_ONLY === 'true';

const presenceCache = {};
DISCORD_IDS.forEach(id => {
    presenceCache[id] = {
        status: 'offline',
        customStatusText: null,
        customStatusEmoji: null,
        spotify: null,
        activities: []
    };
});

function fetchDiscordUser(userId) {
    return new Promise((resolve, reject) => {
        if (!BOT_TOKEN) return reject(new Error('Token yok'));

        const options = {
            hostname: 'discord.com',
            path: `/api/v10/users/${userId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bot ${BOT_TOKEN}`,
                'User-Agent': 'DiscordBot (https://wensia.love, 1.0.0)'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const user = JSON.parse(data);
                        resolve({
                            id: user.id,
                            username: user.username,
                            global_name: user.global_name || user.username,
                            avatar: user.avatar
                                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`
                                : `https://cdn.discordapp.com/embed/avatars/${(BigInt(user.id) >> 22n) % 6n}.png`,
                            public_flags: user.public_flags || 0
                        });
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.end();
    });
}

function parsePresence(presenceData) {
    const status = presenceData.status || 'offline';
    const activities = presenceData.activities || [];

    let customStatusText = null;
    let customStatusEmoji = null;
    const customAct = activities.find(a => a.type === 4);
    if (customAct) {
        customStatusText = customAct.state || null;
        if (customAct.emoji) customStatusEmoji = customAct.emoji.name || null;
    }

    let spotifyData = null;
    const spotifyAct = activities.find(a => a.type === 2 && a.name === 'Spotify');
    if (spotifyAct) {
        let albumArt = null;
        if (spotifyAct.assets && spotifyAct.assets.large_image) {
            const img = spotifyAct.assets.large_image;
            if (img.startsWith('spotify:')) {
                albumArt = `https://i.scdn.co/image/${img.replace('spotify:', '')}`;
            } else {
                albumArt = img;
            }
        }

        spotifyData = {
            song: spotifyAct.details || 'Bilinmeyen Sarki',
            artist: spotifyAct.state || 'Bilinmeyen Sanatci',
            album: spotifyAct.assets?.large_text || '',
            albumArt: albumArt,
            timestamps: spotifyAct.timestamps || null
        };
    }

    return {
        status,
        customStatusText,
        customStatusEmoji,
        spotify: spotifyData,
        activities
    };
}

let gatewayWs = null;
let heartbeatInterval = null;
let lastSequence = null;
let sessionId = null;
let resumeGatewayUrl = null;
let isReconnecting = false;

function connectGateway() {
    if (isReconnecting) return;
    isReconnecting = true;

    const gatewayUrl = resumeGatewayUrl || 'wss://gateway.discord.gg/?v=10&encoding=json';
    
    console.log('[Gateway] Baglaniyor:', gatewayUrl);

    try {
        gatewayWs = new WebSocket(gatewayUrl);
    } catch (e) {
        console.error('[Gateway] WebSocket olusturma hatasi:', e.message);
        isReconnecting = false;
        setTimeout(connectGateway, 5000);
        return;
    }

    gatewayWs.on('open', () => {
        console.log('[Gateway] WebSocket baglantisi acildi');
        isReconnecting = false;
    });

    gatewayWs.on('message', (rawData) => {
        let payload;
        try {
            payload = JSON.parse(rawData.toString());
        } catch (e) {
            return;
        }

        const { op, d, s, t } = payload;

        if (s !== null) lastSequence = s;

        switch (op) {
            case 0:
                handleDispatch(t, d);
                break;

            case 1:
                sendHeartbeat();
                break;

            case 7:
                console.log('[Gateway] Sunucu yeniden baglanma istedi');
                gatewayWs.close(4000, 'Reconnect requested');
                break;

            case 9:
                console.log('[Gateway] Gecersiz oturum, yeniden identify ediliyor...');
                sessionId = null;
                lastSequence = null;
                setTimeout(() => sendIdentify(), 2000);
                break;

            case 10:
                console.log('[Gateway] Hello alindi, heartbeat baslatiyor...');
                startHeartbeat(d.heartbeat_interval);
                
                if (sessionId && lastSequence !== null) {
                    sendResume();
                } else {
                    sendIdentify();
                }
                break;

            case 11:
                break;
        }
    });

    gatewayWs.on('close', (code, reason) => {
        console.log(`[Gateway] Baglanti kapandi (${code}): ${reason}`);
        stopHeartbeat();
        isReconnecting = false;

        const noReconnectCodes = [4004, 4010, 4011, 4012, 4013, 4014];
        if (noReconnectCodes.includes(code)) {
            console.error('[Gateway] Kalici hata, yeniden baglanilmayacak');
            return;
        }

        setTimeout(connectGateway, 5000);
    });

    gatewayWs.on('error', (err) => {
        console.error('[Gateway] WebSocket hatasi:', err.message);
        isReconnecting = false;
    });
}

function sendIdentify() {
    const intents = (1 << 0) | (1 << 8) | (1 << 15);

    const identifyPayload = {
        op: 2,
        d: {
            token: BOT_TOKEN,
            intents: intents,
            properties: {
                os: 'windows',
                browser: 'wensia.love',
                device: 'wensia.love'
            }
        }
    };

    console.log('[Gateway] IDENTIFY gonderiliyor...');
    gatewayWs.send(JSON.stringify(identifyPayload));
}

function sendResume() {
    const resumePayload = {
        op: 6,
        d: {
            token: BOT_TOKEN,
            session_id: sessionId,
            seq: lastSequence
        }
    };

    console.log('[Gateway] RESUME gonderiliyor...');
    gatewayWs.send(JSON.stringify(resumePayload));
}

function startHeartbeat(interval) {
    stopHeartbeat();
    
    const jitter = Math.random();
    setTimeout(() => {
        sendHeartbeat();
        heartbeatInterval = setInterval(sendHeartbeat, interval);
    }, interval * jitter);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

function sendHeartbeat() {
    if (gatewayWs && gatewayWs.readyState === WebSocket.OPEN) {
        gatewayWs.send(JSON.stringify({ op: 1, d: lastSequence }));
    }
}

function handleDispatch(eventName, data) {
    switch (eventName) {
        case 'READY':
            sessionId = data.session_id;
            resumeGatewayUrl = data.resume_gateway_url;
            console.log(`[Gateway] READY! Bot: ${data.user.username}#${data.user.discriminator}`);
            console.log(`[Gateway] ${data.guilds.length} sunucu bulundu`);
            break;

        case 'GUILD_CREATE':
            if (data.presences) {
                data.presences.forEach(presence => {
                    const userId = presence.user?.id;
                    if (userId && DISCORD_IDS.includes(userId)) {
                        presenceCache[userId] = parsePresence(presence);
                        console.log(`[Gateway] Ilk presence: ${userId} -> ${presenceCache[userId].status}${presenceCache[userId].spotify ? ' (Spotify: ' + presenceCache[userId].spotify.song + ')' : ''}`);
                    }
                });
            }
            break;

        case 'PRESENCE_UPDATE':
            const userId = data.user?.id;
            if (userId && DISCORD_IDS.includes(userId)) {
                presenceCache[userId] = parsePresence(data);
                const p = presenceCache[userId];
                console.log(`[Presence] ${userId}: ${p.status}${p.spotify ? ' | Spotify: ' + p.spotify.song + ' - ' + p.spotify.artist : ' | Spotify yok'}${p.customStatusText ? ' | Durum: ' + p.customStatusText : ''}`);
            }
            break;

        case 'RESUMED':
            console.log('[Gateway] Oturum basariyla devam ettirildi');
            break;
    }
}

connectGateway();

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (parsedUrl.pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, gateway: Boolean(BOT_TOKEN) }));
        return;
    }

    if (parsedUrl.pathname === '/api/users') {
        try {
            const results = await Promise.all(
                DISCORD_IDS.map(async (id) => {
                    const profile = await fetchDiscordUser(id).catch(() => null);
                    const presence = presenceCache[id] || {};
                    return {
                        id,
                        username: profile ? profile.username : undefined,
                        global_name: profile ? profile.global_name : undefined,
                        avatar: profile ? profile.avatar : undefined,
                        status: presence.status || 'offline',
                        customStatusText: presence.customStatusText,
                        customStatusEmoji: presence.customStatusEmoji,
                        spotify: presence.spotify
                    };
                })
            );
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, users: results }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
    }

    if (API_ONLY) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Not found' }));
        return;
    }

    const fs = require('fs');
    const path = require('path');

    let filePath = path.join(__dirname, parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);
    const ext = path.extname(filePath);

    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.mp3': 'audio/mpeg',
        '.webp': 'image/webp'
    };

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
            res.end(content);
        }
    });
});

server.listen(PORT, HOST, () => {
    if (!BOT_TOKEN) {
        console.warn('[UYARI] DISCORD_BOT_TOKEN yok. Presence calismaz.');
    }
    console.log(`\n==================================================`);
    console.log(`WENSIA.LOVE bot API calisiyor (${HOST}:${PORT})`);
    console.log(`API: http://${HOST}:${PORT}/api/users`);
    console.log(`Mod: ${API_ONLY ? 'sadece API (GitHub Pages icin)' : 'API + statik site'}`);
    console.log(`==================================================\n`);
});
