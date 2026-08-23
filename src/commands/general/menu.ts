import type { Command } from '../../handlers/command.registry';
import { commandRegistry } from '../../handlers/command.registry';
import { config } from '../../config';

export const menuCommand: Command = {
  name: 'menu',
  aliases: ['help', 'commands', 'list'],
  category: 'General',
  description: 'Displays the catalog of available commands grouped by category',
  execute: async (ctx) => {
    const commands = commandRegistry.getAll();
    const categories = new Map<string, Command[]>();

    for (const cmd of commands) {
      const list = categories.get(cmd.category) || [];
      list.push(cmd);
      categories.set(cmd.category, list);
    }

    let menu = `⚡ *${config.botName.toUpperCase()}*\n`;
    menu += `👤 *User:* \`${ctx.senderName}\`\n`;
    menu += `🔑 *Active Prefixes:* \`${config.prefixes.join(' ')}\`\n`;
    menu += `📦 *Total Modules:* \`${commands.length}\`\n\n`;

    for (const [category, cmds] of categories.entries()) {
      menu += `📂 *${category.toUpperCase()}*\n`;
      for (const c of cmds) {
        const flag = c.isOwner ? '👑' : c.isAdminOnly ? '🛡' : c.isGroupOnly ? '👥' : '•';
        menu += `  ${flag} \`${ctx.prefix}${c.name}\` — ${c.description}\n`;
      }
      menu += '\n';
    }

    menu += `_Legend: 👑 Owner | 🛡 Admin | 👥 Group Only_\n`;
    menu += `_Tip: Use \`${ctx.prefix}help <command>\` for detailed parameter usage._`;

    await ctx.reply(menu);
  },
};
