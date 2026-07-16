// src/commands/ping.command.ts
import type { WASocket } from 'baileys';
import type { Command, ExtendedWAMessage } from '../types/index.d.ts';
import logger from '../utils/logger.ts';

const pingCommand: Command = {
  name: 'ping',
  aliases: ['p'],
  description: 'Checks if the bot is responsive and measures latency.',

  execute: async (sock: WASocket, message: ExtendedWAMessage, args: string[]) => {
    try {
      await message.react('⏳');

      const extraInfo = args.length > 0 ? `\nArgs: ${args.join(' ')}` : '';

      const startTime = Date.now();

      const sentMsg = await message.reply(`Pinging...${extraInfo}`);

      const endTime = Date.now();
      const latency = endTime - startTime;

      if (sentMsg && sentMsg.key) {
        await sock.sendMessage(message.key.remoteJid!, {
          text: `Pong! 🏓\nLatency: ${latency} ms`,
          edit: sentMsg.key,
        });
      } else {
        await sock.sendMessage(message.key.remoteJid!, {
          text: `Pong! 🏓\nLatency: ${latency} ms`,
        });
      }

      await message.react('✅');
    } catch (error) {
      logger.error(error, 'Error in ping command:');
      await message.react('❌');
      await message.reply('An error occurred while executing the ping command.');
    }
  },
};

export default pingCommand;
