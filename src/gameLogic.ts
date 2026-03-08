export type Grid = (number | null)[][];

export const GRID_SIZE = 4;

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
    newGrid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
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
    let newRow: (number | null)[] = row.filter((val) => val !== null);
    for (let i = 0; i < newRow.length - 1; i++) {
      if (newRow[i] === newRow[i + 1]) {
        newRow[i] = (newRow[i] as number) * 2;
        score += newRow[i] as number;
        newRow.splice(i + 1, 1);
        changed = true;
      }
    }
    while (newRow.length < GRID_SIZE) {
      newRow.push(null);
    }
    if (JSON.stringify(newRow) !== JSON.stringify(row)) {
      changed = true;
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
  let currentGrid = grid;
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
      if (grid[r][c] === null) return false;
      if (c < GRID_SIZE - 1 && grid[r][c] === grid[r][c + 1]) return false;
      if (r < GRID_SIZE - 1 && grid[r][c] === grid[r + 1][c]) return false;
    }
  }
  return true;
};
