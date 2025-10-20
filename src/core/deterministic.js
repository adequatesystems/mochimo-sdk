/**
 * Deterministic Key Generation Module
 *
 * Provides deterministic hierarchical key generation for Mochimo accounts.
 * Designed for cryptocurrency exchanges to manage user accounts using a
 * MasterSeed-based approach.
 *
 * CRITICAL SECURITY NOTE:
 * Mochimo uses WOTS+ (Winternitz One-Time Signatures) which should ONLY be used once.
 * Integrators must track the spend index for each user account and increment it after
 * every successful transaction.
 *
 * Reusing a spend index should only occur when recovering from a network split, as it
 * reduces WOTS+ keypair security with each reuse.
 *
 * @module deterministic
 */

import crypto from 'crypto';
import { Derivation } from '../utils/derivation.js';

/**
 * Generate a cryptographically secure 32-byte master seed
 *
 * This should be called once per user and the result stored securely.
 * The master seed can regenerate all future addresses for that user.
 *
 * @returns {Buffer} 32-byte master seed
 *
 * @example
 * import { generateMasterSeed } from 'mochimo';
 *
 * const masterSeed = generateMasterSeed();
 * const masterSeedHex = masterSeed.toString('hex');
 */
export function generateMasterSeed() {
  return crypto.randomBytes(32);
}

/**
 * Derive account information from a master seed
 *
 * Returns the account seed, account tag (persistent identifier), and deposit address
 * information for a given account index. Most exchanges will use accountIndex = 0.
 * Present the account tag as a base58+CRC address to users for deposits.
 *
 * The account tag is the persistent identifier for the user's account. This is what
 * should be displayed to users as their "account number" or "deposit address identifier".
 *
 * @param {Buffer|string} masterSeed - 32-byte master seed (Buffer or hex string)
 * @param {number} [accountIndex=0] - Account index (default: 0)
 * @returns {Object} Account information
 * @returns {Buffer} returns.accountSeed - 32-byte account seed (intermediate value)
 * @returns {Buffer} returns.accountTag - 20-byte persistent account identifier
 * @returns {string} returns.accountTagHex - Account tag as hex string (40 chars)
 * @returns {Object} returns.depositAddress - First address info (spend index 0)
 * @returns {Buffer} returns.depositAddress.dsaHash - 40-byte DSA hash
 * @returns {string} returns.depositAddress.dsaHashHex - DSA hash as hex (80 chars)
 *
 * @example
 * import { generateMasterSeed, getAccountFromMasterSeed } from 'mochimo';
 *
 * const masterSeed = generateMasterSeed();
 * const account = getAccountFromMasterSeed(masterSeed, 0);
 *
 * console.log('Account Tag (show to user):', account.accountTagHex);
 * console.log('Deposit Address Hash:', account.depositAddress.dsaHashHex);
 *
 * // Persist:
 * // - master_seed
 * // - account_tag: account.accountTagHex
 * // - spend_index: 0 (initial value)
 * // - account_index: 0
 */
export function getAccountFromMasterSeed(masterSeed, accountIndex = 0) {
  // Convert hex string to Buffer if needed
  if (typeof masterSeed === 'string') {
    if (masterSeed.length !== 64) {
      throw new Error('Master seed hex string must be 64 characters (32 bytes)');
    }
    masterSeed = Buffer.from(masterSeed, 'hex');
  }

  if (!Buffer.isBuffer(masterSeed) || masterSeed.length !== 32) {
    throw new Error('Master seed must be a 32-byte Buffer or 64-char hex string');
  }

  if (typeof accountIndex !== 'number' || accountIndex < 0) {
    throw new Error('Account index must be a non-negative number');
  }

  // Derive account seed
  const { secret: accountSeed } = Derivation.deriveAccountSeed(masterSeed, accountIndex);

  // Derive account tag (persistent identifier)
  const accountTag = Derivation.deriveAccountTag(masterSeed, accountIndex);

  // Get the first WOTS address (spend index 0) as the deposit address
  const firstKeypair = Derivation.deriveWotsKeypair(accountSeed, 0, accountTag);

  return {
    accountSeed: accountSeed,
    accountTag: accountTag,
    accountTagHex: accountTag.toString('hex'),
    depositAddress: {
      dsaHash: firstKeypair.dsaHash,
      dsaHashHex: firstKeypair.dsaHash.toString('hex'),
      publicKey: firstKeypair.publicKey,
      publicKeyHex: firstKeypair.publicKey.toString('hex')
    }
  };
}

