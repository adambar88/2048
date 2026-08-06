import { Tile, GameMode } from '../types/game';
import { MoveResult, ModeStrategy } from '../types/strategy';
import { SeedablePRNG } from '../utils/prng';

export type { ModeStrategy, MoveResult };

let idCounter = 1;
export const getNextId = (): number => idCounter++;
export const resetNextId = (val = 1): void => {
  idCounter = val;
};

export abstract class BaseStrategy implements ModeStrategy {
  abstract readonly mode: GameMode;
  abstract readonly name: string;
  abstract readonly description: string;
  targetValue?: number;

  abstract addRandomTile(tiles: Tile[], gridSize: number, prng?: SeedablePRNG): Tile[];
  abstract canMerge(a: Tile, b: Tile): boolean;
  abstract getMergedValue(a: Tile, b: Tile): number;

  calculateTimeBonus?(_mergedValue: number): number {
    return 0;
  }

  checkWin(tiles: Tile[], targetValue?: number): boolean {
    const target = targetValue ?? this.targetValue ?? 2048;
    return tiles.some((t) => !t.isDestroyed && t.value >= target);
  }

  checkGameOver(tiles: Tile[], gridSize = 4): boolean {
    const active = tiles.filter((t) => !t.isDestroyed);
    if (active.length < gridSize * gridSize) return false;

    const directions: ('UP' | 'DOWN' | 'LEFT' | 'RIGHT')[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    for (const dir of directions) {
      const { changed } = this.move(active, dir, gridSize);
      if (changed) return false;
    }

    return true;
  }

  move(
    tiles: Tile[],
    direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT',
    gridSize = 4
  ): MoveResult {
    const activeTiles: Tile[] = tiles
      .filter((t) => !t.isDestroyed)
      .map((t) => ({ ...t, isNew: false, isMerged: false }));

    let score = 0;
    let changed = false;
    let timeBonus = 0;
    const nextTiles: Tile[] = [...activeTiles];

    const isVertical = direction === 'UP' || direction === 'DOWN';
    const isForward = direction === 'RIGHT' || direction === 'DOWN';

    for (let primary = 0; primary < gridSize; primary++) {
      const line = activeTiles.filter((t) => (isVertical ? t.c === primary : t.r === primary));
      line.sort((a, b) => (isVertical ? a.r - b.r : a.c - b.c));

      if (isForward) line.reverse();

      let writeIndex = isForward ? gridSize - 1 : 0;
      let previous: Tile | null = null;

      for (const tile of line) {
        let canMerge = false;
        let mergedValue = 0;

        if (previous && !previous.isDestroyed) {
          if (this.canMerge(previous, tile)) {
            canMerge = true;
            mergedValue = this.getMergedValue(previous, tile);
          }
        }

        if (canMerge && previous) {
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
          if (this.calculateTimeBonus) {
            timeBonus += this.calculateTimeBonus(mergedValue);
          }
          changed = true;
          previous = null;
        } else {
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
  }
}
