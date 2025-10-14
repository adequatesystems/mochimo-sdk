/**
 * Address generation module
 *
 * Provides functions for generating Mochimo WOTS+ keypairs and addresses.
 */

import crypto from 'crypto';
import { keygen } from './wots.js';
import { addrFromWots } from './crypto.js';

/**
 * Generate a single Mochimo address with WOTS+ keypair
 *
 * @param {Object} options - Generation options
 * @param {Buffer} [options.seed] - Optional 32-byte seed for deterministic generation
 * @param {number} [options.index=0] - Address index for account number
 * @returns {Object} Address object with publicKey, secretKey, address, and accountNumber
 *
 * @example
 * // Generate random address
 * const addr = generateAddress();
 * console.log('Address:', addr.address);
 * console.log('Public Key:', addr.publicKey);
 * console.log('Secret Key:', addr.secretKey);
 *
 * @example
 * // Generate deterministic address from seed
 * const seed = Buffer.from('0'.repeat(64), 'hex');
 * const addr = generateAddress({ seed });
 */
export function generateAddress(options = {}) {
  const { seed = crypto.randomBytes(32), index = 0 } = options;

  if (!Buffer.isBuffer(seed) || seed.length !== 32) {
    throw new Error(`Seed must be a 32-byte Buffer, got ${seed?.length || 'invalid'} bytes`);
  }

  // Generate WOTS+ keypair
  const keypair = keygen(seed);

  // Create the full public key with components (2208 bytes total)
  const publicKeyFull = Buffer.alloc(2208);

  // Copy the WOTS public key (2144 bytes)
  keypair.publicKey.copy(publicKeyFull, 0);

  // Copy public seed (32 bytes)
  keypair.components.publicSeed.copy(publicKeyFull, 2144);

  // Copy address seed (32 bytes)
  keypair.components.addrSeed.copy(publicKeyFull, 2144 + 32);

  // Set the last 12 bytes to default tag (matches Go implementation)
  // These bytes are: [66, 0, 0, 0, 14, 0, 0, 0, 1, 0, 0, 0]
  const defaultTag = Buffer.from([0x42, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);
  defaultTag.copy(publicKeyFull, 2208 - 12);

  // Generate MCM account number (20 hex characters = 10 bytes)
  const accountNumber = index.toString(16).padStart(20, '0');

  // Generate address from WOTS public key
  const address = addrFromWots(keypair.publicKey);

  return {
    address,
    accountNumber,
    publicKey: publicKeyFull.toString('hex'),
    secretKey: seed.toString('hex'),
    // Include raw buffers for convenience
    publicKeyBuffer: publicKeyFull,
    secretKeyBuffer: seed
  };
}

/**
 * Generate multiple Mochimo addresses
 *
 * @param {number} count - Number of addresses to generate
 * @param {Object} options - Generation options
 * @param {Buffer} [options.masterSeed] - Optional 32-byte master seed for deterministic generation
 * @returns {Array<Object>} Array of address objects
 *
 * @example
 * // Generate 5 random addresses
 * const addresses = generateAddresses(5);
 *
 * @example
 * // Generate 3 deterministic addresses from master seed
 * const masterSeed = Buffer.from('0'.repeat(64), 'hex');
 * const addresses = generateAddresses(3, { masterSeed });
 * // Each address uses: seed[0], SHA256(seed[0]), SHA256(SHA256(seed[0])), ...
 */
export function generateAddresses(count, options = {}) {
  if (typeof count !== 'number' || count < 1) {
    throw new Error(`Count must be a positive number, got ${count}`);
  }

  const { masterSeed = null } = options;

  if (masterSeed !== null && (!Buffer.isBuffer(masterSeed) || masterSeed.length !== 32)) {
    throw new Error(`Master seed must be a 32-byte Buffer, got ${masterSeed?.length || 'invalid'} bytes`);
  }

  const addresses = [];
  let currentSeed = masterSeed;

  for (let i = 0; i < count; i++) {
    // Generate seed: either from master seed iteration or random
    let seed;
    if (masterSeed) {
      // Deterministic: use current seed and hash for next iteration
      seed = currentSeed;
      currentSeed = crypto.createHash('sha256').update(currentSeed).digest();
    } else {
      // Random: generate new random seed for each address
      seed = crypto.randomBytes(32);
    }

    const address = generateAddress({ seed, index: i });
    addresses.push(address);
  }

  return addresses;
}
