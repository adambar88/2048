import { describe, it, expect } from 'vitest';
import { getStrategy, ClassicStrategy, FibonacciStrategy, ObstaclesStrategy, ZenStrategy, CustomTargetStrategy, BlitzStrategy, resetNextId } from './index';
import { GameMode, Tile } from '../types/game';
import { SeedablePRNG } from '../utils/prng';

describe('Mode Strategies', () => {
  it('factory getStrategy should return correct strategy instance', () => {
    expect(getStrategy(GameMode.CLASSIC)).toBeInstanceOf(ClassicStrategy);
    expect(getStrategy(GameMode.FIBONACCI)).toBeInstanceOf(FibonacciStrategy);
    expect(getStrategy(GameMode.OBSTACLES)).toBeInstanceOf(ObstaclesStrategy);
    expect(getStrategy(GameMode.ZEN)).toBeInstanceOf(ZenStrategy);
    expect(getStrategy(GameMode.CUSTOM_TARGET, { targetValue: 512 })).toBeInstanceOf(CustomTargetStrategy);
    expect(getStrategy(GameMode.BLITZ)).toBeInstanceOf(BlitzStrategy);
  });

  describe('ClassicStrategy', () => {
    const strat = new ClassicStrategy();

    it('spawns tiles deterministically using PRNG', () => {
      const prng1 = new SeedablePRNG(12345);
      const prng2 = new SeedablePRNG(12345);
      resetNextId(1);
      const tiles1 = strat.addRandomTile([], 4, prng1);
      resetNextId(1);
      const tiles2 = strat.addRandomTile([], 4, prng2);
      expect(tiles1).toEqual(tiles2);
    });

    it('merges equal tiles', () => {
      const tiles: Tile[] = [
        { id: 1, value: 2, r: 0, c: 0 },
        { id: 2, value: 2, r: 0, c: 1 },
      ];
      const { tiles: nextTiles, score, changed } = strat.move(tiles, 'LEFT', 4);
      expect(changed).toBe(true);
      expect(score).toBe(4);
      const active = nextTiles.filter((t) => !t.isDestroyed);
      expect(active.length).toBe(1);
      expect(active[0].value).toBe(4);
    });
  });

  describe('FibonacciStrategy', () => {
    const strat = new FibonacciStrategy();

    it('merges consecutive Fibonacci numbers 1 and 2 to 3', () => {
      const tiles: Tile[] = [
        { id: 1, value: 1, r: 0, c: 0 },
        { id: 2, value: 2, r: 0, c: 1 },
      ];
      const { tiles: nextTiles, score } = strat.move(tiles, 'LEFT', 4);
      expect(score).toBe(3);
      const active = nextTiles.filter((t) => !t.isDestroyed);
      expect(active[0].value).toBe(3);
    });

    it('does not merge equal non-1 Fibonacci tiles (e.g. 2 and 2)', () => {
      const tiles: Tile[] = [
        { id: 1, value: 2, r: 0, c: 0 },
        { id: 2, value: 2, r: 0, c: 1 },
      ];
      const { changed } = strat.move(tiles, 'LEFT', 4);
      expect(changed).toBe(false);
    });
  });

  describe('ObstaclesStrategy', () => {
    const strat = new ObstaclesStrategy();

    it('blocks merging across obstacle tiles', () => {
      const tiles: Tile[] = [
        { id: 1, value: 2, r: 0, c: 0 },
        { id: 2, value: 0, r: 0, c: 1, isObstacle: true },
        { id: 3, value: 2, r: 0, c: 2 },
      ];
      const { tiles: nextTiles } = strat.move(tiles, 'LEFT', 4);
      const active = nextTiles.filter((t) => !t.isDestroyed);
      expect(active.find((t) => t.id === 1)?.c).toBe(0);
      expect(active.find((t) => t.id === 3)?.c).toBe(2);
    });
  });

  describe('ZenStrategy', () => {
    const strat = new ZenStrategy();

    it('never reports game over or win', () => {
      const tiles: Tile[] = [{ id: 1, value: 2048, r: 0, c: 0 }];
      expect(strat.checkWin(tiles)).toBe(false);
      expect(strat.checkGameOver(tiles, 4)).toBe(false);
    });
  });

  describe('CustomTargetStrategy', () => {
    it('wins when target value reached', () => {
      const strat = new CustomTargetStrategy(512);
      const tiles: Tile[] = [{ id: 1, value: 512, r: 0, c: 0 }];
      expect(strat.checkWin(tiles)).toBe(true);
    });
  });

  describe('BlitzStrategy', () => {
    const strat = new BlitzStrategy();

    it('awards time bonus for merges >= 32', () => {
      const bonus16 = strat.calculateTimeBonus(16);
      const bonus32 = strat.calculateTimeBonus(32);
      const bonus64 = strat.calculateTimeBonus(64);
      expect(bonus16).toBe(0);
      expect(bonus32).toBe(1);
      expect(bonus64).toBe(2);
    });
  });
});
