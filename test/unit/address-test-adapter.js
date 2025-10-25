/**
 * Test adapter for address generation
 * Maps SDK API to test format
 */

import { generateAccountKeypair, generateAccountKeypairs } from '../../src/core/address.js';

/**
 * Adapter for generateAccount - maps to SDK generateAccountKeypair
 */
export function generateAccount(seed, accountIndex = 0) {
  const result = generateAccountKeypair({ seed, index: accountIndex });

  return {
    accountTag: result.accountTag.toString('hex'),        // 20 bytes (40 hex chars) - persistent identifier
    dsaHash: result.dsaHash.toString('hex'),              // 40 bytes (80 hex chars) - implicit address
    wotsPublicKey: result.publicKey.toString('hex'),      // 2208 bytes (4416 hex chars)
    wotsSecretKey: result.secretKey.toString('hex')       // 32 bytes (64 hex chars)
  };
}

/**
 * Adapter for generateAccounts - maps to SDK generateAccountKeypairs
 */
export function generateAccounts(count, masterSeed = null, startIndex = 0) {
  const options = masterSeed ? { masterSeed, startIndex } : {};
  const keypairs = generateAccountKeypairs(count, options);

  return {
    accounts: keypairs.map((keypair) => ({
      accountTag: keypair.accountTag.toString('hex'),
      dsaHash: keypair.dsaHash.toString('hex'),
      wotsPublicKey: keypair.publicKey.toString('hex'),
      wotsSecretKey: keypair.secretKey.toString('hex')
    }))
  };
}
