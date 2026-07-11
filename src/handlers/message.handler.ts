// src/handlers/message.handler.ts
import type { proto, WAMessage, WASocket } from 'baileys';
import type { Command, ExtendedWAMessage } from '../types/index';
import { readdir } from 'fs/promises';
import { join } from 'path';
import logger from '../utils/logger.ts';

const COMMAND_PREFIX = '/';

const commands = new Map<string, Command>();

/**
 * Import all commands
 */
async function loadCommands() {
  const commandsPath = join(process.cwd(), 'src/commands');
  try {
    const commandFiles = await readdir(commandsPath);
    for (const file of commandFiles) {
      if (file.endsWith('.command.ts')) {
        const filePath = join(commandsPath, file);
        // Bun's dynamic import is very fast
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

/**
 * @param sock (WASocket)
 * @param m (WAMessage)
 */
export async function handleMessage(sock: WASocket, m: WAMessage) {
  // 1. Ignore void message
  if (!m.message || !m.key.remoteJid) {
    return;
  }

  const extendedMessage = m as ExtendedWAMessage;
  extendedMessage.reply = async (text: string, options = {}): Promise<proto.WebMessageInfo> => {
    const result = await sock.sendMessage(m.key.remoteJid!, { text }, { quoted: m, ...options });
    if (!result) throw new Error('Failed to send reply');
    return result as proto.WebMessageInfo;
  };

  extendedMessage.react = async (emoji: string): Promise<proto.WebMessageInfo> => {
    const result = await sock.sendMessage(m.key.remoteJid!, {
      react: {
        text: emoji,
        key: m.key,
      },
    });
    if (!result) throw new Error('Failed to send reaction');
    return result as proto.WebMessageInfo;
  };

  // 2. Ignore bot message
  if (extendedMessage.key.fromMe) {
    return;
  }

  // 3. Extract text
  const msg = extendedMessage.message!;
  const messageText =
    msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || '';
  if (!messageText) {
    return;
  }

  // 4. Is command
  if (!messageText.startsWith(COMMAND_PREFIX)) {
    return;
  }

  // 5. Parse
  const args = messageText.slice(COMMAND_PREFIX.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) {
    return;
  }

  // 6. Command execution
  const command = commands.get(commandName);
  if (command) {
    try {
      logger.info(`Executing command "${commandName}" for ${m.key.remoteJid}`);
      await command.execute(sock, extendedMessage, args);
    } catch (error) {
      logger.error(error, `Error executing command "${commandName}":`);
      await sock.sendMessage(m.key.remoteJid, {
        text: `Oops! An error occurred while trying to execute the \`${commandName}\` command.`,
      });
    }
  } else {
    logger.warn(`Command not found: ${commandName}`);
    // await sock.sendMessage(m.key.remoteJid, {
    //   text: `Command \`${commandName}\` not found. Type \`${COMMAND_PREFIX}menu\` to see available commands.`
    // });
  }
}

loadCommands();
