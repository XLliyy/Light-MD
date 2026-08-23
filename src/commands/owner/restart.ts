import type { Command } from '../../handlers/command.registry';
import { appEmitter } from '../../core/emitter';
import { waEngine } from '../../core/socket';

export const restartCommand: Command = {
  name: 'restart',
  aliases: ['reboot', 'reload'],
  category: 'Owner',
  description: 'Gracefully cycles the WhatsApp socket connection and reconnects',
  isOwner: true,
  execute: async (ctx) => {
    await ctx.reply('🔄 *Initiating graceful socket engine restart...*');
    appEmitter.emitLog('warn', 'Lifecycle', `Socket reload triggered by owner ${ctx.senderNumber}`);
    await waEngine.restart();
  },
};
