// src/core/Client.js
import pkgBaileys from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import logger from '../utils/Logger.js';
import config from '../../config/config.js';

const makeWASocket = pkgBaileys.default || pkgBaileys;
const { useMultiFileAuthState, DisconnectReason } = pkgBaileys;

class Client {
  constructor() {
    this.socket = null;
  }

  async connect() {
    logger.info('Menginisialisasi modul autentikasi...');
   
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionPath);

    logger.info('Membuka koneksi WebSocket ke WhatsApp...');
    
    this.socket = makeWASocket({
      auth: state,
      printQRInTerminal: false, // Kita nonaktifkan bawaan untuk ditangani kustom dengan qrcode-terminal
      logger: pino({ level: 'silent' }) // Mematikan log internal Baileys agar tidak mengotori terminal
    });

    // Menangani perubahan status koneksi
    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Jika ada QR code yang perlu dipindai
      if (qr) {
        logger.info('QR Code diperoleh. Silakan pindai melalui aplikasi WhatsApp Anda:');
        qrcode.generate(qr, { small: true });
      }

      // Jika koneksi terputus
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        logger.warn(`Koneksi terputus (Status: ${statusCode || 'Unknown'}). Alasan: ${lastDisconnect?.error?.message || 'Tidak diketahui'}`);

        if (shouldReconnect) {
          logger.info('Mencoba menyambungkan kembali ke WhatsApp dalam 5 detik...');
          setTimeout(() => this.connect(), 5000);
        } else {
          logger.error('Sesi Anda telah keluar (Logged Out). Harap hapus folder "./session" secara manual dan jalankan ulang bot.');
        }
      } 
      // Jika berhasil terhubung
      else if (connection === 'open') {
        logger.info(`Koneksi berhasil terjalin! ${config.botName} kini aktif.`);
      }
    });

    // Menyimpan setiap kali kredensial diperbarui (misalnya setelah memindai QR)
    this.socket.ev.on('creds.update', saveCreds);
  }
}

export default Client;
