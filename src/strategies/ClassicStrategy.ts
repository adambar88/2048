import { BaseStrategy, getNextId } from './ModeStrategy';
import { GameMode, Tile } from '../types/game';
import { SeedablePRNG } from '../utils/prng';

export class ClassicStrategy extends BaseStrategy {
  readonly mode = GameMode.CLASSIC;
  readonly name = 'Classic';
  readonly description = 'Standard 2048 game mode. Combine equal tiles to reach 2048!';
  targetValue = 2048;

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
    const value = valueVal < 0.9 ? 2 : 4;

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
    return !a.isObstacle && !b.isObstacle && a.value === b.value;
  }

  getMergedValue(a: Tile, _b: Tile): number {
    return a.value * 2;
  }
}
