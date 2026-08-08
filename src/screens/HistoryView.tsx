import React, { useState, useEffect } from 'react';
import { History, Trash2, Search, Filter, ShieldCheck } from 'lucide-react';
import { store } from '../db/store';
import { AuditLog } from '../types';

export const HistoryView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const data = await store.getAuditLogs();
    setLogs(data);
  };

  const handlePurge = async () => {
    if (window.confirm('Are you sure you want to permanently purge all security audit logs?')) {
      await store.purgeAuditLogs();
      await loadLogs();
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterAction === 'all' || log.action === filterAction;
    return matchesSearch && matchesFilter;
  });

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'key_generate':
      case 'key_export':
      case 'key_import':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">{action}</span>;
      case 'text_encrypt':
      case 'file_encrypt':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">{action}</span>;
      case 'text_decrypt':
      case 'file_decrypt':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{action}</span>;
      case 'channel_create':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">{action}</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">{action}</span>;
    }
  };

  return (
    <div className="p-8 h-full flex flex-col space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Security Audit Logs</h2>
          <p className="text-xs text-slate-400">Encrypted local history of all security activities and cryptographic operations.</p>
        </div>

        <button
          onClick={handlePurge}
          className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition flex items-center space-x-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Purge History</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search audit details..."
            className="w-full cipher-input rounded-xl pl-9 pr-4 py-2 text-xs"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="cipher-input rounded-xl px-3 py-2 text-xs text-slate-300"
          >
            <option value="all">All Actions</option>
            <option value="key_generate">Key Generate</option>
            <option value="text_encrypt">Text Encrypt</option>
            <option value="text_decrypt">Text Decrypt</option>
            <option value="file_encrypt">File Encrypt</option>
            <option value="file_decrypt">File Decrypt</option>
            <option value="key_export">Key Export</option>
            <option value="key_import">Key Import</option>
            <option value="channel_create">Channel Create</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-2xl p-4 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 pr-1 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No audit logs found.</div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-dark-900/60 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition"
              >
                <div className="flex items-center space-x-3">
                  {getActionBadge(log.action)}
                  <span className="text-slate-300 font-medium">{log.details}</span>
                </div>

                <span className="text-[11px] font-mono text-slate-500">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
