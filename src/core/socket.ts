// ==========================================
// FILE: src/core/socket.ts
// ==========================================

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import pino from 'pino';
import { existsSync, rmSync } from 'node:fs';
import { config } from '../config';
import { groupCache, getMessageCallback } from './store';
import { MessageHandler } from '../handlers/message.handler';
import { appEmitter } from './emitter';
import { metrics } from './metrics';

export class WhatsAppEngine {
  public sock: WASocket | null = null;
  private isInitializing = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private activeQrData: { qr: string; dataUrl: string } | null = null;
  private activePairingCode: string | null = null;

  private readonly logger = pino({
    level: config.logLevel,
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
  });

  public getActiveQr(): { qr: string; dataUrl: string } | null {
    return this.activeQrData;
  }

  public getActivePairingCode(): string | null {
    return this.activePairingCode;
  }

  public async start(): Promise<WASocket> {
    if (this.isInitializing) {
      appEmitter.emitLog('warn', 'Socket', 'Socket initialization already in progress.');
      if (this.sock) return this.sock;
      throw new Error('Socket initialization already active');
    }

    this.isInitializing = true;
    this.clearReconnectTimer();

    metrics.setStatus('connecting');
    appEmitter.emit('status_change', 'connecting');
    appEmitter.emitLog('info', 'Socket', 'Initializing WhatsApp Multi-Device session...');

    try {
      const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
      const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
        version: [2, 3000, 1015901307] as [number, number, number],
        isLatest: false,
      }));

      appEmitter.emitLog(
        'info',
        'Baileys',
        `Engine Version: v${version.join('.')} (Latest Upstream: ${isLatest})`
      );

      if (this.sock) {
        try {
          this.sock.ws.close();
          this.sock.ev.removeAllListeners('creds.update');
          this.sock.ev.removeAllListeners('connection.update');
          this.sock.ev.removeAllListeners('messages.upsert');
          this.sock.ev.removeAllListeners('groups.update');
          this.sock.ev.removeAllListeners('group-participants.update');
        } catch {
          // Ignore teardown errors
        }
        this.sock = null;
      }

      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, this.logger),
        },
        logger: this.logger,
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: getMessageCallback,
        cachedGroupMetadata: async (jid) => {
          const cached = groupCache.get(jid);
          return cached ? cached.metadata : undefined;
        },
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const dataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
            this.activeQrData = { qr, dataUrl };
            this.activePairingCode = null;
            appEmitter.emit('qr', this.activeQrData);
            appEmitter.emitLog('info', 'Auth', 'Fresh QR Code generated.');
          } catch (err) {
            appEmitter.emitLog('error', 'Auth', `QR generation failed: ${err instanceof Error ? err.message : err}`);
          }
        }

        if (connection === 'close') {
          this.activeQrData = null;
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          metrics.incrementReconnects();
          appEmitter.emitLog(
            'warn',
            'Socket',
            `Connection closed. Status code: ${statusCode || 'Unknown'} | Reconnecting: ${shouldReconnect}`
          );

          if (statusCode === DisconnectReason.loggedOut) {
            metrics.setStatus('logged_out');
            appEmitter.emit('status_change', 'logged_out');
            appEmitter.emitLog('error', 'Auth', 'Session logged out. Purging session storage.');
            this.purgeSession();
            this.isInitializing = false;
          } else {
            metrics.setStatus('disconnected');
            appEmitter.emit('status_change', 'disconnected');
            this.isInitializing = false;
            this.scheduleReconnect();
          }
        } else if (connection === 'open') {
          this.reconnectAttempts = 0;
          this.activeQrData = null;
          this.activePairingCode = null;
          metrics.setStatus('connected');
          this.isInitializing = false;
          appEmitter.emit('status_change', 'connected');

          const botNumber = this.sock?.user?.id ? jidNormalizedUser(this.sock.user.id).split('@')[0] : 'Unknown';
          appEmitter.emitLog('success', 'Socket', `Connected successfully as @${botNumber}`);
        }
      });

      this.sock.ev.on('messages.upsert', async (upsert) => {
        if (!this.sock) return;
        await MessageHandler.handleUpsert(this.sock, upsert);
      });

      this.sock.ev.on('groups.update', (updates) => {
        for (let i = 0; i < updates.length; i++) {
          const id = updates[i].id;
          if (id) groupCache.delete(id);
        }
      });

      this.sock.ev.on('group-participants.update', (event) => {
        if (event.id) groupCache.delete(event.id);
      });

      return this.sock;
    } catch (error) {
      this.isInitializing = false;
      metrics.setStatus('disconnected');
      appEmitter.emit('status_change', 'disconnected');
      const msg = error instanceof Error ? error.message : String(error);
      appEmitter.emitLog('error', 'SocketInit', `Fatal socket initialization error: ${msg}`);
      this.scheduleReconnect();
      throw error;
    }
  }

  public async requestPairingCode(phoneNumber: string): Promise<string> {
    if (!this.sock) {
      throw new Error('WhatsApp Socket is offline. Initialize connection first.');
    }

    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 9 || cleanNumber.length > 15) {
      throw new Error('Invalid phone number format. Provide country code + subscriber digits without symbols.');
    }

    if (this.sock.authState.creds.registered) {
      throw new Error('Session is already registered. Delete session storage to pair a new device.');
    }

    appEmitter.emitLog('info', 'Pairing', `Requesting pairing code for +${cleanNumber}...`);

    try {
      const code = await this.sock.requestPairingCode(cleanNumber);
      const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
      this.activePairingCode = formattedCode;
      this.activeQrData = null;

      appEmitter.emit('pairing_code', formattedCode);
      appEmitter.emitLog('success', 'Pairing', `Pairing Code issued: [ ${formattedCode} ]`);
      return formattedCode;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      appEmitter.emitLog('error', 'Pairing', `Pairing Code request failed: ${msg}`);
      throw error;
    }
  }

  public async restart(): Promise<void> {
    this.clearReconnectTimer();
    if (this.sock) {
      try {
        this.sock.end(new Error('Manual system restart requested'));
      } catch {
        // Ignore termination errors
      }
      this.sock = null;
    }
    this.isInitializing = false;
    await this.start();
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectAttempts++;
    const delay = Math.min(30000, Math.pow(2, this.reconnectAttempts) * 1000 + Math.floor(Math.random() * 1000));

    appEmitter.emitLog('warn', 'Socket', `Reconnecting in ${Math.round(delay / 1000)}s (Attempt #${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.start().catch((err) => {
        appEmitter.emitLog('error', 'Socket', `Reconnection #${this.reconnectAttempts} failed: ${err.message}`);
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private purgeSession(): void {
    try {
      if (existsSync(config.sessionDir)) {
        rmSync(config.sessionDir, { recursive: true, force: true });
        appEmitter.emitLog('info', 'Auth', 'Session directory purged.');
      }
    } catch (err) {
      appEmitter.emitLog('error', 'Auth', `Failed to purge session directory: ${err}`);
    }
  }
}

export const waEngine = new WhatsAppEngine();
