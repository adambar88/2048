import React from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isColored: boolean;
  onToggleColored: () => void;
  onOpenStats: () => void;
  onOpenReplay?: () => void;
  onOpenShortcuts?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isColored,
  onToggleColored,
  onOpenStats,
  onOpenReplay,
  onOpenShortcuts,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="help-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="help-panel settings-panel" onClick={(e) => e.stopPropagation()}>
        <button className="help-close" onClick={onClose} aria-label="Close settings">
          ×
        </button>
        <h2 className="help-title">Settings</h2>

        <div className="settings-group">
          <div className="settings-row">
            <div className="settings-row-text">
              <span className="settings-label">Tile Colors</span>
              <span className="settings-desc">Toggle between color and monochrome tiles</span>
            </div>
            <button className="theme-button" onClick={onToggleColored} style={{ height: '32px', padding: '0 12px' }}>
              {isColored ? 'Color' : 'Mono'}
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <span className="settings-label">Statistics</span>
              <span className="settings-desc">View games played, high scores, and tile records</span>
            </div>
            <button
              className="stats-button"
              onClick={() => {
                onClose();
                onOpenStats();
              }}
              style={{ height: '32px', padding: '0 12px' }}
            >
              Stats
            </button>
          </div>

          {onOpenReplay && (
            <div className="settings-row">
              <div className="settings-row-text">
                <span className="settings-label">Replay Engine</span>
                <span className="settings-desc">Review and playback previous moves</span>
              </div>
              <button
                className="stats-button"
                onClick={() => {
                  onClose();
                  onOpenReplay();
                }}
                style={{ height: '32px', padding: '0 12px' }}
              >
                Replay
              </button>
            </div>
          )}

          {onOpenShortcuts && (
            <div className="settings-row">
              <div className="settings-row-text">
                <span className="settings-label">Keyboard Controls</span>
                <span className="settings-desc">View keyboard shortcuts and game rules</span>
              </div>
              <button
                className="stats-button"
                onClick={() => {
                  onClose();
                  onOpenShortcuts();
                }}
                style={{ height: '32px', padding: '0 12px' }}
              >
                Keys
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
