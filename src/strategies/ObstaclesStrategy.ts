import { BaseStrategy, getNextId } from './ModeStrategy';
import { GameMode, Tile } from '../types/game';
import { SeedablePRNG } from '../utils/prng';

export class ObstaclesStrategy extends BaseStrategy {
  readonly mode = GameMode.OBSTACLES;
  readonly name = 'Obstacles';
  readonly description = 'Obstacle tiles (rock) spawn on the grid and block tile movements and merges!';
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

    const cellVal = prng ? prng.nextFloat() : Math.random();
    const cellIndex = Math.floor(cellVal * emptyCells.length);
    const cell = emptyCells[cellIndex];

    const obstacleVal = prng ? prng.nextFloat() : Math.random();
    let isObstacle = false;
    let value = 2;

    if (obstacleVal < 0.1) {
      isObstacle = true;
      value = 0;
    } else {
      const valChoice = prng ? prng.nextFloat() : Math.random();
      value = valChoice < 0.9 ? 2 : 4;
    }

    return [
      ...tiles,
      {
        id: getNextId(),
        value,
        r: cell.r,
        c: cell.c,
        isNew: true,
        ...(isObstacle ? { isObstacle: true } : {}),
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
