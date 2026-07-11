// src/index.ts
import { startWhatsAppConnection } from './connection.ts';
import logger from './utils/logger.ts';

async function main() {
  try {
    const sock = await startWhatsAppConnection();

    // Stop bot
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      // Close connection
      await sock.logout('Graceful shutdown initiated');
      process.exit(0);
    };

    // Watch (Ctrl+C) and kill
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error(error, 'An unexpected error occurred in the main function:');
    process.exit(1);
  }
}

main();
