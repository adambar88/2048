export interface Tile {
  id: number;
  value: number;
  r: number;
  c: number;
  isNew?: boolean;
  isMerged?: boolean;
  isDestroyed?: boolean;
}

export const GRID_SIZE = 4;

let nextId = 0;
export const getNextId = () => nextId++;

export const initGame = (): Tile[] => {
  let tiles: Tile[] = [];
  tiles = addRandomTile(tiles);
  tiles = addRandomTile(tiles);
  return tiles;
};

export const addRandomTile = (tiles: Tile[]): Tile[] => {
  const emptyCells = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!tiles.some((t) => !t.isDestroyed && t.r === r && t.c === c)) {
        emptyCells.push({ r, c });
      }
    }
  }

  if (emptyCells.length === 0) return tiles;

  const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  return [
    ...tiles,
    {
      id: getNextId(),
      value: Math.random() < 0.9 ? 2 : 4,
      r: cell.r,
      c: cell.c,
      isNew: true,
    },
  ];
};

export const move = (
  tiles: Tile[],
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
): { tiles: Tile[]; score: number; changed: boolean } => {
  // 1. Filter out previously destroyed and clear flags
  let activeTiles: Tile[] = tiles
    .filter((t) => !t.isDestroyed)
    .map((t) => ({ ...t, isNew: false, isMerged: false }));

  let score = 0;
  let changed = false;
  let nextTiles: Tile[] = [...activeTiles];

  const isVertical = direction === 'UP' || direction === 'DOWN';
  const isForward = direction === 'RIGHT' || direction === 'DOWN';

  for (let primary = 0; primary < GRID_SIZE; primary++) {
    let line = activeTiles.filter((t) => (isVertical ? t.c === primary : t.r === primary));
    line.sort((a, b) => (isVertical ? a.r - b.r : a.c - b.c));

    if (isForward) line.reverse();

    let writeIndex = isForward ? GRID_SIZE - 1 : 0;
    let previous: Tile | null = null;

    for (const tile of line) {
      if (previous && previous.value === tile.value && !previous.isDestroyed) {
        // Merge!
        tile.r = isVertical ? writeIndex + (isForward ? 1 : -1) : primary;
        tile.c = isVertical ? primary : writeIndex + (isForward ? 1 : -1);
        tile.isDestroyed = true;
        previous.isDestroyed = true;

        const mergedTile: Tile = {
          id: getNextId(),
          value: tile.value * 2,
          r: tile.r,
          c: tile.c,
          isMerged: true,
        };
        nextTiles.push(mergedTile);
        score += mergedTile.value;
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

  return { tiles: nextTiles, score, changed };
};

export const isGameOver = (tiles: Tile[]): boolean => {
  const active = tiles.filter((t) => !t.isDestroyed);
  if (active.length < GRID_SIZE * GRID_SIZE) return false;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = active.find((t) => t.r === r && t.c === c);
      if (!tile) return false;

      const right = active.find((t) => t.r === r && t.c === c + 1);
      if (right && tile.value === right.value) return false;

      const down = active.find((t) => t.r === r + 1 && t.c === c);
      if (down && tile.value === down.value) return false;
    }
  }
  return true;
};
