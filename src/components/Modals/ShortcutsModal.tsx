import React from 'react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="help-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="How to play and Shortcuts"
    >
      <div className="help-panel" onClick={(e) => e.stopPropagation()}>
        <button className="help-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="help-title">How to play & Keyboard Controls</h2>

        <div className="help-section">
          <h3>Basics</h3>
          <p>
            Use <strong>arrow keys</strong>, <strong>WASD</strong>, or <strong>Vim keys (H/J/K/L)</strong> (or swipe on touch screens) to slide tiles. When two compatible tiles collide, they merge into one! Reach the <strong>2048</strong> tile (or higher) to win.
          </p>
        </div>

        <div className="help-section">
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li><strong>Arrow Keys / WASD / H J K L</strong> — Move tiles</li>
            <li><strong>Ctrl / ⌘ + Z</strong> — Undo last move</li>
            <li><strong>R</strong> — Start New Game</li>
            <li><strong>Space</strong> — Toggle Replay play/pause</li>
            <li><strong>?</strong> — Toggle Help & Shortcuts modal</li>
          </ul>
        </div>

        <div className="help-section">
          <h3>Game Modes</h3>
          <p><strong>Classic:</strong> Standard 2048 rules (2s and 4s).</p>
          <p><strong>Blitz:</strong> 60-second time limit! Merges of 32+ award bonus seconds.</p>
          <p><strong>Obstacles:</strong> Rock obstacles spawn on grid and block movements.</p>
          <p><strong>Fibonacci:</strong> Merge consecutive Fibonacci numbers (1, 1, 2, 3, 5, 8...).</p>
          <p><strong>Zen:</strong> Endless relaxing mode with no game over.</p>
          <p><strong>Custom Target:</strong> Choose your target tile to achieve victory.</p>
        </div>

        <div className="help-section">
          <h3>Grid Sizes</h3>
          <p>
            <strong>3×3</strong> is fast and tight. <strong>4×4</strong> is classic. <strong>5×5</strong> gives maximum strategy room.
          </p>
        </div>
      </div>
    </div>
  );
};
