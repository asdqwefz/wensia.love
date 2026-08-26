/* ==========================================
   WENSIA.LOVE - Configuration File
   Buradan profillerin isimlerini, avatarlarını,
   durumlarını ve sosyal linklerini kolayca değiştirebilirsin!
   ========================================== */

const CONFIG = {
    // 1. Profil (Sol Taraf)
    profile1: {
        discordId: '216738682852343818',
        displayName: 'iovebf',
        username: '@toxicluvs',
        avatar: 'https://i.ibb.co/L5wKx2d/avatar1.jpg', // veya kendi resim linkin / dosya yolun
        status: 'online', // 'online', 'idle', 'dnd', 'offline'
        customStatusText: 'alacati', // Fotoğraftaki durum balonu
        customStatusEmoji: '✨',
        socials: {
            pinterest: 'https://www.pinterest.com/crownesxd/'
        }
    },

    // 2. Profil (Sağ Taraf)
    profile2: {
        discordId: '287243601262542849',
        displayName: 'wensia',
        username: '@wensia',
        avatar: 'https://i.ibb.co/M9KzM5n/avatar2.jpg', // veya kendi resim linkin / dosya yolun
        status: 'online',
        customStatusText: 'wensia',
        customStatusEmoji: '💕',
        socials: {
            pinterest: 'https://www.pinterest.com/pinnershin/'
        }
    },

    // Bot sunucusunun adresi (GitHub Pages buraya istek atar).
    // Railway/Render/VPS URL'sini buraya yaz, sonda / olmasın.
    // Örnek: 'https://wensia-bot.up.railway.app'
    apiUrl: '',

    useLiveDiscord: true
};
