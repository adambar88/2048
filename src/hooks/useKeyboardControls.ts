import { useEffect, useCallback } from 'react';

export interface KeyboardControlsHandlers {
  onMove: (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  onUndo?: () => void;
  onReset?: () => void;
  onToggleHelp?: () => void;
  onSpace?: () => void;
  disabled?: boolean;
}

export function useKeyboardControls({
  onMove,
  onUndo,
  onReset,
  onToggleHelp,
  onSpace,
  disabled = false,
}: KeyboardControlsHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      // Ignore keystrokes when focus is inside text inputs or textareas
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Prevent page scrolling on navigation keys
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          ' ',
          'Spacebar',
        ].includes(e.key)
      ) {
        e.preventDefault();
      }

      // 1. Movement: Arrow keys, WASD, Vim keys (H/J/K/L)
      const key = e.key.toLowerCase();

      if (e.key === 'ArrowUp' || key === 'w' || key === 'k') {
        onMove('UP');
      } else if (e.key === 'ArrowDown' || key === 's' || key === 'j') {
        onMove('DOWN');
      } else if (e.key === 'ArrowLeft' || key === 'a' || key === 'h') {
        onMove('LEFT');
      } else if (e.key === 'ArrowRight' || key === 'd' || key === 'l') {
        onMove('RIGHT');
      }
      // 2. Undo: Ctrl+Z / Cmd+Z
      else if (key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onUndo?.();
      }
      // 3. Reset: 'r' key (without modifier keys)
      else if (key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        onReset?.();
      }
      // 4. Help: '?' key
      else if (e.key === '?' || (key === '/' && e.shiftKey)) {
        onToggleHelp?.();
      }
      // 5. Space
      else if (e.key === ' ' || e.key === 'Spacebar') {
        onSpace?.();
      }
    },
    [onMove, onUndo, onReset, onToggleHelp, onSpace, disabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
