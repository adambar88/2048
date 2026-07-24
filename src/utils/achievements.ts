export interface Badge {
  id: string;
  name: string;
  description: string;
  isUnlocked: boolean;
}

export interface GameStats {
  totalTime: number; // in milliseconds
  totalMoves: number;
  undoUsed: boolean;
  actionTimestamps: number[]; // For APM calculation
}

export interface ActionData {
  type: 'MOVE' | 'UNDO' | 'START';
  timestamp: number;
}

export interface GameState {
  tiles?: { value: number }[];
  score?: number;
  hasWon?: boolean;
  isGameOver?: boolean;
}

const STORAGE_KEY_STATS = '2048_stats';
const STORAGE_KEY_BADGES = '2048_badges';

export const BADGES_DEF: Badge[] = [
  { id: 'flawless', name: 'Flawless', description: 'Win without Undo', isUnlocked: false },
  { id: 'SPEED_DEMON', name: 'Speed Demon', description: 'Maintain over 100 APM for 30 seconds', isUnlocked: false },
  { id: 'PERSISTENT', name: 'Persistent', description: 'Make 1000 total moves across all games', isUnlocked: false },
  { id: 'FIRST_UNDO', name: 'Wait, go back!', description: 'Use the undo button for the first time', isUnlocked: false }
];

export const getStats = (): GameStats => {
  const defaultStats: GameStats = {
    totalTime: 0,
    totalMoves: 0,
    undoUsed: false,
    actionTimestamps: []
  };
  try {
    const stored = localStorage.getItem(STORAGE_KEY_STATS);
    if (stored) {
      return { ...defaultStats, ...JSON.parse(stored) };
    }
  } catch (e) {
    // ignore
  }
  return defaultStats;
};

export const saveStats = (stats: GameStats) => {
  try {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
  } catch (e) {
    // ignore
  }
};

export const getBadges = (): Badge[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_BADGES);
    if (stored) {
      const unlockedIds: string[] = JSON.parse(stored);
      return BADGES_DEF.map(b => ({
        ...b,
        isUnlocked: b.isUnlocked || unlockedIds.includes(b.id)
      }));
    }
  } catch (e) {
    // ignore
  }
  return [...BADGES_DEF];
};

export const saveBadges = (badges: Badge[]) => {
  try {
    const unlockedIds = badges.filter(b => b.isUnlocked).map(b => b.id);
    localStorage.setItem(STORAGE_KEY_BADGES, JSON.stringify(unlockedIds));
  } catch (e) {
    // ignore
  }
};

export const updateStats = (actionData: ActionData) => {
  const stats = getStats();
  
  if (actionData.type === 'MOVE') {
    stats.totalMoves += 1;
    stats.actionTimestamps.push(actionData.timestamp);
  } else if (actionData.type === 'UNDO') {
    stats.undoUsed = true;
    stats.actionTimestamps.push(actionData.timestamp);
  }

  // Keep only timestamps from the last 30 seconds for APM calculation
  const thirtySecondsAgo = actionData.timestamp - 30000;
  stats.actionTimestamps = stats.actionTimestamps.filter(t => t >= thirtySecondsAgo);

  saveStats(stats);
};

export const calculateAPM = (): number => {
  const stats = getStats();
  if (stats.actionTimestamps.length < 2) return 0;
  
  const now = Date.now();
  const thirtySecondsAgo = now - 30000;
  const recentActions = stats.actionTimestamps.filter(t => t >= thirtySecondsAgo);
  
  if (recentActions.length < 2) return 0;
  
  const firstActionTime = Math.max(recentActions[0], thirtySecondsAgo);
  const timeElapsedMs = now - firstActionTime;
  
  if (timeElapsedMs < 1000) return 0;
  
  return Math.floor((recentActions.length / timeElapsedMs) * 60000);
};

export const checkAchievements = (gameState: GameState): Badge[] => {
  const stats = getStats();
  const badges = getBadges();
  
  let newlyUnlocked = false;

  const unlockBadge = (id: string) => {
    const badge = badges.find(b => b.id === id);
    if (badge && !badge.isUnlocked) {
      badge.isUnlocked = true;
      newlyUnlocked = true;
    }
  };

  if (gameState.hasWon && !stats.undoUsed) {
    unlockBadge('flawless');
  }

  if (calculateAPM() > 100 && stats.actionTimestamps.length > 50) { // arbitrary threshold to ensure it's not 3 moves in 1 second
    unlockBadge('SPEED_DEMON');
  }

  if (stats.totalMoves >= 1000) {
    unlockBadge('PERSISTENT');
  }

  if (stats.undoUsed) {
    unlockBadge('FIRST_UNDO');
  }

  if (newlyUnlocked) {
    saveBadges(badges);
  }

  return badges;
};
