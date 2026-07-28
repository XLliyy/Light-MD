import type { WASocket } from 'baileys';
import type { Command, ExtendedWAMessage } from '../types/index.ts';
import logger from '../utils/logger.ts';

const testCommand: Command = {
  name: 'test',
  aliases: ['t'],
  description: 'A simple test command.',

  execute: async (sock: WASocket, message: ExtendedWAMessage, args: string[]) => {
    try {
      const response = args.length > 0 ? `Received args: ${args.join(' ')}` : 'No args provided.';
      await message.reply(response);
    } catch (error) {
      logger.error(error, 'Error in test command:');
      await message.reply('An error occurred while executing the test command.');
    }
  },
};

export default testCommand;
