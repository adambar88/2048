import { GameMode, Tile, GridSize } from './types/game';
import { getStrategy } from './strategies';
import { SeedablePRNG } from './utils/prng';
import { getNextId as getStrategyNextId } from './strategies/ModeStrategy';

export { GameMode };
export type { Tile, GridSize };

export const GRID_SIZE = 4;

export const getNextId = (): number => getStrategyNextId();

export const initGame = (
  gridSize = GRID_SIZE,
  mode: GameMode = GameMode.CLASSIC,
  prng?: SeedablePRNG
): Tile[] => {
  let tiles: Tile[] = [];
  const strategy = getStrategy(mode);
  tiles = strategy.addRandomTile(tiles, gridSize, prng);
  tiles = strategy.addRandomTile(tiles, gridSize, prng);
  return tiles;
};

export const addRandomTile = (
  tiles: Tile[],
  gridSize = GRID_SIZE,
  mode: GameMode = GameMode.CLASSIC,
  prng?: SeedablePRNG
): Tile[] => {
  const strategy = getStrategy(mode);
  return strategy.addRandomTile(tiles, gridSize, prng);
};

export const move = (
  tiles: Tile[],
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT',
  gridSize = GRID_SIZE,
  mode: GameMode = GameMode.CLASSIC
): { tiles: Tile[]; score: number; changed: boolean; timeBonus: number } => {
  const strategy = getStrategy(mode);
  return strategy.move(tiles, direction, gridSize);
};

export const isGameOver = (
  tiles: Tile[],
  gridSize = GRID_SIZE,
  mode: GameMode = GameMode.CLASSIC
): boolean => {
  const strategy = getStrategy(mode);
  return strategy.checkGameOver(tiles, gridSize);
};
