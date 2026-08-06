import { GameMode } from '../types/game';
import { ModeStrategy } from '../types/strategy';
import { ClassicStrategy } from './ClassicStrategy';
import { FibonacciStrategy } from './FibonacciStrategy';
import { ObstaclesStrategy } from './ObstaclesStrategy';
import { ZenStrategy } from './ZenStrategy';
import { CustomTargetStrategy } from './CustomTargetStrategy';
import { BlitzStrategy } from './BlitzStrategy';

export * from './ModeStrategy';
export * from './ClassicStrategy';
export * from './FibonacciStrategy';
export * from './ObstaclesStrategy';
export * from './ZenStrategy';
export * from './CustomTargetStrategy';
export * from './BlitzStrategy';

const classicStrategy = new ClassicStrategy();
const fibonacciStrategy = new FibonacciStrategy();
const obstaclesStrategy = new ObstaclesStrategy();
const zenStrategy = new ZenStrategy();
const blitzStrategy = new BlitzStrategy();

export const getStrategy = (mode: GameMode, options?: { targetValue?: number }): ModeStrategy => {
  switch (mode) {
    case GameMode.FIBONACCI:
      return fibonacciStrategy;
    case GameMode.OBSTACLES:
      return obstaclesStrategy;
    case GameMode.ZEN:
      return zenStrategy;
    case GameMode.CUSTOM_TARGET:
      return new CustomTargetStrategy(options?.targetValue ?? 2048);
    case GameMode.BLITZ:
      return blitzStrategy;
    case GameMode.CLASSIC:
    default:
      return classicStrategy;
  }
};
