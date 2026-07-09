// src/plugins/system/ping.js
import Format from '../../utils/Format.js';

export default {
  name: "ping",
  aliases: ["p"],
  category: "System",
  description: "Memeriksa latensi kecepatan respon bot",
  owner: false,
  admin: false,
  group: false,

  async execute(ctx) {
    const start = Date.now();
    // Mengirim pesan sementara untuk menghitung selisih waktu respon server
    const sent = await ctx.reply(Format.info('Ping', 'Menghitung latensi respon...'));
    const latency = Date.now() - start;

    // Menghapus/mengedit balasan sementara dan mengirim hasil akhir berformat konsisten
    await ctx.socket.sendMessage(ctx.from, {
      text: Format.info('Information', `Latensi Respon: *${latency} ms*`)
    }, { quoted: ctx.msg });
  }
};
