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
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`relative rounded-2xl p-6 w-full max-w-sm shadow-2xl ${
              dm ? 'bg-slate-800 border border-slate-700 text-slate-100' : 'bg-white text-slate-800'
            }`}
          >
            <button
              onClick={onCancel}
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
                dm ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
              }`}
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                isDestructive 
                  ? (dm ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-500') 
                  : (dm ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-500')
              }`}>
                <AlertTriangle size={24} />
              </div>
              <h3 className={`text-lg font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
            </div>

            <p className={`text-sm mb-6 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>{message}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className={`flex-1 py-2.5 rounded-xl border font-medium transition-colors ${
                  dm 
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-700' 
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-white font-medium transition-colors ${
                  isDestructive 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
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
