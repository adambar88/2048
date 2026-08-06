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
        <div className="badges-list">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`badge-item ${b.isUnlocked ? 'unlocked' : 'locked'}`}
            >
              <span className="badge-icon">{b.isUnlocked ? '✨' : '🔒'}</span>
              <div className="badge-info">
                <span className="badge-name">{b.name}</span>
                <p className="badge-desc">{b.description}</p>
              </div>
              {b.isUnlocked && <span className="badge-tag">Unlocked</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
