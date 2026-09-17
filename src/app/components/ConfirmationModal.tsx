import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  darkMode?: boolean;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
  darkMode = false,
}: ConfirmationModalProps) {
  const dm = darkMode;
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`relative rounded-2xl p-6 w-full max-w-sm shadow-2xl ${
              dm ? 'bg-ink-800 border border-ink-700 text-ink-100' : 'bg-white text-ink-800'
            }`}
          >
            <button
              onClick={onCancel}
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
                dm ? 'hover:bg-ink-700 text-ink-400 hover:text-ink-200' : 'hover:bg-ink-100 text-ink-400 hover:text-ink-600'
              }`}
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                isDestructive 
                  ? (dm ? 'bg-chili-900/40 text-chili-400' : 'bg-chili-50 text-chili-500') 
                  : (dm ? 'bg-brand-900/40 text-brand-400' : 'bg-brand-50 text-brand-500')
              }`}>
                <AlertTriangle size={24} />
              </div>
              <h3 className={`text-lg font-semibold ${dm ? 'text-white' : 'text-ink-800'}`}>{title}</h3>
            </div>

            <p className={`text-sm mb-6 ${dm ? 'text-ink-300' : 'text-ink-600'}`}>{message}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className={`flex-1 py-2.5 rounded-xl border font-medium transition-colors ${
                  dm 
                    ? 'border-ink-700 text-ink-300 hover:bg-ink-700' 
                    : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                }`}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-white font-medium transition-colors ${
                  isDestructive 
                    ? 'bg-chili-600 hover:bg-chili-700' 
                    : 'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
