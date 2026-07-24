export enum GameMode {
  CLASSIC = 'CLASSIC',
  FIBONACCI = 'FIBONACCI',
  OBSTACLES = 'OBSTACLES',
  BLITZ = 'BLITZ'
}

export interface Tile {
  id: number;
  value: number;
  r: number;
  c: number;
  isNew?: boolean;
  isMerged?: boolean;
  isDestroyed?: boolean;
  isObstacle?: boolean;
}

export const GRID_SIZE = 4;

let nextId = 0;
export const getNextId = () => nextId++;

export const initGame = (gridSize = GRID_SIZE, mode: GameMode = GameMode.CLASSIC): Tile[] => {
  let tiles: Tile[] = [];
  tiles = addRandomTile(tiles, gridSize, mode);
  tiles = addRandomTile(tiles, gridSize, mode);
  return tiles;
};

export const addRandomTile = (tiles: Tile[], gridSize = GRID_SIZE, mode: GameMode = GameMode.CLASSIC): Tile[] => {
  const emptyCells = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!tiles.some((t) => !t.isDestroyed && t.r === r && t.c === c)) {
        emptyCells.push({ r, c });
      }
    }
  }

  if (emptyCells.length === 0) return tiles;

  const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  let isObstacle = false;
  let value = 2;

  if (mode === GameMode.OBSTACLES && Math.random() < 0.1) {
    isObstacle = true;
    value = 0;
  } else if (mode === GameMode.FIBONACCI) {
    value = Math.random() < 0.9 ? 1 : 2;
  } else {
    value = Math.random() < 0.9 ? 2 : 4;
  }

  return [
    ...tiles,
    {
      id: getNextId(),
      value,
      r: cell.r,
      c: cell.c,
      isNew: true,
      ...(isObstacle ? { isObstacle: true } : {})
    },
  ];
};

const isFibonacciConsecutive = (a: number, b: number) => {
  if (a === 1 && b === 1) return true;
  if (a === b) return false;
  let prev = 1;
  let curr = 1;
  while (curr <= Math.max(a, b)) {
    if ((prev === a && curr === b) || (prev === b && curr === a)) {
      return true;
    }
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
  return false;
};

export const move = (
  tiles: Tile[],
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT',
  gridSize = GRID_SIZE,
  mode: GameMode = GameMode.CLASSIC
): { tiles: Tile[]; score: number; changed: boolean; timeBonus: number } => {
  // 1. Filter out previously destroyed and clear flags
  let activeTiles: Tile[] = tiles
    .filter((t) => !t.isDestroyed)
    .map((t) => ({ ...t, isNew: false, isMerged: false }));

  let score = 0;
  let changed = false;
  let timeBonus = 0;
  let nextTiles: Tile[] = [...activeTiles];

  const isVertical = direction === 'UP' || direction === 'DOWN';
  const isForward = direction === 'RIGHT' || direction === 'DOWN';

  for (let primary = 0; primary < gridSize; primary++) {
    let line = activeTiles.filter((t) => (isVertical ? t.c === primary : t.r === primary));
    line.sort((a, b) => (isVertical ? a.r - b.r : a.c - b.c));

    if (isForward) line.reverse();

    let writeIndex = isForward ? gridSize - 1 : 0;
    let previous: Tile | null = null;

    for (const tile of line) {
      let canMerge = false;
      let mergedValue = 0;

      if (previous && !previous.isDestroyed && !previous.isObstacle && !tile.isObstacle) {
        if (mode === GameMode.FIBONACCI) {
          canMerge = isFibonacciConsecutive(previous.value, tile.value);
          mergedValue = previous.value + tile.value;
        } else {
          canMerge = previous.value === tile.value;
          mergedValue = previous.value * 2;
        }
      }

      if (canMerge && previous) {
        // Merge!
        const targetR = isVertical ? writeIndex + (isForward ? 1 : -1) : primary;
        const targetC = isVertical ? primary : writeIndex + (isForward ? 1 : -1);

        tile.r = targetR;
        tile.c = targetC;
        tile.isDestroyed = true;
        previous.isDestroyed = true;

        const mergedTile: Tile = {
          id: getNextId(),
          value: mergedValue,
          r: targetR,
          c: targetC,
          isMerged: true,
        };
        nextTiles.push(mergedTile);
        score += mergedTile.value;
        if (mode === GameMode.BLITZ && mergedValue >= 32) {
          timeBonus += Math.floor(mergedValue / 32);
        }
        changed = true;
        previous = null; // Can't merge again
      } else {
        // Just move
        const newR = isVertical ? writeIndex : primary;
        const newC = isVertical ? primary : writeIndex;

        if (tile.r !== newR || tile.c !== newC) {
          changed = true;
        }

        tile.r = newR;
        tile.c = newC;

        previous = tile;
        writeIndex += isForward ? -1 : 1;
      }
    }
  }

  return { tiles: nextTiles, score, changed, timeBonus };
};

export const isGameOver = (tiles: Tile[], gridSize = GRID_SIZE, mode: GameMode = GameMode.CLASSIC): boolean => {
  const active = tiles.filter((t) => !t.isDestroyed);
  if (active.length < gridSize * gridSize) return false;

  const directions: ('UP' | 'DOWN' | 'LEFT' | 'RIGHT')[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  for (const dir of directions) {
    const { changed } = move(active, dir, gridSize, mode);
    if (changed) return false;
  }

  return true;
};
