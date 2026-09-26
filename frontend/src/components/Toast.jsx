import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { X, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';

export default function Toast() {
  const { toasts, removeToast } = useWebSocket();

  if (!toasts || toasts.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="#34d399" />;
      case 'warning':
        return <AlertCircle size={18} color="#fbbf24" />;
      case 'error':
        return <AlertCircle size={18} color="#f43f5e" />;
      default:
        return <Bell size={18} color="#818cf8" />;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          <div style={{ marginTop: 2 }}>{getIcon(toast.type)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {toast.title && (
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>
                {toast.title}
              </div>
            )}
            <div style={{ fontSize: '0.815rem', color: '#cbd5e1', lineHeight: 1.4 }}>
              {toast.message}
            </div>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            style={{ color: '#64748b', padding: 2 }}
            aria-label="Dismiss toast"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
