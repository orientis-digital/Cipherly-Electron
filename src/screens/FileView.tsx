import React, { useState } from 'react';
import { FolderLock, File, Lock, Unlock, CheckCircle2, AlertCircle, HardDrive, RefreshCw } from 'lucide-react';
import { store } from '../db/store';

export const FileView: React.FC = () => {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string; size: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSelectFile = async () => {
    setMessage(null);
    if (!window.api) {
      setMessage({ type: 'error', text: 'File selection is available in Electron Desktop Mode.' });
      return;
    }

    const file = await window.api.openFileDialog();
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleProcessFile = async () => {
    setMessage(null);
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a target file first.' });
      return;
    }

    const activeKey = await store.getActiveKey();
    if (!activeKey) {
      setMessage({ type: 'error', text: 'No active encryption key found.' });
      return;
    }

    const defaultName = mode === 'encrypt' ? `${selectedFile.name}.enc` : selectedFile.name.replace('.enc', '');
    const savePath = await window.api.saveFileDialog(defaultName);

    if (!savePath) return; // User cancelled save dialog

    setLoading(true);
    try {
      if (mode === 'encrypt') {
        const res = await window.api.encryptFileStream(selectedFile.path, savePath, activeKey.keyB64);
        if (res.success) {
          setMessage({ type: 'success', text: `Encrypted file successfully saved to ${savePath}` });
          await store.logAction('file_encrypt', `Encrypted file '${selectedFile.name}' (${(selectedFile.size / 1024).toFixed(1)} KB)`);
        } else {
          throw new Error(res.error || 'File encryption failed.');
        }
      } else {
        const res = await window.api.decryptFileStream(selectedFile.path, savePath, activeKey.keyB64);
        if (res.success) {
          setMessage({ type: 'success', text: `Decrypted file successfully restored to ${savePath}` });
          await store.logAction('file_decrypt', `Decrypted file '${selectedFile.name}'`);
        } else {
          throw new Error(res.error || 'File decryption failed.');
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'File processing failed.' });
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="p-8 h-full flex flex-col space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Secure File Vault</h2>
          <p className="text-xs text-slate-400">Stream-based AES-256-GCM hardware-accelerated file encryption.</p>
        </div>

        {/* Mode Switcher */}
        <div className="bg-dark-800 p-1 rounded-xl border border-slate-800 flex space-x-1">
          <button
            onClick={() => { setMode('encrypt'); setSelectedFile(null); setMessage(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
              mode === 'encrypt'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Encrypt File</span>
          </button>

          <button
            onClick={() => { setMode('decrypt'); setSelectedFile(null); setMessage(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
              mode === 'decrypt'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Decrypt File</span>
          </button>
        </div>
      </div>

      {/* Main File Drop / Select Area */}
      <div
        onClick={handleSelectFile}
        className="glass-panel border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-12 flex flex-col items-center justify-center space-y-4 cursor-pointer transition-all hover:bg-slate-800/20 group"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform shadow-lg shadow-amber-500/10">
          <FolderLock className="w-8 h-8" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-slate-200">
            {selectedFile ? selectedFile.name : 'Click to select file for processing'}
          </p>
          <p className="text-xs text-slate-400 font-mono">
            {selectedFile ? `${formatSize(selectedFile.size)} • ${selectedFile.path}` : 'Supports all document, archive, video, or binary formats'}
          </p>
        </div>
      </div>

      {/* Notification banner */}
      {message && (
        <div
          className={`flex items-center space-x-2 p-4 rounded-xl border text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
          <HardDrive className="w-4 h-4 text-slate-500" />
          <span>AES-256-GCM Stream Engine Ready</span>
        </div>

        <button
          onClick={handleProcessFile}
          disabled={!selectedFile || loading}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-semibold text-sm transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : mode === 'encrypt' ? (
            <Lock className="w-4 h-4" />
          ) : (
            <Unlock className="w-4 h-4" />
          )}
          <span>{loading ? 'Processing File...' : mode === 'encrypt' ? 'Encrypt & Save .enc' : 'Decrypt File'}</span>
        </button>
      </div>
    </div>
  );
};
