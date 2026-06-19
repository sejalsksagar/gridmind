import { useEffect, useState } from 'react';

export type ToastType = 'error' | 'success' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onDismiss: () => void;
}

const TOAST_STYLES: Record<ToastType, string> = {
  error: 'bg-red-900 border-red-600 text-red-100',
  success: 'bg-green-900 border-green-600 text-green-100',
  info: 'bg-slate-800 border-slate-600 text-slate-100',
};

const AUTO_DISMISS_MS = 4000;

export default function Toast({ message, type, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mount in the "off-screen" position first, then flip to visible on the
    // next frame so the transition actually animates instead of snapping in.
    const enter = requestAnimationFrame(() => setVisible(true));

    const dismissTimer = setTimeout(() => {
      setVisible(false);
      // Let the slide-out transition finish before unmounting via onDismiss.
      setTimeout(onDismiss, 300);
    }, AUTO_DISMISS_MS);

    return () => {
      cancelAnimationFrame(enter);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm border text-sm rounded-md px-4 py-3 shadow-lg transition-all duration-300 ${
        TOAST_STYLES[type]
      } ${visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}
    >
      {message}
    </div>
  );
}
