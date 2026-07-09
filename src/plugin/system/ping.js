// src/plugins/system/ping.js
export default {
  name: "ping",
  aliases: ["p"],
  category: "System",
  description: "Memeriksa kecepatan respon bot",
  owner: false,
  admin: false,
  group: false,

  async execute(ctx) {
    // Menghitung latensi respon bot secara sederhana
    const startTimestamp = Date.now();
    const sentMessage = await ctx.reply("Menghitung respon bot...");
    const speed = Date.now() - startTimestamp;

    // Memperbarui pesan tadi dengan informasi latensi milidetik
    await ctx.socket.sendMessage(ctx.from, {
      text: `Pong! 🚀 Respon bot membutuhkan waktu *${speed} ms*`
    }, { quoted: ctx.msg });
  }
};
