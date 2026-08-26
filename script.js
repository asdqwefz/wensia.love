/* ==========================================
   WENSIA.LOVE - Main Engine
   Combines CONFIG + Official Discord API + Real-Time Presence & Spotify
   ========================================== */

// Spotify live progress timers
const spotifyTimers = {};

// Music playlist for bottom audio bar
const PLAYLIST = [
    {
        title: 'Her şey senle güzel',
        artist: 'Chiko',
        src: 'music/hersey-senle-guzel.mp3',
        youtubeId: 'ujOk1_USYy4',
        cover: 'https://img.youtube.com/vi/ujOk1_USYy4/mqdefault.jpg'
    }
];

// ─── PARTICLES ───
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart-particle';
        heart.innerHTML = '<i class="fas fa-heart"></i>';
        
        const size = Math.random() * 15 + 10;
        heart.style.left = Math.random() * 100 + '%';
        heart.style.fontSize = size + 'px';
        heart.style.animationDuration = (Math.random() * 6 + 6) + 's';
        heart.style.animationDelay = (Math.random() * 5) + 's';
        
        container.appendChild(heart);
    }
}

// ─── CURSOR GLOW ───
function initCursorGlow() {
    const glow = document.getElementById('cursorGlow');
    if (!glow) return;
    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateGlow() {
        glowX += (mouseX - glowX) * 0.08;
        glowY += (mouseY - glowY) * 0.08;
        glow.style.left = glowX + 'px';
        glow.style.top = glowY + 'px';
        requestAnimationFrame(animateGlow);
    }
    animateGlow();
}

// ─── RENDER INITIAL CONFIG PROFILES ───
function renderConfigProfiles() {
    const profiles = [CONFIG.profile1, CONFIG.profile2];

    profiles.forEach((p, i) => {
        const index = i + 1;

        // Avatar
        const avatarEl = document.getElementById(`avatar${index}`);
        if (avatarEl && p.avatar) avatarEl.src = p.avatar;

        // Status indicator
        const statusEl = document.getElementById(`status${index}`);
        if (statusEl && p.status) statusEl.dataset.status = p.status;

        // Display Name & Username
        const displayNameEl = document.getElementById(`displayName${index}`);
        const usernameEl = document.getElementById(`username${index}`);
        if (displayNameEl && p.displayName) displayNameEl.textContent = p.displayName;
        if (usernameEl && p.username) usernameEl.textContent = p.username;

        // Custom status badge
        const customStatusEl = document.getElementById(`customStatus${index}`);
        if (customStatusEl && p.customStatusText) {
            customStatusEl.classList.add('active');
            const emojiSpan = customStatusEl.querySelector('.status-emoji');
            const textSpan = customStatusEl.querySelector('.status-text');
            if (emojiSpan) emojiSpan.textContent = p.customStatusEmoji || '';
            if (textSpan) textSpan.textContent = p.customStatusText;
        }

        // Social links from config
        if (p.socials) {
            const pinterestEl = document.getElementById(`pinterest${index}`);
            if (pinterestEl && p.socials.pinterest) pinterestEl.href = p.socials.pinterest;
        }

        // Spotify - hide by default (will be shown by live Discord data)
        const spotifyEl = document.getElementById(`spotify${index}`);
        if (spotifyEl) spotifyEl.style.display = 'none';
    });
}

// ─── LIVE DISCORD VIA LANYARD (works on GitHub Pages) ───
function applyLiveUser(user, index) {
    if (!user || index < 1) return;

    const avatarEl = document.getElementById(`avatar${index}`);
    if (avatarEl && user.avatar) avatarEl.src = user.avatar;

    const displayNameEl = document.getElementById(`displayName${index}`);
    if (displayNameEl && user.global_name) displayNameEl.textContent = user.global_name;

    const usernameEl = document.getElementById(`username${index}`);
    if (usernameEl && user.username) usernameEl.textContent = `@${user.username}`;

    const statusEl = document.getElementById(`status${index}`);
    if (statusEl && user.status) statusEl.dataset.status = user.status;

    const customStatusEl = document.getElementById(`customStatus${index}`);
    if (customStatusEl) {
        if (user.customStatusText) {
            customStatusEl.classList.add('active');
            const emojiSpan = customStatusEl.querySelector('.status-emoji');
            const textSpan = customStatusEl.querySelector('.status-text');
            if (emojiSpan) emojiSpan.textContent = user.customStatusEmoji || '';
            if (textSpan) textSpan.textContent = user.customStatusText;
        } else {
            customStatusEl.classList.remove('active');
        }
    }

    const spotifyEl = document.getElementById(`spotify${index}`);
    if (spotifyEl) {
        if (user.spotify) {
            spotifyEl.style.display = 'block';

            const albumImg = document.getElementById(`spotifyAlbum${index}`);
            if (albumImg && user.spotify.albumArt) albumImg.src = user.spotify.albumArt;

            const trackEl = document.getElementById(`spotifyTrack${index}`);
            if (trackEl && user.spotify.song) trackEl.textContent = user.spotify.song;

            const artistEl = document.getElementById(`spotifyArtist${index}`);
            if (artistEl && user.spotify.artist) artistEl.textContent = user.spotify.artist;

            if (user.spotify.timestamps) {
                updateSpotifyProgress(index, user.spotify.timestamps);
            }
        } else {
            spotifyEl.style.display = 'none';
            if (spotifyTimers[index]) {
                clearInterval(spotifyTimers[index]);
                spotifyTimers[index] = null;
            }
        }
    }
}

