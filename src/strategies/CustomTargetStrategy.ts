import { BaseStrategy, getNextId } from './ModeStrategy';
import { GameMode, Tile } from '../types/game';
import { SeedablePRNG } from '../utils/prng';

export class CustomTargetStrategy extends BaseStrategy {
  readonly mode = GameMode.CUSTOM_TARGET;
  readonly name = 'Custom Target';
  readonly description = 'Set a custom target tile (512, 1024, 4096, 8192) to win.';
  targetValue: number;

  constructor(targetValue = 2048) {
    super();
    this.targetValue = targetValue;
  }

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

    const cellVal = prng ? prng.nextFloat() : Math.random();
    const cellIndex = Math.floor(cellVal * emptyCells.length);
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

  checkWin(tiles: Tile[], targetValue?: number): boolean {
    const target = targetValue ?? this.targetValue;
    return tiles.some((t) => !t.isDestroyed && t.value >= target);
  }
}
