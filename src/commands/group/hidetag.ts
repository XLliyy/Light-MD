import type { Command } from '../../handlers/command.registry';

export const hidetagCommand: Command = {
  name: 'hidetag',
  aliases: ['announce', 'h'],
  category: 'Group',
  description: 'Mentions every member in the group without visual clutter',
  usage: 'hidetag <announcement_text>',
  isGroupOnly: true,
  isAdminOnly: true,
  execute: async (ctx) => {
    const metadata = await ctx.getGroupMetadata();
    if (!metadata) {
      await ctx.reply('❌ Unable to resolve group participant metadata.');
      return;
    }

    const participants = metadata.participants.map((p) => p.id);
    const announcement = ctx.args.join(' ') || '📢 *Attention Group Members*';

    await ctx.send({
      text: announcement,
      mentions: participants,
    });
  },
};