function mapLanyardUser(data) {
    const u = data.discord_user || {};
    const custom = (data.activities || []).find((a) => a.type === 4);
    const emoji = custom?.emoji;
    const customStatusEmoji = emoji ? (emoji.name || '') : '';
    const avatar = u.avatar
        ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${String(u.avatar).startsWith('a_') ? 'gif' : 'png'}?size=256`
        : null;

    let spotify = null;
    if (data.spotify) {
        spotify = {
            albumArt: data.spotify.album_art_url,
            song: data.spotify.song,
            artist: data.spotify.artist,
            timestamps: data.spotify.timestamps
        };
    }

    return {
        id: u.id,
        username: u.username,
        global_name: u.global_name || u.username,
        avatar,
        status: data.discord_status || 'offline',
        customStatusText: custom?.state || null,
        customStatusEmoji,
        spotify
    };
}

function getPresenceApiUrl() {
    const configured = String(CONFIG.apiUrl || '').trim().replace(/\/$/, '');
    if (configured) return `${configured}/api/users`;

    const host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return '/api/users';
    return '';
}

async function fetchOfficialDiscordUsers() {
    if (CONFIG.useLiveDiscord === false) return;

    const apiUrl = getPresenceApiUrl();
    if (apiUrl) {
        try {
            const res = await fetch(apiUrl);
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.users)) {
                    const ids = [CONFIG.profile1.discordId, CONFIG.profile2.discordId];
                    json.users.forEach((user) => {
                        const index = ids.indexOf(user.id) + 1;
                        if (index > 0) applyLiveUser(user, index);
                    });
                    return;
                }
            }
        } catch (e) {
            console.warn('[Discord bot] API ulasilamadi, Lanyard yedegi deneniyor');
        }
    }

    const ids = [CONFIG.profile1.discordId, CONFIG.profile2.discordId];
    await Promise.all(ids.map(async (id, i) => {
        try {
            const res = await fetch(`https://api.lanyard.rest/v1/users/${id}`);
            if (!res.ok) return;
            const json = await res.json();
            if (!json.success || !json.data) return;
            applyLiveUser(mapLanyardUser(json.data), i + 1);
        } catch (e) {
            console.warn('[Lanyard] Could not load presence for', id);
        }
    }));
}

function updateSpotifyProgress(index, timestamps) {
    if (spotifyTimers[index]) clearInterval(spotifyTimers[index]);

    const barEl = document.getElementById(`spotifyBar${index}`);
    const elapsedEl = document.getElementById(`spotifyElapsed${index}`);
    const totalEl = document.getElementById(`spotifyTotal${index}`);

    if (!timestamps || !timestamps.start || !timestamps.end) return;

    const start = timestamps.start;
    const end = timestamps.end;
    const duration = end - start;

    if (totalEl) totalEl.textContent = formatTime(duration);

    const update = () => {
        const now = Date.now();
        const elapsed = Math.min(now - start, duration);
        const pct = (elapsed / duration) * 100;
        if (barEl) barEl.style.width = pct + '%';
        if (elapsedEl) elapsedEl.textContent = formatTime(elapsed);
    };

    update();
    spotifyTimers[index] = setInterval(update, 1000);
}

// ─── MUSIC PLAYER (BOTTOM PLAYER CONTROLS VIA YOUTUBE) ───
let ytPlayer;
let musicPlayerInstance;

