// src/plugins/system/runtime.js
import Format from '../../utils/Format.js';

export default {
  name: "runtime",
  aliases: ["uptime", "rt"],
  category: "System",
  description: "Menampilkan durasi aktif bot sejak booting",
  owner: false,
  admin: false,
  group: false,

  async execute(ctx) {
    const uptime = process.uptime();
    const formatted = formatRuntime(uptime);
    await ctx.reply(Format.info('Information', `Runtime : ${formatted}`));
  }
};

function formatRuntime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const dDisplay = d > 0 ? `${d} Hari ` : "";
  const hDisplay = h > 0 ? `${h} Jam ` : "";
  const mDisplay = m > 0 ? `${m} Menit ` : "";
  const sDisplay = s > 0 ? `${s} Detik` : "0 Detik";
  return dDisplay + hDisplay + mDisplay + sDisplay;
}
