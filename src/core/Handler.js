// src/core/Handler.js
import Context from './Context.js';
import logger from '../utils/Logger.js';
import config from '../../config/config.js';

class Handler {
  constructor(socket, loader) {
    this.socket = socket;
    this.loader = loader;
  }

  /**
   * Menerima payload pesan masuk, mencocokkan ke plugin, memvalidasi hak akses, lalu mengeksekusi
   */
  async handleMessage(upsert) {
    if (!upsert.messages || upsert.messages.length === 0) return;
    
    const rawMsg = upsert.messages[0];
    if (rawMsg.key.fromMe || !rawMsg.message) return;

    try {
      const ctx = new Context(this.socket, rawMsg);

      const chatLabel = ctx.isGroup ? `Grup (${ctx.from})` : `Pribadi (${ctx.sender.split('@')[0]})`;
      logger.info(`[Pesan Masuk] Dari: ${chatLabel} | Teks: "${ctx.body || '[Non-Teks/Media]'}"`);

      // Memeriksa jika pesan mengandung prefix dan merupakan panggilan perintah
      if (ctx.command) {
        const plugin = this.loader.getCommand(ctx.command);

        if (plugin) {
          logger.info(`[Trigger Perintah] Plugin: "${plugin.name}" dipanggil oleh: ${ctx.sender}`);

          // 1. Validasi Akses Owner
          if (plugin.owner) {
            const cleanSender = ctx.sender.split('@')[0];
            if (!config.ownerNumbers.includes(cleanSender)) {
              return await ctx.reply('Perintah ini terbatas hanya untuk Owner bot saja.');
            }
          }

          // 2. Validasi Batasan Grup
          if (plugin.group && !ctx.isGroup) {
            return await ctx.reply('Perintah ini hanya dapat dijalankan di dalam lingkungan Grup.');
          }

          // 3. Validasi Akses Admin Grup
          if (plugin.admin && ctx.isGroup) {
            const groupMetadata = await this.socket.groupMetadata(ctx.from);
            const isSenderAdmin = groupMetadata.participants
              .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
              .some(p => p.id === ctx.sender);

            if (!isSenderAdmin) {
              return await ctx.reply('Perintah ini terbatas hanya untuk Admin grup.');
            }
          }

          // Eksekusi fungsi utama plugin dengan penanganan error terisolasi
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
