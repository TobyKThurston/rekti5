'use client';

import type { ToastState } from '@/types';

interface ToastProps {
  toast: ToastState | null;
}

export function Toast({ toast }: ToastProps) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-xs rounded-[2px] border px-3 py-2 text-[11px] shadow-lg ${
      toast.type === 'success' ? 'border-[#27c47c] bg-[#0d1a12] text-[#27c47c]' : 'border-[#e04f4f] bg-[#1a0d0d] text-[#e04f4f]'
    }`}>{toast.msg}</div>
  );
}
