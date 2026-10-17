import { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function ImageLightbox({ src, alt = 'Image preview', onClose }) {
  useEffect(() => {
    if (!src) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [src, onClose]);

  if (!src) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex min-h-[100dvh] items-center justify-center bg-slate-950/95 p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image preview"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </button>
      <button type="button" className="flex h-full w-full items-center justify-center" onClick={onClose} aria-label="Close image preview">
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain"
          onClick={(event) => event.stopPropagation()}
        />
      </button>
    </div>,
    document.body
  );
}
