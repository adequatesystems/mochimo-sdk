/**
 * Transaction Builder Utilities
 *
 * Higher-level helpers for creating Mochimo transactions with automatic
 * tag extraction and validation. These functions simplify the transaction
 * creation process and help prevent common errors.
 */

import { createTransaction } from '../core/transaction.js';
import { extractTag, getAddressInfo, validateAddress } from './address-utils.js';

/**
 * Build a transaction with automatic tag extraction from source address.
 *
 * This is a convenience wrapper around createTransaction() that automatically
 * extracts the source tag from the full source address, preventing the common
 * error of providing mismatched tags.
 *
 * **Understanding Mochimo Addresses:**
 * - Full ledger addresses are 40 bytes: TAG (20 bytes) + DSA (20 bytes)
 * - TAG = Account identifier that persists across transactions
 * - DSA = WOTS+ public key hash (changes with each transaction)
 * - When spending, the source TAG automatically moves to the change address
 *
 * **Implicit vs Explicit Addresses:**
 * - Implicit (never spent): TAG == DSA (both portions are identical)
 * - Explicit (previously spent): TAG ≠ DSA (tag preserved from last TX)
 *
 * @param {Object} params - Transaction parameters
 * @param {string} params.sourceAddress - Full 40-byte source address (80 hex chars)
 * @param {string} params.sourcePublicKey - Source WOTS+ public key (4416 hex chars)
 * @param {string} params.sourceSecret - Source secret key (64 hex chars)
 * @param {string|bigint} params.balance - Current balance in nanoMCM
 * @param {string} params.changePublicKey - New WOTS+ public key for change (4416 hex chars)
 * @param {string} params.destinationAddress - Destination TAG (20 bytes, 40 hex) or full address (40 bytes, 80 hex)
 * @param {string|bigint} params.amount - Amount to send in nanoMCM
 * @param {string|bigint} [params.fee=500] - Transaction fee in nanoMCM
 * @param {string} [params.memo=''] - Optional memo (max 16 chars, see rules)
 * @param {number} [params.blocksToLive=1000] - Transaction expiry in blocks
 *
 * @returns {Buffer} - Serialized signed transaction ready for broadcast
 *
 * @throws {Error} If source address is invalid or parameters are incorrect
 *
 * @example
 * // Build a transaction (automatic tag extraction)
 * const tx = buildTransaction({
 *   sourceAddress: 'ab8599ef...dddc2760ab8599ef...dddc2760', // 80 hex chars
 *   sourcePublicKey: '0123...', // 4416 hex chars
 *   sourceSecret: 'a1b2...', // 64 hex chars
 *   balance: '100000',
 *   changePublicKey: '4567...', // 4416 hex chars (new keypair)
 *   destinationAddress: 'cd1234...', // 40 or 80 hex chars
 *   amount: '5000',
 *   fee: '500',
 *   memo: 'TEST-123'
 * });
 */
export function buildTransaction(params) {
  const {
    sourceAddress,
    sourcePublicKey,
    sourceSecret,
    balance,
    changePublicKey,
    destinationAddress,
    amount,
    fee = 500,
    memo = '',
    blocksToLive = 1000
  } = params;

  // Validate and extract source tag
  if (!sourceAddress) {
    throw new Error('sourceAddress is required');
  }

  let sourceTag;
  try {
    // Validate full address
    validateAddress(sourceAddress, 'sourceAddress');
    // Extract tag (first 20 bytes)
    sourceTag = extractTag(sourceAddress);
  } catch (error) {
    throw new Error(`Invalid sourceAddress: ${error.message}\n` +
      `Expected: 40-byte address (80 hex characters) in format TAG+DSA`);
  }

  // Handle destination address (could be 20-byte tag or 40-byte full address)
  let destinationTag;
  if (destinationAddress.length === 40) {
    // It's a 20-byte tag
    destinationTag = destinationAddress;
  } else if (destinationAddress.length === 80) {
    // It's a 40-byte full address, extract tag
    destinationTag = extractTag(destinationAddress);
  } else {
    throw new Error(`destinationAddress must be either 40 hex chars (tag) or 80 hex chars (full address), ` +
      `got ${destinationAddress.length} chars`);
  }

  // Get source address info for helpful debugging
  const srcInfo = getAddressInfo(sourceAddress);

  // Log helpful info if this is an implicit address
  if (srcInfo.implicit) {
    console.log('ℹ️  Source is an implicit address (first-time use, TAG == DSA)');
    console.log(`   Tag: ${srcInfo.tag}`);
  } else {
    console.log('ℹ️  Source is an explicit address (previously spent, TAG ≠ DSA)');
    console.log(`   Tag: ${srcInfo.tag} (will move to change address)`);
    console.log(`   DSA: ${srcInfo.dsa} (current WOTS+ key)`);
  }

  // Create transaction with extracted tag
  const txObj = createTransaction({
    srcTag: sourceTag,
    sourcePk: sourcePublicKey,
    changePk: changePublicKey,
    balance,
    dstAddress: destinationTag,
    amount,
    fee,
    secret: sourceSecret,
    memo,
    blkToLive: blocksToLive
  });

  // Return the transaction buffer (for direct broadcast)
  return txObj.transaction;
}

