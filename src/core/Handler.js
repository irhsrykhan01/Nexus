// src/core/Handler.js
import Context from './Context.js';
import logger from '../utils/Logger.js';
import config from '../../config/config.js';
import db from '../utils/Database.js';

class Handler {
  constructor(socket, loader) {
    this.socket = socket;
    this.loader = loader;
    this.cooldowns = new Map(); // Untuk mencatat waktu cooldown per pengguna
  }

  async handleMessage(upsert) {
    if (!upsert.messages || upsert.messages.length === 0) return;
    
    const rawMsg = upsert.messages[0];
    if (rawMsg.key.fromMe || !rawMsg.message) return;

    try {
      const ctx = new Context(this.socket, rawMsg);
      ctx.loader = this.loader; 

      if (ctx.command) {
        // Mengambil konfigurasi bot langsung dari database
        const botConfig = db.get('bot') || {
          mode: "all",
          scope: {
            private: true,
            group: true,
            community: true,
            channel: false,
            newsletter: false,
            status: false
          }
        };

        const cleanSender = ctx.sender.split('@')[0];
        const isOwner = config.ownerNumbers.includes(cleanSender);

        // 1. PENYARINGAN UTAMA (BOT SCOPE & BOT MODE CHECK)
        // Jika pengirim bukan Owner, periksa otorisasi mode dan cakupan chat
        if (!isOwner) {
          // A. Filter Mode Utama Bot (off, private, group)
          if (botConfig.mode === 'off') {
            logger.info(`[Mode Off] Mengabaikan perintah dari non-owner (${cleanSender}).`);
            return;
          }

          if (botConfig.mode === 'private' && ctx.chatType !== 'private') {
            logger.info(`[Mode Private] Perintah dari tipe chat "${ctx.chatType}" diabaikan.`);
            return;
          }

          if (botConfig.mode === 'group' && ctx.chatType !== 'group') {
            logger.info(`[Mode Group] Perintah dari tipe chat "${ctx.chatType}" diabaikan.`);
            return;
          }

          // B. Filter Cakupan Spesifik (ketika mode bot adalah 'all')
          if (botConfig.mode === 'all') {
            const isScopeAllowed = botConfig.scope[ctx.chatType];
            
            // Catatan: Jika chatType tidak dikenal atau status scope bernilai false, abaikan senyap
            if (isScopeAllowed === false || isScopeAllowed === undefined) {
              logger.info(`[Cakupan Nonaktif] Perintah di tipe chat "${ctx.chatType}" diabaikan.`);
              return;
            }
          }
        }

        const plugin = this.loader.getCommand(ctx.command);

        if (plugin) {
          logger.info(`[Trigger Perintah] Plugin: "${plugin.name}" dipanggil oleh: ${ctx.sender}`);

          // 2. Validasi Akses Owner
          if (plugin.owner) {
            if (!isOwner) {
              return await ctx.reply('Perintah ini terbatas hanya untuk Owner bot saja.');
            }
          }

          // 3. Validasi Akses Admin Grup (jika perintah dikirim di grup)
          if (plugin.admin && ctx.isGroup) {
            const groupMetadata = await this.socket.groupMetadata(ctx.from);
            const isSenderAdmin = groupMetadata.participants
              .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
              .some(p => p.id === ctx.sender);

            if (!isSenderAdmin) {
              return await ctx.reply('Perintah ini terbatas hanya untuk Admin grup.');
            }
          }

          // 4. Validasi Cooldown
          if (plugin.cooldown && !isOwner) {
            const now = Date.now();
            const cooldownKey = `${ctx.sender}_${plugin.name}`;
            const expirationTime = this.cooldowns.get(cooldownKey) || 0;

            if (now < expirationTime) {
              const timeLeft = Math.ceil((expirationTime - now) / 1000);
              return await ctx.reply(`Mohon tunggu *${timeLeft} detik* sebelum memanggil perintah ini lagi.`);
            }

            // Menyimpan masa kadaluarsa cooldown (detik dikonversi ke milidetik)
            this.cooldowns.set(cooldownKey, now + (plugin.cooldown * 1000));
          }

          try {
            await plugin.execute(ctx);
          } catch (execErr) {
            logger.error(`Kegagalan eksekusi internal plugin "${plugin.name}": ${execErr.message}`);
            await ctx.reply(`Gagal mengeksekusi perintah. Terjadi kesalahan pada sistem internal.`);
          }
        } else {
          logger.info(`[Command Diabaikan] Perintah "${ctx.command}" tidak terdaftar di database plugin.`);
        }
      }
    } catch (err) {
      logger.error(`Kesalahan kritis handler pesan: ${err.message}`);
    }
  }
}

export default Handler;
