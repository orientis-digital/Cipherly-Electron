import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { store } from '../db/store';
import { User as UserType } from '../types';

interface LoginViewProps {
  onSuccess: (user: UserType) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const [isFirstRun, setIsFirstRun] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('operator');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    store.hasUsers().then(has => {
      setIsFirstRun(!has);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all credentials.');
      return;
    }

    if (isFirstRun && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isFirstRun) {
        const newUser = await store.setupVault(username.trim(), password);
        onSuccess(newUser);
      } else {
        const user = await store.login(username.trim(), password);
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -top-24 -left-24" />
      <div className="absolute w-[400px] h-[400px] bg-amber-600/5 rounded-full blur-[100px] pointer-events-none -bottom-20 -right-20" />

      <div className="w-full max-w-md glass-panel border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto shadow-lg shadow-amber-500/10">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
            {isFirstRun ? 'Initialize Secure Vault' : 'Unlock Vault'}
          </h2>
          <p className="text-xs text-slate-400">
            {isFirstRun
              ? 'Create your master password to derive zero-trust encryption keys.'
              : 'Enter master credentials to unlock your local encryption vault.'}
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Operator Username</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="operator"
                className="w-full cipher-input rounded-lg pl-9 pr-3 py-2.5 text-sm"
                required
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Master Vault Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full cipher-input rounded-lg pl-9 pr-3 py-2.5 text-sm"
                required
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          {isFirstRun && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full cipher-input rounded-lg pl-9 pr-3 py-2.5 text-sm"
                  required
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <span>{loading ? 'Deriving Keys...' : isFirstRun ? 'Create Vault' : 'Unlock Vault'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-3 text-center border-t border-slate-800 flex flex-col items-center space-y-1">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <img src="/orientis_logo.png" alt="Orientis Digital" className="h-4 w-auto opacity-80" />
            <span className="font-medium text-slate-300">Developed by Orientis Digital</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Zero-Trust AES-256-GCM & PBKDF2 Architecture
          </p>
        </div>
      </div>
    </div>
  );
};
