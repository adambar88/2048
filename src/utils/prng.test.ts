import { describe, it, expect } from 'vitest';
import { SeedablePRNG, generateSeed, createPRNG } from './prng';

describe('SeedablePRNG (Mulberry32)', () => {
  it('should generate a 32-bit unsigned integer seed', () => {
    const seed = generateSeed();
    expect(typeof seed).toBe('number');
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(seed)).toBe(true);
  });

  it('should be deterministic given the same seed', () => {
    const seed = 123456789;
    const prng1 = new SeedablePRNG(seed);
    const prng2 = new SeedablePRNG(seed);

    const seq1 = [prng1.next(), prng1.next(), prng1.next(), prng1.next()];
    const seq2 = [prng2.next(), prng2.next(), prng2.next(), prng2.next()];

    expect(seq1).toEqual(seq2);
  });

  it('should produce different sequences for different seeds', () => {
    const prng1 = new SeedablePRNG(11111);
    const prng2 = new SeedablePRNG(99999);

    expect(prng1.next()).not.toEqual(prng2.next());
  });

  it('should generate floats in [0, 1) range', () => {
    const prng = new SeedablePRNG(42);
    for (let i = 0; i < 100; i++) {
      const floatVal = prng.nextFloat();
      expect(floatVal).toBeGreaterThanOrEqual(0);
      expect(floatVal).toBeLessThan(1);
    }
  });

  it('should generate integers within specified min and max inclusive', () => {
    const prng = new SeedablePRNG(2024);
    const min = 2;
    const max = 4;
    const counts: Record<number, number> = { 2: 0, 3: 0, 4: 0 };

    for (let i = 0; i < 500; i++) {
      const val = prng.nextInt(min, max);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(min);
      expect(val).toBeLessThanOrEqual(max);
      counts[val] = (counts[val] || 0) + 1;
    }

    // Verify all numbers in range [2, 4] were generated
    expect(counts[2]).toBeGreaterThan(0);
    expect(counts[3]).toBeGreaterThan(0);
    expect(counts[4]).toBeGreaterThan(0);
  });

  it('should handle min > max by swapping parameters in nextInt', () => {
    const prng = new SeedablePRNG(100);
    const val = prng.nextInt(10, 5);
    expect(val).toBeGreaterThanOrEqual(5);
    expect(val).toBeLessThanOrEqual(10);
  });

  it('should instantiate using createPRNG helper', () => {
    const prng = createPRNG(777);
    expect(prng).toBeInstanceOf(SeedablePRNG);
    expect(prng.getSeed()).toBeDefined();
  });
});
