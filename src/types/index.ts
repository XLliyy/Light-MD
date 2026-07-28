import type {
  proto,
  AuthenticationState,
  WASocket,
  WAMessage,
  MiscMessageGenerationOptions,
} from 'baileys';

export type KeyStore = { [key: string]: any };

export type ExtendedWAMessage = WAMessage & {
  reply: (text: string, options?: MiscMessageGenerationOptions) => Promise<proto.WebMessageInfo | undefined>;
  react: (emoji: string) => Promise<proto.WebMessageInfo | undefined>;

  quoted?: {
    message: proto.IMessage;
    senderJid: string;
    key: proto.IMessageKey;
    text: string;
  } | null;
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
