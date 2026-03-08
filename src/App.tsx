import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { Tile, initGame, move, addRandomTile, isGameOver } from './gameLogic';

function App() {
  const [tiles, setTiles] = useState<Tile[]>(initGame());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const handleMove = useCallback(
    (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (gameOver) return;
      const { tiles: newTiles, score: addedScore, changed } = move(tiles, direction);
      if (changed) {
        const tilesWithNewTile = addRandomTile(newTiles);
        setTiles(tilesWithNewTile);
        setScore((prev: number) => prev + addedScore);
        if (isGameOver(tilesWithNewTile)) {
          setGameOver(true);
        }
      }
    },
    [tiles, gameOver]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault(); // Prevent scrolling
      }
      if (event.key === 'ArrowUp') handleMove('UP');
      else if (event.key === 'ArrowDown') handleMove('DOWN');
      else if (event.key === 'ArrowLeft') handleMove('LEFT');
      else if (event.key === 'ArrowRight') handleMove('RIGHT');
    },
    [handleMove]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
        handleMove(dx > 0 ? 'RIGHT' : 'LEFT');
      }
    } else {
      if (Math.abs(dy) > 30) {
        handleMove(dy > 0 ? 'DOWN' : 'UP');
      }
    }
    setTouchStart(null);
  };

  const resetGame = () => {
    setTiles(initGame());
    setScore(0);
    setGameOver(false);
  };

  const sortedTiles = [...tiles].sort((a, b) => a.id - b.id);

  return (
    <div
      className="container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="header">
        <h1>2048</h1>
        <div className="score-container">
          <div className="score-label">SCORE</div>
          <div className="score-value">{score}</div>
        </div>
      </div>
      <div className="game-intro">
        <p className="game-explanation">
          Join the numbers and get to the <strong>2048 tile!</strong>
        </p>
        <button className="restart-button" onClick={resetGame}>
          New Game
        </button>
      </div>
      <div className="game-container">
        {gameOver && (
          <div className="game-message game-over">
            <p>Game over!</p>
            <div className="lower">
              <button className="retry-button" onClick={resetGame}>
                Try again
              </button>
            </div>
          </div>
        )}
        <div className="grid-container">
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <div key={`${r}-${c}`} className="grid-cell"></div>
            ))
          )}
          {sortedTiles.map((tile) => (
            <div
              key={tile.id}
              style={{ '--r': tile.r, '--c': tile.c } as React.CSSProperties}
              className={`tile tile-${tile.value} ${
                tile.isMerged ? 'tile-merged' : ''
              } ${tile.isNew ? 'tile-new' : ''} ${
                tile.value > 2048 ? 'tile-super' : ''
              } ${tile.isDestroyed ? 'tile-destroyed' : ''}`}
            >
              <div className="tile-inner">{tile.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
