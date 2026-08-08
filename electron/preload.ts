import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  copyClipboard: (text: string) => ipcRenderer.invoke('cipherly:copy-clipboard', text),
  readClipboard: () => ipcRenderer.invoke('cipherly:read-clipboard'),
  openFileDialog: () => ipcRenderer.invoke('cipherly:open-file-dialog'),
  saveFileDialog: (defaultName: string) => ipcRenderer.invoke('cipherly:save-file-dialog', defaultName),
  storeRead: (key: string) => ipcRenderer.invoke('cipherly:store-read', key),
  storeWrite: (key: string, value: any) => ipcRenderer.invoke('cipherly:store-write', key, value),
  encryptFileStream: (inputPath: string, outputPath: string, keyB64: string) =>
    ipcRenderer.invoke('cipherly:encrypt-file-stream', inputPath, outputPath, keyB64),
  decryptFileStream: (inputPath: string, outputPath: string, keyB64: string) =>
    ipcRenderer.invoke('cipherly:decrypt-file-stream', inputPath, outputPath, keyB64),
});
