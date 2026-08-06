/**
 * Mulberry32 Pseudorandom Number Generator (PRNG)
 * Pure, deterministic 32-bit seedable PRNG with no side effects.
 */

export class SeedablePRNG {
  private state: number;

  /**
   * Initializes the PRNG with a 32-bit integer seed.
   * If no seed is specified, a random 32-bit seed is generated.
   * @param seed Optional 32-bit integer seed
   */
  constructor(seed?: number) {
    this.state = seed !== undefined ? (seed >>> 0) : SeedablePRNG.generateSeed();
  }

  /**
   * Generates a random 32-bit unsigned integer seed.
   */
  public static generateSeed(): number {
    return Math.floor(Math.random() * 0xffffffff) >>> 0;
  }

  /**
   * Generates a random 32-bit unsigned integer seed.
   */
  public generateSeed(): number {
    return SeedablePRNG.generateSeed();
  }

  /**
   * Advances the generator state and returns a 32-bit unsigned integer [0, 4294967295].
   */
  public next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /**
   * Returns a pseudorandom float in the half-open range [0, 1).
   */
  public nextFloat(): number {
    return this.next() / 4294967296;
  }

  /**
   * Returns a pseudorandom integer in the range [min, max] inclusive.
   * @param min Minimum integer bound
   * @param max Maximum integer bound
   */
  public nextInt(min: number, max: number): number {
    const minInt = Math.ceil(Math.min(min, max));
    const maxInt = Math.floor(Math.max(min, max));
    const float = this.nextFloat();
    return Math.floor(float * (maxInt - minInt + 1)) + minInt;
  }

  /**
   * Gets current state / seed value.
   */
  public getSeed(): number {
    return this.state >>> 0;
  }
}

/**
 * Standalone helper to generate a 32-bit unsigned integer seed.
 */
export const generateSeed = (): number => {
  return SeedablePRNG.generateSeed();
};

/**
 * Factory helper to create a SeedablePRNG instance.
 */
export const createPRNG = (seed?: number): SeedablePRNG => {
  return new SeedablePRNG(seed);
};
