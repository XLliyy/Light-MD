import type { Command } from '../../handlers/command.registry';

export const groupInfoCommand: Command = {
  name: 'groupinfo',
  aliases: ['gcinfo', 'groupstats'],
  category: 'Group',
  description: 'Inspects group settings, administrator rosters, and participant counts',
  isGroupOnly: true,
  execute: async (ctx) => {
    const metadata = await ctx.getGroupMetadata();
    if (!metadata) {
      await ctx.reply('❌ Failed to query group telemetry.');
      return;
    }

    const admins = metadata.participants.filter(
      (p) => p.admin === 'admin' || p.admin === 'superadmin'
    );
    const creationDate = metadata.creation
      ? new Date(metadata.creation * 1000).toLocaleDateString('en-GB')
      : 'Unknown';

    let text = `🏷 *GROUP PROFILE*\n\n`;
    text += `├ 📛 *Subject:* ${metadata.subject}\n`;
    text += `├ 🆔 *JID:* \`${metadata.id}\`\n`;
    text += `├ 👑 *Owner:* @${(metadata.owner || metadata.id).split('@')[0]}\n`;
    text += `├ 📅 *Created On:* ${creationDate}\n`;
    text += `├ 👥 *Total Members:* \`${metadata.participants.length}\`\n`;
    text += `├ 🛡 *Admins (${admins.length}):*\n`;

    admins.forEach((a) => {
      text += `│  • @${a.id.split('@')[0]} ${a.admin === 'superadmin' ? '(Creator)' : ''}\n`;
    });

    if (metadata.desc) {
      text += `\n📝 *Description:*\n${metadata.desc}`;
    }

    await ctx.replyWithMentions(text, metadata.participants.map((p) => p.id));
  },
};
