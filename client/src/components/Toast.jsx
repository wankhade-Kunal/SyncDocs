import React from 'react';
import { useToast } from '../context/ToastContext';
import '../styles/Toast.css';

export const Toast = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type} toast-enter`}>
          <div className="toast-content">
            {toast.type === 'success' && <span className="toast-icon">✓</span>}
            {toast.type === 'error' && <span className="toast-icon">✕</span>}
            {toast.type === 'info' && <span className="toast-icon">ℹ</span>}
            <span className="toast-message">{toast.message}</span>
          </div>
          <button 
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
