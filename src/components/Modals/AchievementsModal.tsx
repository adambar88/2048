import React from 'react';
import { Badge } from '../../utils/achievements';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: Badge[];
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  badges,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="help-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Achievements"
    >
      <div className="help-panel" onClick={(e) => e.stopPropagation()}>
        <button className="help-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="help-title">🏆 Achievements</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          {badges.map((b) => (
            <div
              key={b.id}
              className={`badge-item ${b.isUnlocked ? 'unlocked' : ''}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: '8px',
                background: b.isUnlocked ? 'var(--btn-bg)' : 'rgba(128, 128, 128, 0.1)',
                border: `1px solid ${b.isUnlocked ? 'var(--primary)' : 'var(--btn-border)'}`,
                opacity: b.isUnlocked ? 1 : 0.6,
              }}
            >
              <div>
                <span className="badge-name" style={{ color: 'var(--text)', fontWeight: 'bold' }}>
                  {b.isUnlocked ? '✅ ' : '🔒 '}
                  {b.name}
                </span>
                <p className="badge-desc" style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {b.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
