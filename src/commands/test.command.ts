// src/commands/ping.command.ts
import type { WASocket } from 'baileys';
import type { Command, ExtendedWAMessage } from '../types/index.d.ts';
import logger from '../utils/logger.ts';

const testCommand: Command = {
  name: 'test',
  aliases: ['test', '99'],
  description: '.',

  execute: async (sock: WASocket, message: ExtendedWAMessage, args: string[]) => {
    try {
      const response = args.length > 0 ? `Received args: ${args.join(' ')}` : 'No args provided.';

      await sock.sendMessage(message.key.remoteJid!, { text: response });
    } catch (error) {
      logger.error(error, 'Error in test command:');
      await sock.sendMessage(message.key.remoteJid!, {
        text: 'An error occurred while executing the test command.',
      });
    }
  },
};

export default testCommand;
