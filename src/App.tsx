import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { Tile, initGame, move, addRandomTile, isGameOver } from './gameLogic';

// Counts a displayed number up (or down) to `target` over `duration` ms.
function useAnimatedValue(target: number, duration = 350): number {
  const [displayed, setDisplayed] = useState(target);
  const displayedRef = useRef(target);
  const frameRef = useRef(0);

  useEffect(() => {
    const from = displayedRef.current;
    if (from === target) return;
    cancelAnimationFrame(frameRef.current);
    let start: number | null = null;
    const animate = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = Math.round(from + (target - from) * eased);
      displayedRef.current = value;
      setDisplayed(value);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return displayed;
}

const SAVE_KEY = '2048-save';
const STATS_KEY = '2048-stats';
const THEME_KEY = '2048-theme';
const SIZE_KEY = '2048-size';
const BEST_SCORES_KEY = '2048-best-scores';
const BEST_TILES_KEY = '2048-best-tiles';
const CHALLENGE_BEST_KEY = '2048-challenge-best';

const SIZES = [3, 4, 5] as const;
type GridSize = (typeof SIZES)[number];
type BestScores = Record<GridSize, number>;
type BestTiles = Record<GridSize, number>;

// Safe localStorage wrapper to prevent crashes when disabled or unavailable
const storage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    } catch {
      // Ignore
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
};

// Challenge mode: targets starting from 16, time budgets per level (seconds)
const CHALLENGE_TARGETS = [16, 32, 64, 128, 256, 512, 1024, 2048] as const;
const CHALLENGE_TIMES: Record<number, number> = {
  16: 30,
  32: 40,
  64: 50,
  128: 60,
  256: 75,
  512: 90,
  1024: 120,
  2048: 150,
};
type ChallengeStatus = 'idle' | 'running' | 'won' | 'lost';

interface Stats {
  gamesPlayed: number;
  totalMerges: number;
  highestTileEver: number;
}

function loadStats(): Stats {
  try {
    const raw = storage.getItem(STATS_KEY);
    return raw ? (JSON.parse(raw) as Stats) : { gamesPlayed: 0, totalMerges: 0, highestTileEver: 2 };
  } catch {
    return { gamesPlayed: 0, totalMerges: 0, highestTileEver: 2 };
  }
}

function saveStats(s: Stats) {
  storage.setItem(STATS_KEY, JSON.stringify(s));
}

function loadBestScores(): BestScores {
  try {
    const raw = storage.getItem(BEST_SCORES_KEY);
    if (raw) return JSON.parse(raw) as BestScores;
    // Migrate legacy single best score to the 4×4 slot
    const legacy = parseInt(storage.getItem('2048-best') ?? '0', 10);
    return { 3: 0, 4: legacy, 5: 0 };
  } catch {
    return { 3: 0, 4: 0, 5: 0 };
  }
}

function loadBestTiles(): BestTiles {
  try {
    const raw = storage.getItem(BEST_TILES_KEY);
    return raw ? (JSON.parse(raw) as BestTiles) : { 3: 0, 4: 0, 5: 0 };
  } catch {
    return { 3: 0, 4: 0, 5: 0 };
  }
}

interface SavedState {
  tiles: Tile[];
  score: number;
  hasWon: boolean;
  keepPlaying: boolean;
  gridSize: GridSize;
}

function loadSave(): SavedState | null {
  try {
    const raw = storage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as SavedState) : null;
  } catch {
    return null;
  }
}

