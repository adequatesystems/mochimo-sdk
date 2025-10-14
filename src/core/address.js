/**
 * Account Keypair Generation Module
 *
 * Provides functions for generating Mochimo WOTS+ keypairs and DSA public keys
 * for use with Mochimo accounts.
 *
 * TERMINOLOGY:
 * - Account: The persistent user identity in Mochimo
 * - Account Tag: 20-byte persistent identifier (what users think of as their account number)
 * - DSA PK: WOTS+ Digital Signature Algorithm public key (one-time use, changes each transaction)
 * - DSA Hash: 20-byte hash of the DSA PK
 *
 * IMPORTANT: What this module generates is a WOTS+ DSA keypair. The DSA PK hash can be used as an
 * Account Tag on first use (implicit tagging), or you can assign a custom Account Tag for
 * subsequent transactions to maintain account persistence.
 */

import crypto from 'crypto';
import { keygen } from './wots.js';
import { addrFromWots } from './crypto.js';

/**
 * Generate a single Mochimo WOTS+ keypair for an account
 *
 * This generates a one-time-use WOTS+ DSA keypair. The DSA PK hash can be used as an
 * Account Tag on first use (implicit tagging), or you can assign a custom Account Tag
 * for subsequent transactions to maintain account persistence.
 *
 * @param {Object} options - Generation options
 * @param {Buffer} [options.seed] - Optional 32-byte seed for deterministic generation
 * @param {number} [options.index=0] - Keypair index for derivation
 * @returns {Object} Keypair object with publicKey, secretKey, dsaHash, and accountNumber
 *
 * @example
 * // Generate random keypair
 * const keypair = generateAccountKeypair();
 * console.log('DSA Hash (can be Account Tag):', keypair.dsaHash);
 * console.log('Public Key:', keypair.publicKey);
 * console.log('Secret Key:', keypair.secretKey);
 *
 * @example
 * // Generate deterministic keypair from seed
 * const seed = Buffer.from('0'.repeat(64), 'hex');
 * const keypair = generateAccountKeypair({ seed });
 */
export function generateAccountKeypair(options = {}) {
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

  // Generate DSA hash from WOTS public key (40 bytes)
  const dsaHash = addrFromWots(keypair.publicKey);

  // Account tag is the first 20 bytes of the DSA hash (persistent identifier)
  const accountTag = dsaHash.slice(0, 20);

  return {
    dsaHash,              // 40-byte one-time DSA public key hash
    accountTag,           // 20-byte persistent account identifier
    accountNumber,
    publicKey: publicKeyFull,
    secretKey: seed
  };
}

/**
 * Generate multiple Mochimo WOTS+ keypairs for accounts
 *
 * @param {number} count - Number of keypairs to generate
 * @param {Object} options - Generation options
 * @param {Buffer} [options.masterSeed] - Optional 32-byte master seed for deterministic generation
 * @returns {Array<Object>} Array of keypair objects
 *
 * @example
 * // Generate 5 random keypairs
 * const keypairs = generateAccountKeypairs(5);
 *
 * @example
 * // Generate 3 deterministic keypairs from master seed
 * const masterSeed = Buffer.from('0'.repeat(64), 'hex');
 * const keypairs = generateAccountKeypairs(3, { masterSeed });
 * // Each keypair uses: seed[0], SHA256(seed[0]), SHA256(SHA256(seed[0])), ...
 */
export function generateAccountKeypairs(count, options = {}) {
  if (typeof count !== 'number' || count < 1) {
    throw new Error(`Count must be a positive number, got ${count}`);
  }

  const { masterSeed = null } = options;

  if (masterSeed !== null && (!Buffer.isBuffer(masterSeed) || masterSeed.length !== 32)) {
    throw new Error(`Master seed must be a 32-byte Buffer, got ${masterSeed?.length || 'invalid'} bytes`);
  }

  const keypairs = [];
  let currentSeed = masterSeed;

  for (let i = 0; i < count; i++) {
    // Generate seed: either from master seed iteration or random
    let seed;
    if (masterSeed) {
      // Deterministic: use current seed and hash for next iteration
      seed = currentSeed;
      currentSeed = crypto.createHash('sha256').update(currentSeed).digest();
    } else {
      // Random: generate new random seed for each keypair
      seed = crypto.randomBytes(32);
    }

    const keypair = generateAccountKeypair({ seed, index: i });
    keypairs.push(keypair);
  }

  return keypairs;
}
