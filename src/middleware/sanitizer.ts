// ==========================================
// FILE: src/middleware/sanitizer.ts
// ==========================================

import type { proto } from '@whiskeysockets/baileys';
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import { config } from '../config';

export interface QuotedMessageContext {
  readonly stanzaId: string;
  readonly participant: string;
  readonly message: proto.IMessage;
  readonly text: string;
}

export interface CleanMessage {
  readonly raw: proto.IWebMessageInfo;
  readonly key: proto.IMessageKey;
  readonly remoteJid: string;
  readonly sender: string;
  readonly senderNumber: string;
  readonly senderName: string;
  readonly isGroup: boolean;
  readonly isOwner: boolean;
  readonly text: string;
  readonly type: string;
  readonly timestamp: number;
  readonly message: proto.IMessage;
  readonly mentionedJids: readonly string[];
  readonly quoted?: QuotedMessageContext;
}

export function extractPhoneNumberFast(jid: string): string {
  const atIdx = jid.indexOf('@');
  const limit = atIdx === -1 ? jid.length : atIdx;
  const colonIdx = jid.indexOf(':');
  const sliceEnd = colonIdx !== -1 && colonIdx < limit ? colonIdx : limit;

  let res = '';
  for (let i = 0; i < sliceEnd; i++) {
    const code = jid.charCodeAt(i);
    if (code >= 48 && code <= 57) { // 0-9 ASCII
      res += jid[i];
    }
  }
  return res;
}

export function unwrapMessage(msg: proto.IMessage | null | undefined): proto.IMessage | undefined {
  if (!msg) return undefined;
  let curr: proto.IMessage | null | undefined = msg;

  while (curr) {
    if (curr.ephemeralMessage?.message) { curr = curr.ephemeralMessage.message; continue; }
    if (curr.viewOnceMessage?.message) { curr = curr.viewOnceMessage.message; continue; }
    if (curr.viewOnceMessageV2?.message) { curr = curr.viewOnceMessageV2.message; continue; }
    if (curr.viewOnceMessageV2Extension?.message) { curr = curr.viewOnceMessageV2Extension.message; continue; }
    if (curr.documentWithCaptionMessage?.message) { curr = curr.documentWithCaptionMessage.message; continue; }
    if (curr.groupMentionedMessage?.message) { curr = curr.groupMentionedMessage.message; continue; }
    if (curr.editedMessage?.message?.protocolMessage?.editedMessage) {
      curr = curr.editedMessage.message.protocolMessage.editedMessage;
      continue;
    }
    break;
  }
  return curr || undefined;
}

export function extractMessageText(unwrapped: proto.IMessage | undefined): string {
  if (!unwrapped) return '';

  if (unwrapped.conversation) return unwrapped.conversation;
  if (unwrapped.extendedTextMessage?.text) return unwrapped.extendedTextMessage.text;
  if (unwrapped.imageMessage?.caption) return unwrapped.imageMessage.caption;
  if (unwrapped.videoMessage?.caption) return unwrapped.videoMessage.caption;
  if (unwrapped.documentMessage?.caption) return unwrapped.documentMessage.caption;
  if (unwrapped.buttonsResponseMessage?.selectedDisplayText) return unwrapped.buttonsResponseMessage.selectedDisplayText;
  if (unwrapped.buttonsResponseMessage?.selectedButtonId) return unwrapped.buttonsResponseMessage.selectedButtonId;
  if (unwrapped.templateButtonReplyMessage?.selectedId) return unwrapped.templateButtonReplyMessage.selectedId;
  if (unwrapped.templateButtonReplyMessage?.selectedDisplayText) return unwrapped.templateButtonReplyMessage.selectedDisplayText;
  if (unwrapped.listResponseMessage?.singleSelectReply?.selectedRowId) {
    return unwrapped.listResponseMessage.singleSelectReply.selectedRowId;
  }
  if (unwrapped.listResponseMessage?.title) return unwrapped.listResponseMessage.title;

  if (unwrapped.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
    const rawJson = unwrapped.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson;
    try {
      const parsed = JSON.parse(rawJson);
      return parsed.id || parsed.selected_id || rawJson;
    } catch {
      return rawJson;
    }
  }

  if (unwrapped.interactiveResponseMessage?.body?.text) {
    return unwrapped.interactiveResponseMessage.body.text;
  }

  return '';
}

