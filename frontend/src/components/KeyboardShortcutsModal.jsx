'use client';
import { useClickOutside } from '@/hooks/useClickOutside';
import { X } from 'lucide-react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const modalRef = useClickOutside(onClose);

  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['Ctrl', 'Enter'], description: 'Send message' },
    { keys: ['Ctrl', 'N'], description: 'New conversation' },
    { keys: ['Ctrl', 'K'], description: 'Focus search/input' },
    { keys: ['Ctrl', 'D'], description: 'Toggle dark mode' },
    { keys: ['Esc'], description: 'Close modals & dropdowns' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {shortcuts.map((shortcut, idx) => (
              <div key={idx} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIdx) => (
                    <span key={keyIdx}>
                      <kbd className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                        {key}
                      </kbd>
                      {keyIdx < shortcut.keys.length - 1 && (
                        <span className="mx-1 text-slate-400 dark:text-slate-500">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs font-medium bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-500">?</kbd> anytime to open this menu
          </p>
        </div>
      </div>
    </div>
  );
}
