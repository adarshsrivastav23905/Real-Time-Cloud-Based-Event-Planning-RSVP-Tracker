import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Download, Share2, Sparkles } from 'lucide-react';

export default function QRModal({ isOpen, onClose, title, value, subtitle, type = 'invite' }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${title.replace(/\s+/g, '_')}_QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#818cf8" />
            <h3 style={{ fontSize: '1.25rem' }}>{title || 'Share & Invite'}</h3>
          </div>
          <button onClick={onClose} style={{ color: '#94a3b8', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {subtitle && (
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: 20 }}>
            {subtitle}
          </p>
        )}

        {/* QR Code Container */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '16px',
            display: 'inline-block',
            margin: '0 auto 20px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          }}
        >
          <QRCodeSVG
            id="qr-code-svg"
            value={value || window.location.href}
            size={200}
            level="H"
            includeMargin={false}
            fgColor="#0f172a"
          />
        </div>

        {/* Link display & copy */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontSize: '0.85rem',
              color: '#94a3b8',
              fontFamily: 'var(--font-mono)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'left',
            }}
          >
            {value}
          </span>
          <button
            className="btn btn-secondary"
            onClick={handleCopy}
            style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={handleDownload} style={{ flex: 1 }}>
            <Download size={16} /> Download QR
          </button>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
