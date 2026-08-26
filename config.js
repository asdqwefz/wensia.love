/* ==========================================
   WENSIA.LOVE - Configuration File
   Buradan profillerin isimlerini, avatarlarını,
   durumlarını ve sosyal linklerini kolayca değiştirebilirsin!
   ========================================== */

const CONFIG = {
    // 1. Profil (Sol Taraf)
    profile1: {
        discordId: '216738682852343818',
        displayName: 'crownes',
        username: '@crownesxd',
        avatar: 'https://media.discordapp.net/attachments/1468015739737739494/1541925463008612483/29db5b0552d85ee78c7b6beffcd97d5f.jpg?ex=6a8f5d7d&is=6a8e0bfd&hm=a0012bbdccdcfc45b986ffb02582f0fadbeea7def9e3653c8f277ae573c13b8c&=&format=webp', // veya kendi resim linkin / dosya yolun
        status: 'online', // 'online', 'idle', 'dnd', 'offline'
        socials: {
            pinterest: 'https://www.pinterest.com/crownesxd/'
        }
    },

    // 2. Profil (Sağ Taraf)
    profile2: {
        discordId: '287243601262542849',
        displayName: 'wensia',
        username: '@toxicluvs',
        avatar: 'https://media.discordapp.net/attachments/1468015739737739494/1541925463008612483/29db5b0552d85ee78c7b6beffcd97d5f.jpg?ex=6a8f5d7d&is=6a8e0bfd&hm=a0012bbdccdcfc45b986ffb02582f0fadbeea7def9e3653c8f277ae573c13b8c&=&format=webp', // veya kendi resim linkin / dosya yolun
        status: 'online',
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
