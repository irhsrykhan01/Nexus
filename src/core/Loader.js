// src/core/Loader.js
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import logger from '../utils/Logger.js';

class Loader {
  constructor() {
    this.commands = new Map(); // Menyimpan plugin utama dengan key berupa nama command
    this.aliases = new Map();  // Memetakan alias command ke nama command utamanya
  }

  /**
   * Membaca dan memuat seluruh file plugin secara dinamis dari direktori target
   */
  async loadPlugins(dir = './src/plugins') {
    const absoluteDir = path.resolve(dir);

    // Membuat folder plugins otomatis jika belum ada
    if (!fs.existsSync(absoluteDir)) {
      fs.mkdirSync(absoluteDir, { recursive: true });
    }

    // Fungsi rekursif untuk membaca seluruh file .js di dalam sub-folder
    const readDirectory = (currentDir) => {
      let results = [];
      const list = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const file of list) {
        const fullPath = path.join(currentDir, file.name);
        if (file.isDirectory()) {
          results = results.concat(readDirectory(fullPath));
        } else if (file.isFile() && file.name.endsWith('.js')) {
          results.push(fullPath);
        }
      }
      return results;
    };

    const files = readDirectory(absoluteDir);
    logger.info(`Menemukan ${files.length} kandidat file plugin. Memulai pemuatan...`);

    for (const file of files) {
      try {
        // Menggunakan pathToFileURL untuk kompabilitas lintasi OS (menghindari error path Windows)
        const fileUrl = pathToFileURL(file).href;
        const module = await import(fileUrl);
        const plugin = module.default;

        // Validasi struktur kontrak plugin
        if (!plugin || !plugin.name || typeof plugin.execute !== 'function') {
          logger.warn(`Plugin di "${path.basename(file)}" dilewati karena strukturnya tidak valid.`);
          continue;
        }

        const cmdName = plugin.name.toLowerCase();
        this.commands.set(cmdName, plugin);

        // Mendaftarkan alias jika ada
        if (plugin.aliases && Array.isArray(plugin.aliases)) {
          for (const alias of plugin.aliases) {
            this.aliases.set(alias.toLowerCase(), cmdName);
          }
        }

        logger.info(`Plugin [${plugin.category || 'System'}] "${plugin.name}" berhasil dimuat.`);
      } catch (err) {
        logger.error(`Gagal memuat file plugin (${file}): ${err.message}`);
      }
    }
  }

  /**
   * Mengambil data plugin berdasarkan nama atau aliasnya
   */
  getCommand(name) {
    const targetName = this.aliases.get(name.toLowerCase()) || name.toLowerCase();
    return this.commands.get(targetName);
  }
}

export default Loader;
