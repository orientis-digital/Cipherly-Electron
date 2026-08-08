import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  bundleData: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, title, bundleData }) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (bundleData) {
      QRCode.toDataURL(bundleData, { width: 280, margin: 2, color: { dark: '#f59e0b', light: '#0f141c' } })
        .then(url => setQrUrl(url))
        .catch(err => console.error('QR generation error:', err));
    }
  }, [bundleData]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (window.api) {
      await window.api.copyClipboard(bundleData);
    } else {
      await navigator.clipboard.writeText(bundleData);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-dark-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
          <div className="flex items-center space-x-2 text-amber-400">
            <QrCode className="w-5 h-5" />
            <h3 className="font-semibold text-slate-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Display */}
        <div className="flex flex-col items-center justify-center p-4 bg-dark-900 rounded-xl border border-slate-800 space-y-3">
          {qrUrl ? (
            <img src={qrUrl} alt="Key Bundle QR Code" className="w-64 h-64 rounded-lg shadow-inner" />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-slate-500">Generating QR...</div>
          )}
          <p className="text-xs text-slate-400 text-center font-mono">
            Scan with Cipherly mobile or copy base64 bundle below
          </p>
        </div>

        {/* Raw Base64 Text Area */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400">Key Bundle Payload (Base64)</label>
          <div className="relative">
            <textarea
              readOnly
              value={bundleData}
              rows={3}
              className="w-full cipher-input rounded-lg p-2.5 text-xs font-mono text-slate-300 resize-none pr-10"
            />
            <button
              onClick={handleCopy}
              className="absolute right-2 top-2.5 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
