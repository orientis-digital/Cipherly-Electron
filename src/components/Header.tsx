import React from 'react';
import { KeyRound, ShieldCheck, User as UserIcon } from 'lucide-react';
import { EncryptionKey, User } from '../types';

interface HeaderProps {
  user: User | null;
  activeKey: EncryptionKey | null;
}

export const Header: React.FC<HeaderProps> = ({ user, activeKey }) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-dark-800/40 backdrop-blur-md px-6 flex items-center justify-between select-none">
      {/* Active Key Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 font-medium">Active Key:</span>
          <span className="text-amber-400 font-mono font-medium">
            {activeKey ? activeKey.label : 'None'}
          </span>
          {activeKey && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
              {activeKey.fingerprint.substring(0, 9)}...
            </span>
          )}
        </div>
      </div>

      {/* User Info & Engine Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="font-medium">Vault Encrypted</span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-slate-300">
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
            <UserIcon className="w-4 h-4" />
          </div>
          <span className="font-medium text-xs text-slate-200">{user?.username || 'Operator'}</span>
        </div>
      </div>
    </header>
  );
};
