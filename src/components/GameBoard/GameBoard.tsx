import React, { useState } from 'react';
import { Tile, GridSize, GameMode } from '../../types/game';
import { TileComponent } from './TileComponent';

interface GameBoardProps {
  gridSize: GridSize;
  gameMode: GameMode;
  tiles: Tile[];
  score: number;
  gameOver: boolean;
  hasWon: boolean;
  keepPlaying: boolean;
  onKeepPlaying: () => void;
  onRestart: () => void;
  onMove: (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  particles: Array<{ id: number; r: number; c: number }>;
  onRemoveParticle: (id: number) => void;
  blitzTimeLeft?: number;
  onShareScore?: () => void;
  challengeStatus?: 'idle' | 'running' | 'won' | 'lost';
  challengeLevel?: number;
  challengeTarget?: number;
  onStartChallenge?: () => void;
  onExitChallenge?: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gridSize,
  gameMode,
  tiles,
  score,
  gameOver,
  hasWon,
  keepPlaying,
  onKeepPlaying,
  onRestart,
  onMove,
  particles,
  onRemoveParticle,
  blitzTimeLeft = 60000,
  onShareScore,
  challengeStatus = 'idle',
  challengeLevel = 0,
  challengeTarget = 2048,
  onStartChallenge,
  onExitChallenge,
}) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const dx = touchEnd.x - touchStart.x;
    const dy = touchEnd.y - touchStart.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) {
        onMove(dx > 0 ? 'RIGHT' : 'LEFT');
      }
    } else {
      if (Math.abs(dy) > 30) {
        onMove(dy > 0 ? 'DOWN' : 'UP');
      }
    }
    setTouchStart(null);
  };

  const sortedTiles = [...tiles].sort((a, b) => a.id - b.id);
  const gridCells = Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c) => ({ r, c }))
  ).flat();

  return (
    <div
      className={`game-container${gameOver ? ' game-over-shake' : ''}`}
      style={
        {
          '--grid-size': gridSize,
          '--cell-size': `calc((var(--board-size) - var(--cell-gap) * ${gridSize + 1}) / ${gridSize})`,
          '--cell-step': `calc((var(--board-size) - var(--cell-gap) * ${gridSize + 1}) / ${gridSize} + var(--cell-gap))`,
        } as React.CSSProperties
      }
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {gameOver && (
        <div className="game-message game-over">
          <p>Game over!</p>
          <span className="sub-text">Score: {score}</span>
          <div className="lower">
            <button className="retry-button" onClick={onRestart}>
              Try again
            </button>
            {onShareScore && (
              <button className="retry-button" onClick={onShareScore}>
                Share
              </button>
            )}
          </div>
        </div>
      )}

      {challengeStatus === 'lost' && (
        <div className="game-message game-over">
          <p>Time's up!</p>
          <span className="sub-text">
            You reached level {challengeLevel + 1} — target was {challengeTarget}
          </span>
          <div className="lower">
            <button className="keep-playing-button" onClick={onStartChallenge}>
              Try again
            </button>
            <button className="retry-button" onClick={onExitChallenge}>
              Exit
            </button>
          </div>
        </div>
      )}

      {challengeStatus === 'won' && (
        <div className="game-message game-won">
          <p>Champion!</p>
          <span className="sub-text">You beat all 8 levels! 🏆</span>
          <div className="lower">
            <button className="keep-playing-button" onClick={onStartChallenge}>
              Again
            </button>
            <button className="retry-button" onClick={onExitChallenge}>
              Exit
            </button>
          </div>
        </div>
      )}

      {hasWon && !keepPlaying && !gameOver && (
        <div className="game-message game-won">
          <p>You win!</p>
          <span className="sub-text">You reached the target! Keep going?</span>
          <div className="lower">
            <button className="keep-playing-button" onClick={onKeepPlaying}>
              Keep playing
            </button>
            <button className="retry-button" onClick={onRestart}>
              New Game
            </button>
            {onShareScore && (
              <button className="retry-button" onClick={onShareScore}>
                Share
              </button>
            )}
          </div>
        </div>
      )}

      {particles.map((burst) => (
        <div
          key={burst.id}
          className="particle-burst"
          style={{ '--r': burst.r, '--c': burst.c } as React.CSSProperties}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) onRemoveParticle(burst.id);
          }}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="particle" />
          ))}
        </div>
      ))}

      {gameMode === GameMode.BLITZ && (
        <div className="blitz-timer-track">
          <div
            className="blitz-timer-fill"
            style={{ width: `${Math.max(0, (blitzTimeLeft / 60000) * 100)}%` }}
          />
        </div>
      )}

      <div className="grid-container">
        {gridCells.map(({ r, c }) => (
          <div key={`${r}-${c}`} className="grid-cell" />
        ))}
        {sortedTiles.map((tile) => (
          <TileComponent key={tile.id} tile={tile} />
        ))}
      </div>
    </div>
  );
};
