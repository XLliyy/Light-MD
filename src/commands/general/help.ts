import type { Command } from '../../handlers/command.registry';
import { commandRegistry } from '../../handlers/command.registry';

export const helpCommand: Command = {
  name: 'help',
  aliases: ['info', 'manual'],
  category: 'General',
  description: 'Displays comprehensive manual and parameter usage for a specific command',
  usage: 'help <command_name>',
  execute: async (ctx) => {
    const targetName = ctx.args[0]?.toLowerCase();
    if (!targetName) {
      await ctx.reply(`ℹ️ *Usage*: \`${ctx.prefix}help <command>\`\n_Example: \`${ctx.prefix}help ping\`_`);
      return;
    }

    const cmd = commandRegistry.get(targetName);
    if (!cmd) {
      await ctx.reply(`❌ Command \`${targetName}\` was not found in the registry.`);
      return;
    }

    let text = `📖 *COMMAND MANUAL: ${cmd.name.toUpperCase()}*\n\n`;
    text += `├ 🏷 *Category:* ${cmd.category}\n`;
    text += `├ 📝 *Description:* ${cmd.description}\n`;
    if (cmd.aliases && cmd.aliases.length > 0) {
      text += `├ 🔀 *Aliases:* \`${cmd.aliases.join(', ')}\`\n`;
    }
    text += `├ 💡 *Usage:* \`${ctx.prefix}${cmd.usage || cmd.name}\`\n`;
    text += `├ 👑 *Owner Only:* ${cmd.isOwner ? 'Yes' : 'No'}\n`;
    text += `├ 🛡 *Admin Only:* ${cmd.isAdminOnly ? 'Yes' : 'No'}\n`;
    text += `└ 👥 *Group Only:* ${cmd.isGroupOnly ? 'Yes' : 'No'}`;

    await ctx.reply(text);
  },
};
