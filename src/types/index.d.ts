// src/types/index.d.ts
import type {
  proto,
  SignalKeyStore,
  AuthenticationCreds,
  AuthenticationState,
  WASocket,
  WAMessage,
  MiscMessageGenerationOptions,
} from 'baileys';

export type KeyStore = { [key: string]: any };

export type ExtendedWAMessage = WAMessage & {
  reply: (text: string, options?: MiscMessageGenerationOptions) => Promise<proto.WebMessageInfo>;
  react: (emoji: string) => Promise<proto.WebMessageInfo>;
};

export type RobustAuthState = {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
};

export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  execute: (sock: WASocket, message: ExtendedWAMessage, args: string[]) => Promise<void>;
}
