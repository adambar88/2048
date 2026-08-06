import { Tile, GameMode } from './game';
import { SeedablePRNG } from '../utils/prng';

export interface MoveResult {
  tiles: Tile[];
  score: number;
  changed: boolean;
  timeBonus: number;
}

export interface ModeStrategy {
  readonly mode: GameMode;
  readonly name: string;
  readonly description: string;
  targetValue?: number;

  addRandomTile(tiles: Tile[], gridSize: number, prng?: SeedablePRNG): Tile[];
  canMerge(a: Tile, b: Tile): boolean;
  getMergedValue(a: Tile, b: Tile): number;
  calculateTimeBonus?(mergedValue: number): number;
  checkWin(tiles: Tile[], targetValue?: number): boolean;
  checkGameOver(tiles: Tile[], gridSize: number): boolean;
  move(tiles: Tile[], direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', gridSize?: number): MoveResult;
}
