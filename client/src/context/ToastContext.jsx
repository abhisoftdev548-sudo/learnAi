import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const VARIANTS = {
  success: { icon: CheckCircle2, className: 'border-emerald-100 bg-white text-emerald-700' },
  error: { icon: XCircle, className: 'border-rose-100 bg-white text-rose-700' },
  info: { icon: Info, className: 'border-slate-200 bg-white text-ink-700' },
};

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, variant = 'info', { duration = 4200 } = {}) => {
      nextId += 1;
      const id = nextId;
      setToasts((current) => [...current.slice(-3), { id, message, variant }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toasts,
      dismiss,
      success: (message, options) => push(message, 'success', options),
      error: (message, options) => push(message, 'error', options),
      info: (message, options) => push(message, 'info', options),
    }),
    [toasts, dismiss, push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2">
        {toasts.map((toast) => {
          const variant = VARIANTS[toast.variant] ?? VARIANTS.info;
          const Icon = variant.icon;
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 text-sm shadow-card animate-fade-in ${variant.className}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1 leading-snug text-ink-800">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-0.5 text-ink-400 transition hover:bg-slate-100 hover:text-ink-600"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

export default ToastContext;
