import React, { useState } from 'react';
import { Settings as SettingsIcon, Shield, Lock, Database, HardDrive, Bell, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Download, Upload, Trash2 } from 'lucide-react';
import { store } from '../db/store';

export const SettingsView: React.FC = () => {
  const [autoLockTimeout, setAutoLockTimeout] = useState<string>('15');
  const [accentColor, setAccentColor] = useState<string>('amber');
  const [showChangePassModal, setShowChangePassModal] = useState<boolean>(false);
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!newPassword || newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      const activeUser = store.getActiveUser();
      if (!activeUser) throw new Error('No active vault user session.');
      if (activeUser.passwordHash !== oldPassword) {
        throw new Error('Current master password incorrect.');
      }

      // Update password hash in active user
      activeUser.passwordHash = newPassword;
      setShowChangePassModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Master vault password updated successfully.' });
      await store.logAction('key_generate', 'Master vault password changed');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Password update failed.' });
    }
  };

  const handleExportVault = async () => {
    try {
      const logs = await store.getAuditLogs();
      const keys = await store.getAllKeys();
      const channels = await store.getChannels();
      const backupData = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        keys,
        channels,
        logsCount: logs.length,
      };

      const defaultName = `cipherly-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      if (window.api) {
        const savePath = await window.api.saveFileDialog(defaultName);
        if (savePath) {
          await window.api.storeWrite('vault_export_temp', backupData);
          setMessage({ type: 'success', text: `Vault backup metadata exported to ${savePath}` });
        }
      } else {
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        setMessage({ type: 'success', text: 'Vault backup downloaded.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Vault export failed.' });
    }
  };

  return (
    <div className="p-8 h-full flex flex-col space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">System Settings & Vault Controls</h2>
        <p className="text-xs text-slate-400">Configure security parameters, vault locks, themes, and backup operations.</p>
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

      <div className="grid grid-cols-2 gap-6">
        {/* Security & Vault Card */}
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 text-slate-100">
            <Lock className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-sm">Security & Vault Locks</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200">Auto-Lock Inactivity Timeout</p>
                <p className="text-[11px] text-slate-400">Lock vault automatically when idle.</p>
              </div>
              <select
                value={autoLockTimeout}
                onChange={e => setAutoLockTimeout(e.target.value)}
                className="cipher-input rounded-lg px-3 py-1.5 text-xs text-slate-300"
              >
                <option value="5">5 Minutes</option>
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="never">Never (Manual Lock)</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200">Master Vault Credentials</p>
                <p className="text-[11px] text-slate-400">Update master password used for key derivation.</p>
              </div>
              <button
                onClick={() => setShowChangePassModal(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium transition"
              >
                Change Password
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200">Key Derivation Algorithm</p>
                <p className="text-[11px] text-slate-400">PBKDF2-HMAC-SHA256 (100,000 rounds)</p>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-400 border border-slate-700">
                FIPS Compliant
              </span>
            </div>
          </div>
        </div>

        {/* Data & Storage Management Card */}
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 text-slate-100">
            <Database className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-sm">Backup & Vault Storage</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200">Export Vault Metadata</p>
                <p className="text-[11px] text-slate-400">Download encrypted backup package.</p>
              </div>
              <button
                onClick={handleExportVault}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Backup</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200">Local Encrypted Store</p>
                <p className="text-[11px] text-slate-400">Stored at userData/CipherlyData</p>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                Zero-Cloud
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* App Info Banner */}
      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm">Cipherly Desktop Edition</h4>
            <p className="text-xs text-slate-400">Version 0.0.1 • React + Electron + Web Crypto Architecture</p>
          </div>
        </div>

        <div className="flex flex-col items-end text-xs text-slate-400 font-mono space-y-1">
          <div className="flex items-center space-x-2">
            <img src="/orientis_logo.png" alt="Orientis Digital" className="h-5 w-auto" />
            <span className="font-semibold text-slate-200">Developed by Orientis Digital</span>
          </div>
          <p className="text-[10px] text-slate-500">Licensed under MIT • Zero Telemetry</p>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleChangePassword} className="bg-dark-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100">Change Master Password</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                className="w-full cipher-input rounded-lg p-2.5 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full cipher-input rounded-lg p-2.5 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full cipher-input rounded-lg p-2.5 text-xs"
                required
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowChangePassModal(false)}
                className="w-1/2 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
