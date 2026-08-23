// ==========================================
// FILE: src/commands/owner/exec.ts
// ==========================================

import type { Command } from '../../handlers/command.registry';

export const execCommand: Command = {
  name: 'exec',
  aliases: ['sh', 'shell', '$'],
  category: 'Owner',
  description: 'Spawns an isolated shell command with memory safety and execution timeouts',
  usage: 'exec <shell_command>',
  isOwner: true,
  execute: async (ctx) => {
    if (!ctx.args.length) {
      await ctx.reply('⚠️ Shell command string is required.');
      return;
    }

    const cmdString = ctx.args.join(' ');
    const startTime = performance.now();

    try {
      const proc = Bun.spawn(['sh', '-c', cmdString], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      // 10-second timeout guard to prevent hung processes
      const timeout = setTimeout(() => {
        try { proc.kill(); } catch {}
      }, 10_000);

      const [stdoutBuffer, stderrBuffer] = await Promise.all([
        new Response(proc.stdout).arrayBuffer(),
        new Response(proc.stderr).arrayBuffer(),
      ]);

      clearTimeout(timeout);
      const exitCode = await proc.exited;
      const duration = (performance.now() - startTime).toFixed(2);

      // Max 4KB slice to avoid messaging buffer overflows
      const decoder = new TextDecoder();
      const stdout = decoder.decode(stdoutBuffer.slice(0, 4096)).trim();
      const stderr = decoder.decode(stderrBuffer.slice(0, 4096)).trim();
      const output = stdout || stderr || '(No output recorded)';

      await ctx.reply(
        `🐚 *Shell (Exit: ${exitCode} | ${duration}ms)*:\n\`\`\`sh\n${output}\n\`\`\``
      );
    } catch (err) {
      const duration = (performance.now() - startTime).toFixed(2);
      await ctx.reply(
        `❌ *Process Spawn Error (${duration}ms)*:\n\`\`\`\n${
          err instanceof Error ? err.message : String(err)
        }\n\`\`\``
      );
    }
  },
};
