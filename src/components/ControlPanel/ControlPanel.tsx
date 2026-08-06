import React from 'react';
import { GridSize } from '../../types/game';

interface ControlPanelProps {
  gridSize: GridSize;
  onSizeChange: (size: GridSize) => void;
  undoDisabled: boolean;
  onUndo: () => void;
  onRestart: () => void;
  isChallenge: boolean;
  onStartChallenge: () => void;
  onExitChallenge: () => void;
  onOpenSettings: () => void;
}

const SIZES: GridSize[] = [3, 4, 5];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  gridSize,
  onSizeChange,
  undoDisabled,
  onUndo,
  onRestart,
  isChallenge,
  onStartChallenge,
  onExitChallenge,
  onOpenSettings,
}) => {
  return (
    <div className="game-intro">
      <div className="intro-buttons">
        <div className="size-selector" role="group" aria-label="Board size">
          {SIZES.map((s) => (
            <button
              key={s}
              className={`size-btn${gridSize === s ? ' size-btn-active' : ''}`}
              onClick={() => onSizeChange(s)}
              aria-pressed={gridSize === s}
              disabled={isChallenge}
            >
              {s}×{s}
            </button>
          ))}
        </div>

        <button
          className="undo-button"
          onClick={onUndo}
          disabled={undoDisabled || isChallenge}
          title="Undo last move (Ctrl+Z)"
        >
          Undo
        </button>

        <button className="restart-button" onClick={onRestart}>
          New Game
        </button>

        {isChallenge ? (
          <button className="challenge-exit-button" onClick={onExitChallenge}>
            Exit Challenge
          </button>
        ) : (
          <button className="challenge-button" onClick={onStartChallenge}>
            Challenge
          </button>
        )}

        <button
          className="stats-button"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Game Settings"
        >
          Settings
        </button>
      </div>
    </div>
  );
};
