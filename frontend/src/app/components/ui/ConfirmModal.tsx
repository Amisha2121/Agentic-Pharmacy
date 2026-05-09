import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button when opened, handle Escape key
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl shadow-2xl"
        style={{
          background: 'white',
          border: danger ? '1px solid #FECACA' : '1px solid #E5E7EB',
          animation: 'modal-in 0.18s ease',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid #F3F4F6' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: danger ? '#FEE2E2' : '#F9FAFB' }}
          >
            <AlertTriangle size={18} style={{ color: danger ? '#DC2626' : '#F59E0B' }} />
          </div>
          <p
            className="font-semibold text-base flex-1"
            style={{ fontFamily: 'DM Sans, sans-serif', color: '#111827' }}
          >
            {title}
          </p>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #F3F4F6' }}
        >
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              fontFamily: 'IBM Plex Sans, sans-serif',
              background: 'white',
              border: '1px solid #E5E7EB',
              color: '#6B7280',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              fontFamily: 'IBM Plex Sans, sans-serif',
              background: danger ? '#DC2626' : '#22C55E',
              color: '#fff',
              border: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = danger ? '#B91C1C' : '#16A34A')}
            onMouseLeave={e => (e.currentTarget.style.background = danger ? '#DC2626' : '#22C55E')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
