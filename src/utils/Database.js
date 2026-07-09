// src/utils/Database.js
import fs from 'fs';
import path from 'path';
import logger from './Logger.js';

class Database {
  constructor(filePath = './database.json') {
    this.filePath = path.resolve(filePath);
    this.data = {};
  }

  async init() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
        logger.info('Database lokal berhasil dimuat.');
      } else {
        this.data = { users: {}, groups: {}, settings: {} };
        logger.info('Database lokal baru berhasil diinisialisasi.');
      }

      // Memastikan konfigurasi Bot Mode & Scope dasar selalu terisi saat inisialisasi awal
      if (!this.data.bot) {
        this.data.bot = {
          mode: "all", // Pilihan: "all", "private", "group", "off"
          scope: {
            private: true,
            group: true,
            community: true,
            channel: false,
            newsletter: false,
            status: false
          }
        };
        this.save();
      }
    } catch (err) {
      logger.error(`Gagal menginisialisasi database: ${err.message}`);
      this.data = { 
        users: {}, 
        groups: {}, 
        settings: {},
        bot: {
          mode: "all",
          scope: {
            private: true,
            group: true,
            community: true,
            channel: false,
            newsletter: false,
            status: false
          }
        }
      };
    }
  }

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

const db = new Database();
export default db;
