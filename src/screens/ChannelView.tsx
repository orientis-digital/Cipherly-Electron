import React, { useState, useEffect } from 'react';
import { Radio, Plus, QrCode, Download, Upload, Key, CheckCircle2, AlertCircle } from 'lucide-react';
import { store } from '../db/store';
import { Channel, ChannelKey } from '../types';
import { QRCodeModal } from '../components/QRCodeModal';

export const ChannelView: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [channelKeys, setChannelKeys] = useState<ChannelKey[]>([]);

  // Create Channel modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [channelName, setChannelName] = useState<string>('');
  const [channelDesc, setChannelDesc] = useState<string>('');

  // Import Modal
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importPayload, setImportPayload] = useState<string>('');

  // QR Modal
  const [qrModalData, setQrModalData] = useState<{ isOpen: boolean; title: string; bundle: string }>({
    isOpen: false,
    title: '',
    bundle: '',
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    const list = await store.getChannels();
    setChannels(list);
    if (list.length > 0 && !selectedChannelId) {
      setSelectedChannelId(list[0].id);
      loadChannelKeys(list[0].id);
    }
  };

  const loadChannelKeys = async (cid: number) => {
    const keys = await store.getChannelKeys(cid);
    setChannelKeys(keys);
  };

  const handleSelectChannel = (cid: number) => {
    setSelectedChannelId(cid);
    loadChannelKeys(cid);
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    try {
      const channel = await store.createChannel(channelName.trim(), channelDesc.trim());
      setChannelName('');
      setChannelDesc('');
      setShowCreateModal(false);
      await loadChannels();
      handleSelectChannel(channel.id);
      setMessage({ type: 'success', text: `Created channel '${channel.name}'` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Channel creation failed.' });
    }
  };

  const handleExportQR = async (cid?: number) => {
    try {
      const bundle = await store.exportBundle(cid);
      const title = cid ? 'Channel Key Bundle QR' : 'Personal Active Key QR';
      setQrModalData({ isOpen: true, title, bundle });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Export failed.' });
    }
  };

  const handleImportBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importPayload.trim()) return;
    try {
      const resText = await store.importBundle(importPayload.trim());
      setImportPayload('');
      setShowImportModal(false);
      await loadChannels();
      setMessage({ type: 'success', text: resText });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Import failed.' });
    }
  };

  return (
    <div className="p-8 h-full flex flex-col space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Key Channels & Bundles</h2>
          <p className="text-xs text-slate-400">Share encrypted key bundles securely across devices or team channels via QR codes.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center space-x-1.5 border border-slate-700"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Import Key Bundle</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs font-semibold transition flex items-center space-x-1.5 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Channel</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center space-x-2 p-3 rounded-xl border text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Grid: Channels list + Key Details */}
      <div className="grid grid-cols-3 gap-6 flex-1">
        {/* Left: Channel Selector List */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Channels</h3>
          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            {channels.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No active channels yet. Create one to share keys.</div>
            ) : (
              channels.map(c => {
                const isSelected = c.id === selectedChannelId;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectChannel(c.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/30 text-slate-100 shadow-md'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Radio className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                        <span className="font-semibold text-sm">{c.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-800">
                        {c.uuid.substring(0, 8)}
                      </span>
                    </div>
                    {c.description && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{c.description}</p>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Channel Details & Keys */}
        <div className="col-span-2 glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-6">
          {selectedChannelId && channels.find(c => c.id === selectedChannelId) ? (
            <>
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">
                      {channels.find(c => c.id === selectedChannelId)?.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {channels.find(c => c.id === selectedChannelId)?.description || 'No description provided.'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleExportQR(selectedChannelId)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium transition flex items-center space-x-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Show QR Bundle</span>
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Channel Keys & Fingerprints</span>
                  </h4>

                  <div className="space-y-2">
                    {channelKeys.map(ck => (
                      <div key={ck.id} className="p-3.5 rounded-xl bg-dark-900 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-200">{ck.label}</p>
                          <p className="font-mono text-amber-400 text-[11px] mt-0.5">{ck.fingerprint}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(ck.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Select or create a channel to manage keys.
            </div>
          )}
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleCreateChannel} className="bg-dark-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100">Create Key Channel</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Channel Name</label>
              <input
                type="text"
                value={channelName}
                onChange={e => setChannelName(e.target.value)}
                placeholder="e.g. Finance Vault Key"
                className="w-full cipher-input rounded-lg p-2.5 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Description</label>
              <textarea
                value={channelDesc}
                onChange={e => setChannelDesc(e.target.value)}
                placeholder="Optional channel summary"
                rows={2}
                className="w-full cipher-input rounded-lg p-2.5 text-xs resize-none"
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-1/2 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleImportBundle} className="bg-dark-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100">Import Key Bundle</h3>
            <p className="text-xs text-slate-400">Paste Base64 bundle string exported from another Cipherly instance.</p>
            <textarea
              value={importPayload}
              onChange={e => setImportPayload(e.target.value)}
              placeholder="Paste Base64 JSON bundle payload..."
              rows={4}
              className="w-full cipher-input rounded-lg p-3 text-xs font-mono resize-none"
              required
            />
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="w-1/2 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold"
              >
                Import Key
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QR Modal */}
      <QRCodeModal
        isOpen={qrModalData.isOpen}
        onClose={() => setQrModalData({ ...qrModalData, isOpen: false })}
        title={qrModalData.title}
        bundleData={qrModalData.bundle}
      />
    </div>
  );
};
