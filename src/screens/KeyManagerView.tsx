import React, { useState, useEffect } from 'react';
import { KeyRound, Plus, QrCode, CheckCircle2, ShieldAlert, Sparkles, Copy } from 'lucide-react';
import { store } from '../db/store';
import { EncryptionKey } from '../types';
import { QRCodeModal } from '../components/QRCodeModal';

export const KeyManagerView: React.FC = () => {
  const [keys, setKeys] = useState<EncryptionKey[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState<string>('');
  const [showGenModal, setShowGenModal] = useState<boolean>(false);
  const [qrData, setQrData] = useState<{ isOpen: boolean; title: string; bundle: string }>({
    isOpen: false,
    title: '',
    bundle: '',
  });

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    const list = await store.getAllKeys();
    setKeys(list);
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newKeyLabel.trim() || 'Personal Encryption Key';
    await store.generateKey(label);
    setNewKeyLabel('');
    setShowGenModal(false);
    await loadKeys();
  };

  const handleSetActive = async (keyId: number) => {
    await store.setActiveKey(keyId);
    await loadKeys();
  };

  const handleExportQR = async (key: EncryptionKey) => {
    const bundle = btoa(
      JSON.stringify({
        version: 'v2',
        type: 'personal',
        key_b64: key.keyB64,
        label: key.label,
      })
    );
    setQrData({ isOpen: true, title: `Key QR: ${key.label}`, bundle });
  };

  return (
    <div className="p-8 h-full flex flex-col space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Key Manager & Rotation</h2>
          <p className="text-xs text-slate-400">Manage encryption keys, rotate active keys, and export fingerprints.</p>
        </div>

        <button
          onClick={() => setShowGenModal(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs font-semibold transition flex items-center space-x-1.5 shadow-lg shadow-amber-500/20"
        >
          <Sparkles className="w-4 h-4" />
          <span>Rotate & Generate Key</span>
        </button>
      </div>

      {/* Keys List */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {keys.map(k => {
          const isActive = !k.isRetired;
          return (
            <div
              key={k.id}
              className={`glass-panel p-5 rounded-2xl border transition flex items-center justify-between ${
                isActive ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-slate-800/80 border-slate-700 text-slate-500'
                  }`}
                >
                  <KeyRound className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-sm text-slate-200">{k.label}</h3>
                    {isActive ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Active Key
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-amber-400 mt-1">{k.fingerprint}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Created on {new Date(k.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {!isActive && (
                  <button
                    onClick={() => handleSetActive(k.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                  >
                    Set Active
                  </button>
                )}

                <button
                  onClick={() => handleExportQR(k)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition"
                  title="Export QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Generate Key Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleGenerateKey} className="bg-dark-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100">Rotate & Generate Key</h3>
            <p className="text-xs text-slate-400">
              Generating a new key will automatically set it as active. Existing ciphertext can still be decrypted via historical key scanning.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Key Label</label>
              <input
                type="text"
                value={newKeyLabel}
                onChange={e => setNewKeyLabel(e.target.value)}
                placeholder="e.g. Master Key 2026 Q3"
                className="w-full cipher-input rounded-lg p-2.5 text-xs"
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowGenModal(false)}
                className="w-1/2 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold"
              >
                Generate & Activate
              </button>
            </div>
          </form>
        </div>
      )}

      <QRCodeModal
        isOpen={qrData.isOpen}
        onClose={() => setQrData({ ...qrData, isOpen: false })}
        title={qrData.title}
        bundleData={qrData.bundle}
      />
    </div>
  );
};
