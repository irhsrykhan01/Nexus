// src/utils/Database.js
import fs from 'fs';
import path from 'path';
import logger from './Logger.js';

class Database {
  constructor(filePath = './database.json') {
    this.filePath = path.resolve(filePath);
    this.data = {};
  }

  // Menginisialisasi file database saat bot pertama kali dijalankan
  async init() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
        logger.info('Database lokal berhasil dimuat.');
      } else {
        // Kerangka dasar database untuk masa depan
        this.data = { users: {}, groups: {}, settings: {} };
        this.save();
        logger.info('Database lokal baru berhasil dibuat.');
      }
    } catch (err) {
      logger.error(`Gagal menginisialisasi database: ${err.message}`);
      this.data = { users: {}, groups: {}, settings: {} };
    }
  }

  // Menyimpan keadaan data saat ini ke dalam disk (JSON)
  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      logger.error(`Gagal menulis data ke database: ${err.message}`);
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }
}

// Ekspor instance tunggal (Singleton pattern) agar seluruh modul menggunakan instance database yang sama
const db = new Database();
export default db;
