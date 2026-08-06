export enum GameMode {
  CLASSIC = 'CLASSIC',
  FIBONACCI = 'FIBONACCI',
  OBSTACLES = 'OBSTACLES',
  BLITZ = 'BLITZ',
  ZEN = 'ZEN',
  CUSTOM_TARGET = 'CUSTOM_TARGET',
}

export type GridSize = 3 | 4 | 5;

export interface Tile {
  id: number;
  value: number;
  r: number;
  c: number;
  isNew?: boolean;
  isMerged?: boolean;
  isDestroyed?: boolean;
  isObstacle?: boolean;
}
