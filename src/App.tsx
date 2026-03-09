import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { Tile, initGame, move, addRandomTile, isGameOver } from './gameLogic';

const SAVE_KEY = '2048-save';
const STATS_KEY = '2048-stats';
const THEME_KEY = '2048-theme';

interface Stats {
  gamesPlayed: number;
  totalMerges: number;
  highestTileEver: number;
}

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? (JSON.parse(raw) as Stats) : { gamesPlayed: 0, totalMerges: 0, highestTileEver: 2 };
  } catch {
    return { gamesPlayed: 0, totalMerges: 0, highestTileEver: 2 };
  }
}

function saveStats(s: Stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

interface SavedState {
  tiles: Tile[];
  score: number;
  hasWon: boolean;
  keepPlaying: boolean;
}

function loadSave(): SavedState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as SavedState) : null;
  } catch {
    return null;
  }
}

function App() {
  const saved = loadSave();

  const [tiles, setTiles] = useState<Tile[]>(() => saved?.tiles ?? initGame());
  const [score, setScore] = useState(() => saved?.score ?? 0);
  const [bestScore, setBestScore] = useState<number>(() =>
    parseInt(localStorage.getItem('2048-best') ?? '0', 10)
  );
  const [gameOver, setGameOver] = useState(() =>
    saved ? isGameOver(saved.tiles) : false
  );
  const [hasWon, setHasWon] = useState(() => saved?.hasWon ?? false);
  const [keepPlaying, setKeepPlaying] = useState(() => saved?.keepPlaying ?? false);
  const [scoreDelta, setScoreDelta] = useState<{ value: number; key: number } | null>(null);
  const deltaKey = useRef(0);
  const [particles, setParticles] = useState<Array<{ id: number; r: number; c: number }>>([]);
  const particleIdRef = useRef(0);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [statsOpen, setStatsOpen] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<{ tiles: Tile[]; score: number } | null>(null);
  const undoRef = useRef<() => void>(() => { });
  const [milestoneBanner, setMilestoneBanner] = useState<{ value: number; key: number } | null>(null);
  const milestoneKeyRef = useRef(0);
  const [isDark, setIsDark] = useState(() => {
    const dark = localStorage.getItem(THEME_KEY) !== 'light';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    return dark;
  });

  // Sync theme attribute and persist preference
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  // Persist game state after every move
  useEffect(() => {
    const state: SavedState = { tiles, score, hasWon, keepPlaying };
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }, [tiles, score, hasWon, keepPlaying]);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('2048-best', String(score));
    }
  }, [score, bestScore]);

  const handleMove = useCallback(
    (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (gameOver || (hasWon && !keepPlaying)) return;
      const { tiles: newTiles, score: addedScore, changed } = move(tiles, direction);
      if (changed) {
        // Save snapshot for undo before committing the new state
        setUndoSnapshot({ tiles, score });
        const tilesWithNewTile = addRandomTile(newTiles);
        setTiles(tilesWithNewTile);
        setScore((prev) => prev + addedScore);
        if (addedScore > 0) {
          deltaKey.current += 1;
          setScoreDelta({ value: addedScore, key: deltaKey.current });
          const merged = tilesWithNewTile.filter((t) => t.isMerged);
          if (merged.length > 0) {
            setParticles((prev) => [
              ...prev,
              ...merged.map((t) => ({ id: particleIdRef.current++, r: t.r, c: t.c })),
            ]);
            const newHighest = Math.max(...tilesWithNewTile.filter((t) => !t.isDestroyed).map((t) => t.value));
            if (newHighest > stats.highestTileEver) {
              milestoneKeyRef.current += 1;
              setMilestoneBanner({ value: newHighest, key: milestoneKeyRef.current });
            }
            setStats((prev) => {
              const next = {
                ...prev,
                totalMerges: prev.totalMerges + merged.length,
                highestTileEver: Math.max(prev.highestTileEver, newHighest),
              };
              saveStats(next);
              return next;
            });
          }
        }
        if (!keepPlaying && tilesWithNewTile.some((t) => !t.isDestroyed && t.value >= 2048)) {
          setHasWon(true);
        }
        if (isGameOver(tilesWithNewTile)) {
          setGameOver(true);
        }
      }
    },
    [tiles, gameOver, hasWon, keepPlaying, stats]
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
      else if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        undoRef.current();
      }
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
    localStorage.removeItem(SAVE_KEY);
    setUndoSnapshot(null);
    setStats((prev) => {
      const next = { ...prev, gamesPlayed: prev.gamesPlayed + 1 };
      saveStats(next);
      return next;
    });
    setTiles(initGame());
    setScore(0);
    setGameOver(false);
    setHasWon(false);
    setKeepPlaying(false);
    setParticles([]);
  };

  const removeBurst = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleUndo = useCallback(() => {
    if (!undoSnapshot || gameOver) return;
    setTiles(undoSnapshot.tiles);
    setScore(undoSnapshot.score);
    setUndoSnapshot(null);
    setGameOver(false);
    setHasWon(undoSnapshot.tiles.some((t) => !t.isDestroyed && t.value >= 2048));
  }, [undoSnapshot, gameOver]);
  undoRef.current = handleUndo;

  const sortedTiles = [...tiles].sort((a, b) => a.id - b.id);

  const highestTile = Math.max(
    2,
    ...tiles.filter((t) => !t.isDestroyed).map((t) => t.value)
  );
  // log2(2)=1 … log2(2048)=11; clamp to [0,100]
  const progressPct = Math.min(100, (Math.log2(highestTile) / 11) * 100);

  return (
    <div
      className="container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="header">
        <h1>2048</h1>
        <div className="scores-wrapper">
          <div className="score-container">
            <div className="score-label">SCORE</div>
            <div className="score-value">{score}</div>
            {scoreDelta && (
              <span
                key={scoreDelta.key}
                className="score-delta"
                onAnimationEnd={() => setScoreDelta(null)}
              >
                +{scoreDelta.value}
              </span>
            )}
          </div>
          <div className="score-container">
            <div className="score-label">BEST</div>
            <div className="score-value">{bestScore}</div>
          </div>
        </div>
      </div>
      <div className="game-intro">
        <p className="game-explanation">
          Join the numbers and get to the <strong>2048 tile!</strong>
        </p>
        <div className="intro-buttons">
          <button className="theme-button" onClick={() => setIsDark((d) => !d)} aria-label="Toggle theme" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? 'Light' : 'Dark'}
          </button>
          <button className="stats-button" onClick={() => setStatsOpen((o) => !o)} aria-label="Stats">
            {statsOpen ? 'Hide Stats' : 'Stats'}
          </button>
          <button
            className="undo-button"
            onClick={handleUndo}
            disabled={!undoSnapshot || gameOver}
            title="Undo last move (Ctrl+Z)"
          >
            Undo
          </button>
          <button className="restart-button" onClick={resetGame}>
            New Game
          </button>
        </div>
      </div>
      <div className={`game-container${gameOver ? ' game-over-shake' : ''}`}>
        {gameOver && (
          <div className="game-message game-over">
            <p>Game over!</p>
            <span className="sub-text">Score: {score}</span>
            <div className="lower">
              <button className="retry-button" onClick={resetGame}>
                Try again
              </button>
            </div>
          </div>
        )}
        {hasWon && !keepPlaying && !gameOver && (
          <div className="game-message game-won">
            <p>You win!</p>
            <span className="sub-text">You reached 2048! Keep going?</span>
            <div className="lower">
              <button className="keep-playing-button" onClick={() => setKeepPlaying(true)}>
                Keep playing
              </button>
              <button className="retry-button" onClick={resetGame}>
                New Game
              </button>
            </div>
          </div>
        )}
        {particles.map((burst) => (
          <div
            key={burst.id}
            className="particle-burst"
            style={{ '--r': burst.r, '--c': burst.c } as React.CSSProperties}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget) removeBurst(burst.id);
            }}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="particle" />
            ))}
          </div>
        ))}
        {milestoneBanner && (
          <div
            key={milestoneBanner.key}
            className="milestone-banner"
            onAnimationEnd={() => setMilestoneBanner(null)}
          >
            🔥 NEW BEST TILE: {milestoneBanner.value}!
          </div>
        )}
        <div className="grid-container">
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <div key={`${r}-${c}`} className="grid-cell" />
            ))
          )}
          {sortedTiles.map((tile) => (
            <div
              key={tile.id}
              style={{ '--r': tile.r, '--c': tile.c } as React.CSSProperties}
              className={[
                'tile',
                tile.value <= 2048 ? `tile-${tile.value}` : 'tile-super',
                tile.isMerged ? 'tile-merged' : '',
                tile.isNew ? 'tile-new' : '',
                tile.isDestroyed ? 'tile-destroyed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="tile-inner">{tile.value}</div>
            </div>
          ))}
        </div>
      </div>
      {statsOpen && (
        <div className="stats-drawer">
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
        </div>
      )}
      <div className="progress-track" title={`Best tile: ${highestTile}`}>
        <div
          className={`progress-fill${highestTile >= 2048 ? ' progress-win' : ''}`}
          style={{ width: `${progressPct}%` }}
        />
        <span className="progress-label">
          {highestTile >= 2048 ? '🏆 2048!' : highestTile}
        </span>
      </div>
    </div>
  );
}

export default App;
