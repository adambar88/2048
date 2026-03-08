export interface Tile {
  id: number;
  value: number;
  merged?: boolean;
}

export type Grid = (Tile | null)[][];

export const GRID_SIZE = 4;

let nextId = 0;
const getNextId = () => nextId++;

export const createEmptyGrid = (): Grid => {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
};

export const getRandomEmptyCell = (grid: Grid): { r: number; c: number } | null => {
  const emptyCells = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === null) {
        emptyCells.push({ r, c });
      }
    }
  }
  if (emptyCells.length === 0) return null;
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
};

export const addRandomTile = (grid: Grid): Grid => {
  const newGrid = grid.map((row) => [...row]);
  const cell = getRandomEmptyCell(newGrid);
  if (cell) {
    newGrid[cell.r][cell.c] = {
      id: getNextId(),
      value: Math.random() < 0.9 ? 2 : 4,
    };
  }
  return newGrid;
};

export const initGame = (): Grid => {
  let grid = createEmptyGrid();
  grid = addRandomTile(grid);
  grid = addRandomTile(grid);
  return grid;
};

const moveLeft = (grid: Grid): { grid: Grid; score: number; changed: boolean } => {
  let score = 0;
  let changed = false;
  const newGrid = grid.map((row) => {
    let newRow: (Tile | null)[] = row.filter((val) => val !== null);
    for (let i = 0; i < newRow.length - 1; i++) {
      const current = newRow[i];
      const next = newRow[i + 1];
      if (current && next && current.value === next.value) {
        newRow[i] = {
          id: getNextId(),
          value: current.value * 2,
          merged: true,
        };
        score += current.value * 2;
        newRow.splice(i + 1, 1);
        changed = true;
      }
    }
    while (newRow.length < GRID_SIZE) {
      newRow.push(null);
    }
    
    // Check if changed
    for (let i = 0; i < GRID_SIZE; i++) {
      if (newRow[i]?.id !== row[i]?.id) {
        changed = true;
        break;
      }
    }
    return newRow;
  });
  return { grid: newGrid, score, changed };
};

const rotateGrid = (grid: Grid): Grid => {
  const newGrid = createEmptyGrid();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      newGrid[c][GRID_SIZE - 1 - r] = grid[r][c];
    }
  }
  return newGrid;
};

export const move = (
  grid: Grid,
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
): { grid: Grid; score: number; changed: boolean } => {
  // Clear merged flags from previous move
  let currentGrid: Grid = grid.map(row => row.map(tile => tile ? { ...tile, merged: false } : null));
  let rotations = 0;

  switch (direction) {
    case 'LEFT':
      rotations = 0;
      break;
    case 'UP':
      rotations = 3;
      break;
    case 'RIGHT':
      rotations = 2;
      break;
    case 'DOWN':
      rotations = 1;
      break;
  }

  for (let i = 0; i < rotations; i++) {
    currentGrid = rotateGrid(currentGrid);
  }

  const result = moveLeft(currentGrid);
  let movedGrid = result.grid;

  for (let i = 0; i < (4 - rotations) % 4; i++) {
    movedGrid = rotateGrid(movedGrid);
  }

  return { grid: movedGrid, score: result.score, changed: result.changed };
};

export const isGameOver = (grid: Grid): boolean => {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const current = grid[r][c];
      if (current === null) return false;
      
      const right = c < GRID_SIZE - 1 ? grid[r][c + 1] : null;
      if (right && current.value === right.value) return false;
      
      const down = r < GRID_SIZE - 1 ? grid[r + 1][c] : null;
      if (down && current.value === down.value) return false;
    }
  }
  return true;
};
