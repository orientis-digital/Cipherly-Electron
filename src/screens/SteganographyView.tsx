import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Image as ImageIcon, Lock, Unlock, Copy, Check, Key, RefreshCw, AlertCircle, Download, FileCheck } from 'lucide-react';
import { store } from '../db/store';
import { EncryptionKey } from '../types';
import { encryptTextGCM, decryptTextGCM } from '../crypto/engine';
import { embedDataInImage, extractDataFromImage } from '../crypto/steganography';

export const SteganographyView: React.FC = () => {
  const [mode, setMode] = useState<'embed' | 'extract'>('embed');
  const [useEncryption, setUseEncryption] = useState<boolean>(true);
  const [secretText, setSecretText] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [keys, setKeys] = useState<EncryptionKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [stegoResultUrl, setStegoResultUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setSuccessMsg('');
    setStegoResultUrl(null);
    setExtractedText('');

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (PNG recommended).');
        return;
      }
      setCoverFile(file);
      const url = URL.createObjectURL(file);
      setCoverPreview(url);
    }
  };

  const handleProcess = async () => {
    setError('');
    setSuccessMsg('');
    setStegoResultUrl(null);
    setExtractedText('');

    if (!coverFile) {
      setError('Please select an image file first.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'embed') {
        if (!secretText.trim()) {
          throw new Error('Please enter a secret message to embed.');
        }

        let payloadToEmbed = secretText;
        let activeKeyLabel = '';

        if (useEncryption) {
          const key = getSelectedKey();
          if (!key) throw new Error('No encryption key selected.');
          payloadToEmbed = await encryptTextGCM(secretText, key.keyB64);
          activeKeyLabel = key.label;
        }

        const resultDataUrl = await embedDataInImage(coverFile, payloadToEmbed);
        setStegoResultUrl(resultDataUrl);
        setSuccessMsg('Secret data successfully embedded into image!');
        await store.logAction(
          'stego_embed',
          `Embedded secret into image '${coverFile.name}' (${useEncryption ? `Encrypted via '${activeKeyLabel}'` : 'Plaintext'})`
        );
      } else {
        // Extraction mode
        const extractedRaw = await extractDataFromImage(coverFile);
        let finalResult = extractedRaw;

        if (useEncryption) {
          const key = getSelectedKey();
          if (!key) throw new Error('No decryption key selected.');

          try {
            finalResult = await decryptTextGCM(extractedRaw, key.keyB64);
          } catch {
            // Historical fallback key scan
            let decryptedStr: string | null = null;
            for (const k of keys) {
              if (k.id === key.id) continue;
              try {
                decryptedStr = await decryptTextGCM(extractedRaw, k.keyB64);
                break;
              } catch {
                // Ignore fallback error
              }
            }

            if (decryptedStr) {
              finalResult = decryptedStr;
            } else {
              throw new Error('Decryption failed for extracted steganographic payload. Invalid key.');
            }
          }
        }

        setExtractedText(finalResult);
        setSuccessMsg('Successfully extracted hidden secret from image!');
        await store.logAction('stego_extract', `Extracted secret payload from '${coverFile.name}'`);
      }
    } catch (err: any) {
      setError(err.message || 'Steganography operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!extractedText) return;
    if (window.api) {
      await window.api.copyClipboard(extractedText);
    } else {
      await navigator.clipboard.writeText(extractedText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 h-full flex flex-col space-y-6 max-w-5xl mx-auto animate-fade-in overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Steganography Suite</h2>
          <p className="text-xs text-slate-400">Hide encrypted zero-trust messages inside innocent cover image pixels.</p>
        </div>

        {/* Mode Switcher */}
        <div className="bg-dark-800 p-1 rounded-xl border border-slate-800 flex space-x-1">
          <button
            onClick={() => {
              setMode('embed');
              setError('');
              setSuccessMsg('');
              setStegoResultUrl(null);
              setExtractedText('');
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
              mode === 'embed'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Embed Secret</span>
          </button>

          <button
            onClick={() => {
              setMode('extract');
              setError('');
              setSuccessMsg('');
              setStegoResultUrl(null);
              setExtractedText('');
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
              mode === 'extract'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Extract Secret</span>
          </button>
        </div>
      </div>

      {/* Encryption Toggle & Key Selector Bar */}
      <div className="glass-card rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-xs font-medium text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={useEncryption}
              onChange={e => setUseEncryption(e.target.checked)}
              className="rounded bg-dark-900 border-slate-700 text-amber-500 focus:ring-amber-500"
            />
            <span>AES-256-GCM Layer Encryption</span>
          </label>
        </div>

        {useEncryption && (
          <div className="flex items-center space-x-3 text-xs text-slate-300">
            <Key className="w-4 h-4 text-amber-400" />
            <span className="font-medium">Vault Key:</span>
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
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center space-x-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <FileCheck className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Stego Panel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
        {/* Cover Image Picker Box */}
        <div className="flex flex-col space-y-3">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span>{mode === 'embed' ? '1. Cover Image (PNG)' : '1. Steganographic Image'}</span>
            {coverFile && <span className="text-[11px] text-slate-500 font-mono">{coverFile.name} ({(coverFile.size / 1024).toFixed(1)} KB)</span>}
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="glass-panel border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-6 flex flex-col items-center justify-center flex-1 space-y-3 cursor-pointer min-h-[220px] transition-all hover:bg-slate-800/20 group"
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover Preview" className="max-h-44 max-w-full object-contain rounded-lg border border-slate-800" />
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-slate-200">Click to upload cover image</p>
                  <p className="text-[11px] text-slate-400 font-mono">PNG images work best for lossless pixel encoding</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payload Box (Input Secret or Extracted Output) */}
        <div className="flex flex-col space-y-3">
          {mode === 'embed' ? (
            <>
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>2. Secret Message Payload</span>
                <span className="text-[11px] text-slate-500 font-mono">{secretText.length} chars</span>
              </label>
              <textarea
                value={secretText}
                onChange={e => setSecretText(e.target.value)}
                placeholder="Type your confidential message to hide within image pixels..."
                className="w-full flex-1 cipher-input rounded-xl p-4 text-sm font-mono resize-none min-h-[220px]"
              />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  2. Extracted Secret Message
                </label>
                {extractedText && (
                  <button
                    onClick={handleCopy}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1 font-medium"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Payload'}</span>
                  </button>
                )}
              </div>
              <textarea
                readOnly
                value={extractedText}
                placeholder="Extracted secret payload will appear here..."
                className="w-full flex-1 cipher-input rounded-xl p-4 text-sm font-mono resize-none bg-dark-900/60 min-h-[220px]"
              />
            </>
          )}
        </div>
      </div>

      {/* Stegano Result Image Output (If Embed successful) */}
      {stegoResultUrl && mode === 'embed' && (
        <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-amber-500/30">
          <div className="flex items-center space-x-4">
            <img src={stegoResultUrl} alt="Stego Result" className="w-20 h-20 object-cover rounded-xl border border-slate-700" />
            <div>
              <h4 className="text-sm font-bold text-slate-200">Steganographic Image Ready</h4>
              <p className="text-xs text-slate-400">The carrier image looks visually identical, but conceals your secret payload.</p>
            </div>
          </div>

          <a
            href={stegoResultUrl}
            download={`stego_carrier_${Date.now()}.png`}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-semibold text-xs transition flex items-center space-x-2 shadow-lg shadow-amber-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Stego PNG</span>
          </a>
        </div>
      )}

      {/* Footer Action Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleProcess}
          disabled={loading || !coverFile}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-semibold text-sm transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : mode === 'embed' ? (
            <Lock className="w-4 h-4" />
          ) : (
            <Unlock className="w-4 h-4" />
          )}
          <span>{loading ? 'Processing Image...' : mode === 'embed' ? 'Encode Secret into Image' : 'Extract Hidden Secret'}</span>
        </button>
      </div>
    </div>
  );
};
