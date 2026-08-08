import { app, BrowserWindow, ipcMain, dialog, clipboard } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

const DATA_DIR = path.join(app.getPath('userData'), 'CipherlyData');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    title: 'Cipherly',
    backgroundColor: '#090b10',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#090b10',
      symbolColor: '#f59e0b',
      height: 38
    },
    webPreferences: {
      preload: fs.existsSync(path.join(__dirname, 'preload.mjs'))
        ? path.join(__dirname, 'preload.mjs')
        : path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('cipherly:copy-clipboard', (_, text: string) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('cipherly:read-clipboard', () => {
  return clipboard.readText();
});

ipcMain.handle('cipherly:open-file-dialog', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const stats = fs.statSync(filePath);
  return {
    path: filePath,
    name: path.basename(filePath),
    size: stats.size,
  };
});

ipcMain.handle('cipherly:save-file-dialog', async (_, defaultName: string) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});

ipcMain.handle('cipherly:store-read', (_, key: string) => {
  const file = path.join(DATA_DIR, `${key}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error('Store read error:', err);
    return null;
  }
});

ipcMain.handle('cipherly:store-write', (_, key: string, value: any) => {
  const file = path.join(DATA_DIR, `${key}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Store write error:', err);
    return false;
  }
});

// Stream-based File Encryption using AES-256-GCM
ipcMain.handle('cipherly:encrypt-file-stream', async (_, inputPath: string, outputPath: string, keyB64: string) => {
  try {
    const rawKey = Buffer.from(keyB64, 'base64');
    // Ensure key is 32 bytes for AES-256
    const key = crypto.createHash('sha256').update(rawKey).digest();
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    // Header: Magic Header ("CIPHERLY_V1") + 12-byte IV
    output.write(Buffer.from('CIPHERLY_V1', 'utf8'));
    output.write(iv);

    return new Promise((resolve, reject) => {
      input.pipe(cipher).pipe(output, { end: false });
      cipher.on('end', () => {
        const authTag = cipher.getAuthTag();
        output.write(authTag);
        output.end();
        resolve({ success: true });
      });
      cipher.on('error', (err: any) => reject(err));
      input.on('error', (err: any) => reject(err));
      output.on('error', (err: any) => reject(err));
    });
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Stream-based File Decryption using AES-256-GCM
ipcMain.handle('cipherly:decrypt-file-stream', async (_, inputPath: string, outputPath: string, keyB64: string) => {
  try {
    const rawKey = Buffer.from(keyB64, 'base64');
    const key = crypto.createHash('sha256').update(rawKey).digest();

    const fileBuf = fs.readFileSync(inputPath);
    const magic = fileBuf.subarray(0, 11).toString('utf8');
    if (magic !== 'CIPHERLY_V1') {
      throw new Error('Invalid file format or header mismatch.');
    }

    const iv = fileBuf.subarray(11, 23);
    const authTag = fileBuf.subarray(fileBuf.length - 16);
    const ciphertext = fileBuf.subarray(23, fileBuf.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    fs.writeFileSync(outputPath, decrypted);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Decryption failed (Invalid key or corrupted file).' };
  }
});
