// src/core/Client.js
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import logger from '../utils/Logger.js';
import config from '../../config/config.js';

class Client {
  constructor() {
    this.socket = null;
  }

  async connect() {
    logger.info('Menginisialisasi modul autentikasi...');
    
    // Menggunakan useMultiFileAuthState yang diimpor secara eksplisit
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionPath);

    logger.info('Membuka koneksi WebSocket ke WhatsApp...');
    
    // Menghindari inkonsistensi default export di beberapa versi Node.js / Baileys
    const socketInit = makeWASocket.default || makeWASocket;

    this.socket = socketInit({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }) // Mematikan log internal Baileys agar terminal bersih
    });

    // Menangani perubahan status koneksi
    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info('QR Code diperoleh. Silakan pindai melalui aplikasi WhatsApp Anda:');
        qrcode.generate(qr, { small: true });
      }

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
      else if (connection === 'open') {
        logger.info(`Koneksi berhasil terjalin! ${config.botName} kini aktif.`);
      }
    });

    // Menyimpan kredensial sesi setiap kali ada perubahan
    this.socket.ev.on('creds.update', saveCreds);
  }
}

export default Client;
