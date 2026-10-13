import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Accessible modal: closes on Escape/backdrop, locks background scrolling. */
export function Modal({ open, onClose, title, description, children, footer = null, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 cursor-default" onClick={() => onClose?.()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 max-h-[92vh] w-full ${sizes[size] ?? sizes.md} overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-scale-in sm:rounded-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-ink-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-slate-100 hover:text-ink-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scrollbar-thin max-h-[64vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Destructive-action confirmation. */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', loading = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-600">This action cannot be undone.</p>
    </Modal>
  );
}

export default Modal;
