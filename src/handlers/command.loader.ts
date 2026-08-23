// ==========================================
// FILE: src/handlers/command.loader.ts
// ==========================================

import { Glob } from 'bun';
import { resolve, normalize, basename } from 'node:path';
import { watch, type FSWatcher } from 'node:fs';
import { commandRegistry, type Command } from './command.registry';
import { appEmitter } from '../core/emitter';

const COMMANDS_DIR = resolve(import.meta.dir, '../commands');
const globPattern = new Glob('**/*.{ts,js}');

let activeWatcher: FSWatcher | null = null;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function isCommand(obj: unknown): obj is Command {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0 &&
    typeof candidate.category === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.execute === 'function'
  );
}

export async function loadCommandFile(filePath: string): Promise<number> {
  const normalizedPath = normalize(filePath);
  const cacheBuster = `?t=${Date.now()}`;
  let registeredCount = 0;

  try {
    const module = await import(normalizedPath + cacheBuster);

    commandRegistry.unregisterByFile(normalizedPath);

    if (isCommand(module.default)) {
      commandRegistry.register(module.default, normalizedPath);
      registeredCount++;
    }

    for (const key of Object.keys(module)) {
      if (key === 'default') continue;
      const exportValue = module[key];

      if (isCommand(exportValue)) {
        commandRegistry.register(exportValue, normalizedPath);
        registeredCount++;
      } else if (Array.isArray(exportValue)) {
        for (const item of exportValue) {
          if (isCommand(item)) {
            commandRegistry.register(item, normalizedPath);
            registeredCount++;
          }
        }
      }
    }

    return registeredCount;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    appEmitter.emitLog('error', 'Loader', `Failed to load module [${basename(normalizedPath)}]: ${msg}`);
    return 0;
  }
}

export async function loadAllCommands(dir = COMMANDS_DIR): Promise<number> {
  const startTime = performance.now();
  let totalLoaded = 0;
  let fileCount = 0;

  for await (const relativePath of globPattern.scan({ cwd: dir })) {
    if (
      relativePath.endsWith('.d.ts') ||
      relativePath.endsWith('.test.ts') ||
      relativePath.endsWith('.spec.ts') ||
      basename(relativePath).startsWith('.')
    ) {
      continue;
    }

    const absolutePath = resolve(dir, relativePath);
    const count = await loadCommandFile(absolutePath);
    if (count > 0) {
      totalLoaded += count;
      fileCount++;
    }
  }

  const duration = (performance.now() - startTime).toFixed(2);
  appEmitter.emitLog(
    'success',
    'Loader',
    `Auto-loaded ${totalLoaded} command(s) across ${fileCount} file(s) in ${duration}ms`
  );

  return totalLoaded;
}

export function startCommandWatcher(dir = COMMANDS_DIR): void {
  if (activeWatcher) return;

  try {
    activeWatcher = watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      if (
        filename.endsWith('.d.ts') ||
        filename.endsWith('.test.ts') ||
        filename.endsWith('.spec.ts') ||
        (!filename.endsWith('.ts') && !filename.endsWith('.js'))
      ) {
        return;
      }

      const fullPath = resolve(dir, filename);

      const existingTimer = debounceTimers.get(fullPath);
      if (existingTimer) clearTimeout(existingTimer);

      debounceTimers.set(
        fullPath,
        setTimeout(async () => {
          debounceTimers.delete(fullPath);

          const exists = await Bun.file(fullPath).exists();

          if (!exists) {
            const removed = commandRegistry.unregisterByFile(fullPath);
            if (removed > 0) {
              appEmitter.emitLog('warn', 'HotReload', `Removed ${removed} command(s) from deleted file: ${basename(fullPath)}`);
            }
            return;
          }

          const loaded = await loadCommandFile(fullPath);
          if (loaded > 0) {
            appEmitter.emitLog('success', 'HotReload', `Hot-reloaded ${loaded} command(s) in [${basename(fullPath)}]`);
          }
        }, 150)
      );
    });

    appEmitter.emitLog('info', 'HotReload', `Live command watcher active on: ${dir}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    appEmitter.emitLog('error', 'HotReload', `Failed to start file watcher: ${msg}`);
  }
}

export function stopCommandWatcher(): void {
  if (activeWatcher) {
    activeWatcher.close();
    activeWatcher = null;
  }
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
}
