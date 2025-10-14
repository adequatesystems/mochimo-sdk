/**
 * Test adapter for address generation
 * Maps old test API to new SDK API
 */

import { generateAddress as sdkGenerateAddress, generateAddresses as sdkGenerateAddresses } from '../../src/core/address.js';

/**
 * Adapter for generateAccount - maps to SDK generateAddress
 */
export function generateAccount(seed, accountIndex = 0) {
  const result = sdkGenerateAddress({ seed, index: accountIndex });

  // Map SDK field names to test-expected field names
  return {
    mcmAccountNumber: result.accountNumber,
    wotsPublicKey: result.publicKey,
    wotsSecretKey: result.secretKey
  };
}

/**
 * Adapter for generateAccounts - maps to SDK generateAddresses
 */
export function generateAccounts(count, masterSeed = null) {
  const options = masterSeed ? { masterSeed } : {};
  const addresses = sdkGenerateAddresses(count, options);

  // Map SDK format to test-expected format
  return {
    accounts: addresses.map(addr => ({
      mcmAccountNumber: addr.accountNumber,
      wotsPublicKey: addr.publicKey,
      wotsSecretKey: addr.secretKey
    }))
  };
}
