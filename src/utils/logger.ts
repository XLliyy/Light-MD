// src/utils/logger.ts
import pino from 'pino';

function createLogger() {
  const targets: Array<{ target: string; options?: Record<string, unknown>; level: string }> = [
    {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      },
      level: 'info',
    },
    {
      target: 'pino/file',
      options: { destination: './x99-logs.txt' },
      level: 'debug',
    },
  ];

  return pino({
    level: 'debug',
    transport: { targets },
  });
}

const logger = createLogger();

export default logger;
