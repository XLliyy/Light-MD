// ==========================================
// FILE: src/handlers/message.handler.ts
// ==========================================

import type { WASocket, proto } from '@whiskeysockets/baileys';
import { sanitizeIncomingMessage } from '../middleware/sanitizer';
import { buildCommandContext } from '../middleware/context';
import { commandRegistry } from './command.registry';
import { messageStore } from '../core/store';
import { metrics } from '../core/metrics';
import { config } from '../config';

export class MessageHandler {
  public static async handleUpsert(
    sock: WASocket,
    upsert: { messages: proto.IWebMessageInfo[]; type: string }
  ): Promise<void> {
    if (upsert.type !== 'notify' && upsert.type !== 'append') return;

    for (let i = 0; i < upsert.messages.length; i++) {
      const rawMsg = upsert.messages[i];
      metrics.incrementReceived();

      if (rawMsg.key?.id && rawMsg.message) {
        messageStore.set(rawMsg.key.id, rawMsg.message);
      }

      const clean = sanitizeIncomingMessage(rawMsg, sock.user?.id);
      if (!clean || clean.text.length === 0) {
        metrics.incrementFiltered();
        continue;
      }

      metrics.incrementSanitized();

      let matchedPrefix: string | null = null;
      for (let p = 0; p < config.prefixes.length; p++) {
        const prefix = config.prefixes[p];
        if (clean.text.startsWith(prefix)) {
          matchedPrefix = prefix;
          break;
        }
      }

      if (!matchedPrefix) continue;

      const bodyWithoutPrefix = clean.text.slice(matchedPrefix.length).trim();
      if (!bodyWithoutPrefix) continue;

      const spaceIdx = bodyWithoutPrefix.indexOf(' ');
      let commandName: string;
      let args: string[];

      if (spaceIdx === -1) {
        commandName = bodyWithoutPrefix.toLowerCase();
        args = [];
      } else {
        commandName = bodyWithoutPrefix.slice(0, spaceIdx).toLowerCase();
        args = bodyWithoutPrefix.slice(spaceIdx + 1).trim().split(/\s+/);
      }

      const ctx = buildCommandContext(sock, clean, commandName, args, matchedPrefix);
      await commandRegistry.dispatch(ctx);
    }
  }
}
