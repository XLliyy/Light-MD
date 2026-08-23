// ==========================================
// FILE: src/handlers/command.registry.ts
// ==========================================

import type { CommandContext } from '../middleware/context';
import { appEmitter } from '../core/emitter';
import { metrics } from '../core/metrics';
import { config } from '../config';
import { BoundedMemoryStore } from '../core/store';

export interface Command {
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly category: string;
  readonly description: string;
  readonly usage?: string;
  readonly isOwner?: boolean;
  readonly isGroupOnly?: boolean;
  readonly isAdminOnly?: boolean;
  readonly isBotAdminOnly?: boolean;
  readonly cooldownMs?: number;
  execute(ctx: CommandContext): Promise<void>;
}

export class CommandRegistry {
  private readonly commands = new Map<string, Command>();
  private readonly aliases = new Map<string, string>();
  private readonly fileToCommands = new Map<string, Set<string>>();
  private readonly cooldownStore = new BoundedMemoryStore<string, number>(10000, 60000);

  public register(command: Command, sourceFile?: string): void {
    const primaryName = command.name.toLowerCase();

    if (this.commands.has(primaryName)) {
      this.unregister(primaryName);
    }

    this.commands.set(primaryName, command);

    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias.toLowerCase(), primaryName);
      }
    }

    if (sourceFile) {
      let commandSet = this.fileToCommands.get(sourceFile);
      if (!commandSet) {
        commandSet = new Set();
        this.fileToCommands.set(sourceFile, commandSet);
      }
      commandSet.add(primaryName);
    }
  }

  public unregister(nameOrAlias: string): boolean {
    const lower = nameOrAlias.toLowerCase();
    const primaryName = this.aliases.get(lower) || lower;
    const cmd = this.commands.get(primaryName);
    if (!cmd) return false;

    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        this.aliases.delete(alias.toLowerCase());
      }
    }

    this.commands.delete(primaryName);

    for (const [file, set] of this.fileToCommands.entries()) {
      if (set.has(primaryName)) {
        set.delete(primaryName);
        if (set.size === 0) {
          this.fileToCommands.delete(file);
        }
        break;
      }
    }

    return true;
  }

  public unregisterByFile(sourceFile: string): number {
    const commandSet = this.fileToCommands.get(sourceFile);
    if (!commandSet || commandSet.size === 0) return 0;

    let removed = 0;
    for (const primaryName of Array.from(commandSet)) {
      if (this.unregister(primaryName)) {
        removed++;
      }
    }
    this.fileToCommands.delete(sourceFile);
    return removed;
  }

  public get(name: string): Command | undefined {
    const lower = name.toLowerCase();
    const primaryName = this.aliases.get(lower) || lower;
    return this.commands.get(primaryName);
  }

  public getAll(): readonly Command[] {
    return Array.from(this.commands.values());
  }

  public clear(): void {
    this.commands.clear();
    this.aliases.clear();
    this.fileToCommands.clear();
  }

  public async dispatch(ctx: CommandContext): Promise<boolean> {
    const cmd = this.get(ctx.command);
    if (!cmd) return false;

    const cooldownDuration = cmd.cooldownMs ?? config.defaultCooldownMs;
    if (cooldownDuration > 0 && !ctx.isOwner) {
      const cooldownKey = `${ctx.sender}:${cmd.name}`;
      const lastExecution = this.cooldownStore.get(cooldownKey);
      const now = Date.now();

      if (lastExecution && now < lastExecution) {
        const remainingSec = ((lastExecution - now) / 1000).toFixed(1);
        await ctx.reply(`⏳ *Rate Limited*: Please wait \`${remainingSec}s\` before reusing \`${ctx.prefix}${cmd.name}\`.`);
        return true;
      }
      this.cooldownStore.set(cooldownKey, now + cooldownDuration, cooldownDuration);
    }

    // Role Guard: Owner
    if (cmd.isOwner && !ctx.isOwner) {
      await ctx.reply('⛔ *Access Denied*: This command is strictly reserved for the bot owner.');
      return true;
    }

    // Role Guard: Group Only
    if (cmd.isGroupOnly && !ctx.isGroup) {
      await ctx.reply('👥 *Group Only*: This command can only be executed inside WhatsApp groups.');
      return true;
    }

    // Role Guard: Sender Admin
    if (cmd.isAdminOnly) {
      const isAdmin = await ctx.isSenderAdmin();
      if (!isAdmin) {
        await ctx.reply('🛡 *Admin Required*: You must be a Group Admin to use this command.');
        return true;
      }
    }

    // Role Guard: Bot Admin
    if (cmd.isBotAdminOnly) {
      const isBotAdm = await ctx.isBotAdmin();
      if (!isBotAdm) {
        await ctx.reply('🤖 *Bot Admin Required*: The bot must be promoted to Group Admin to perform this action.');
        return true;
      }
    }

    const startTime = performance.now();
    try {
      metrics.incrementCommands();
      appEmitter.emitLog('info', 'Command', `[${ctx.command}] invoked by ${ctx.senderName} (${ctx.senderNumber})`);
      await cmd.execute(ctx);
      const executionTime = Math.round(performance.now() - startTime);
      appEmitter.emitLog('success', 'Command', `[${ctx.command}] completed in ${executionTime}ms`);
      return true;
    } catch (error) {
      metrics.incrementErrors();
      const errMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : '';
      appEmitter.emitLog('error', 'CommandError', `Failed in [${ctx.command}]: ${errMessage}\n${stack}`);
      await ctx.reply(`❌ *Command Error*: \`${errMessage}\``);
      return true;
    }
  }
}

export const commandRegistry: CommandRegistry =
  (import.meta.hot?.data?.commandRegistry as CommandRegistry | undefined) ?? new CommandRegistry();

if (import.meta.hot) {
  import.meta.hot.data.commandRegistry = commandRegistry;
}
