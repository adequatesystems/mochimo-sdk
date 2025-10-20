/**
 * Hierarchical Derivation Utilities
 *
 * Provides functions for deriving account seeds and WOTS keypairs from a master seed
 * using a hierarchical deterministic approach.
 *
 * Hierarchy: MasterSeed → AccountSeed → WOTS Keypairs
 *
 * Adapted from SDK-JS for Node.js environment and integration with mochimo-sdk.
 */

import crypto from 'crypto';
import { DigestRandomGenerator, intToBytes } from './digest-random-generator.js';
import { keygen } from '../core/wots.js';
import { addrFromWots } from '../core/crypto.js';

/**
 * Derivation Class
 *
 * Provides hierarchical deterministic key derivation for Mochimo accounts.
 */
export class Derivation {
  /**
   * Derives an account seed from a master seed and account index
   *
   * Process:
   * 1. Convert account index to 4 bytes
   * 2. Concatenate master seed + index bytes (36 bytes total)
   * 3. Hash with SHA-512 to get 64 bytes
   * 4. Feed hash to PRNG
   * 5. Extract first 32 bytes as account seed
   *
   * @param {Buffer} masterSeed - 32-byte master seed
   * @param {number} accountIndex - Account index (usually 0)
   * @returns {Object} { secret: Buffer, prng: DigestRandomGenerator }
   */
  static deriveAccountSeed(masterSeed, accountIndex) {
    if (!Buffer.isBuffer(masterSeed) || masterSeed.length !== 32) {
      throw new Error('Master seed must be a 32-byte Buffer');
    }

    if (typeof accountIndex !== 'number' || accountIndex < 0) {
      throw new Error('Account index must be a non-negative number');
    }

    // Convert index to 4 bytes and concatenate with master seed
    const idBytes = intToBytes(accountIndex);
    const input = Buffer.concat([masterSeed, idBytes]);

    // Hash the input with SHA-512
    const hash = crypto.createHash('sha512').update(input).digest();

    // Initialize PRNG with the hash
    const prng = new DigestRandomGenerator();
    prng.addSeedMaterial(hash);

    // Extract first 32 bytes as the account seed
    const secret = prng.nextBytes(32);

    return { secret, prng };
  }

  /**
   * Derives the account tag (identifier) for a given master seed and account index
   *
   * CRITICAL: The account tag MUST be derived from spend index 0 so that when
   * funds are deposited to the tag (creating an implicit address), the first
   * spend can be signed with the correct WOTS+ keypair.
   *
   * The account tag is derived by:
   * 1. Deriving the account seed
   * 2. Deriving the WOTS keypair for spend index 0
   * 3. Extracting the first 20 bytes of the DSA hash as the tag
   *
   * This ensures: Account Tag == DSA Hash of Spend Index 0 (implicit address)
   *
   * @param {Buffer} masterSeed - 32-byte master seed
   * @param {number} accountIndex - Account index (usually 0)
   * @returns {Buffer} 20-byte account tag
   */
  static deriveAccountTag(masterSeed, accountIndex) {
    const { secret: accountSeed } = this.deriveAccountSeed(masterSeed, accountIndex);

    // CRITICAL: Derive WOTS keypair for spend index 0
    // Convert spend index 0 to 4 bytes and concatenate with account seed
    const idBytes = intToBytes(0);  // Spend index 0
    const input = Buffer.concat([accountSeed, idBytes]);

    // Hash the input with SHA-512
    const hash = crypto.createHash('sha512').update(input).digest();

    // Initialize PRNG with the hash
    const prng = new DigestRandomGenerator();
    prng.addSeedMaterial(hash);

    // Extract first 32 bytes as WOTS secret
    const secret = prng.nextBytes(32);

    // Generate WOTS keypair
    const wotsKeypair = keygen(secret);

    // Generate DSA hash from WOTS public key
    const dsaHash = addrFromWots(wotsKeypair.publicKey);

    // Account tag is the first 20 bytes of the DSA hash from spend index 0
    // This ensures the account tag matches the DSA hash of the first keypair
  return dsaHash.subarray(0, 20);
  }

  /**
   * Derives a WOTS keypair for spending
   *
   * Process:
   * 1. Convert spend index to 4 bytes
   * 2. Concatenate account seed + spend index bytes (36 bytes)
   * 3. Hash with SHA-512 to get 64 bytes
   * 4. Feed hash to PRNG
   * 5. Extract 32 bytes as WOTS secret
   * 6. Use PRNG to generate full WOTS keypair
   *
   * @param {Buffer} accountSeed - 32-byte account seed
   * @param {number} spendIndex - Spend index (must be tracked and incremented)
   * @param {Buffer} accountTag - 20-byte account tag
   * @returns {Object} { secret, publicKey, dsaHash, wotsKeypair }
   */
  static deriveWotsKeypair(accountSeed, spendIndex, accountTag) {
    if (!Buffer.isBuffer(accountSeed) || accountSeed.length !== 32) {
      throw new Error('Account seed must be a 32-byte Buffer');
    }

    if (typeof spendIndex !== 'number' || spendIndex < 0) {
      throw new Error('Spend index must be a non-negative number');
    }

    if (!Buffer.isBuffer(accountTag) || accountTag.length !== 20) {
      throw new Error(`Account tag must be a 20-byte Buffer, got ${accountTag?.length || 'invalid'} bytes`);
    }

    // Convert spend index to 4 bytes and concatenate with account seed
    const idBytes = intToBytes(spendIndex);
    const input = Buffer.concat([accountSeed, idBytes]);

    // Hash the input with SHA-512
    const hash = crypto.createHash('sha512').update(input).digest();

    // Initialize PRNG with the hash
    const prng = new DigestRandomGenerator();
    prng.addSeedMaterial(hash);

    // Extract first 32 bytes as WOTS secret
    const secret = prng.nextBytes(32);

    // Generate WOTS keypair
    const wotsKeypair = keygen(secret);

    // Create the full public key with components (2208 bytes total)
    const publicKeyFull = Buffer.alloc(2208);

    // Copy the WOTS public key (2144 bytes)
    wotsKeypair.publicKey.copy(publicKeyFull, 0);

    // Copy public seed (32 bytes)
    wotsKeypair.components.publicSeed.copy(publicKeyFull, 2144);

    // Copy address seed (32 bytes)
    wotsKeypair.components.addrSeed.copy(publicKeyFull, 2144 + 32);

    // Set the last 12 bytes to default tag (matches Go implementation)
    const defaultTag = Buffer.from([0x42, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);
    defaultTag.copy(publicKeyFull, 2208 - 12);

    // Generate DSA hash from WOTS public key
    const dsaHash = addrFromWots(wotsKeypair.publicKey);

    return {
      secret: secret,
      publicKey: publicKeyFull,
      dsaHash: dsaHash,
      accountTag: accountTag,
      wotsKeypair: wotsKeypair
    };
  }
}
