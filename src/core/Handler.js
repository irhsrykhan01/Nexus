// src/core/Handler.js
import Context from './Context.js';
import logger from '../utils/Logger.js';

class Handler {
  constructor(socket) {
    this.socket = socket;
  }

  /**
   * Menerima payload upsert pesan dari Client.js, mengevaluasinya, dan melakukan routing
   */
  async handleMessage(upsert) {
    // Abaikan jika tipe pesan bukan pembaruan pesan biasa (bukan pesan baru)
    if (!upsert.messages || upsert.messages.length === 0) return;
    
    const rawMsg = upsert.messages[0];
    
    // Hindari perulangan pesan tak terbatas (mengabaikan pesan dari bot itu sendiri)
    if (rawMsg.key.fromMe || !rawMsg.message) return;

    try {
      // Membungkus pesan mentah ke dalam wrapper Context
      const ctx = new Context(this.socket, rawMsg);

      // Log pesan masuk untuk pengawasan lalu lintas bot
      const chatLabel = ctx.isGroup ? `Grup (${ctx.from})` : `Pribadi (${ctx.sender.split('@')[0]})`;
      logger.info(`[Pesan Masuk] Dari: ${chatLabel} | Teks: "${ctx.body || '[Non-Teks/Media]'}"`);

      // Menguji respon command statis di tingkat Handler sebelum Plugin Loader dirakit
      if (ctx.command) {
        logger.info(`[Perintah Terdeteksi] Command: "${ctx.command}" | Argumen: [${ctx.args.join(', ')}]`);
        
        if (ctx.command === 'ping') {
          await ctx.reply('Pong! Handler utama terverifikasi bekerja.');
        }
      }
    } catch (err) {
      logger.error(`Kesalahan penanganan pesan masuk: ${err.message}`);
    }
  }
}

export default Handler;
