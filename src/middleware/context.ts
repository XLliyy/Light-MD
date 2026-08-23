// ==========================================
// FILE: src/middleware/context.ts
// ==========================================

import type {
  WASocket,
  proto,
  AnyMessageContent,
  MiscMessageGenerationOptions,
  GroupMetadata,
} from '@whiskeysockets/baileys';
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import type { CleanMessage } from './sanitizer';
import { groupCache, type CachedGroupData } from '../core/store';

export interface CommandContext {
  readonly sock: WASocket;
  readonly clean: CleanMessage;
  readonly raw: proto.IWebMessageInfo;
  readonly key: proto.IMessageKey;
  readonly remoteJid: string;
  readonly sender: string;
  readonly senderNumber: string;
  readonly senderName: string;
  readonly isGroup: boolean;
  readonly isOwner: boolean;
  readonly text: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly prefix: string;
  readonly mentionedJids: readonly string[];
  reply(text: string, quoted?: boolean): Promise<proto.WebMessageInfo | undefined>;
  replyWithMentions(text: string, mentions: string[], quoted?: boolean): Promise<proto.WebMessageInfo | undefined>;
  send(content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<proto.WebMessageInfo | undefined>;
  react(emoji: string): Promise<proto.WebMessageInfo | undefined>;
  getGroupMetadata(): Promise<GroupMetadata | null>;
  isSenderAdmin(): Promise<boolean>;
  isBotAdmin(): Promise<boolean>;
}

export function buildCommandContext(
  sock: WASocket,
  clean: CleanMessage,
  command: string,
  args: readonly string[],
  prefix: string
): CommandContext {
  let cachedGroupData: CachedGroupData | null = null;

  const resolveGroupData = async (): Promise<CachedGroupData | null> => {
    if (!clean.isGroup) return null;
    if (cachedGroupData) return cachedGroupData;

    const fromCache = groupCache.get(clean.remoteJid);
    if (fromCache) {
      cachedGroupData = fromCache;
      return fromCache;
    }

    try {
      const metadata = await sock.groupMetadata(clean.remoteJid);
      const adminSet = new Set<string>();

      for (const p of metadata.participants) {
        if (p.admin === 'admin' || p.admin === 'superadmin') {
          adminSet.add(jidNormalizedUser(p.id));
        }
      }

      const entry: CachedGroupData = { metadata, adminSet };
      groupCache.set(clean.remoteJid, entry);
      cachedGroupData = entry;
      return entry;
    } catch {
      return null;
    }
  };

  const getGroupMetadata = async (): Promise<GroupMetadata | null> => {
    const data = await resolveGroupData();
    return data ? data.metadata : null;
  };

  const isSenderAdmin = async (): Promise<boolean> => {
    if (!clean.isGroup) return false;
    if (clean.isOwner) return true;
    const data = await resolveGroupData();
    if (!data) return false;
    return data.adminSet.has(clean.sender);
  };

  const isBotAdmin = async (): Promise<boolean> => {
    if (!clean.isGroup) return false;
    const data = await resolveGroupData();
    if (!data) return false;

    const botJid = sock.user?.id;
    if (!botJid) return false;
    const normalizedBot = jidNormalizedUser(botJid);
    return data.adminSet.has(normalizedBot);
  };

  const reply = (text: string, quoted = true) => {
    return sock.sendMessage(
      clean.remoteJid,
      { text },
      quoted ? { quoted: clean.raw } : undefined
    );
  };

  const replyWithMentions = (text: string, mentions: string[], quoted = true) => {
    return sock.sendMessage(
      clean.remoteJid,
      { text, mentions },
      quoted ? { quoted: clean.raw } : undefined
    );
  };

  const send = (content: AnyMessageContent, options?: MiscMessageGenerationOptions) => {
    return sock.sendMessage(clean.remoteJid, content, options);
  };

  const react = (emoji: string) => {
    return sock.sendMessage(clean.remoteJid, {
      react: { text: emoji, key: clean.key },
    });
  };

  return {
    sock,
    clean,
    raw: clean.raw,
    key: clean.key,
    remoteJid: clean.remoteJid,
    sender: clean.sender,
    senderNumber: clean.senderNumber,
    senderName: clean.senderName,
    isGroup: clean.isGroup,
    isOwner: clean.isOwner,
    text: clean.text,
    command,
    args,
    prefix,
    mentionedJids: clean.mentionedJids,
    reply,
    replyWithMentions,
    send,
    react,
    getGroupMetadata,
    isSenderAdmin,
    isBotAdmin,
  };
}
