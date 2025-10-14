/**
 * Mochimo Node.js SDK
 *
 * A complete SDK for interacting with the Mochimo blockchain network.
 * Supports account keypair generation, transaction creation/signing, and network broadcasting.
 *
 * TERMINOLOGY GUIDE:
 * - Account: The persistent user identity in Mochimo
 * - Account Tag: 20-byte persistent identifier
 * - DSA PK: WOTS+ public key (one-time use)
 * - Ledger Address: 40-byte blockchain entry (Account Tag + DSA Hash)
 *
 * @module mochimo
 */

// Core functionality
export {
  generateAccountKeypair,
  generateAccountKeypairs
} from './core/address.js';

export { createTransaction, signTransaction, serializeTransaction } from './core/transaction.js';

// Network functionality
export { broadcastTransaction, getNetworkStatus } from './network/broadcast.js';
export { getAccountBalance, resolveTag } from './network/account.js';

// Utilities
export {
  addrTagToBase58,
  validateBase58Tag,
  base58ToAddrTag,
  addrTagToBase58 as encodeBase58WithChecksum,
  validateBase58Tag as decodeBase58WithChecksum
} from './utils/base58.js';

// Address utilities
export {
  validateLedgerAddress,
  validateAccountTag,
  extractAccountTag,
  extractDsaHash,
  isImplicitAccount,
  constructLedgerAddress,
  formatLedgerAddress,
  getAccountInfo
} from './utils/address-utils.js';

// Transaction builder utilities
export {
  buildTransaction,
  prepareTransactionFromWallet,
  validateTransactionParams
} from './utils/transaction-builder.js';

// Low-level exports for advanced users
export { keygen, sign, verify, wotsPkFromSig } from './core/wots.js';
export { mochimoHash, addrFromWots } from './core/crypto.js';

/**
 * SDK Version
 */
export const VERSION = '1.0.0';
