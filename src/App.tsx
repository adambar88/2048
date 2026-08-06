import { useState, useEffect, useRef } from 'react';
import './App.css';
import { GameMode, GridSize } from './types/game';
import { useGameState } from './hooks/useGameState';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useAccessibility } from './hooks/useAccessibility';
import { toggleMute, getIsMuted } from './utils/soundEngine';
import { ReplaySession } from './utils/replaySerializer';

import { Header } from './components/Header/Header';
import { ControlPanel } from './components/ControlPanel/ControlPanel';
import { GameBoard } from './components/GameBoard/GameBoard';
import { AchievementsModal } from './components/Modals/AchievementsModal';
import { StatsModal } from './components/Modals/StatsModal';
import { ShortcutsModal } from './components/Modals/ShortcutsModal';
import { ReplayModal } from './components/Modals/ReplayModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { LiveAnnouncer } from './components/Accessibility/LiveAnnouncer';

const THEME_KEY = 'barczynski-theme';
const COLOR_KEY = '2048-color';
const STATS_KEY = '2048-stats';
const CHALLENGE_BEST_KEY = '2048-challenge-best';

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
};

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

function App() {
  const { announcement, announce } = useAccessibility();

  const {
    gridSize,
    setGridSize,
    gameMode,
    setGameMode,
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
    getReplaySession,
  } = useGameState(announce);

  const [stats, setStats] = useState<Stats>(loadStats);
  const [isMutedState, setIsMutedState] = useState(() => getIsMuted());

  const [isDark, setIsDark] = useState(() => {
    const urlTheme = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('theme') as 'dark' | 'light' | null
      : null;
    if (urlTheme === 'dark' || urlTheme === 'light') {
      storage.setItem(THEME_KEY, urlTheme);
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

  // Modal open states
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customReplaySession, setCustomReplaySession] = useState<ReplaySession | null>(null);

  // Challenge mode state
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>('idle');
  const [challengeLevel, setChallengeLevel] = useState(0);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(0);
  const [challengeBest, setChallengeBest] = useState<number>(
    () => parseInt(storage.getItem(CHALLENGE_BEST_KEY) ?? '0', 10)
  );

  const challengeStatusRef = useRef<ChallengeStatus>('idle');
  challengeStatusRef.current = challengeStatus;

  // Sync themes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
    storage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-color', isColored ? 'on' : 'off');
    }
    storage.setItem(COLOR_KEY, isColored ? 'on' : 'off');
  }, [isColored]);

  // Challenge mode countdown
  useEffect(() => {
    if (challengeStatus !== 'running') return;
    if (challengeTimeLeft <= 0) {
      setChallengeStatus('lost');
      announce("Challenge failed: Time's up!");
      return;
    }
    const timer = window.setTimeout(() => {
      if (challengeStatusRef.current === 'running') {
        setChallengeTimeLeft((t) => t - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [challengeStatus, challengeTimeLeft, announce]);

  // Check challenge tile progress on move
  useEffect(() => {
    if (challengeStatusRef.current !== 'running') return;
    const target = CHALLENGE_TARGETS[challengeLevel];
    const reached = tiles.some((t) => !t.isDestroyed && t.value >= target);
    if (reached) {
      const nextLevel = challengeLevel + 1;
      if (nextLevel >= CHALLENGE_TARGETS.length) {
        setChallengeStatus('won');
        announce('Champion! You completed all challenge levels!');
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
        announce(`Challenge Level ${nextLevel + 1} reached! Target: ${CHALLENGE_TARGETS[nextLevel]}`);
      }
    }
  }, [tiles, challengeLevel, challengeBest, announce]);

  // Track merges and highest tile stats
  useEffect(() => {
    const active = tiles.filter((t) => !t.isDestroyed);
    if (active.length === 0) return;
    const currentMax = Math.max(...active.map((t) => t.value));
    setStats((prev) => {
      if (currentMax > prev.highestTileEver) {
        const next = { ...prev, highestTileEver: currentMax };
        saveStats(next);
        return next;
      }
      return prev;
    });
  }, [tiles]);

  const handleToggleMute = () => {
    toggleMute();
    setIsMutedState(getIsMuted());
  };

  const startChallenge = () => {
    setGridSize(4);
    resetGame(4, GameMode.CLASSIC);
    setChallengeLevel(0);
    setChallengeTimeLeft(CHALLENGE_TIMES[CHALLENGE_TARGETS[0]]);
    setChallengeStatus('running');
    announce('Challenge mode started! Target: 16');
  };

  const exitChallenge = () => {
    setChallengeStatus('idle');
    announce('Exited challenge mode.');
  };

  const handleRestartGame = (size: GridSize = gridSize) => {
    if (challengeStatus !== 'idle') exitChallenge();
    setStats((prev) => {
      const next = { ...prev, gamesPlayed: prev.gamesPlayed + 1 };
      saveStats(next);
      return next;
    });
    resetGame(size, gameMode);
  };

  const handleShareScore = () => {
    let gridStr = '';
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const tile = tiles.find((t) => t.r === r && t.c === c && !t.isDestroyed);
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
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`I scored ${score} in 2048!\n\n${gridStr}`);
      addToast('Copied to clipboard!');
    }
  };

  // Bind keyboard controls
  useKeyboardControls({
    onMove: handleMove,
    onUndo: handleUndo,
    onReset: () => handleRestartGame(),
    onToggleHelp: () => setShortcutsOpen((o) => !o),
    disabled: achievementsOpen || statsOpen || shortcutsOpen || replayOpen || settingsOpen,
  });

  const isChallenge = challengeStatus !== 'idle';
  const challengeTarget = CHALLENGE_TARGETS[challengeLevel];
  const timePct = isChallenge
    ? (challengeTimeLeft / CHALLENGE_TIMES[challengeTarget]) * 100
    : 0;
  const timeWarning = isChallenge && challengeTimeLeft <= 10;

  return (
    <div className="container">
      {/* Dark / Light Theme Toggle */}
      <button
        className="theme-btn"
        onClick={() => setIsDark((d) => !d)}
        aria-label="Toggle theme"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      {/* Header & ScoreBoard */}
      <Header
        isMuted={isMutedState}
        onToggleMute={handleToggleMute}
        onToggleAchievements={() => setAchievementsOpen((o) => !o)}
        gameMode={gameMode}
        onGameModeChange={(mode) => setGameMode(mode)}
        onToggleHelp={() => setShortcutsOpen((o) => !o)}
        score={score}
        bestScore={bestScores[gridSize] ?? 0}
        scoreDelta={scoreDelta}
        onDeltaEnd={() => setScoreDelta(null)}
        isChallenge={isChallenge}
        challengeTarget={challengeTarget}
        challengeTimeLeft={challengeTimeLeft}
        challengeLevel={challengeLevel}
      />

      {/* Control Panel */}
      <ControlPanel
        gridSize={gridSize}
        onSizeChange={(size) => handleRestartGame(size)}
        undoDisabled={!undoSnapshot || gameOver}
        onUndo={handleUndo}
        onRestart={() => handleRestartGame()}
        isChallenge={isChallenge}
        onStartChallenge={startChallenge}
        onExitChallenge={exitChallenge}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Game Board */}
      <GameBoard
        gridSize={gridSize}
        gameMode={gameMode}
        tiles={tiles}
        score={score}
        gameOver={gameOver}
        hasWon={hasWon}
        keepPlaying={keepPlaying}
        onKeepPlaying={() => setKeepPlaying(true)}
        onRestart={() => handleRestartGame()}
        onMove={handleMove}
        particles={particles}
        onRemoveParticle={removeParticle}
        blitzTimeLeft={blitzTimeLeft}
        onShareScore={handleShareScore}
        challengeStatus={challengeStatus}
        challengeLevel={challengeLevel}
        challengeTarget={challengeTarget}
        onStartChallenge={startChallenge}
        onExitChallenge={exitChallenge}
      />

      {/* Challenge mode timer track */}
      {isChallenge && (
        <div className={`challenge-timer-track${timeWarning ? ' challenge-timer-warn' : ''}`}>
          <div className="challenge-timer-fill" style={{ width: `${timePct}%` }} />
          <span className="challenge-timer-label">
            {CHALLENGE_TARGETS.map((t, i) => (
              <span
                key={t}
                className={`challenge-step${
                  i < challengeLevel ? ' done' : i === challengeLevel ? ' current' : ''
                }`}
              >
                {t}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Modals */}
      <AchievementsModal
        isOpen={achievementsOpen}
        onClose={() => setAchievementsOpen(false)}
        badges={badges}
      />

      <StatsModal
        isOpen={statsOpen}
        onClose={() => setStatsOpen(false)}
        stats={stats}
        bestScores={bestScores}
        bestTiles={bestTiles}
        gridSize={gridSize}
        challengeBest={challengeBest}
      />

      <ShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <ReplayModal
        isOpen={replayOpen}
        onClose={() => setReplayOpen(false)}
        session={customReplaySession || getReplaySession()}
        onLoadCustomSession={(s) => setCustomReplaySession(s)}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isColored={isColored}
        onToggleColored={() => setIsColored((c) => !c)}
        onOpenStats={() => setStatsOpen(true)}
        onOpenReplay={() => setReplayOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      {/* Live Accessibility Announcer */}
      <LiveAnnouncer announcement={announcement} />

      {/* Toast Notifications */}
      <div className="toasts-container">
        {toasts.map((t, i) => (
          <div key={i} className="toast">
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
