// src/core/Client.js
import Handler from './Handler.js';
import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import logger from '../utils/Logger.js';
import config from '../../config/config.js';

class Client {
  constructor() {
    this.socket = null;
  }

  // Helper untuk mendapatkan versi WhatsApp Web dengan batas waktu (timeout)
  async getWhatsAppVersion() {
    const timeoutPromise = (ms) => new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout saat mengambil versi WA')), ms)
    );

    try {
      logger.info('Mengambil versi protokol WhatsApp Web terbaru...');
      // Membatasi proses pencarian versi maksimal 4 detik agar tidak menggantung (hang)
      const result = await Promise.race([
        fetchLatestBaileysVersion(),
        timeoutPromise(4000)
      ]);
      
      logger.info(`Berhasil mendapatkan versi dinamis: v${result.version.join('.')}`);
      return result.version;
    } catch (err) {
      const fallbackVersion = [2, 3000, 1033893291]; // Versi stabil cadangan
      logger.warn(`Gagal memuat versi dinamis (${err.message}). Menggunakan fallback v${fallbackVersion.join('.')}`);
      return fallbackVersion;
    }
  }

  async connect() {
    logger.info('Menginisialisasi modul autentikasi...');
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionPath);

    const waVersion = await this.getWhatsAppVersion();

    logger.info('Membuka koneksi WebSocket ke WhatsApp...');
    const socketInit = makeWASocket.default || makeWASocket;

    this.socket = socketInit({
      auth: state,
      version: waVersion,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' })
    });

    // Deklarasi variabel instance handler
    let messageHandler = null;

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
          logger.error('Sesi Anda telah keluar (Logged Out). Harap hapus folder "./session" secara manual.');
        }
      } 
      else if (connection === 'open') {
        logger.info(`Koneksi berhasil terjalin! ${config.botName} kini aktif.`);
        
        // Inisialisasi Handler baru ketika soket koneksi sukses terhubung
        messageHandler = new Handler(this.socket);
      }
    });

    this.socket.ev.on('creds.update', saveCreds);

    // Meneruskan seluruh event pesan masuk baru ke Handler utama
    this.socket.ev.on('messages.upsert', async (upsert) => {
      if (messageHandler) {
        await messageHandler.handleMessage(upsert);
      }
    });
  }
