import React from 'react';
import { Shield, Lock, FileText, FolderLock, KeyRound, History, Radio, LogOut, Settings as SettingsIcon } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLock: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, onLock }) => {
  const navItems = [
    { id: 'text', label: 'Text Cipher', icon: FileText },
    { id: 'file', label: 'File Vault', icon: FolderLock },
    { id: 'channel', label: 'Key Channels', icon: Radio },
    { id: 'keys', label: 'Key Manager', icon: KeyRound },
    { id: 'history', label: 'Audit Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 h-full bg-dark-800/90 border-r border-slate-800 flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-100 tracking-tight flex items-center gap-1.5">
              Cipherly
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">v0.0.1</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">Zero-Trust Encryption</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-500/5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Lock Session Footer */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-400 font-mono">
          <img src="/orientis_logo.png" alt="Orientis Digital" className="h-4 w-auto opacity-75" />
          <span>Orientis Digital</span>
        </div>

        <button
          onClick={onLock}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
        >
          <Lock className="w-4 h-4" />
          <span>Lock Vault</span>
        </button>
      </div>
    </aside>
  );
};
