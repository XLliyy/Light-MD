// ==========================================
// FILE: src/web/server.ts
// ==========================================

import { renderDashboardHTML } from './views/dashboard.html';
import { appEmitter } from '../core/emitter';
import { metrics } from '../core/metrics';
import { config } from '../config';
import { waEngine } from '../core/socket';

interface WSClientData {
  readonly id: string;
  readonly connectedAt: number;
}

export function startWebServer() {
  let connectedWsSockets = 0;
  let metricsInterval: ReturnType<typeof setInterval> | null = null;

  const server = Bun.serve<WSClientData>({
    port: config.port,
    async fetch(req, server) {
      const url = new URL(req.url);

      if (url.pathname === '/ws') {
        const upgraded = server.upgrade(req, {
          data: { id: crypto.randomUUID(), connectedAt: Date.now() },
        });
        if (upgraded) return undefined;
        return new Response('WebSocket upgrade failed', { status: 400 });
      }

      if (url.pathname === '/api/pair' && req.method === 'POST') {
        try {
          const body = (await req.json()) as { phone?: string };
          if (!body.phone) {
            return Response.json({ error: 'Phone number is required' }, { status: 400 });
          }
          const code = await waEngine.requestPairingCode(body.phone);
          return Response.json({ success: true, code });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : 'Internal pairing failure' },
            { status: 500 }
          );
        }
      }

      if (url.pathname === '/api/restart' && req.method === 'POST') {
        waEngine.restart().catch(() => {});
        return Response.json({ success: true, message: 'Socket restart scheduled' });
      }

      if (url.pathname === '/api/health' && req.method === 'GET') {
        const snap = metrics.getSnapshot();
        const isHealthy = snap.connection.status === 'connected' || snap.connection.status === 'connecting';
        return Response.json(
          { status: isHealthy ? 'UP' : 'DOWN', telemetry: snap },
          { status: isHealthy ? 200 : 503 }
        );
      }

      if (url.pathname === '/api/metrics' && req.method === 'GET') {
        return Response.json(metrics.getSnapshot());
      }

      if (url.pathname === '/' || url.pathname === '/dashboard') {
        return new Response(renderDashboardHTML(config.botName), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      return new Response('404 Resource Not Found', { status: 404 });
    },
    websocket: {
      open(ws) {
        connectedWsSockets++;
        metrics.setWsClients(connectedWsSockets);
        ws.subscribe('bot-feed');

        const snap = metrics.getSnapshot();
        ws.send(JSON.stringify({ type: 'status', payload: snap.connection.status }));
        ws.send(JSON.stringify({ type: 'metrics', payload: snap }));

        const activeQr = waEngine.getActiveQr();
        if (activeQr) ws.send(JSON.stringify({ type: 'qr', payload: activeQr }));

        const activePairing = waEngine.getActivePairingCode();
        if (activePairing) ws.send(JSON.stringify({ type: 'pairing_code', payload: activePairing }));
      },
      message() {},
      close(ws) {
        connectedWsSockets = Math.max(0, connectedWsSockets - 1);
        metrics.setWsClients(connectedWsSockets);
        ws.unsubscribe('bot-feed');
      },
    },
  });

  const onQr = (payload: unknown) => server.publish('bot-feed', JSON.stringify({ type: 'qr', payload }));
  const onStatus = (status: unknown) => server.publish('bot-feed', JSON.stringify({ type: 'status', payload: status }));
  const onPairing = (code: unknown) => server.publish('bot-feed', JSON.stringify({ type: 'pairing_code', payload: code }));
  const onLog = (logEntry: unknown) => server.publish('bot-feed', JSON.stringify({ type: 'log', payload: logEntry }));

  appEmitter.on('qr', onQr);
  appEmitter.on('status_change', onStatus);
  appEmitter.on('pairing_code', onPairing);
  appEmitter.on('log', onLog);

  metricsInterval = setInterval(() => {
    if (connectedWsSockets > 0) {
      server.publish('bot-feed', JSON.stringify({ type: 'metrics', payload: metrics.getSnapshot() }));
    }
  }, 1000);

  return {
    server,
    stop: () => {
      if (metricsInterval) clearInterval(metricsInterval);
      appEmitter.removeListener('qr', onQr);
      appEmitter.removeListener('status_change', onStatus);
      appEmitter.removeListener('pairing_code', onPairing);
      appEmitter.removeListener('log', onLog);
      server.stop();
    },
  };
}
