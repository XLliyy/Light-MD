import type { Command } from '../../handlers/command.registry';

export const pingCommand: Command = {
  name: 'ping',
  aliases: ['p', 'speed', 'latency'],
  category: 'General',
  description: 'Measures round-trip engine latency and Bun runtime memory footprint',
  execute: async (ctx) => {
    const start = performance.now();
    const sent = await ctx.reply('🏓 *Pinging WhatsApp Gateway...*');
    const end = performance.now();

    const latency = Math.round(end - start);
    const bunVer = Bun.version;
    const memUsage = process.memoryUsage();
    const heapMB = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;
    const rssMB = Math.round((memUsage.rss / 1024 / 1024) * 100) / 100;

    const message =
      `⚡ *LATENCY & RUNTIME TELEMETRY*\n\n` +
      `├ ⏱ *Round-Trip:* \`${latency} ms\`\n` +
      `├ 🏎 *Runtime:* \`Bun v${bunVer}\`\n` +
      `├ 🧠 *Heap Allocation:* \`${heapMB} MB\`\n` +
      `└ 📦 *Resident Set Size:* \`${rssMB} MB\``;

    if (sent?.key && ctx.sock.sendMessage) {
      await ctx.sock.sendMessage(ctx.remoteJid, { text: message, edit: sent.key });
    } else {
      await ctx.reply(message);
    }
  },
};