/**
 * Derive a WOTS+ keypair for a specific spend transaction
 *
 * CRITICAL: The spend index must be tracked and incremented after
 * every successful transaction. Avoid reuse of spend index as WOTS+ signatures are
 * one-time use only.
 *
 * Workflow:
 * 1. Retrieve current spend index
 * 2. Derive keypair using this function
 * 3. Create and sign transaction
 * 4. Broadcast transaction
 * 5. ONLY if broadcast succeeds, increment spend index
 *
 * @param {Buffer|string} masterSeed - 32-byte master seed (Buffer or hex string)
 * @param {number} spendIndex - Current spend index (must track persistently!)
 * @param {number} [accountIndex=0] - Account index (default: 0)
 * @returns {Object} Full WOTS+ keypair for transaction signing
 * @returns {Buffer} returns.secretKey - 32-byte secret key
 * @returns {string} returns.secretKeyHex - Secret key as hex string (64 chars)
 * @returns {Buffer} returns.publicKey - 2208-byte public key
 * @returns {string} returns.publicKeyHex - Public key as hex string (4416 chars)
 * @returns {Buffer} returns.dsaHash - 40-byte DSA hash
 * @returns {string} returns.dsaHashHex - DSA hash as hex (80 chars)
 * @returns {Buffer} returns.accountTag - 20-byte account tag
 * @returns {string} returns.accountTagHex - Account tag as hex (40 chars)
 *
 * @example
 * import { deriveKeypairForSpend } from 'mochimo';
 *
 * // Retrieve persisted values
 * const masterSeed = Buffer.from(user.master_seed, 'hex');
 * const currentSpendIndex = user.spend_index;

 * // Derive keypair
 * const keypair = deriveKeypairForSpend(masterSeed, currentSpendIndex);

 * // Create and broadcast transaction
 * // ... (use keypair.publicKeyHex, keypair.secretKeyHex, etc.)

 * // ONLY after successful broadcast, increment spend index:
 * // user.spend_index = currentSpendIndex + 1
 */
export function deriveKeypairForSpend(masterSeed, spendIndex, accountIndex = 0) {
  // Convert hex string to Buffer if needed
  if (typeof masterSeed === 'string') {
    if (masterSeed.length !== 64) {
      throw new Error('Master seed hex string must be 64 characters (32 bytes)');
    }
    masterSeed = Buffer.from(masterSeed, 'hex');
  }

  if (!Buffer.isBuffer(masterSeed) || masterSeed.length !== 32) {
    throw new Error('Master seed must be a 32-byte Buffer or 64-char hex string');
  }

  if (typeof spendIndex !== 'number' || spendIndex < 0) {
    throw new Error('Spend index must be a non-negative number');
  }

  if (typeof accountIndex !== 'number' || accountIndex < 0) {
    throw new Error('Account index must be a non-negative number');
  }

  // Derive account seed and tag
  const { secret: accountSeed } = Derivation.deriveAccountSeed(masterSeed, accountIndex);
  const accountTag = Derivation.deriveAccountTag(masterSeed, accountIndex);

  // Derive the specific keypair for this spend index
  const keypair = Derivation.deriveWotsKeypair(accountSeed, spendIndex, accountTag);

  return {
    secretKey: keypair.secret,
    secretKeyHex: keypair.secret.toString('hex'),
    publicKey: keypair.publicKey,
    publicKeyHex: keypair.publicKey.toString('hex'),
    dsaHash: keypair.dsaHash,
    dsaHashHex: keypair.dsaHash.toString('hex'),
    accountTag: keypair.accountTag,
    accountTagHex: keypair.accountTag.toString('hex')
  };
}

/**
 * Derive just the account seed (intermediate step)
 *
 * Most exchanges won't need this directly - use getAccountFromMasterSeed() instead.
 * This is exposed for advanced use cases.
 *
 * @param {Buffer|string} masterSeed - 32-byte master seed (Buffer or hex string)
 * @param {number} [accountIndex=0] - Account index (default: 0)
 * @returns {Buffer} 32-byte account seed
 *
 * @example
 * import { deriveAccountSeed } from 'mochimo';
 *
 * const masterSeed = Buffer.from('a'.repeat(64), 'hex');
 * const accountSeed = deriveAccountSeed(masterSeed, 0);
 */
export function deriveAccountSeed(masterSeed, accountIndex = 0) {
  // Convert hex string to Buffer if needed
  if (typeof masterSeed === 'string') {
    if (masterSeed.length !== 64) {
      throw new Error('Master seed hex string must be 64 characters (32 bytes)');
    }
    masterSeed = Buffer.from(masterSeed, 'hex');
  }

  if (!Buffer.isBuffer(masterSeed) || masterSeed.length !== 32) {
    throw new Error('Master seed must be a 32-byte Buffer or 64-char hex string');
  }

  const { secret } = Derivation.deriveAccountSeed(masterSeed, accountIndex);
  return secret;
}

/**
 * Derive the account tag (persistent identifier)
 *
 * The account tag is the 20-byte persistent identifier for a user's account.
 * This is what should be displayed to users as their "account number".
 *
 * @param {Buffer|string} masterSeed - 32-byte master seed (Buffer or hex string)
 * @param {number} [accountIndex=0] - Account index (default: 0)
 * @returns {Object} Account tag information
 * @returns {Buffer} returns.accountTag - 20-byte account tag
 * @returns {string} returns.accountTagHex - Account tag as hex string (40 chars)
 *
 * @example
 * import { deriveAccountTag } from 'mochimo';
 *
 * const masterSeed = Buffer.from('a'.repeat(64), 'hex');
 * const { accountTag, accountTagHex } = deriveAccountTag(masterSeed, 0);
 * console.log('Account Tag:', accountTagHex);
 */
export function deriveAccountTag(masterSeed, accountIndex = 0) {
  // Convert hex string to Buffer if needed
  if (typeof masterSeed === 'string') {
    if (masterSeed.length !== 64) {
      throw new Error('Master seed hex string must be 64 characters (32 bytes)');
    }
    masterSeed = Buffer.from(masterSeed, 'hex');
  }

  if (!Buffer.isBuffer(masterSeed) || masterSeed.length !== 32) {
    throw new Error('Master seed must be a 32-byte Buffer or 64-char hex string');
  }

  const accountTag = Derivation.deriveAccountTag(masterSeed, accountIndex);

  return {
    accountTag: accountTag,
    accountTagHex: accountTag.toString('hex')
  };
}