// This function is called by the YouTube IFrame API once it's loaded
function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('youtubePlayer', {
        height: '0',
        width: '0',
        videoId: PLAYLIST[0].youtubeId,
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'rel': 0,
            'loop': 1,
            'playlist': PLAYLIST[0].youtubeId
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    // Kısık ses için ses seviyesini 30'a ayarladık (0-100 arası)
    event.target.setVolume(30);

    if (musicPlayerInstance) {
        musicPlayerInstance.ytReady = true;
    }
}

function onPlayerStateChange(event) {
    if (musicPlayerInstance) {
        if (event.data == YT.PlayerState.PLAYING) {
            musicPlayerInstance.setPlayingState(true);
        } else if (event.data == YT.PlayerState.PAUSED || event.data == YT.PlayerState.ENDED) {
            musicPlayerInstance.setPlayingState(false);
        }
    }
}

class MusicPlayer {
    constructor() {
        this.currentTrack = 0;
        this.isPlaying = false;
        this.ytReady = false;

        this.playBtn = document.getElementById('playBtn');
        this.playIcon = document.getElementById('playIcon');
        this.playerCover = document.getElementById('playerCover');
        this.playerTitle = document.getElementById('playerTitle');
        this.playerArtist = document.getElementById('playerArtist');
        this.playerEl = document.getElementById('musicPlayer');

        this.init();
    }

    init() {
        this.loadTrack(0);
        if (this.playBtn) this.playBtn.addEventListener('click', () => this.togglePlay());
    }

    loadTrack(index) {
        if (PLAYLIST.length === 0) return;
        const track = PLAYLIST[index];
        if (this.playerTitle) this.playerTitle.textContent = track.title;
        if (this.playerArtist) this.playerArtist.textContent = track.artist;
        if (this.playerCover) this.playerCover.src = track.cover;
    }

    togglePlay() {
        if (!this.ytReady || !ytPlayer) return;
        
        if (this.isPlaying) {
            ytPlayer.pauseVideo();
        } else {
            ytPlayer.playVideo();
        }
    }
    
    setPlayingState(playing) {
        this.isPlaying = playing;
        if (playing) {
            if (this.playIcon) this.playIcon.className = 'fas fa-pause';
            if (this.playerEl) this.playerEl.classList.add('playing');
        } else {
            if (this.playIcon) this.playIcon.className = 'fas fa-play';
            if (this.playerEl) this.playerEl.classList.remove('playing');
        }
    }
}

// ─── UTILS ───
function formatTime(ms) {
    if (isNaN(ms) || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ─── CARD TILT EFFECT ───
function initCardTilt() {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    document.querySelectorAll('.profile-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -6;
            const rotateY = ((x - centerX) / centerX) * 6;

            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}

// ─── TOGETHER COUNTER (Istanbul, 01.01.2026 00:00) ───
const COUNTER_TZ = 'Europe/Istanbul';
const COUNTER_START = { y: 2026, m: 1, d: 1, h: 0, min: 0, s: 0 };

function istanbulParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: COUNTER_TZ,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hourCycle: 'h23'
    }).formatToParts(date);

    const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
    return {
        y: get('year'),
        m: get('month'),
        d: get('day'),
        h: get('hour'),
        min: get('minute'),
        s: get('second')
    };
}

function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function elapsedSinceStart() {
    const now = istanbulParts();
    const start = COUNTER_START;

    let y = now.y - start.y;
    let mo = now.m - start.m;
    let d = now.d - start.d;
    let h = now.h - start.h;
    let mi = now.min - start.min;
    let s = now.s - start.s;

    if (s < 0) { s += 60; mi--; }
    if (mi < 0) { mi += 60; h--; }
    if (h < 0) { h += 24; d--; }
    if (d < 0) {
        mo--;
        const prevMonth = now.m === 1 ? 12 : now.m - 1;
        const prevYear = now.m === 1 ? now.y - 1 : now.y;
        d += daysInMonth(prevYear, prevMonth);
    }
    if (mo < 0) { mo += 12; y--; }

    if (y < 0) return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

    return {
        months: y * 12 + mo,
        days: d,
        hours: h,
        minutes: mi,
        seconds: s
    };
}

function pad2(n) {
    return String(n).padStart(2, '0');
}

function renderTogetherCounter() {
    const elapsed = elapsedSinceStart();
    const monthsEl = document.getElementById('tMonths');
    const daysEl = document.getElementById('tDays');
    const hoursEl = document.getElementById('tHours');
    const minutesEl = document.getElementById('tMinutes');
    const secondsEl = document.getElementById('tSeconds');

    if (monthsEl) monthsEl.textContent = elapsed.months;
    if (daysEl) daysEl.textContent = elapsed.days;
    if (hoursEl) hoursEl.textContent = pad2(elapsed.hours);
    if (minutesEl) minutesEl.textContent = pad2(elapsed.minutes);
    if (secondsEl) secondsEl.textContent = pad2(elapsed.seconds);
}

function initTogetherCounter() {
    renderTogetherCounter();
    setInterval(renderTogetherCounter, 1000);
}

// ─── INIT ON LOAD ───
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    initCursorGlow();
    initCardTilt();
    initTogetherCounter();
    renderConfigProfiles();
    
    fetchOfficialDiscordUsers();
    setInterval(fetchOfficialDiscordUsers, 3000);

    musicPlayerInstance = new MusicPlayer();

    // Enter Screen Logic
    const enterScreen = document.getElementById('enterScreen');
    if (enterScreen) {
        enterScreen.addEventListener('click', () => {
            enterScreen.classList.add('hidden');
            
            // Try to play music if ready, else it will just be ready to play later
            if (musicPlayerInstance && !musicPlayerInstance.isPlaying) {
                musicPlayerInstance.togglePlay();
            }
            
            // Remove from DOM after fade out to avoid blocking clicks
            setTimeout(() => {
                enterScreen.remove();
            }, 800);
        });
    }
});
