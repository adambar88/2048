import React from 'react';
import { GridSize } from '../../types/game';

interface ControlPanelProps {
  isColored: boolean;
  onToggleColored: () => void;
  gridSize: GridSize;
  onSizeChange: (size: GridSize) => void;
  statsOpen: boolean;
  onToggleStats: () => void;
  onOpenReplay?: () => void;
  onOpenShortcuts?: () => void;
  undoDisabled: boolean;
  onUndo: () => void;
  onRestart: () => void;
  isChallenge: boolean;
  onStartChallenge: () => void;
  onExitChallenge: () => void;
}

const SIZES: GridSize[] = [3, 4, 5];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isColored,
  onToggleColored,
  gridSize,
  onSizeChange,
  statsOpen,
  onToggleStats,
  onOpenReplay,
  onOpenShortcuts,
  undoDisabled,
  onUndo,
  onRestart,
  isChallenge,
  onStartChallenge,
  onExitChallenge,
}) => {
  return (
    <div className="game-intro">
      <div className="intro-buttons">
        <button
          className="theme-button"
          onClick={onToggleColored}
          aria-label="Toggle tile colors"
          title={isColored ? 'Switch to monochrome tiles' : 'Switch to color tiles'}
        >
          {isColored ? 'Mono' : 'Color'}
        </button>

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
          className="stats-button"
          onClick={onToggleStats}
          aria-label="Stats"
          disabled={isChallenge}
        >
          {statsOpen ? 'Hide Stats' : 'Stats'}
        </button>

        {onOpenReplay && (
          <button
            className="stats-button"
            onClick={onOpenReplay}
            aria-label="Replay"
            title="Open game replay player"
          >
            Replay 🎬
          </button>
        )}

        {onOpenShortcuts && (
          <button
            className="stats-button"
            onClick={onOpenShortcuts}
            aria-label="Shortcuts"
            title="View keyboard shortcuts"
          >
            Keys ⌨️
          </button>
        )}

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
      </div>
    </div>
  );
};
