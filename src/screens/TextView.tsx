import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Copy, Check, Key, RefreshCw, AlertCircle } from 'lucide-react';
import { store } from '../db/store';
import { EncryptionKey } from '../types';
import { encryptTextGCM, decryptTextGCM } from '../crypto/engine';

export const TextView: React.FC = () => {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [keys, setKeys] = useState<EncryptionKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    const allKeys = await store.getAllKeys();
    setKeys(allKeys);
    const active = await store.getActiveKey();
    if (active) {
      setSelectedKeyId(active.id);
    } else if (allKeys.length > 0) {
      setSelectedKeyId(allKeys[0].id);
    }
  };

  const getSelectedKey = (): EncryptionKey | null => {
    return keys.find(k => k.id === selectedKeyId) || null;
  };

  const handleProcess = async () => {
    setError('');
    setOutputText('');
    if (!inputText.trim()) {
      setError('Please enter text payload.');
      return;
    }

    const key = getSelectedKey();
    if (!key) {
      setError('No key selected.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'encrypt') {
        const encrypted = await encryptTextGCM(inputText, key.keyB64);
        setOutputText(encrypted);
        await store.logAction('text_encrypt', `Encrypted text (${inputText.length} chars) using key '${key.label}'`);
      } else {
        // Try selected key first, fallback to other keys if needed
        try {
          const decrypted = await decryptTextGCM(inputText, key.keyB64);
          setOutputText(decrypted);
          await store.logAction('text_decrypt', `Decrypted text payload using key '${key.label}'`);
        } catch (firstErr) {
          // Automatic historical key fallback scan
          let decryptedStr: string | null = null;
          let matchedKeyLabel = '';
          for (const k of keys) {
            if (k.id === key.id) continue;
            try {
              decryptedStr = await decryptTextGCM(inputText, k.keyB64);
              matchedKeyLabel = k.label;
              break;
            } catch (e) {
              // Ignore fallback failure
            }
          }

          if (decryptedStr) {
            setOutputText(decryptedStr);
            await store.logAction('text_decrypt', `Decrypted text payload using historical key '${matchedKeyLabel}'`);
          } else {
            throw firstErr;
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!outputText) return;
    if (window.api) {
      await window.api.copyClipboard(outputText);
    } else {
      await navigator.clipboard.writeText(outputText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 h-full flex flex-col space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Text Cipher Engine</h2>
          <p className="text-xs text-slate-400">Military-grade text encryption with automatic historical key fallback.</p>
        </div>

        {/* Mode Switcher */}
        <div className="bg-dark-800 p-1 rounded-xl border border-slate-800 flex space-x-1">
          <button
            onClick={() => { setMode('encrypt'); setError(''); setOutputText(''); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
              mode === 'encrypt'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Encrypt Text</span>
          </button>

          <button
            onClick={() => { setMode('decrypt'); setError(''); setOutputText(''); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
              mode === 'decrypt'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Decrypt Text</span>
          </button>
        </div>
      </div>

      {/* Key Selector Bar */}
      <div className="glass-card rounded-xl p-4 flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-3 text-xs text-slate-300">
          <Key className="w-4 h-4 text-amber-400" />
          <span className="font-medium">Encryption Key:</span>
          <select
            value={selectedKeyId || ''}
            onChange={e => setSelectedKeyId(Number(e.target.value))}
            className="cipher-input rounded-lg px-3 py-1.5 text-xs text-amber-400 font-mono"
          >
            {keys.map(k => (
              <option key={k.id} value={k.id} className="bg-dark-800 text-slate-200">
                {k.label} {!k.isRetired ? '(Active)' : '(Archived)'} — {k.fingerprint.substring(0, 9)}...
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          {getSelectedKey()?.fingerprint}
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input / Output Workspace */}
      <div className="grid grid-cols-2 gap-6 flex-1">
        {/* Input Pane */}
        <div className="flex flex-col space-y-2">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span>{mode === 'encrypt' ? 'Plaintext Payload' : 'Ciphertext Payload (Base64)'}</span>
            <span className="text-[11px] text-slate-500 font-mono">{inputText.length} chars</span>
          </label>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={mode === 'encrypt' ? 'Type or paste secret message here...' : 'Paste ciphertext payload here...'}
            className="w-full flex-1 cipher-input rounded-xl p-4 text-sm font-mono resize-none"
          />
        </div>

        {/* Output Pane */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">
              {mode === 'encrypt' ? 'Encrypted Ciphertext' : 'Decrypted Plaintext'}
            </label>
            {outputText && (
              <button
                onClick={handleCopy}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1 font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            )}
          </div>
          <textarea
            readOnly
            value={outputText}
            placeholder="Result will appear here after processing..."
            className="w-full flex-1 cipher-input rounded-xl p-4 text-sm font-mono resize-none bg-dark-900/60"
          />
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleProcess}
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-semibold text-sm transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : mode === 'encrypt' ? (
            <Lock className="w-4 h-4" />
          ) : (
            <Unlock className="w-4 h-4" />
          )}
          <span>{loading ? 'Processing...' : mode === 'encrypt' ? 'Encrypt Text' : 'Decrypt Text'}</span>
        </button>
      </div>
    </div>
  );
};
