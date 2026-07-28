import { startWhatsAppConnection, globalSock } from './connection.ts';
import logger from './utils/logger.ts';

async function main() {
  try {
    await startWhatsAppConnection();

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      if (globalSock.current) {
         try {
             globalSock.current.end(undefined);
         } catch (error) {
             logger.error(error, 'Error during socket shutdown');
         }
      }
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error(error, 'An unexpected error occurred in the main function:');
    process.exit(1);
  }
}

main();
