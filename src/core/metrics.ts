// ==========================================
// FILE: src/core/metrics.ts
// ==========================================

export interface SystemMetrics {
  uptimeSeconds: number;
  memory: {
    rssMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
  };
  traffic: {
    messagesReceived: number;
    messagesSanitized: number;
    messagesFiltered: number;
    commandsExecuted: number;
    errorsCount: number;
  };
  connection: {
    status: 'connecting' | 'connected' | 'disconnected' | 'logged_out';
    lastConnectedAt?: number;
    reconnectAttempts: number;
  };
  activeWsClients: number;
}

class MetricsCollector {
  private readonly startTime = Date.now();
  private received = 0;
  private sanitized = 0;
  private filtered = 0;
  private commands = 0;
  private errors = 0;
  private status: SystemMetrics['connection']['status'] = 'disconnected';
  private lastConnected?: number;
  private reconnects = 0;
  private wsClientsCount = 0;

  public incrementReceived(): void { this.received++; }
  public incrementSanitized(): void { this.sanitized++; }
  public incrementFiltered(): void { this.filtered++; }
  public incrementCommands(): void { this.commands++; }
  public incrementErrors(): void { this.errors++; }
  public incrementReconnects(): void { this.reconnects++; }

  public setStatus(s: SystemMetrics['connection']['status']): void {
    this.status = s;
    if (s === 'connected') this.lastConnected = Date.now();
  }

  public setWsClients(count: number): void {
    this.wsClientsCount = count >= 0 ? count : 0;
  }

  public getSnapshot(): SystemMetrics {
    const mem = process.memoryUsage();
    const toMB = (bytes: number) => Math.round((bytes / 1048576) * 100) / 100;

    return {
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      memory: {
        rssMB: toMB(mem.rss),
        heapUsedMB: toMB(mem.heapUsed),
        heapTotalMB: toMB(mem.heapTotal),
        externalMB: toMB(mem.external),
      },
      traffic: {
        messagesReceived: this.received,
        messagesSanitized: this.sanitized,
        messagesFiltered: this.filtered,
        commandsExecuted: this.commands,
        errorsCount: this.errors,
      },
      connection: {
        status: this.status,
        lastConnectedAt: this.lastConnected,
        reconnectAttempts: this.reconnects,
      },
      activeWsClients: this.wsClientsCount,
    };
  }
}

export const metrics = new MetricsCollector();
