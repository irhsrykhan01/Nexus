// index.js
import Client from './src/core/Client.js';
import logger from './src/utils/Logger.js';
import db from './src/utils/Database.js';

async function bootstrap() {
  logger.info('Memulai Bootstrap Nexus Framework...');
  
  // Mengaktifkan database persisten lokal
  await db.init();
  
  const bot = new Client();
  await bot.connect();
}

bootstrap().catch((err) => {
  logger.error(`Gagal melakukan inisialisasi bootstrapper: ${err.message}`);
});
