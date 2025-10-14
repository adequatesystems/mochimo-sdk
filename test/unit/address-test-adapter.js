/**
 * Test adapter for address generation
 * Maps old test API to new SDK API with updated nomenclature
 */

import { generateAccountKeypair, generateAccountKeypairs } from '../../src/core/address.js';

/**
 * Adapter for generateAccount - maps to SDK generateAccountKeypair
 * Converts new nomenclature back to test-expected format
 */
export function generateAccount(seed, accountIndex = 0) {
  const result = generateAccountKeypair({ seed, index: accountIndex });

  // Map SDK field names to test-expected field names
  // accountNumber is just the index formatted as 20 hex chars (matches Go implementation)
  const accountNumber = accountIndex.toString(16).padStart(20, '0');

  return {
    mcmAccountNumber: accountNumber,
    wotsPublicKey: result.publicKey.toString('hex'),
    wotsSecretKey: result.secretKey.toString('hex')
  };
}

/**
 * Adapter for generateAccounts - maps to SDK generateAccountKeypairs
 */
export function generateAccounts(count, masterSeed = null) {
  const options = masterSeed ? { masterSeed } : {};
  const keypairs = generateAccountKeypairs(count, options);

  // Map SDK format to test-expected format
  return {
    accounts: keypairs.map((keypair, idx) => {
      // accountNumber is just the index formatted as 20 hex chars (matches Go)
      const accountNumber = idx.toString(16).padStart(20, '0');

      return {
        mcmAccountNumber: accountNumber,
        wotsPublicKey: keypair.publicKey.toString('hex'),
        wotsSecretKey: keypair.secretKey.toString('hex')
      };
    })
  };
}
