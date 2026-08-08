import { User, EncryptionKey, Channel, ChannelKey, AuditLog, ChannelBundle } from '../types';
import { generateRawKey, getFingerprint, generateSalt, encryptTextGCM } from '../crypto/engine';

interface AppState {
  users: User[];
  keys: EncryptionKey[];
  channels: Channel[];
  channelKeys: ChannelKey[];
  auditLogs: AuditLog[];
  activeUserId: number | null;
}

const STORE_KEY = 'cipherly_encrypted_db';

const initialAppState: AppState = {
  users: [],
  keys: [],
  channels: [],
  channelKeys: [],
  auditLogs: [],
  activeUserId: null,
};

class StoreManager {
  private state: AppState = { ...initialAppState };
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const data = window.api ? await window.api.storeRead(STORE_KEY) : null;
      if (data) {
        this.state = data;
      } else {
        // Fallback to localStorage if window.api not available
        const local = localStorage.getItem(STORE_KEY);
        if (local) {
          this.state = JSON.parse(local);
        }
      }
    } catch (e) {
      console.warn('Failed to load store, initializing clean state:', e);
    }
    this.initialized = true;
  }

  private async save(): Promise<void> {
    if (window.api) {
      await window.api.storeWrite(STORE_KEY, this.state);
    } else {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.state));
    }
  }

  // --- Auth & Session ---
  async hasUsers(): Promise<boolean> {
    await this.init();
    return this.state.users.length > 0;
  }

  getActiveUser(): User | null {
    if (!this.state.activeUserId) return null;
    return this.state.users.find(u => u.id === this.state.activeUserId) || null;
  }

  async setupVault(username: string, passwordHash: string): Promise<User> {
    await this.init();
    const salt = generateSalt();
    const newUser: User = {
      id: Date.now(),
      username,
      passwordHash,
      saltB64: salt,
      masterKeyEncrypted: await encryptTextGCM(generateRawKey(), passwordHash),
    };

    this.state.users.push(newUser);
    this.state.activeUserId = newUser.id;
    await this.save();

    // Create default active encryption key
    await this.generateKey('Default Encryption Key');
    await this.logAction('key_generate', 'Vault initialized & default key created');

    return newUser;
  }

  async login(username: string, passwordHash: string): Promise<User> {
    await this.init();
    const user = this.state.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      throw new Error('User not found.');
    }
    // Verify password hash
    if (user.passwordHash !== passwordHash) {
      throw new Error('Invalid vault credentials.');
    }

    this.state.activeUserId = user.id;
    await this.save();
    return user;
  }

  async logout(): Promise<void> {
    await this.logAction('session_lock', 'Vault locked');
    this.state.activeUserId = null;
    await this.save();
  }

  // --- Key Management ---
  async getActiveKey(): Promise<EncryptionKey | null> {
    await this.init();
    const userId = this.state.activeUserId;
    if (!userId) return null;
    const userKeys = this.state.keys.filter(k => k.userId === userId && !k.isRetired);
    if (userKeys.length === 0) {
      // Auto-generate if missing
      return await this.generateKey('Auto-generated Key');
    }
    return userKeys[userKeys.length - 1]; // Latest active key
  }

  async getAllKeys(): Promise<EncryptionKey[]> {
    await this.init();
    const userId = this.state.activeUserId;
    if (!userId) return [];
    return this.state.keys.filter(k => k.userId === userId).sort((a, b) => b.id - a.id);
  }

  async generateKey(label: string = 'New Key'): Promise<EncryptionKey> {
    await this.init();
    const userId = this.state.activeUserId;
    if (!userId) throw new Error('No active session.');

    // Retire current active keys
    this.state.keys.forEach(k => {
      if (k.userId === userId) k.isRetired = true;
    });

    const rawKey = generateRawKey();
    const fingerprint = await getFingerprint(rawKey);

    const newKey: EncryptionKey = {
      id: Date.now(),
      userId,
      label,
      keyB64: rawKey,
      fingerprint,
      isRetired: false,
      createdAt: new Date().toISOString(),
    };

    this.state.keys.push(newKey);
    await this.save();
    await this.logAction('key_generate', `Generated new key '${label}' (${fingerprint})`);
    return newKey;
  }

  async setActiveKey(keyId: number): Promise<void> {
    await this.init();
    const userId = this.state.activeUserId;
    if (!userId) return;

    this.state.keys.forEach(k => {
      if (k.userId === userId) {
        k.isRetired = k.id !== keyId;
      }
    });
    await this.save();
    const key = this.state.keys.find(k => k.id === keyId);
    if (key) {
      await this.logAction('key_generate', `Switched active key to '${key.label}'`);
    }
  }

  // --- Channels ---
  async getChannels(): Promise<Channel[]> {
    await this.init();
    return [...this.state.channels];
  }

  async createChannel(name: string, description: string): Promise<Channel> {
    await this.init();
    const channel: Channel = {
      id: Date.now(),
      uuid: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name,
      description,
      createdAt: new Date().toISOString(),
    };

    this.state.channels.push(channel);

    // Create initial channel key
    const rawKey = generateRawKey();
    const fingerprint = await getFingerprint(rawKey);

    const channelKey: ChannelKey = {
      id: Date.now() + 1,
      channelId: channel.id,
      label: `${name} Key v1`,
      keyB64: rawKey,
      fingerprint,
      createdAt: new Date().toISOString(),
    };

    this.state.channelKeys.push(channelKey);
    await this.save();
    await this.logAction('channel_create', `Created channel '${name}' (${channel.uuid.substring(0, 8)})`);
    return channel;
  }

  async getChannelKeys(channelId: number): Promise<ChannelKey[]> {
    await this.init();
    return this.state.channelKeys.filter(ck => ck.channelId === channelId);
  }

  async exportBundle(channelId?: number): Promise<string> {
    await this.init();
    if (channelId) {
      const channel = this.state.channels.find(c => c.id === channelId);
      if (!channel) throw new Error('Channel not found.');
      const keys = this.state.channelKeys.filter(ck => ck.channelId === channelId);
      if (keys.length === 0) throw new Error('No keys for this channel.');
      const activeKey = keys[keys.length - 1];

      const bundle: ChannelBundle = {
        version: 'v2',
        type: 'channel',
        channel_uuid: channel.uuid,
        channel_name: channel.name,
        channel_desc: channel.description,
        key_b64: activeKey.keyB64,
        label: activeKey.label,
      };

      await this.logAction('key_export', `Exported bundle for channel '${channel.name}'`);
      return btoa(JSON.stringify(bundle));
    } else {
      const activeKey = await this.getActiveKey();
      if (!activeKey) throw new Error('No active personal key.');

      const bundle: ChannelBundle = {
        version: 'v2',
        type: 'personal',
        key_b64: activeKey.keyB64,
        label: activeKey.label,
      };

      await this.logAction('key_export', `Exported personal active key '${activeKey.label}'`);
      return btoa(JSON.stringify(bundle));
    }
  }

  async importBundle(b64Bundle: string): Promise<string> {
    await this.init();
    try {
      const jsonStr = atob(b64Bundle.trim());
      const bundle: ChannelBundle = JSON.parse(jsonStr);

      if (bundle.type === 'channel' && bundle.channel_name && bundle.key_b64) {
        let channel = this.state.channels.find(c => c.uuid === bundle.channel_uuid);
        if (!channel) {
          channel = {
            id: Date.now(),
            uuid: bundle.channel_uuid || crypto.randomUUID(),
            name: bundle.channel_name,
            description: bundle.channel_desc || 'Imported Channel',
            createdAt: new Date().toISOString(),
          };
          this.state.channels.push(channel);
        }

        const fingerprint = await getFingerprint(bundle.key_b64);
        const channelKey: ChannelKey = {
          id: Date.now(),
          channelId: channel.id,
          label: bundle.label || `${channel.name} Imported Key`,
          keyB64: bundle.key_b64,
          fingerprint,
          createdAt: new Date().toISOString(),
        };

        this.state.channelKeys.push(channelKey);
        await this.save();
        await this.logAction('key_import', `Imported channel key for '${channel.name}' (${fingerprint})`);
        return `Successfully imported channel '${channel.name}' key!`;
      } else if (bundle.key_b64) {
        // Import as personal key
        const userId = this.state.activeUserId;
        if (!userId) throw new Error('No active user.');

        const fingerprint = await getFingerprint(bundle.key_b64);
        const newKey: EncryptionKey = {
          id: Date.now(),
          userId,
          label: bundle.label || 'Imported Personal Key',
          keyB64: bundle.key_b64,
          fingerprint,
          isRetired: false,
          createdAt: new Date().toISOString(),
        };

        // Retire previous keys
        this.state.keys.forEach(k => {
          if (k.userId === userId) k.isRetired = true;
        });

        this.state.keys.push(newKey);
        await this.save();
        await this.logAction('key_import', `Imported personal encryption key (${fingerprint})`);
        return `Successfully imported personal key '${newKey.label}'!`;
      } else {
        throw new Error('Invalid bundle structure.');
      }
    } catch (e: any) {
      throw new Error(`Import failed: ${e.message || 'Invalid base64/JSON bundle format.'}`);
    }
  }

  // --- Audit Logs ---
  async getAuditLogs(): Promise<AuditLog[]> {
    await this.init();
    return [...this.state.auditLogs].sort((a, b) => b.id - a.id);
  }

  async logAction(action: AuditLog['action'], details: string): Promise<void> {
    await this.init();
    const log: AuditLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      action,
      details,
    };
    this.state.auditLogs.push(log);
    await this.save();
  }

  async purgeAuditLogs(): Promise<void> {
    await this.init();
    this.state.auditLogs = [];
    await this.save();
  }
}

export const store = new StoreManager();
