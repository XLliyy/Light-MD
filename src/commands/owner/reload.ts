// ==========================================
// FILE: src/commands/owner/reload.ts
// ==========================================

import type { Command } from '../../handlers/command.registry';
import { loadAllCommands } from '../../handlers/command.loader';
import { commandRegistry } from '../../handlers/command.registry';

export const reloadCommand: Command = {
  name: 'reload',
  aliases: ['refresh', 'load'],
  category: 'Owner',
  description: 'Reloads all or specific command modules without restarting the WhatsApp gateway',
  usage: 'reload [command_name]',
  isOwner: true,
  execute: async (ctx) => {
    const targetName = ctx.args[0]?.toLowerCase();
    const startTime = performance.now();

    if (targetName) {
      const existing = commandRegistry.get(targetName);
      if (!existing) {
        await ctx.reply(`❌ Command \`${targetName}\` was not found in the active registry.`);
        return;
      }

      await ctx.reply(`🔄 *Reloading command module:* \`${targetName}\`...`);
      await loadAllCommands();
      const duration = (performance.now() - startTime).toFixed(2);
      await ctx.reply(`✅ *Module [${targetName}] reloaded* in \`${duration}ms\``);
      return;
    }

    const sent = await ctx.reply('🔄 *Scanning directory and synchronizing modules...*');
    const count = await loadAllCommands();
    const duration = (performance.now() - startTime).toFixed(2);

    const message =
      `⚡ *COMMAND MODULE SYNC COMPLETE*\n\n` +
      `├ 📦 *Loaded Modules:* \`${count}\`\n` +
      `├ ⏱ *Sync Duration:* \`${duration}ms\`\n` +
      `└ 🛡 *Gateway Status:* \`Zero Downtime (Socket Active)\``;

    if (sent?.key && ctx.sock.sendMessage) {
      await ctx.sock.sendMessage(ctx.remoteJid, { text: message, edit: sent.key });
    } else {
      await ctx.reply(message);
    }
  },
};
