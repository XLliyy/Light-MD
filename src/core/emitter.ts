// ==========================================
// FILE: src/core/emitter.ts
// ==========================================

import { EventEmitter } from 'node:events';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly tag: string;
  readonly message: string;
}

class TypedEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  public emitLog(level: LogLevel, tag: string, message: string): void {
    const d = new Date();
    const timestamp = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp,
      level,
      tag,
      message,
    };
    this.emit('log', entry);
  }
}

export const appEmitter = new TypedEventEmitter();
