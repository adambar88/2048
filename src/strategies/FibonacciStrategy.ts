import { BaseStrategy, getNextId } from './ModeStrategy';
import { GameMode, Tile } from '../types/game';
import { SeedablePRNG } from '../utils/prng';

export const isFibonacciConsecutive = (a: number, b: number): boolean => {
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

export class FibonacciStrategy extends BaseStrategy {
  readonly mode = GameMode.FIBONACCI;
  readonly name = 'Fibonacci';
  readonly description = 'Combine consecutive Fibonacci numbers (1, 1, 2, 3, 5, 8...)!';
  targetValue = 2584;

  addRandomTile(tiles: Tile[], gridSize = 4, prng?: SeedablePRNG): Tile[] {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!tiles.some((t) => !t.isDestroyed && t.r === r && t.c === c)) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length === 0) return tiles;

    const randomVal = prng ? prng.nextFloat() : Math.random();
    const cellIndex = Math.floor(randomVal * emptyCells.length);
    const cell = emptyCells[cellIndex];

    const valueVal = prng ? prng.nextFloat() : Math.random();
    const value = valueVal < 0.9 ? 1 : 2;

    return [
      ...tiles,
      {
        id: getNextId(),
        value,
        r: cell.r,
        c: cell.c,
        isNew: true,
      },
    ];
  }

  canMerge(a: Tile, b: Tile): boolean {
    if (a.isObstacle || b.isObstacle) return false;
    return isFibonacciConsecutive(a.value, b.value);
  }

  getMergedValue(a: Tile, b: Tile): number {
    return a.value + b.value;
  }
}