export function isInternalNoise(unwrapped: proto.IMessage): boolean {
  if (unwrapped.protocolMessage && !unwrapped.protocolMessage.editedMessage) return true;
  return Boolean(
    unwrapped.senderKeyDistributionMessage ||
    unwrapped.reactionMessage ||
    unwrapped.pollUpdateMessage ||
    unwrapped.botInvokeMessage
  );
}

export function resolveMessageType(unwrapped: proto.IMessage): string {
  if (unwrapped.conversation) return 'conversation';
  if (unwrapped.extendedTextMessage) return 'extendedTextMessage';
  if (unwrapped.imageMessage) return 'imageMessage';
  if (unwrapped.videoMessage) return 'videoMessage';
  if (unwrapped.documentMessage) return 'documentMessage';
  if (unwrapped.stickerMessage) return 'stickerMessage';
  if (unwrapped.audioMessage) return 'audioMessage';
  if (unwrapped.contactMessage) return 'contactMessage';
  if (unwrapped.locationMessage) return 'locationMessage';
  return 'unknown';
}

export function sanitizeIncomingMessage(m: proto.IWebMessageInfo, botJid?: string): CleanMessage | null {
  const rawKey = m.key;
  const remoteJid = rawKey.remoteJid;
  if (!m.message || !remoteJid) return null;

  // Discard status broadcasts early
  if (remoteJid === 'status@broadcast') return null;

  const unwrapped = unwrapMessage(m.message);
  if (!unwrapped || isInternalNoise(unwrapped)) return null;

  const isGroup = remoteJid.endsWith('@g.us');
  const normalizedRemote = jidNormalizedUser(remoteJid);

  let rawSender = isGroup ? rawKey.participant : remoteJid;
  if (rawKey.fromMe && botJid) rawSender = botJid;
  const sender = rawSender ? jidNormalizedUser(rawSender) : normalizedRemote;

  const senderNumber = extractPhoneNumberFast(sender);
  const isOwner = Boolean(rawKey.fromMe || config.ownerNumbers.has(senderNumber));

  const text = extractMessageText(unwrapped).trim();
  const type = resolveMessageType(unwrapped);

  const contextInfo = unwrapped.extendedTextMessage?.contextInfo ||
    unwrapped.imageMessage?.contextInfo ||
    unwrapped.videoMessage?.contextInfo ||
    unwrapped.documentMessage?.contextInfo;

  const mentionedJids = contextInfo?.mentionedJid || [];

  let quoted: QuotedMessageContext | undefined;
  if (contextInfo?.quotedMessage && contextInfo.stanzaId && contextInfo.participant) {
    const quotedUnwrapped = unwrapMessage(contextInfo.quotedMessage);
    if (quotedUnwrapped) {
      quoted = {
        stanzaId: contextInfo.stanzaId,
        participant: jidNormalizedUser(contextInfo.participant),
        message: quotedUnwrapped,
        text: extractMessageText(quotedUnwrapped),
      };
    }
  }

  const timestamp = typeof m.messageTimestamp === 'number'
    ? m.messageTimestamp
    : Number(m.messageTimestamp?.low || Math.floor(Date.now() / 1000));

  return {
    raw: m,
    key: rawKey,
    remoteJid: normalizedRemote,
    sender,
    senderNumber,
    senderName: m.pushName || senderNumber || 'Unknown User',
    isGroup,
    isOwner,
    text,
    type,
    timestamp,
    message: unwrapped,
    mentionedJids,
    quoted,
  };
}
