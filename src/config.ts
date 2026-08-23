// ==========================================
// FILE: src/config.ts
// ==========================================

export interface AppConfig {
  readonly botName: string;
  readonly prefixes: readonly string[];
  readonly ownerNumbers: ReadonlySet<string>;
  readonly port: number;
  readonly sessionDir: string;
  readonly logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  readonly maxMemoryStoreSize: number;
  readonly defaultCooldownMs: number;
}

function parseArray(value: string | undefined, fallback: readonly string[]): readonly string[] {
  if (!value) return fallback;
  const parsed = value.split(',').map((v) => v.trim()).filter(Boolean);
  return parsed.length > 0 ? Object.freeze(parsed) : fallback;
}

function parseNumber(value: string | undefined, fallback: number, min = 1, max = 65535): number {
  if (!value) return fallback;
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) && num >= min && num <= max ? num : fallback;
}

const validLogLevels = new Set(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

const rawOwnerNumbers = parseArray(process.env.OWNER_NUMBERS, ['PHONE_NUMBER', 'PHONE_NUMBER']);
const normalizedOwners = new Set<string>(rawOwnerNumbers.map((num) => num.replace(/\D/g, '')));

export const config: AppConfig = Object.freeze({
  botName: (process.env.BOT_NAME || 'XLIY WhatsApp Engine').trim(),
  prefixes: parseArray(process.env.PREFIX, ['/']),
  ownerNumbers: normalizedOwners,
  port: parseNumber(process.env.PORT, 3000, 80, 65535),
  sessionDir: (process.env.SESSION_DIR || './sessions').trim(),
  logLevel: (validLogLevels.has(process.env.LOG_LEVEL || '')
    ? process.env.LOG_LEVEL
    : 'silent') as AppConfig['logLevel'],
  maxMemoryStoreSize: parseNumber(process.env.MAX_STORE_SIZE, 5000, 100, 50000),
  defaultCooldownMs: parseNumber(process.env.DEFAULT_COOLDOWN_MS, 1500, 0, 60000),
});
