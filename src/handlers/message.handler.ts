import type { proto, WAMessage, WASocket } from 'baileys';
import type { Command, ExtendedWAMessage } from '../types/index.ts';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.ts';

const COMMAND_PREFIX = '/';
const commands = new Map<string, Command>();

async function loadCommands() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const commandsPath = join(__dirname, '..', 'commands');

  try {
    const commandFiles = await readdir(commandsPath);
    for (const file of commandFiles) {
      if (file.endsWith('.command.ts') || file.endsWith('.command.js')) {
        const filePath = join(commandsPath, file);
        const { default: command } = await import(filePath);

        if (command && typeof command.execute === 'function') {
          commands.set(command.name, command);
          if (command.aliases) {
            for (const alias of command.aliases) {
              commands.set(alias, command);
            }
          }
          logger.info(`Loaded command: ${command.name}`);
        }
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to load commands:');
  }
}

await loadCommands();

function unwrapMessage(message: proto.IMessage | null | undefined): proto.IMessage | undefined {
  if (!message) return undefined;
  return (
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.documentWithCaptionMessage?.message ||
    message
  );
}

function extractMessageText(message: proto.IMessage | null | undefined): string {
  const msg = unwrapMessage(message);
  if (!msg) return '';

  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    ''
  );
}

function getContextInfo(message: proto.IMessage | null | undefined): proto.IContextInfo | undefined {
  const msg = unwrapMessage(message);
  if (!msg) return undefined;

  for (const key of Object.keys(msg) as (keyof typeof msg)[]) {
    const msgContent = msg[key];
    if (msgContent && typeof msgContent === 'object' && 'contextInfo' in msgContent) {
      return (msgContent as any).contextInfo as proto.IContextInfo;
    }
  }
  return undefined;
}

export async function handleMessage(sock: WASocket, m: WAMessage) {
  if (!m.message || !m.key.remoteJid || m.key.fromMe) return;

  const extendedMessage = m as ExtendedWAMessage;

  extendedMessage.reply = async (text: string, options = {}) => {
    return await sock.sendMessage(m.key.remoteJid!, { text }, { quoted: m, ...options });
  };
  extendedMessage.react = async (emoji: string) => {
    return await sock.sendMessage(m.key.remoteJid!, { react: { text: emoji, key: m.key } });
  };

  const contextInfo = getContextInfo(extendedMessage.message);
  if (contextInfo && contextInfo.quotedMessage) {
    const senderJid = contextInfo.participant || '';
    const botJidId = sock.user?.id?.split(':')[0] || '';
    const isFromMe = senderJid.startsWith(botJidId);

    extendedMessage.quoted = {
      message: contextInfo.quotedMessage,
      senderJid: senderJid,
      text: extractMessageText(contextInfo.quotedMessage),
      key: {
        remoteJid: m.key.remoteJid,
        fromMe: isFromMe,
        id: contextInfo.stanzaId,
        participant: senderJid,
      },
    };
  } else {
    extendedMessage.quoted = null;
  }

  const messageText = extractMessageText(extendedMessage.message);
  if (!messageText || !messageText.startsWith(COMMAND_PREFIX)) return;

  const args = messageText.slice(COMMAND_PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  const command = commands.get(commandName);
  if (command) {
    try {
      logger.info(`Executing command "${commandName}" for ${m.key.remoteJid}`);
      await command.execute(sock, extendedMessage, args);
    } catch (error) {
      logger.error(error, `Error executing command "${commandName}":`);
      await extendedMessage.reply(`Oops! An error occurred while executing the \`${commandName}\` command.`);
    }
  } else {
    logger.debug(`Command not found: ${commandName}`);
  }
}
