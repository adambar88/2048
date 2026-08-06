import React from 'react';
import { GridSize } from '../../types/game';
import { calculateAPM } from '../../utils/achievements';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    gamesPlayed: number;
    totalMerges: number;
    highestTileEver: number;
  };
  bestScores: Record<GridSize, number>;
  bestTiles: Record<GridSize, number>;
  gridSize: GridSize;
  challengeBest?: number;
  challengeTargets?: readonly number[];
}

const SIZES: GridSize[] = [3, 4, 5];

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  bestScores,
  bestTiles,
  gridSize,
  challengeBest = 0,
  challengeTargets = [16, 32, 64, 128, 256, 512, 1024, 2048],
}) => {
  if (!isOpen) return null;

  const apm = calculateAPM();

  return (
    <div
      className="help-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Stats"
    >
      <div className="help-panel" onClick={(e) => e.stopPropagation()}>
        <button className="help-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="help-title">Game Statistics</h2>
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-value">{stats.gamesPlayed}</span>
            <span className="stat-label">Games played</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalMerges.toLocaleString()}</span>
            <span className="stat-label">Total merges</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.highestTileEver}</span>
            <span className="stat-label">Best tile ever</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{apm}</span>
            <span className="stat-label">Actions / min</span>
          </div>
        </div>

        <div className="leaderboard">
          <div className="leaderboard-title">High Scores</div>
          {SIZES.map((s) => (
            <div
              key={s}
              className={`leaderboard-row${s === gridSize ? ' leaderboard-row-active' : ''}`}
            >
              <span className="leaderboard-size">
                {s}×{s}
              </span>
              <span className="leaderboard-right">
                <span className="leaderboard-tile-badge">
                  {bestTiles[s] > 0 ? bestTiles[s] : '—'}
                </span>
                <span className="leaderboard-score">
                  {(bestScores[s] ?? 0).toLocaleString()}
                </span>
              </span>
            </div>
          ))}
          {challengeBest > 0 && (
            <div className="leaderboard-row leaderboard-row-challenge">
              <span className="leaderboard-size">Challenge</span>
              <span className="leaderboard-right">
                <span className="leaderboard-tile-badge">
                  {challengeTargets[Math.min(challengeBest, challengeTargets.length) - 1]}
                </span>
                <span className="leaderboard-score">Lvl {challengeBest}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
