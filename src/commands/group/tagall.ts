import type { Command } from '../../handlers/command.registry';

export const tagallCommand: Command = {
  name: 'tagall',
  aliases: ['everyone', 'mentionall'],
  category: 'Group',
  description: 'Tags all group members with an explicit mention roster',
  usage: 'tagall [custom_message]',
  isGroupOnly: true,
  isAdminOnly: true,
  execute: async (ctx) => {
    const metadata = await ctx.getGroupMetadata();
    if (!metadata) {
      await ctx.reply('❌ Failed to fetch group metadata.');
      return;
    }

    const header = ctx.args.join(' ') || '📢 *Group Member Roster*';
    let message = `👥 *${metadata.subject}*\n${header}\n\n`;
    const mentions: string[] = [];

    metadata.participants.forEach((p, idx) => {
      mentions.push(p.id);
      message += `${idx + 1}. @${p.id.split('@')[0]}\n`;
    });

    message += `\n_Total: ${metadata.participants.length} members_`;

    await ctx.replyWithMentions(message, mentions);
  },
};