function App() {
  const saved = loadSave();

  const [gridSize, setGridSize] = useState<GridSize>(() => {
    const stored = parseInt(storage.getItem(SIZE_KEY) ?? '4', 10);
    return (SIZES as readonly number[]).includes(stored) ? (stored as GridSize) : 4;
  });

  const [tiles, setTiles] = useState<Tile[]>(() => saved?.tiles ?? initGame(gridSize));
  const [score, setScore] = useState(() => saved?.score ?? 0);
  const [bestScores, setBestScores] = useState<BestScores>(loadBestScores);
  const [bestTiles, setBestTiles] = useState<BestTiles>(loadBestTiles);
  const [gameOver, setGameOver] = useState(() =>
    saved ? isGameOver(saved.tiles, saved.gridSize ?? 4) : false
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
  const [isDark, setIsDark] = useState(() => {
    const dark = storage.getItem(THEME_KEY) !== 'light';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }
    return dark;
  });

  // ── Challenge mode state ──────────────────────────────
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>('idle');
  const [challengeLevel, setChallengeLevel] = useState(0); // index into CHALLENGE_TARGETS
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(0);
  const [challengeBest, setChallengeBest] = useState<number>(
    () => parseInt(storage.getItem(CHALLENGE_BEST_KEY) ?? '0', 10)
  );
  const challengeStatusRef = useRef<ChallengeStatus>('idle');
  challengeStatusRef.current = challengeStatus;

  // Sync theme attribute and persist preference
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
    storage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  // Persist game state after every move
  useEffect(() => {
    if (challengeStatus !== 'idle') return; // don't persist during challenge
    const state: SavedState = { tiles, score, hasWon, keepPlaying, gridSize };
    storage.setItem(SAVE_KEY, JSON.stringify(state));
  }, [tiles, score, hasWon, keepPlaying, gridSize, challengeStatus]);

  useEffect(() => {
    if (score > (bestScores[gridSize] ?? 0)) {
      setBestScores((prev) => {
        const next = { ...prev, [gridSize]: score };
        storage.setItem(BEST_SCORES_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, [score, bestScores, gridSize]);

  // ── Challenge countdown timer ─────────────────────────
  useEffect(() => {
    if (challengeStatus !== 'running') return;
    if (challengeTimeLeft <= 0) {
      setChallengeStatus('lost');
      return;
    }
    const id = window.setTimeout(() => {
      if (challengeStatusRef.current === 'running') {
        setChallengeTimeLeft((t) => t - 1);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [challengeStatus, challengeTimeLeft]);

  const handleMove = useCallback(
    (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (gameOver || (hasWon && !keepPlaying)) return;
      const { tiles: newTiles, score: addedScore, changed } = move(tiles, direction, gridSize);
      if (changed) {
        // Save snapshot for undo before committing the new state
        setUndoSnapshot({ tiles, score });
        const tilesWithNewTile = addRandomTile(newTiles, gridSize);
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
            if (newHighest > (bestTiles[gridSize] ?? 0)) {
              setBestTiles((prev) => {
                const next = { ...prev, [gridSize]: newHighest };
                storage.setItem(BEST_TILES_KEY, JSON.stringify(next));
                return next;
              });
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
        if (isGameOver(tilesWithNewTile, gridSize)) {
          setGameOver(true);
        }
        // ── Challenge: check if target tile reached ──
        if (challengeStatusRef.current === 'running') {
          const target = CHALLENGE_TARGETS[challengeLevel];
          const reached = tilesWithNewTile.some((t) => !t.isDestroyed && t.value >= target);
          if (reached) {
            const nextLevel = challengeLevel + 1;
            if (nextLevel >= CHALLENGE_TARGETS.length) {
              // Completed all levels!
              setChallengeStatus('won');
              if (nextLevel > challengeBest) {
                setChallengeBest(nextLevel);
                storage.setItem(CHALLENGE_BEST_KEY, String(nextLevel));
              }
            } else {
              const newBest = Math.max(nextLevel, challengeBest);
              if (newBest > challengeBest) {
                setChallengeBest(newBest);
                storage.setItem(CHALLENGE_BEST_KEY, String(newBest));
              }
              setChallengeLevel(nextLevel);
              setChallengeTimeLeft(CHALLENGE_TIMES[CHALLENGE_TARGETS[nextLevel]]);
            }
          }
        }
      }
    },
    [tiles, gameOver, hasWon, keepPlaying, stats, gridSize, bestTiles, challengeLevel, challengeBest]
  );

  const startChallenge = () => {
    storage.removeItem(SAVE_KEY);
    setUndoSnapshot(null);
    setGridSize(4);
    setTiles(initGame(4));
    setScore(0);
    setGameOver(false);
    setHasWon(false);
    setKeepPlaying(false);
    setParticles([]);
    setChallengeLevel(0);
    setChallengeTimeLeft(CHALLENGE_TIMES[CHALLENGE_TARGETS[0]]);
    setChallengeStatus('running');
  };

  const exitChallenge = () => {
    setChallengeStatus('idle');
  };

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

  const resetGame = (size: GridSize = gridSize) => {
    if (challengeStatus !== 'idle') setChallengeStatus('idle');
    storage.removeItem(SAVE_KEY);
    storage.setItem(SIZE_KEY, String(size));
    setUndoSnapshot(null);
    setStats((prev) => {
      const next = { ...prev, gamesPlayed: prev.gamesPlayed + 1 };
      saveStats(next);
      return next;
    });
    setTiles(initGame(size));
    setScore(0);
    setGameOver(false);
    setHasWon(false);
    setKeepPlaying(false);
    setParticles([]);
  };

  const handleSizeChange = (newSize: GridSize) => {
    setGridSize(newSize);
    resetGame(newSize);
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
  const gridCells = Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c) => ({ r, c }))
  ).flat();

  const displayedScore = useAnimatedValue(score);
  const displayedBest = useAnimatedValue(bestScores[gridSize]);

  const isChallenge = challengeStatus !== 'idle';
  const challengeTarget = CHALLENGE_TARGETS[challengeLevel];
  const timePct = isChallenge
    ? (challengeTimeLeft / CHALLENGE_TIMES[challengeTarget]) * 100
    : 0;
  const timeWarning = isChallenge && challengeTimeLeft <= 10;

  const highestTile = Math.max(
    2,
    ...tiles.filter((t) => !t.isDestroyed).map((t) => t.value)
  );

  return (
    <div
      className="container"
      style={{
        '--grid-size': gridSize,
        '--cell-size': `calc((var(--board-size) - var(--cell-gap) * ${gridSize + 1}) / ${gridSize})`,
        '--cell-step': `calc((var(--board-size) - var(--cell-gap) * ${gridSize + 1}) / ${gridSize} + var(--cell-gap))`,
      } as React.CSSProperties}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="header">
        <h1>2048</h1>
        <div className={isChallenge ? 'scores-wrapper scores-wrapper--challenge' : 'scores-wrapper'}>
          {isChallenge ? (
            <>
              <div className="score-container">
                <div className="score-label">TARGET</div>
                <div className="score-value">{challengeTarget}</div>
              </div>
              <div className={`score-container${timeWarning ? ' score-container-warn' : ''}`}>
                <div className="score-label">TIME</div>
                <div className="score-value">{challengeTimeLeft}s</div>
              </div>
              <div className="score-container">
                <div className="score-label">LEVEL</div>
                <div className="score-value">{challengeLevel + 1}/{CHALLENGE_TARGETS.length}</div>
              </div>
            </>
          ) : (
            <>
              <div className="score-container">
                <div className="score-label">SCORE</div>
                <div className="score-value">{displayedScore.toLocaleString()}</div>
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
                <div className="score-value">{displayedBest.toLocaleString()}</div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="game-intro">
        <p className="game-explanation">
          {isChallenge
            ? <><strong>Challenge:</strong> reach <strong>{challengeTarget}</strong> before time runs out!</>
            : <>Join the numbers and get to the <strong>2048 tile!</strong></>}
        </p>
        <div className="intro-buttons">
          <button className="theme-button" onClick={() => setIsDark((d) => !d)} aria-label="Toggle theme" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? 'Light' : 'Dark'}
          </button>
          <div className="size-selector" role="group" aria-label="Board size">
            {SIZES.map((s) => (
              <button
                key={s}
                className={`size-btn${gridSize === s ? ' size-btn-active' : ''}`}
                onClick={() => handleSizeChange(s)}
                aria-pressed={gridSize === s}
                disabled={isChallenge}
              >
                {s}×{s}
              </button>
            ))}
          </div>
          <button className="stats-button" onClick={() => setStatsOpen((o) => !o)} aria-label="Stats" disabled={isChallenge}>
            {statsOpen ? 'Hide Stats' : 'Stats'}
          </button>
          <button
            className="undo-button"
            onClick={handleUndo}
            disabled={!undoSnapshot || gameOver || isChallenge}
            title="Undo last move (Ctrl+Z)"
          >
            Undo
          </button>
          <button className="restart-button" onClick={() => resetGame()}>
            New Game
          </button>
          {isChallenge ? (
            <button className="challenge-exit-button" onClick={exitChallenge}>
              Exit Challenge
            </button>
          ) : (
            <button className="challenge-button" onClick={startChallenge}>
              Challenge
            </button>
          )}
        </div>
      </div>
      <div className={`game-container${gameOver ? ' game-over-shake' : ''}`}>
        {gameOver && (
          <div className="game-message game-over">
            <p>Game over!</p>
            <span className="sub-text">Score: {score}</span>
            <div className="lower">
              <button className="retry-button" onClick={() => resetGame()}>
                Try again
              </button>
            </div>
          </div>
        )}
        {challengeStatus === 'lost' && (
          <div className="game-message game-over">
            <p>Time's up!</p>
            <span className="sub-text">You reached level {challengeLevel + 1} — target was {challengeTarget}</span>
            <div className="lower">
              <button className="keep-playing-button" onClick={startChallenge}>
                Try again
              </button>
              <button className="retry-button" onClick={exitChallenge}>
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
              <button className="keep-playing-button" onClick={startChallenge}>
                Again
              </button>
              <button className="retry-button" onClick={exitChallenge}>
                Exit
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
              <button className="retry-button" onClick={() => resetGame()}>
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
        <div className="grid-container">
          {gridCells.map(({ r, c }) => (
            <div key={`${r}-${c}`} className="grid-cell" />
          ))}
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
          <div className="leaderboard">
            <div className="leaderboard-title">High Scores</div>
            {SIZES.map((s) => (
              <div
                key={s}
                className={`leaderboard-row${s === gridSize ? ' leaderboard-row-active' : ''}`}
              >
                <span className="leaderboard-size">{s}×{s}</span>
                <span className="leaderboard-right">
                  <span className="leaderboard-tile-badge">{bestTiles[s] > 0 ? bestTiles[s] : '—'}</span>
                  <span className="leaderboard-score">{(bestScores[s] ?? 0).toLocaleString()}</span>
                </span>
              </div>
            ))}
            {challengeBest > 0 && (
              <div className="leaderboard-row leaderboard-row-challenge">
                <span className="leaderboard-size">⚡ Challenge</span>
                <span className="leaderboard-right">
                  <span className="leaderboard-tile-badge">{CHALLENGE_TARGETS[Math.min(challengeBest, CHALLENGE_TARGETS.length) - 1]}</span>
                  <span className="leaderboard-score">Lvl {challengeBest}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      {isChallenge && (
        <div className={`challenge-timer-track${timeWarning ? ' challenge-timer-warn' : ''}`}>
          <div
            className="challenge-timer-fill"
            style={{ width: `${timePct}%` }}
          />
          <span className="challenge-timer-label">
            {CHALLENGE_TARGETS.map((t, i) => (
              <span key={t} className={`challenge-step${i < challengeLevel ? ' done' : i === challengeLevel ? ' current' : ''
                }`}>{t}</span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

export default App;
