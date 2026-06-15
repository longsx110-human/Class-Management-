import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => {
        return (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        );
      })}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-teal-500 shrink-0" />
  };

  const borderColors = {
    success: 'border-l-4 border-emerald-500 bg-emerald-50/90 text-emerald-950',
    warning: 'border-l-4 border-amber-500 bg-amber-50/90 text-amber-950',
    error: 'border-l-4 border-rose-500 bg-rose-50/90 text-rose-950',
    info: 'border-l-4 border-teal-500 bg-teal-50/90 text-teal-950'
  };

  return (
    <div className={`p-4 rounded-r-lg shadow-lg flex items-start gap-3 border border-slate-200 backdrop-blur-sm animate-fade-in ${borderColors[toast.type]}`}>
      {icons[toast.type]}
      <div className="flex-1 text-sm font-medium pr-1">{toast.text}</div>
      <button 
        onClick={() => onRemove(toast.id)}
        className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded hover:bg-white/50"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
