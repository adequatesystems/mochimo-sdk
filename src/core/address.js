/**
 * Account Keypair Generation Module (Reference Implementation)
 *
 * NOT FOR USE IN EXCHANGE INTEGRATION
 * 
 * This module provides basic WOTS+ keypair generation for non-custodial wallets
 * and reference implementations. It is not spend-index aware and not suitable
 * for exchanges or custodial services.
 *
 * FOR EXCHANGE INTEGRATION, USE THESE INSTEAD:
 * - generateMasterSeed() - Generate once per user
 * - getAccountFromMasterSeed() - Get deposit address
 * - deriveKeypairForSpend() - Spend-index aware keypair derivation
 * 
 * See: src/core/deterministic.js and examples/exchange/
 *
 * TERMINOLOGY:
 * - Account: The persistent user identity in Mochimo
 * - Account Tag: 20-byte persistent identifier (what users think of as their account number)
 * - DSA PK: WOTS+ Digital Signature Algorithm public key (one-time use, changes each transaction)
 * - DSA Hash: 20-byte hash of the DSA PK
 *
 * IMPORTANT: What this module generates is a WOTS+ DSA keypair. The DSA PK hash will be used as an
 * Account Tag on first use (implicit tagging).
 */

import crypto from 'crypto';
import { keygen } from './wots.js';
import { addrFromWots } from './crypto.js';

/**
 * Generate a single Mochimo WOTS+ keypair for an account
 *
 * Reference example only.
 * For exchange integration, use deriveKeypairForSpend() from deterministic.js
 *
 * This generates a one-time-use WOTS+ DSA keypair. The DSA PK hash will be used as an
 * Account Tag on first receipt of coins by the network (implicit tagging).
 *
 * USE CASES:
 * - Non-custodial wallet applications
 * - Reference implementations
 * - Testing and development
 * - One-off keypair generation
 *
 * @param {Object} options - Generation options
 * @param {Buffer} [options.seed] - Optional 32-byte seed for deterministic generation
 * @param {number} [options.index=0] - Keypair index for derivation (not stored, used only during generation)
 * @returns {Object} Keypair object with publicKey, secretKey, dsaHash, and accountTag
 *
 * @example
 * // Generate random keypair
 * const keypair = generateAccountKeypair();
 * console.log('Account Tag (persistent address):', keypair.accountTag.toString('hex'));
 * console.log('DSA Hash (full 40 bytes):', keypair.dsaHash.toString('hex'));
 * console.log('Public Key:', keypair.publicKey);
 * console.log('Secret Key:', keypair.secretKey);
 *
 * @example
 * // Generate deterministic keypair from seed.  Example below uses 64 hex 0s as seed, change it.
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

  // Set the last 12 bytes to default tag, a WOTS+ convention
  // These bytes are: [66, 0, 0, 0, 14, 0, 0, 0, 1, 0, 0, 0]
  const defaultTag = Buffer.from([0x42, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);
  defaultTag.copy(publicKeyFull, 2208 - 12);

  // Generate DSA hash from WOTS public key (40 bytes)
  const dsaHash = addrFromWots(keypair.publicKey);

  // Account tag is the first 20 bytes of the DSA hash (persistent identifier)
  const accountTag = dsaHash.subarray(0, 20);

  return {
    dsaHash,              // 40-byte one-time DSA public key hash
    accountTag,           // 20-byte persistent account identifier
    publicKey: publicKeyFull,
    secretKey: seed
  };
}

/**
 * Generate multiple Mochimo WOTS+ keypairs for accounts
 *
 * Reference implementation, not for robust deterministic generation use.
 * For exchange integration: use deriveKeypairForSpend() from deterministic.js instead.
 *
 * This function generates multiple different ACCOUNTS (different account tags),
 * NOT multiple spend keypairs for the same account. If you need to track spends
 * for the same account (exchange withdrawals), this is the WRONG function.
 *
 * WHAT THIS DOES:
 * - Generates multiple separate accounts (different account tags)
 * - NOT for tracking spend index on a single account
 * - Each keypair is a completely different account
 *
 * USE CASES:
 * - Generating multiple addresses for non-custodial wallets
 * - Creating address pools for non-deterministic wallets
 * - Testing multiple accounts
 *
 * @param {number} count - Number of keypairs to generate
 * @param {Object} options - Generation options
 * @param {Buffer} [options.masterSeed] - Optional 32-byte master seed for deterministic generation
 * @returns {Array<Object>} Array of keypair objects
 *
 * @example
 * // Generate 5 random keypairs (5 different accounts)
 * const keypairs = generateAccountKeypairs(5);
 *
 * @example
 * // Generate 3 deterministic keypairs from master seed (3 different accounts)
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
