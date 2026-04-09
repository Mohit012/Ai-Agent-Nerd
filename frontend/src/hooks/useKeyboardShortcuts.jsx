import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
          e.preventDefault();
          shortcuts.onShowShortcuts?.();
          return;
        }
      }

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        if (e.key === 'Escape') {
          Object.values(shortcuts).forEach(shortcut => {
            if (shortcut.onEscape) shortcut.onEscape();
          });
        }
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'Enter') {
        e.preventDefault();
        shortcuts.onCtrlEnter?.();
      }
      if (ctrl && e.key === 'n') {
        e.preventDefault();
        shortcuts.onCtrlN?.();
      }
      if (ctrl && e.key === 'k') {
        e.preventDefault();
        shortcuts.onCtrlK?.();
      }
      if (ctrl && e.key === 'd') {
        e.preventDefault();
        shortcuts.onCtrlD?.();
      }
      if (e.key === 'Escape') {
        shortcuts.onEscape?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
