import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { Tile, initGame, move, addRandomTile, isGameOver } from './gameLogic';
import { GameMode } from './gameLogic';
import { toggleMute, getIsMuted } from './utils/soundEngine';
import { getBadges, checkAchievements, Badge } from './utils/achievements';


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
const THEME_KEY = 'barczynski-theme';
const COLOR_KEY = '2048-color';
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<{ tiles: Tile[]; score: number } | null>(null);
  const undoRef = useRef<() => void>(() => { });
  const [isDark, setIsDark] = useState(() => {
    const urlTheme = new URLSearchParams(window.location.search).get('theme') as 'dark' | 'light' | null;
    if (urlTheme === 'dark' || urlTheme === 'light') {
      storage.setItem(THEME_KEY, urlTheme);
      const url = new URL(window.location.href);
      url.searchParams.delete('theme');
      window.history.replaceState({}, '', url.toString());
    }
    const dark = (storage.getItem(THEME_KEY) ?? 'dark') !== 'light';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }
    return dark;
  });
  const [isColored, setIsColored] = useState(() => {
    const colored = storage.getItem(COLOR_KEY) === 'on';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-color', colored ? 'on' : 'off');
    }
    return colored;
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

  const [gameMode, setGameMode] = useState<GameMode>(GameMode.CLASSIC);
  const [blitzTimeLeft, setBlitzTimeLeft] = useState(60000);
  const [toasts, setToasts] = useState<string[]>([]);
  const [isMutedState, setIsMutedState] = useState(() => getIsMuted());
  const [showAchievements, setShowAchievements] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);

  const addToast = useCallback((msg: string) => {
    setToasts(prev => [...prev, msg]);
    setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 3000);
  }, []);

  useEffect(() => {
    setBadges(getBadges());
  }, []);

  useEffect(() => {
    if (gameMode !== GameMode.BLITZ || gameOver || (hasWon && !keepPlaying)) return;
    
    let frame: number;
    let lastTime = performance.now();
    
    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      setBlitzTimeLeft(prev => {
        const next = prev - delta;
        if (next <= 0) {
          setGameOver(true);
          return 0;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [gameMode, gameOver, hasWon, keepPlaying]);

  const handleToggleMute = () => {
    toggleMute();
    setIsMutedState(getIsMuted());
  };

  const getEmojiGrid = () => {
    let gridStr = '';
    for(let r=0; r<gridSize; r++) {
      for(let c=0; c<gridSize; c++) {
        const tile = tiles.find(t => t.r === r && t.c === c && !t.isDestroyed);
        if (!tile) gridStr += '⬛';
        else if (tile.isObstacle) gridStr += '🪨';
        else if (tile.value >= 2048) gridStr += '🌟';
        else if (tile.value >= 1024) gridStr += '🟥';
        else if (tile.value >= 128) gridStr += '🟧';
        else if (tile.value >= 16) gridStr += '🟨';
        else gridStr += '🟩';
      }
      gridStr += '\n';
    }
    navigator.clipboard.writeText(`I scored ${score} in 2048!\n\n${gridStr}`);

    addToast('Copied to clipboard!');
  };


  // Sync theme attribute and persist preference
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
    storage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  // Restore theme instantly on bfcache navigation (no transition flash)
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        const stored = storage.getItem(THEME_KEY) ?? 'dark';
        const dark = stored !== 'light';
        const s = document.createElement('style');
        s.textContent = '*,*::before,*::after{transition:none!important}';
        document.head.appendChild(s);
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        setIsDark(dark);
        requestAnimationFrame(() => document.head.removeChild(s));
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-color', isColored ? 'on' : 'off');
    }
    storage.setItem(COLOR_KEY, isColored ? 'on' : 'off');
  }, [isColored]);

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
      const { tiles: newTiles, score: addedScore, changed, timeBonus } = move(tiles, direction, gridSize, gameMode);
      if (changed) {
        // Save snapshot for undo before committing the new state
        setUndoSnapshot({ tiles, score });
        const tilesWithNewTile = addRandomTile(newTiles, gridSize, gameMode);
        setTiles(tilesWithNewTile);
        setScore((prev) => prev + addedScore);

        if (gameMode === GameMode.BLITZ && timeBonus) {
          setBlitzTimeLeft(prev => Math.min(60000, prev + timeBonus * 1000));
        }

        const prevBadges = getBadges();
        const nextBadges = checkAchievements({
          tiles: tilesWithNewTile,
          score: score + addedScore,
          hasWon: !keepPlaying && tilesWithNewTile.some((t) => !t.isDestroyed && t.value >= 2048),
          isGameOver: isGameOver(tilesWithNewTile, gridSize, gameMode)
        });
        setBadges(nextBadges);
        nextBadges.forEach(nb => {
          const pb = prevBadges.find(b => b.id === nb.id);
          if (pb && !pb.isUnlocked && nb.isUnlocked) {
            addToast(`Achievement Unlocked: ${nb.name}`);
          }
        });

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
        if (isGameOver(tilesWithNewTile, gridSize, gameMode)) {
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
    if (gameMode === GameMode.BLITZ) setBlitzTimeLeft(60000);
    if (challengeStatus !== 'idle') setChallengeStatus('idle');
    storage.removeItem(SAVE_KEY);
    storage.setItem(SIZE_KEY, String(size));
    setUndoSnapshot(null);
    setStats((prev) => {
      const next = { ...prev, gamesPlayed: prev.gamesPlayed + 1 };
      saveStats(next);
      return next;
    });
    setTiles(initGame(size, gameMode));
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
      <button
        className="theme-btn"
        onClick={() => setIsDark((d) => !d)}
        aria-label="Toggle theme"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
        ) : (
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        )}
      </button>
      <div className="header">

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <button className="icon-button" onClick={handleToggleMute} aria-label="Toggle Mute" title="Toggle Mute">
            {isMutedState ? '🔇' : '🔊'}
          </button>
          <div style={{ position: 'relative' }}>
            <button className="icon-button" onClick={() => setShowAchievements(!showAchievements)} title="Achievements">
              🏆
            </button>
            {showAchievements && (
              <div className="achievements-modal">
                <h4 style={{margin: '0 0 5px', color: 'var(--text)'}}>Achievements</h4>
                {badges.map(b => (
                  <div key={b.id} className={`badge-item ${b.isUnlocked ? 'unlocked' : ''}`}>
                    <span className="badge-name" style={{color: 'var(--text)'}}>{b.name}</span>
                    <span className="badge-desc">{b.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <select 
            value={gameMode} 
            onChange={(e) => {
              const newMode = e.target.value as GameMode;
              setGameMode(newMode);
              setTimeout(() => {
                storage.removeItem('2048-save');
                setUndoSnapshot(null);
                setScore(0);
                setGameOver(false);
                setHasWon(false);
                setKeepPlaying(false);
                setParticles([]);
                if (newMode === GameMode.BLITZ) setBlitzTimeLeft(60000);
                setTiles(initGame(gridSize, newMode));
              }, 0);
            }}
            style={{ padding: '5px', borderRadius: '4px', background: 'var(--btn-bg)', color: 'var(--text)', border: '1px solid var(--btn-border)' }}
          >
            <option value={GameMode.CLASSIC}>Classic</option>
            <option value={GameMode.BLITZ}>Blitz</option>
            <option value={GameMode.OBSTACLES}>Obstacles</option>
            <option value={GameMode.FIBONACCI}>Fibonacci</option>
          </select>
        </div>

        <h1>2048</h1>
        <button
          className="help-btn"
          onClick={() => setHelpOpen((o) => !o)}
          aria-label="How to play"
          title="How to play"
        >
          <span className="help-btn-icon">?</span>
          <span className="help-btn-label">How to play</span>
        </button>
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
        <div className="intro-buttons">
          <button className="theme-button" onClick={() => setIsColored((c) => !c)} aria-label="Toggle tile colors" title={isColored ? 'Switch to monochrome tiles' : 'Switch to color tiles'}>
            {isColored ? 'Mono' : 'Color'}
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

              <button className="retry-button" onClick={getEmojiGrid}>
                Share
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

              <button className="retry-button" onClick={getEmojiGrid}>
                Share
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
        
        {gameMode === GameMode.BLITZ && (
          <div className="blitz-timer-track">
            <div className="blitz-timer-fill" style={{ width: `${(blitzTimeLeft / 60000) * 100}%` }} />
          </div>
        )}

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
                tile.isObstacle ? 'tile-obstacle' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="tile-inner">{tile.value}</div>
            </div>
          ))}
        </div>
      </div>
      {helpOpen && (
        <div className="help-overlay" onClick={() => setHelpOpen(false)} role="dialog" aria-modal="true" aria-label="How to play">
          <div className="help-panel" onClick={(e) => e.stopPropagation()}>
            <button className="help-close" onClick={() => setHelpOpen(false)} aria-label="Close">×</button>
            <h2 className="help-title">How to play</h2>
            <div className="help-section">
              <h3>Basics</h3>
              <p>Use <strong>arrow keys</strong> (or swipe on mobile) to slide all tiles. When two tiles with the same number collide, they merge into one. Reach the <strong>2048</strong> tile to win — but keep going as long as you like.</p>
            </div>
            <div className="help-section">
              <h3>Grid sizes</h3>
              <p><strong>3×3</strong> is fast and tight. <strong>4×4</strong> is the classic. <strong>5×5</strong> gives more room to manoeuvre.</p>
            </div>
            <div className="help-section">
              <h3>Controls</h3>
              <ul>
                <li><strong>Arrow keys</strong> — move tiles</li>
                <li><strong>Swipe</strong> — move tiles on touch devices</li>
                <li><strong>Ctrl / ⌘ + Z</strong> — undo last move</li>
                <li><strong>New Game</strong> — start fresh</li>
              </ul>
            </div>
            <div className="help-section">
              <h3>Challenge mode</h3>
              <p>Hit <strong>Challenge</strong> to race through a series of targets — reach 16, then 32, 64… up to 2048 — each with its own countdown. Fail to hit the target in time and it&apos;s over.</p>
            </div>
            <div className="help-section">
              <h3>Tile colours</h3>
              <p>Toggle between <strong>Mono</strong> (greyscale) and <strong>Color</strong> (classic 2048 palette) using the Color button.</p>
            </div>
            <div className="help-section">
              <h3>Stats</h3>
              <p>Open <strong>Stats</strong> to see your games played, total merges, best tile ever, and high scores per grid size.</p>
            </div>
          </div>
        </div>
      )}
      {statsOpen && (
        <div className="help-overlay" onClick={() => setStatsOpen(false)} role="dialog" aria-modal="true" aria-label="Stats">
          <div className="help-panel" onClick={(e) => e.stopPropagation()}>
            <button className="help-close" onClick={() => setStatsOpen(false)} aria-label="Close">×</button>
            <h2 className="help-title">Stats</h2>
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
    
      <div className="toasts-container">
        {toasts.map((t, i) => <div key={i} className="toast">{t}</div>)}
      </div>
</div>
  );
}

export default App;
