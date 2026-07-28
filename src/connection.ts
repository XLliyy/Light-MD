import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  makeCacheableSignalKeyStore,
  type WASocket,
} from 'baileys';
import type { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import readline from 'readline';
import logger from './utils/logger.ts';
import { useRobustFileAuthState } from './auth/state.ts';
import { handleMessage } from './handlers/message.handler.ts';

const msgRetryCounterCache = new NodeCache({ stdTTL: 60 * 60, useClones: false });
const groupCache = new NodeCache({ stdTTL: 60 * 5, useClones: false });

export const globalSock = { current: null as WASocket | null };

const askQuestion = (text: string): Promise<string> => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(text, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

export async function startWhatsAppConnection() {
  logger.info('Starting WhatsApp connection...');
  const { state, saveCreds } = await useRobustFileAuthState('auth_state');
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(`Using Baileys version ${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    browser: ["Mac OS", "Safari", "26.0"],
    connectTimeoutMs: 15000,
    keepAliveIntervalMs: 25000,
    logger,
    defaultQueryTimeoutMs: 45000,
    retryRequestDelayMs: 200,
    maxMsgRetryCount: 3,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    markOnlineOnConnect: false,
    syncFullHistory: false,
    shouldIgnoreJid: (jid) => isJidBroadcast(jid),
    linkPreviewImageThumbnailWidth: 192,
    generateHighQualityLinkPreview: true,
    printQRInTerminal: false,
    msgRetryCounterCache,
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
  });

  globalSock.current = sock;

  // --- Pairing Code ---
  if (!sock.authState.creds.registered) {
    const phoneNumber =
      process.env['PAIRING_CODE_PHONE_NUMBER'] ||
      (await askQuestion('Enter phone number (with country code, ex: 628xxx): '));

    if (!phoneNumber) {
      logger.error('PAIRING_CODE_PHONE_NUMBER not provided.');
      process.exit(1);
    }

    logger.info(`Requesting pairing code for ${phoneNumber}...`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      const code = await sock.requestPairingCode(phoneNumber, 'XXXXXXXX');
      const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code; // XXXX-XXXX
      logger.info(`Your pairing code is: ${formattedCode}`);
      console.log(`\n\nYour pairing code is: ${formattedCode}\n\n`);
    } catch (error) {
      logger.error(error, 'Failed to request pairing code:');
      process.exit(1);
    }
  }

  // --- Event Listeners ---
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      logger.warn(`Connection closed. Reconnecting: ${shouldReconnect}`);

      if (shouldReconnect) {
        setTimeout(startWhatsAppConnection, 2000);
      } else {
        logger.info('Logged out from WhatsApp. Delete auth_state & restart.');
        process.exit(0);
      }
    } else if (connection === 'open') {
      logger.info('Connection opened successfully!');
    }
  });

  sock.ev.on('messages.upsert', async (upsert) => {
    if (upsert.type === 'notify') {
      for (const message of upsert.messages) {
        handleMessage(sock, message).catch((err) => {
          logger.error(err, 'Error in message handler:');
        });
      }
    }
  });

  return sock;
}
