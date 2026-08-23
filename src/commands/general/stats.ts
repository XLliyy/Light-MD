import type { Command } from '../../handlers/command.registry';
import { metrics } from '../../core/metrics';

export const statsCommand: Command = {
  name: 'stats',
  aliases: ['status', 'system', 'telemetry'],
  category: 'General',
  description: 'Inspect live traffic throughput, buffer rates, and connection stats',
  execute: async (ctx) => {
    const data = metrics.getSnapshot();
    const formatUptime = (sec: number): string => {
      const d = Math.floor(sec / 86400);
      const h = Math.floor((sec % 86400) / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      return `${d > 0 ? `${d}d ` : ''}${h}h ${m}m ${s}s`;
    };

    const text =
      `📊 *SYSTEM HEALTH & METRICS*\n\n` +
      `├ ⏱ *Uptime:* ${formatUptime(data.uptimeSeconds)}\n` +
      `├ 🚦 *Socket Status:* \`${data.connection.status.toUpperCase()}\`\n` +
      `├ 💾 *Heap Used:* \`${data.memory.heapUsedMB} MB / ${data.memory.heapTotalMB} MB\`\n` +
      `├ 📦 *Process RSS:* \`${data.memory.rssMB} MB\`\n` +
      `├ 📥 *Total Ingested:* \`${data.traffic.messagesReceived}\`\n` +
      `├ 🛡 *Filtered Packets:* \`${data.traffic.messagesFiltered}\`\n` +
      `├ ⚡ *Commands Executed:* \`${data.traffic.commandsExecuted}\`\n` +
      `├ ❌ *Error Exceptions:* \`${data.traffic.errorsCount}\`\n` +
      `├ 🔄 *Reconnect Count:* \`${data.connection.reconnectAttempts}\`\n` +
      `└ 🌐 *Dashboard Clients:* \`${data.activeWsClients}\``;

    await ctx.reply(text);
  },
};
