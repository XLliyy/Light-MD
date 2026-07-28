import {
  initAuthCreds,
  BufferJSON,
  makeCacheableSignalKeyStore,
  type AuthenticationState,
} from 'baileys';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { KeyStore, RobustAuthState } from '../types/index.ts';
import logger from '../utils/logger.ts';

const KEY_MAP: Record<string, string> = {
  'pre-key': 'pre-key',
  session: 'session',
  'sender-key': 'sender-key',
  'app-state-sync-key': 'app-state-sync-key',
  'app-state-sync-version': 'app-state-sync-version',
};

const atomicWrite = async (path: string, data: Buffer) => {
  const tempPath = `${path}.${randomUUID()}.tmp`;
  await fs.writeFile(tempPath, data);
  await fs.rename(tempPath, path);
};

export async function useRobustFileAuthState(folder: string): Promise<RobustAuthState> {
  await fs.mkdir(folder, { recursive: true });

  const credsPath = join(folder, 'creds.json');
  const keyStore: KeyStore = {};
  let saveDebounceTimeout: NodeJS.Timeout | undefined = undefined;

  let creds: AuthenticationState['creds'];
  try {
    const credsData = await fs.readFile(credsPath, { encoding: 'utf-8' });
    creds = JSON.parse(credsData, BufferJSON.reviver);
  } catch (error) {
    logger.warn('creds.json not found, creating new credentials.');
    creds = initAuthCreds();
  }

  const saveCreds = () => {
    return new Promise<void>((resolve, reject) => {
      clearTimeout(saveDebounceTimeout);
      saveDebounceTimeout = setTimeout(async () => {
        try {
          logger.debug('Saving credentials...');
          const data = JSON.stringify(creds, BufferJSON.replacer, 2);
          await atomicWrite(credsPath, Buffer.from(data, 'utf-8'));
          resolve();
        } catch (err) {
          logger.error(err, 'Failed to save creds.json');
          reject(err);
        }
      }, 1500);
    });
  };

  try {
    const files = await fs.readdir(folder);
    await Promise.all(
      files.map(async (file) => {
        if (file === 'creds.json' || !file.endsWith('.json')) return;

        for (const type in KEY_MAP) {
          if (file.startsWith(`${type}-`)) {
            const id = file.slice(type.length + 1, -5);
            const filePath = join(folder, file);
            try {
               const data = await fs.readFile(filePath, { encoding: 'utf-8' });
               keyStore[`${type}-${id}`] = JSON.parse(data, BufferJSON.reviver);
            } catch (err) {
               logger.error(err, `Failed to parse session file: ${file}`);
            }
            break;
          }
        }
      })
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.error(error, 'Failed to read session files');
    }
  }

  return {
    state: {
      creds,
      keys: makeCacheableSignalKeyStore(
        {
          get: async (type, ids) => {
            const data: { [key: string]: any } = {};
            for (const id of ids) {
              const value = keyStore[`${type}-${id}`];
              if (value) data[id] = value;
            }
            return data;
          },
          set: async (data) => {
            const promises: Promise<void>[] = [];
            for (const [type, inner] of Object.entries(data)) {
              for (const [id, value] of Object.entries(inner)) {
                const key = `${type}-${id}`;
                keyStore[key] = value;
                const filePath = join(folder, `${key}.json`);
                promises.push(
                  atomicWrite(
                    filePath,
                    Buffer.from(JSON.stringify(value, BufferJSON.replacer), 'utf-8')
                  )
                );
              }
            }
            await Promise.all(promises);
          },
        },
        logger,
      ),
    },
    saveCreds,
  };
}
