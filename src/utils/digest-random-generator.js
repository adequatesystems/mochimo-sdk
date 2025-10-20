/**
 * Digest Random Generator (PRNG)
 *
 * A deterministic pseudo-random number generator based on SHA-512 hashing.
 * This ensures reproducible "random" values from the same input seed.
 *
 * Adapted from SDK-JS for Node.js environment using native crypto module.
 */

import crypto from 'crypto';

/**
 * Converts an integer to a 4-byte array (big-endian)
 * @param {number} num - Integer to convert
 * @returns {Buffer} 4-byte buffer
 */
export function intToBytes(num) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(num, 0);
  return buffer;
}

/**
 * Digest Random Generator Class
 *
 * Provides deterministic random number generation using SHA-512 hashing.
 * Maintains internal state that evolves with each generation to ensure
 * reproducible but unpredictable output.
 */
export class DigestRandomGenerator {
  static CYCLE_COUNT = 10;

  constructor() {
    this.stateCounter = 1;
    this.seedCounter = 1;
    this.seed = Buffer.alloc(64).fill(0);
    this.state = Buffer.alloc(64).fill(0);
  }

  /**
   * Adds counter bytes for the digest operation
   * @param {number} counter - Counter value
   * @returns {Buffer} 8-byte buffer with counter
   */
  digestAddCounter(counter) {
    const bytes = Buffer.alloc(8);
    bytes.writeUInt32LE(counter, 0);
    return bytes;
  }

  /**
   * Performs SHA-512 hash on the input data
   * @param {Buffer} data - Input data to hash
   * @returns {Buffer} 64-byte hash output
   */
  digest(data) {
    return crypto.createHash('sha512').update(data).digest();
  }

  /**
   * Cycles the internal seed state
   */
  cycleSeed() {
    const counterBytes = this.digestAddCounter(this.seedCounter++);
    const input = Buffer.concat([this.seed, counterBytes]);
    this.seed = this.digest(input);
  }

  /**
   * Generates the next internal state
   */
  generateState() {
    const counterBytes = this.digestAddCounter(this.stateCounter++);
    const input = Buffer.concat([counterBytes, this.state, this.seed]);
    this.state = this.digest(input);

    if (this.stateCounter % DigestRandomGenerator.CYCLE_COUNT === 0) {
      this.cycleSeed();
    }
  }

  /**
   * Adds seed material to the internal seed
   * @param {Buffer} seed - Seed material to add
   */
  addSeedMaterial(seed) {
    const input = Buffer.concat([seed, this.seed]);
    this.seed = this.digest(input);
  }

  /**
   * Generates the next random bytes of specified length
   * @param {number} length - Number of bytes to generate
   * @returns {Buffer} Random bytes
   */
  nextBytes(length) {
    const result = Buffer.alloc(length);
    let index = 0;

    // Calculate needed iterations
    const iterations = Math.ceil(length / this.state.length);

    // Generate all needed states
    for (let i = 0; i < iterations; i++) {
      this.generateState();
      const remaining = length - index;
      const copyLength = Math.min(this.state.length, remaining);
      this.state.copy(result, index, 0, copyLength);
      index += copyLength;
    }

    return result;
  }
}
