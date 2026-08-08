export interface User {
  id: number;
  username: string;
  passwordHash: string;
  saltB64: string;
  masterKeyEncrypted: string; // DEK encrypted under master key
}

export interface EncryptionKey {
  id: number;
  userId: number;
  label: string;
  keyB64: string;
  fingerprint: string;
  isRetired: boolean;
  createdAt: string;
}

export interface Channel {
  id: number;
  uuid: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface ChannelKey {
  id: number;
  channelId: number;
  label: string;
  keyB64: string;
  fingerprint: string;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  action: 'key_generate' | 'key_export' | 'key_import' | 'text_encrypt' | 'text_decrypt' | 'file_encrypt' | 'file_decrypt' | 'channel_create' | 'session_lock';
  details: string;
}

export interface ChannelBundle {
  version: string;
  type: 'channel' | 'personal';
  channel_uuid?: string;
  channel_name?: string;
  channel_desc?: string;
  key_b64: string;
  label?: string;
}

declare global {
  interface Window {
    api: {
      copyClipboard: (text: string) => Promise<boolean>;
      readClipboard: () => Promise<string>;
      openFileDialog: () => Promise<{ path: string; name: string; size: number } | null>;
      saveFileDialog: (defaultName: string) => Promise<string | null>;
      storeRead: (key: string) => Promise<any>;
      storeWrite: (key: string, value: any) => Promise<boolean>;
      encryptFileStream: (inputPath: string, outputPath: string, keyB64: string) => Promise<{ success: boolean; error?: string }>;
      decryptFileStream: (inputPath: string, outputPath: string, keyB64: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