/**
 * Prepare transaction parameters from a wallet configuration.
 *
 * This helper extracts and validates all necessary parameters from a
 * wallet config object, making it easier to construct transactions
 * from stored wallet data.
 *
 * @param {Object} wallet - Wallet configuration object
 * @param {Object} wallet.source - Source address info
 * @param {string} wallet.source.address - Full 40-byte address
 * @param {string} wallet.source.publicKey - WOTS+ public key
 * @param {string} wallet.source.seed - Secret key (64 hex chars)
 * @param {string|bigint} wallet.source.balance - Current balance
 * @param {Object} wallet.change - Change address info
 * @param {string} wallet.change.publicKey - New WOTS+ public key for change
 * @param {string} destination - Destination address (tag or full)
 * @param {string|bigint} amount - Amount to send
 * @param {Object} [options] - Additional options
 * @param {string|bigint} [options.fee=500] - Transaction fee
 * @param {string} [options.memo=''] - Optional memo
 * @param {number} [options.blocksToLive=1000] - Blocks until expiry
 *
 * @returns {Object} Parameters ready for buildTransaction()
 *
 * @example
 * const wallet = JSON.parse(fs.readFileSync('wallet-config.json'));
 * const txParams = prepareTransactionFromWallet(
 *   wallet,
 *   'cd1234...', // destination
 *   '5000'       // amount
 * );
 * const tx = buildTransaction(txParams);
 */
export function prepareTransactionFromWallet(wallet, destination, amount, options = {}) {
  if (!wallet || !wallet.source || !wallet.change) {
    throw new Error('Invalid wallet structure: must have source and change objects');
  }

  const { source, change } = wallet;

  // Validate required source fields
  if (!source.address) throw new Error('wallet.source.address is required');
  if (!source.publicKey) throw new Error('wallet.source.publicKey is required');
  if (!source.seed) throw new Error('wallet.source.seed is required');
  if (source.balance === undefined) throw new Error('wallet.source.balance is required');

  // Validate required change fields
  if (!change.publicKey) throw new Error('wallet.change.publicKey is required');

  return {
    sourceAddress: source.address,
    sourcePublicKey: source.publicKey,
    sourceSecret: source.seed,  // Using 'seed' field from wallet config
    balance: source.balance,
    changePublicKey: change.publicKey,
    destinationAddress: destination,
    amount,
    fee: options.fee || 500,
    memo: options.memo || '',
    blocksToLive: options.blocksToLive || 1000
  };
}

/**
 * Validate transaction parameters before creating a transaction.
 *
 * This function performs comprehensive validation of all transaction
 * parameters and returns detailed error messages if any issues are found.
 * Use this before calling createTransaction() to get user-friendly errors.
 *
 * @param {Object} params - Transaction parameters to validate
 * @returns {Object} Validation result {valid: boolean, errors: string[]}
 *
 * @example
 * const validation = validateTransactionParams(params);
 * if (!validation.valid) {
 *   console.error('Transaction validation failed:');
 *   validation.errors.forEach(err => console.error('  -', err));
 * }
 */
export function validateTransactionParams(params) {
  const errors = [];

  // Check required fields
  if (!params.srcTag) errors.push('srcTag is required');
  if (!params.sourcePk) errors.push('sourcePk is required');
  if (!params.changePk) errors.push('changePk is required');
  if (!params.dstAddress) errors.push('dstAddress is required');
  if (!params.amount) errors.push('amount is required');
  if (!params.secret) errors.push('secret is required');
  if (params.balance === undefined) errors.push('balance is required');

  // Validate formats
  if (params.srcTag && params.srcTag.length !== 40) {
    errors.push(`srcTag must be 40 hex chars (20 bytes), got ${params.srcTag.length}`);
  }
  if (params.sourcePk && params.sourcePk.length !== 4416) {
    errors.push(`sourcePk must be 4416 hex chars, got ${params.sourcePk.length}`);
  }
  if (params.changePk && params.changePk.length !== 4416) {
    errors.push(`changePk must be 4416 hex chars, got ${params.changePk.length}`);
  }
  if (params.dstAddress && params.dstAddress.length !== 40) {
    errors.push(`dstAddress must be 40 hex chars (20 bytes), got ${params.dstAddress.length}`);
  }
  if (params.secret && params.secret.length !== 64) {
    errors.push(`secret must be 64 hex chars (32 bytes), got ${params.secret.length}`);
  }

  // Validate amounts
  try {
    const balance = BigInt(params.balance || 0);
    const amount = BigInt(params.amount || 0);
    const fee = BigInt(params.fee || 0);

    if (amount <= 0n) {
      errors.push('amount must be greater than zero');
    }
    if (balance < amount + fee) {
      errors.push(`insufficient balance: need ${amount + fee} nanoMCM, have ${balance} nanoMCM`);
    }
  } catch (e) {
    errors.push('invalid amount or balance: must be numeric');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
