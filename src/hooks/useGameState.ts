import { useState, useEffect, useCallback, useRef } from 'react';
import { Tile, GameMode, GridSize } from '../types/game';
import { getStrategy } from '../strategies';
import { SeedablePRNG, generateSeed } from '../utils/prng';
import { ReplayAction, ReplaySession } from '../utils/replaySerializer';
import { getBadges, checkAchievements, updateStats, Badge } from '../utils/achievements';
import { playMove, playMerge, playWin } from '../utils/soundEngine';

const SIZE_KEY = '2048-size';
const BEST_SCORES_KEY = '2048-best-scores';
const BEST_TILES_KEY = '2048-best-tiles';

type BestScores = Record<GridSize, number>;
type BestTiles = Record<GridSize, number>;

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
      // ignore
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

function loadBestScores(): BestScores {
  try {
    const raw = storage.getItem(BEST_SCORES_KEY);
    if (raw) return JSON.parse(raw) as BestScores;
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

export function useGameState(announcer?: (msg: string) => void) {
  const [gridSize, setGridSizeState] = useState<GridSize>(() => {
    const stored = parseInt(storage.getItem(SIZE_KEY) ?? '4', 10);
    return ([3, 4, 5] as number[]).includes(stored) ? (stored as GridSize) : 4;
  });

  const [gameMode, setGameModeState] = useState<GameMode>(GameMode.CLASSIC);
  const [seed, setSeed] = useState<number>(generateSeed);
  const prngRef = useRef<SeedablePRNG>(new SeedablePRNG(seed));

  const [tiles, setTiles] = useState<Tile[]>(() => {
    const strat = getStrategy(GameMode.CLASSIC);
    let initial: Tile[] = [];
    initial = strat.addRandomTile(initial, gridSize, prngRef.current);
    initial = strat.addRandomTile(initial, gridSize, prngRef.current);
    return initial;
  });

  const [score, setScore] = useState(0);
  const [bestScores, setBestScores] = useState<BestScores>(loadBestScores);
  const [bestTiles, setBestTiles] = useState<BestTiles>(loadBestTiles);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<{ tiles: Tile[]; score: number } | null>(null);

  const [scoreDelta, setScoreDelta] = useState<{ value: number; key: number } | null>(null);
  const deltaKeyRef = useRef(0);

  const [particles, setParticles] = useState<Array<{ id: number; r: number; c: number }>>([]);
  const particleIdRef = useRef(0);

  const [blitzTimeLeft, setBlitzTimeLeft] = useState(60000);
  const [toasts, setToasts] = useState<string[]>([]);
  const [badges, setBadges] = useState<Badge[]>(getBadges);

  const [replayActions, setReplayActions] = useState<ReplayAction[]>([]);
  const lastActionTimeRef = useRef<number>(Date.now());

  const addToast = useCallback((msg: string) => {
    setToasts((prev) => [...prev, msg]);
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3000);
  }, []);

  const modeStrategy = getStrategy(gameMode);

  // Blitz mode countdown timer
  useEffect(() => {
    if (gameMode !== GameMode.BLITZ || gameOver || (hasWon && !keepPlaying)) return;

    let frame: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      setBlitzTimeLeft((prev) => {
        const next = prev - delta;
        if (next <= 0) {
          setGameOver(true);
          announcer?.('Blitz time is up! Game over.');
          return 0;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [gameMode, gameOver, hasWon, keepPlaying, announcer]);

  // Update best scores
  useEffect(() => {
    if (score > (bestScores[gridSize] ?? 0)) {
      setBestScores((prev) => {
        const next = { ...prev, [gridSize]: score };
        storage.setItem(BEST_SCORES_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, [score, bestScores, gridSize]);

  const handleMove = useCallback(
    (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (gameOver || (hasWon && !keepPlaying)) return;

      const now = Date.now();
      const dt = Math.max(0, now - lastActionTimeRef.current);
      lastActionTimeRef.current = now;

      // Update stats and APM tracking
      updateStats({ type: 'MOVE', timestamp: now });

      const { tiles: movedTiles, score: addedScore, changed, timeBonus } = modeStrategy.move(
        tiles,
        direction,
        gridSize
      );

      if (changed) {
        setUndoSnapshot({ tiles, score });
        playMove();

        const tilesWithNew = modeStrategy.addRandomTile(movedTiles, gridSize, prngRef.current);
        setTiles(tilesWithNew);
        setScore((prev) => prev + addedScore);

        setReplayActions((prev) => [...prev, { direction, timestamp: now, dt }]);

        if (gameMode === GameMode.BLITZ && timeBonus) {
          setBlitzTimeLeft((prev) => Math.min(60000, prev + timeBonus * 1000));
        }

        const prevBadges = getBadges();
        const nextBadges = checkAchievements({
          tiles: tilesWithNew,
          score: score + addedScore,
          hasWon: !keepPlaying && modeStrategy.checkWin(tilesWithNew),
          isGameOver: modeStrategy.checkGameOver(tilesWithNew, gridSize),
        });
        setBadges(nextBadges);
        nextBadges.forEach((nb) => {
          const pb = prevBadges.find((b) => b.id === nb.id);
          if (pb && !pb.isUnlocked && nb.isUnlocked) {
            addToast(`Achievement Unlocked: ${nb.name}`);
            announcer?.(`Achievement Unlocked: ${nb.name}`);
          }
        });

        if (addedScore > 0) {
          deltaKeyRef.current += 1;
          setScoreDelta({ value: addedScore, key: deltaKeyRef.current });

          const merged = tilesWithNew.filter((t) => t.isMerged);
          if (merged.length > 0) {
            const maxMergedVal = Math.max(...merged.map((m) => m.value));
            playMerge(maxMergedVal);
            announcer?.(`Merged tiles for +${addedScore} points!`);

            setParticles((prev) => [
              ...prev,
              ...merged.map((t) => ({ id: particleIdRef.current++, r: t.r, c: t.c })),
            ]);

            const highest = Math.max(...tilesWithNew.filter((t) => !t.isDestroyed).map((t) => t.value));
            if (highest > (bestTiles[gridSize] ?? 0)) {
              setBestTiles((prev) => {
                const next = { ...prev, [gridSize]: highest };
                storage.setItem(BEST_TILES_KEY, JSON.stringify(next));
                return next;
              });
            }
          }
        }

        if (!keepPlaying && modeStrategy.checkWin(tilesWithNew)) {
          setHasWon(true);
          playWin();
          announcer?.('Congratulations! You reached the target tile!');
        }

        if (modeStrategy.checkGameOver(tilesWithNew, gridSize)) {
          setGameOver(true);
          announcer?.(`Game over! Final score: ${score + addedScore}`);
        }
      }
    },
    [
      tiles,
      score,
      gameOver,
      hasWon,
      keepPlaying,
      gridSize,
      gameMode,
      modeStrategy,
      bestTiles,
      addToast,
      announcer,
    ]
  );

  const handleUndo = useCallback(() => {
    if (!undoSnapshot || gameOver) return;
    const now = Date.now();
    updateStats({ type: 'UNDO', timestamp: now });

    setTiles(undoSnapshot.tiles);
    setScore(undoSnapshot.score);
    setUndoSnapshot(null);
    setGameOver(false);
    setHasWon(modeStrategy.checkWin(undoSnapshot.tiles));
    announcer?.('Undid last move');
  }, [undoSnapshot, gameOver, modeStrategy, announcer]);

  const resetGame = useCallback(
    (newSize?: GridSize, newMode?: GameMode, customSeed?: number) => {
      const sizeToUse = newSize ?? gridSize;
      const modeToUse = newMode ?? gameMode;
      const seedToUse = customSeed ?? generateSeed();

      if (newSize) setGridSizeState(newSize);
      if (newMode) setGameModeState(newMode);

      storage.setItem(SIZE_KEY, String(sizeToUse));
      setSeed(seedToUse);

      const prng = new SeedablePRNG(seedToUse);
      prngRef.current = prng;

      const strat = getStrategy(modeToUse);
      let initial: Tile[] = [];
      initial = strat.addRandomTile(initial, sizeToUse, prng);
      initial = strat.addRandomTile(initial, sizeToUse, prng);

      setTiles(initial);
      setScore(0);
      setGameOver(false);
      setHasWon(false);
      setKeepPlaying(false);
      setUndoSnapshot(null);
      setParticles([]);
      setReplayActions([]);
      lastActionTimeRef.current = Date.now();

      if (modeToUse === GameMode.BLITZ) {
        setBlitzTimeLeft(60000);
      }

      announcer?.(`New game started in ${strat.name} mode (${sizeToUse}x${sizeToUse}).`);
    },
    [gridSize, gameMode, announcer]
  );

  const removeParticle = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getReplaySession = useCallback((): ReplaySession => {
    return {
      seed,
      mode: gameMode,
      gridSize,
      score,
      timestamp: Date.now(),
      actions: replayActions,
      version: 1,
    };
  }, [seed, gameMode, gridSize, score, replayActions]);

  return {
    gridSize,
    setGridSize: (size: GridSize) => resetGame(size, gameMode),
    gameMode,
    setGameMode: (mode: GameMode) => resetGame(gridSize, mode),
    tiles,
    score,
    bestScores,
    bestTiles,
    gameOver,
    hasWon,
    keepPlaying,
    setKeepPlaying,
    undoSnapshot,
    handleMove,
    handleUndo,
    resetGame,
    scoreDelta,
    setScoreDelta,
    particles,
    removeParticle,
    blitzTimeLeft,
    toasts,
    addToast,
    badges,
    modeStrategy,
    replayActions,
    seed,
    getReplaySession,
  };
}
