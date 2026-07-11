// src/connection.ts
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  isJidBroadcast,
  makeCacheableSignalKeyStore,
} from 'baileys';
import type { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import readline from 'readline';
import logger from './utils/logger.ts';
import { useRobustFileAuthState } from './auth/state.ts';
import { handleMessage } from './handlers/message.handler.ts';

const msgRetryCounterCache = new NodeCache();
const groupCache = new NodeCache();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const question = (text: string): Promise<string> =>
  new Promise((resolve) => rl.question(text, resolve));

export async function startWhatsAppConnection() {
  logger.info('Starting WhatsApp connection...');
  const { state, saveCreds } = await useRobustFileAuthState('auth_state');

  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(`Using Baileys version ${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    browser: Browsers.macOS('Desktop'),
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

  // --- Pairing Code ---
  if (!sock.authState.creds.registered) {
    const phoneNumber =
      process.env['PAIRING_CODE_PHONE_NUMBER'] ||
      (await question('Enter phone number for pairing code request: '));
    if (!phoneNumber) {
      logger.error('PAIRING_CODE_PHONE_NUMBER not set in .env file.');
      process.exit(1);
    }

    logger.info(`Requesting pairing code for ${phoneNumber}...`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      const code = await sock.requestPairingCode(phoneNumber, 'XXXXXXXX');
      logger.info(`Your pairing code is: ${code}`);
      console.log(`\n\nYour pairing code is: ${code}\n\n`);
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
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      logger.warn(
        `Connection closed due to: ${lastDisconnect?.error}, reconnecting: ${shouldReconnect}`,
      );
      if (shouldReconnect) {
        startWhatsAppConnection();
      }
    } else if (connection === 'open') {
      logger.info('Connection opened successfully!');
    }
  });

  sock.ev.on('messages.upsert', async (upsert) => {
    if (upsert.type === 'notify') {
      for (const message of upsert.messages) {
        handleMessage(sock, message).catch((err) => {
          logger.error('Error in message handler:', err);
        });
      }
    }
  });

  return sock;
}
