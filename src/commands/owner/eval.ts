import type { Command } from '../../handlers/command.registry';
import { metrics } from '../../core/metrics';

export const evalCommand: Command = {
  name: 'eval',
  aliases: ['e', 'ev', '>'],
  category: 'Owner',
  description: 'Executes sandboxed TypeScript/JavaScript code in the live Bun runtime',
  usage: 'eval <expression>',
  isOwner: true,
  execute: async (ctx) => {
    if (!ctx.args.length) {
      await ctx.reply('⚠️ Expression required for evaluation.');
      return;
    }

    const code = ctx.args.join(' ');
    const startTime = performance.now();

    try {
      const asyncFn = new Function(
        'ctx',
        'sock',
        'metrics',
        `return (async () => { ${code} })()`
      );
      let result = await asyncFn(ctx, ctx.sock, metrics);
      const executionTime = (performance.now() - startTime).toFixed(2);

      if (typeof result !== 'string') {
        result = Bun.inspect(result, { depth: 2, colors: false });
      }

      await ctx.reply(`💻 *Evaluation (${executionTime}ms)*:\n\`\`\`ts\n${result}\n\`\`\``);
    } catch (err) {
      const executionTime = (performance.now() - startTime).toFixed(2);
      await ctx.reply(
        `❌ *Evaluation Panic (${executionTime}ms)*:\n\`\`\`\n${
          err instanceof Error ? err.stack || err.message : String(err)
        }\n\`\`\``
      );
    }
  },
};
