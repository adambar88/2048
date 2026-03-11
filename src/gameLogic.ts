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

export const initGame = (gridSize = GRID_SIZE): Tile[] => {
  let tiles: Tile[] = [];
  tiles = addRandomTile(tiles, gridSize);
  tiles = addRandomTile(tiles, gridSize);
  return tiles;
};

export const addRandomTile = (tiles: Tile[], gridSize = GRID_SIZE): Tile[] => {
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
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT',
  gridSize = GRID_SIZE
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

  for (let primary = 0; primary < gridSize; primary++) {
    let line = activeTiles.filter((t) => (isVertical ? t.c === primary : t.r === primary));
    line.sort((a, b) => (isVertical ? a.r - b.r : a.c - b.c));

    if (isForward) line.reverse();

    let writeIndex = isForward ? gridSize - 1 : 0;
    let previous: Tile | null = null;

    for (const tile of line) {
      if (previous && previous.value === tile.value && !previous.isDestroyed) {
        // Merge!
        const targetR = isVertical ? writeIndex + (isForward ? 1 : -1) : primary;
        const targetC = isVertical ? primary : writeIndex + (isForward ? 1 : -1);

        tile.r = targetR;
        tile.c = targetC;
        tile.isDestroyed = true;
        previous.isDestroyed = true;

        const mergedTile: Tile = {
          id: getNextId(),
          value: tile.value * 2,
          r: targetR,
          c: targetC,
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

export const isGameOver = (tiles: Tile[], gridSize = GRID_SIZE): boolean => {
  const active = tiles.filter((t) => !t.isDestroyed);
  if (active.length < gridSize * gridSize) return false;

  const directions: ('UP' | 'DOWN' | 'LEFT' | 'RIGHT')[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  for (const dir of directions) {
    const { changed } = move(active, dir, gridSize);
    if (changed) return false;
  }

  return true;
};
