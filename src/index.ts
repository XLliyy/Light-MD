// ==========================================
// FILE: src/index.ts
// ==========================================

import { config } from './config';
import { loadAllCommands, startCommandWatcher, stopCommandWatcher } from './handlers/command.loader';
import { waEngine } from './core/socket';
import { startWebServer } from './web/server';
import { appEmitter } from './core/emitter';
import { messageStore, groupCache } from './core/store';

interface HMRState {
  webApp?: ReturnType<typeof startWebServer>;
  isSocketStarted?: boolean;
}

const hmrData = (import.meta.hot?.data as HMRState | undefined) ?? {};

async function bootstrap(): Promise<void> {
  console.clear();
  console.log(`\x1b[32m🚀 Starting ${config.botName} on Bun v${Bun.version}...\x1b[0m`);

  const loadedCount = await loadAllCommands();
  appEmitter.emitLog('info', 'Plugins', `Auto-loaded ${loadedCount} production command modules.`);

  startCommandWatcher();

  let webApp = hmrData.webApp;
  if (!webApp) {
    webApp = startWebServer();
    if (import.meta.hot) {
      hmrData.webApp = webApp;
    }
    console.log(`\x1b[36m🌐 Real-time Dashboard active: http://localhost:${webApp.server.port}\x1b[0m`);
  } else {
    console.log(`\x1b[36m🌐 Real-time Dashboard retained across HMR: http://localhost:${webApp.server.port}\x1b[0m`);
  }

  if (!hmrData.isSocketStarted) {
    await waEngine.start();
    if (import.meta.hot) {
      hmrData.isSocketStarted = true;
    }
  } else {
    appEmitter.emitLog('info', 'HMR', 'Preserved existing WhatsApp Multi-Device session.');
  }

  const teardown = (signal: string) => {
    console.log(`\n\x1b[33m[${signal}] Executing graceful shutdown...\x1b[0m`);
    stopCommandWatcher();
    webApp?.stop();
    messageStore.destroy();
    groupCache.destroy();

    if (waEngine.sock) {
      try {
        waEngine.sock.end(new Error(`Terminated by ${signal}`));
      } catch {
        // Ignore teardown errors
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', () => teardown('SIGINT'));
  process.on('SIGTERM', () => teardown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.stack || reason.message : String(reason);
  appEmitter.emitLog('error', 'UnhandledRejection', msg);
  console.error('\x1b[31m[Unhandled Rejection]:\x1b[0m', reason);
});

process.on('uncaughtException', (err) => {
  appEmitter.emitLog('error', 'UncaughtException', err.stack || err.message);
  console.error('\x1b[31m[Uncaught Exception]:\x1b[0m', err);
});

bootstrap().catch((err) => {
  console.error('\x1b[31m💥 Fatal Application Initialization Panic:\x1b[0m', err);
  process.exit(1);
});

// ==========================================
// Bun Hot Module Replacement (HMR) Hooks
// ==========================================
if (import.meta.hot) {
  import.meta.hot.accept();

  import.meta.hot.dispose(() => {
    stopCommandWatcher();
  });
}
