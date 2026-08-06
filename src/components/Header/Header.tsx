import React from 'react';
import { GameMode } from '../../types/game';
import { ScoreBoard } from '../ScoreBoard/ScoreBoard';

interface HeaderProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleAchievements: () => void;
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
  onToggleHelp: () => void;
  score: number;
  bestScore: number;
  scoreDelta?: { value: number; key: number } | null;
  onDeltaEnd?: () => void;
  isChallenge?: boolean;
  challengeTarget?: number;
  challengeTimeLeft?: number;
  challengeLevel?: number;
}

export const Header: React.FC<HeaderProps> = ({
  isMuted,
  onToggleMute,
  onToggleAchievements,
  gameMode,
  onGameModeChange,
  onToggleHelp,
  score,
  bestScore,
  scoreDelta,
  onDeltaEnd,
  isChallenge = false,
  challengeTarget,
  challengeTimeLeft,
  challengeLevel,
}) => {
  return (
    <div className="header">
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
        <button
          className="icon-button"
          onClick={onToggleMute}
          aria-label="Toggle Mute"
          title="Toggle Mute"
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        <button
          className="icon-button"
          onClick={onToggleAchievements}
          aria-label="Achievements"
          title="Achievements"
        >
          🏆
        </button>
        <select
          value={gameMode}
          onChange={(e) => onGameModeChange(e.target.value as GameMode)}
          style={{
            padding: '5px',
            borderRadius: '4px',
            background: 'var(--btn-bg)',
            color: 'var(--text)',
            border: '1px solid var(--btn-border)',
            cursor: 'pointer',
          }}
          aria-label="Select Game Mode"
        >
          <option value={GameMode.CLASSIC}>Classic</option>
          <option value={GameMode.BLITZ}>Blitz</option>
          <option value={GameMode.OBSTACLES}>Obstacles</option>
          <option value={GameMode.FIBONACCI}>Fibonacci</option>
          <option value={GameMode.ZEN}>Zen</option>
          <option value={GameMode.CUSTOM_TARGET}>Custom Target</option>
        </select>
      </div>

      <h1>2048</h1>
      <button
        className="help-btn"
        onClick={onToggleHelp}
        aria-label="How to play"
        title="How to play"
      >
        <span className="help-btn-icon">?</span>
        <span className="help-btn-label">How to play</span>
      </button>

      <ScoreBoard
        score={score}
        bestScore={bestScore}
        scoreDelta={scoreDelta}
        onDeltaEnd={onDeltaEnd}
        isChallenge={isChallenge}
        challengeTarget={challengeTarget}
        challengeTimeLeft={challengeTimeLeft}
        challengeLevel={challengeLevel}
      />
    </div>
  );
};
