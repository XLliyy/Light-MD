// ==========================================
// FILE: src/commands/owner/broadcast.ts
// ==========================================

import type { Command } from '../../handlers/command.registry';
import { groupCache } from '../../core/store';

export const broadcastCommand: Command = {
  name: 'broadcast',
  aliases: ['bc'],
  category: 'Owner',
  description: 'Paced concurrent broadcast transmission to active cached groups',
  usage: 'broadcast <message_text>',
  isOwner: true,
  execute: async (ctx) => {
    if (!ctx.args.length) {
      await ctx.reply('⚠️ Please provide the broadcast message.');
      return;
    }

    const message = ctx.args.join(' ');
    const groups = groupCache.keys();

    if (groups.length === 0) {
      await ctx.reply('⚠️ No active groups found in the telemetry cache.');
      return;
    }

    await ctx.reply(`🚀 *Starting broadcast to ${groups.length} groups with rate-paced concurrency...*`);

    let sent = 0;
    let failed = 0;

    // Chunk size of 5 parallel executions to balance network speed and rate limits
    const CHUNK_SIZE = 5;
    for (let i = 0; i < groups.length; i += CHUNK_SIZE) {
      const batch = groups.slice(i, i + CHUNK_SIZE);
      const results = await Promise.allSettled(
        batch.map((jid) =>
          ctx.sock.sendMessage(jid, {
            text: `📢 *OFFICIAL BROADCAST*\n\n${message}`,
          })
        )
      );

      for (const res of results) {
        if (res.status === 'fulfilled') sent++;
        else failed++;
      }

      // 1-second interval pacing between batches
      if (i + CHUNK_SIZE < groups.length) {
        await Bun.sleep(1000);
      }
    }

    await ctx.reply(`✅ *Broadcast Finished*\n├ 📤 *Success:* ${sent}\n└ ❌ *Failed:* ${failed}`);
  },
};
