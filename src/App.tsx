import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { Grid, initGame, move, addRandomTile, isGameOver } from './gameLogic';

function App() {
  const [grid, setGrid] = useState<Grid>(initGame());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (gameOver) return;

      let direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null = null;
      if (event.key === 'ArrowUp') direction = 'UP';
      else if (event.key === 'ArrowDown') direction = 'DOWN';
      else if (event.key === 'ArrowLeft') direction = 'LEFT';
      else if (event.key === 'ArrowRight') direction = 'RIGHT';

      if (direction) {
        const { grid: newGrid, score: addedScore, changed } = move(grid, direction);
        if (changed) {
          const gridWithNewTile = addRandomTile(newGrid);
          setGrid(gridWithNewTile);
          setScore((prev: number) => prev + addedScore);
          if (isGameOver(gridWithNewTile)) {
            setGameOver(true);
          }
        }
      }
    },
    [grid, gameOver]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const resetGame = () => {
    setGrid(initGame());
    setScore(0);
    setGameOver(false);
  };

  return (
    <div className="container">
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
          {grid.map((row, r) =>
            row.map((tile, c) => (
              <div key={`${r}-${c}`} className="grid-cell">
                {tile && (
                  <div className={`tile tile-${tile}`}>
                    <div className="tile-inner">{tile}</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
