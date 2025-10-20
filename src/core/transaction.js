/**
 * Transaction creation and signing module
 *
 * Provides functions for creating and signing Mochimo transactions.
 */

import crypto from 'crypto';
import { keygen, sign } from './wots.js';
import { addrFromWots } from './crypto.js';
import { validateAccountTag, extractAccountTag, extractDsaHash, isImplicitAccount } from '../utils/address-utils.js';

// Constants matching MCM 3.0 protocol
const ACCOUNT_TAG_LEN = 20;    // Account Tag length (bytes) - persistent identifier
const ACCOUNT_REF_LEN = 16;    // Account Reference (memo) length (bytes)
const TX_AMOUNT = 8;           // Transaction amount field size
const WOTS_ADDR_LEN = 32;      // WOTS+ Address Scheme length
const HASHLEN = 32;            // SHA-256 hash length

// Transaction type codes
const TXDAT_MDST = 0x00;    // Multi-Destination type
const TXDSA_WOTS = 0x00;    // WOTS+ DSA type

/**
 * Validates a transaction memo/reference string
 *
 * Rules:
 * - Max 16 characters
 * - Contains only uppercase [A-Z], digits [0-9], dash [-]
 * - Groups of letters and groups of numbers MUST be separated by dashes
 * - Cannot have two consecutive letter groups (even with dash between)
 * - Cannot have two consecutive number groups (even with dash between)
 * - Valid: "ABC-123", "123-ABC", "AB-12-CD", "ABC-123-XYZ"
 * - Invalid: "ABC-XYZ", "123-456", "AB-CD-12", "ABC", "123"
 *
 * @param {string} ref - Reference string to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateReference(ref) {
  if (!ref || ref.length === 0) return true;
  if (ref.length > ACCOUNT_REF_LEN) return false;

  const states = {
    START: 0,
    DIGIT_DASH: 1,
    DIGIT: 2,
    UPPER_DASH: 3,
    UPPER: 4
  };

  let state = states.START;

  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);

    switch (state) {
      case states.START:
        if (c >= 48 && c <= 57) { // '0'-'9'
          state = states.DIGIT;
          continue;
        }
        // fallthrough
      case states.DIGIT_DASH:
        if (c >= 65 && c <= 90) { // 'A'-'Z'
          state = states.UPPER;
          continue;
        }
        break;

      case states.UPPER_DASH:
        if (c >= 48 && c <= 57) { // '0'-'9'
          state = states.DIGIT;
          continue;
        }
        break;

      case states.DIGIT:
        if (c >= 48 && c <= 57) { // '0'-'9'
          continue;
        }
        if (c === 45) { // '-'
          state = states.DIGIT_DASH;
          continue;
        }
        return false;

      case states.UPPER:
        if (c >= 65 && c <= 90) { // 'A'-'Z'
          continue;
        }
        if (c === 45) { // '-'
          state = states.UPPER_DASH;
          continue;
        }
        return false;

      default:
        return false;
    }
  }

  return state === states.DIGIT || state === states.UPPER;
}

/**
 * Creates a Multi-Destination Structure (MDST)
 *
 * @param {string} accountTag - Destination account tag (20 hex characters = 10 bytes)
 * @param {string} memo - Transaction memo/reference (max 16 characters)
 * @param {number|bigint} amount - Amount in nanoMCM
 * @returns {Object} MDST structure with tag, ref, and amount buffers
 */
function createMDST(accountTag, memo, amount) {
  if (!accountTag || accountTag.length !== 40) {
    throw new Error('Destination account tag must be 40 hex characters (20 bytes)');
  }

  if (!validateReference(memo)) {
    throw new Error('Invalid memo format (max 16 chars: A-Z, 0-9, dash)');
  }

  // Account Tag is 20 bytes (ACCOUNT_TAG_LEN)
  const tagBytes = Buffer.from(accountTag, 'hex');
  if (tagBytes.length !== ACCOUNT_TAG_LEN) {
    throw new Error(`Destination account tag decoded to ${tagBytes.length} bytes, expected ${ACCOUNT_TAG_LEN}`);
  }

  // Ref is 16 bytes (ACCOUNT_REF_LEN) - pad with zeros
  const refBytes = Buffer.alloc(ACCOUNT_REF_LEN);
  if (memo) {
    Buffer.from(memo, 'utf8').copy(refBytes, 0);
  }

  // Amount is 8 bytes little-endian uint64
  const amountBytes = Buffer.alloc(TX_AMOUNT);
  amountBytes.writeBigUInt64LE(BigInt(amount), 0);

  return {
    tag: tagBytes,      // 20 bytes (Account Tag)
    ref: refBytes,      // 16 bytes (memo/reference)
    amount: amountBytes // 8 bytes
  };
}

/**
 * Creates a transaction header (TXHDR)
 *
 * @param {Buffer} srcLedgerAddr - Source ledger address (40 bytes: Account Tag + DSA Hash)
 * @param {Buffer} chgLedgerAddr - Change ledger address (40 bytes: Account Tag + DSA Hash)
 * @param {number|bigint} sendTotal - Total amount to send
 * @param {number|bigint} changeTotal - Total change amount
 * @param {number|bigint} feeTotal - Total fee amount
 * @param {number} blkToLive - Blocks to live (0 for default)
 * @returns {Object} Transaction header structure
 */
function createTXHDR(srcLedgerAddr, chgLedgerAddr, sendTotal, changeTotal, feeTotal, blkToLive = 0) {
  const options = Buffer.alloc(4);
  options[0] = TXDAT_MDST;
  options[1] = TXDSA_WOTS;
  options[2] = 0; // destination count - 1 (will be set later)
  options[3] = 0; // reserved

  const sendTotalBuf = Buffer.alloc(TX_AMOUNT);
  sendTotalBuf.writeBigUInt64LE(BigInt(sendTotal), 0);

  const changeTotalBuf = Buffer.alloc(TX_AMOUNT);
  changeTotalBuf.writeBigUInt64LE(BigInt(changeTotal), 0);

  const feeTotalBuf = Buffer.alloc(TX_AMOUNT);
  feeTotalBuf.writeBigUInt64LE(BigInt(feeTotal), 0);

  const blkToLiveBuf = Buffer.alloc(8);
  blkToLiveBuf.writeBigUInt64LE(BigInt(blkToLive), 0);

  return {
    options,
    srcAddr: srcLedgerAddr,
    chgAddr: chgLedgerAddr,
    sendTotal: sendTotalBuf,
    changeTotal: changeTotalBuf,
    feeTotal: feeTotalBuf,
    blkToLive: blkToLiveBuf
  };
}

/**
 * Serializes transaction components to buffers
 */
function serializeTXHDR(hdr) {
  return Buffer.concat([
    hdr.options,
    hdr.srcAddr,
    hdr.chgAddr,
    hdr.sendTotal,
    hdr.changeTotal,
    hdr.feeTotal,
    hdr.blkToLive
  ]);
}

function serializeTXDAT(destinations) {
  const buffers = [];
  for (const dst of destinations) {
    buffers.push(dst.tag);
    buffers.push(dst.ref);
    buffers.push(dst.amount);
  }
  return Buffer.concat(buffers);
}

function serializeTXDSA(dsa) {
  return Buffer.concat([
    dsa.signature,
    dsa.pubSeed,
    dsa.adrs
  ]);
}

function serializeTXTLR(tlr) {
  return Buffer.concat([
    tlr.nonce,
    tlr.id
  ]);
}

/**
 * Create and sign a Mochimo transaction
 *
 * IMPORTANT: Mochimo uses Account Tags for account persistence across WOTS+ signatures.
 * - For first-time accounts (implicit tag): Account Tag equals the DSA PK hash
 * - For subsequent transactions: Account Tag persists from source to change
 * - The source Account Tag MUST move to the change account to maintain account binding
 *
 * @param {Object} params - Transaction parameters
 * @param {string} params.srcTag - Source account tag (40 hex characters = 20 bytes). This is the persistent account identifier that MUST move to the change account.
 * @param {string} params.sourcePk - Source DSA public key (4416 hex characters = 2208 bytes)
 * @param {string} params.changePk - Change DSA public key (4416 hex characters = 2208 bytes) - NEW WOTS+ key for next transaction
 * @param {number|bigint} params.balance - Source account balance in nanoMCM
 * @param {string} params.dstAccountTag - Destination account tag only (40 hex characters = 20 bytes)
 * @param {number|bigint} params.amount - Amount to send in nanoMCM
 * @param {string} params.secret - Secret key for signing (64 hex characters)
 * @param {string} [params.memo=''] - Transaction memo (max 16 characters)
 * @param {number} [params.fee=500] - Transaction fee in nanoMCM
 * @param {number} [params.blkToLive=0] - Blocks to live (0 for default)
 * @returns {Object} Transaction object with hex data and metadata
 *
 * @example
 * // First transaction from implicit account (Account Tag == DSA Hash)
 * const tx = createTransaction({
 *   srcTag: 'ab8599ef698c629d499909917d15c291dddc2760', // Account Tag from ledger
 *   sourcePk: sourceKeypair.publicKey,
 *   changePk: changeKeypair.publicKey, // New WOTS+ key
 *   balance: 10000,
 *   dstAccountTag: 'bef52f1f806bf3ecc2f837ba2555d34972793e4b',
 *   amount: 5000,
 *   secret: sourceKeypair.secretKey,
 *   memo: 'PAYMENT',
 *   fee: 500
 * });
 * // Result: Change ledger entry will be srcTag + changePk DSA hash
 */
export function createTransaction(params) {
  const {
    srcTag,
    sourcePk,
    changePk,
    balance,
    dstAccountTag,
    dstAddress,  // Legacy parameter from v1.1.0
    amount,
    secret,
    memo = '',
    fee = 500,
    blkToLive = 0
  } = params;

  // === COMPREHENSIVE INPUT VALIDATION ===

  // Support legacy dstAddress parameter (v1.1.0 compatibility)
  const destinationTag = dstAccountTag || dstAddress;

  // Validate source account tag (persistent identifier)
  let srcTagBytes;
  try {
    srcTagBytes = validateAccountTag(srcTag, 'srcTag');
  } catch (error) {
    throw new Error(`Invalid source account tag: ${error.message}\n` +
      `HINT: srcTag must be the 20-byte persistent account identifier (40 hex chars). ` +
      `Extract it from your source ledger address using the first 20 bytes.`);
  }

  // Validate source public key
  if (!sourcePk || typeof sourcePk !== 'string') {
    throw new Error('sourcePk must be a hex string');
  }
  if (!/^[0-9a-fA-F]+$/.test(sourcePk)) {
    throw new Error('sourcePk must contain only hexadecimal characters');
  }
  if (sourcePk.length !== 4416) {
    throw new Error(`sourcePk must be 4416 hex characters (2208 bytes), got ${sourcePk.length} characters`);
  }

  // Validate change public key
  if (!changePk || typeof changePk !== 'string') {
    throw new Error('changePk must be a hex string');
  }
  if (!/^[0-9a-fA-F]+$/.test(changePk)) {
    throw new Error('changePk must contain only hexadecimal characters');
  }
  if (changePk.length !== 4416) {
    throw new Error(`changePk must be 4416 hex characters (2208 bytes), got ${changePk.length} characters`);
  }

  // Validate balance and amounts
  const balanceNum = BigInt(balance);
  const amountNum = BigInt(amount);
  const feeNum = BigInt(fee);

  if (balanceNum <= 0n) {
    throw new Error('balance must be greater than zero');
  }
  if (amountNum <= 0n) {
    throw new Error('amount must be greater than zero');
  }
  if (feeNum < 0n) {
    throw new Error('fee cannot be negative');
  }
  if (balanceNum < amountNum + feeNum) {
    const needed = amountNum + feeNum;
    const shortfall = needed - balanceNum;
    throw new Error(`Insufficient balance: need ${needed} nanoMCM (${amount} send + ${fee} fee), ` +
      `have ${balance} nanoMCM, short ${shortfall} nanoMCM`);
  }

  // Validate destination account tag (20 bytes)
  let dstTagBytes;
  try {
    dstTagBytes = validateAccountTag(destinationTag, 'dstAccountTag');
  } catch (error) {
    throw new Error(`Invalid destination account tag: ${error.message}\n` +
      `HINT: dstAccountTag should be the 20-byte account tag (40 hex chars), not the full 40-byte ledger address. ` +
      `For Base58 addresses, decode and extract the first 20 bytes.`);
  }

  // Validate secret key
  if (!secret || typeof secret !== 'string') {
    throw new Error('secret must be a hex string');
  }
  if (!/^[0-9a-fA-F]+$/.test(secret)) {
    throw new Error('secret must contain only hexadecimal characters');
  }
  if (secret.length !== 64) {
    throw new Error(`secret must be 64 hex characters (32 bytes), got ${secret.length} characters`);
  }

  // Validate memo if provided
  if (memo && !validateReference(memo)) {
    throw new Error(`Invalid memo format: "${memo}"\n` +
      `RULES: Max 16 chars, uppercase A-Z, digits 0-9, dash (-)\n` +
      `Groups of letters and groups of numbers must be separated by dashes\n` +
      `Valid examples: "ABC-123", "123-ABC", "AB-12-CD"\n` +
      `Invalid examples: "ABC-XYZ" (two letter groups), "123-456" (two number groups)`);
  }

  // === END VALIDATION ===

  // Extract WOTS public key (first 2144 bytes = 4288 hex chars)
  const srcWotsPk = sourcePk.substring(0, 4288);
  const chgWotsPk = changePk.substring(0, 4288);

  // Get source ledger address (40 bytes: Account Tag + DSA Hash)
  // srcTag parameter provides the Account Tag, addrFromWots provides DSA Hash
  const srcWotsDsaHash = addrFromWots(Buffer.from(srcWotsPk, 'hex'));
  // srcTagBytes already created during validation above

  // Source ledger address: user-provided Account Tag + WOTS DSA hash
  const srcLedgerAddrBuf = Buffer.alloc(40);
  srcTagBytes.copy(srcLedgerAddrBuf, 0);  // First 20 bytes: Account Tag
  srcWotsDsaHash.subarray(0, 20).copy(srcLedgerAddrBuf, 20);  // Last 20 bytes: DSA hash

  // Change ledger address: SAME Account Tag as source + NEW WOTS DSA hash
  const chgWotsDsaHash = addrFromWots(Buffer.from(chgWotsPk, 'hex'));
  const chgLedgerAddrBuf = Buffer.alloc(40);
  srcTagBytes.copy(chgLedgerAddrBuf, 0);  // First 20 bytes: SAME Account Tag as source (tag moves!)
  chgWotsDsaHash.subarray(0, 20).copy(chgLedgerAddrBuf, 20);  // Last 20 bytes: NEW DSA hash

  const srcLedgerAddr = srcLedgerAddrBuf.toString('hex');
  const chgLedgerAddr = chgLedgerAddrBuf.toString('hex');

  // CRITICAL VALIDATION: Change account MUST be explicit (Account Tag ≠ DSA Hash)
  // Per Mochimo protocol (txval.c), change accounts cannot be implicit
  const chgTag = chgLedgerAddrBuf.subarray(0, 20).toString('hex');
  const chgDsa = chgLedgerAddrBuf.subarray(20, 40).toString('hex');
  if (chgTag === chgDsa) {
    throw new Error(
      'Invalid change account: Change account cannot be implicit (Account Tag == DSA Hash).\n' +
      'Change accounts MUST be explicit per Mochimo protocol.\n' +
      `Change Account Tag: ${chgTag}\n` +
      `Change DSA Hash: ${chgDsa}\n` +
      'This usually means you are reusing a previously used WOTS+ public key.\n' +
      'Generate a fresh WOTS+ key pair for the change account.'
    );
  }

  // Calculate change amount
  const changeAmount = balance - amount - fee;

  // Create transaction header
  const hdr = createTXHDR(
    Buffer.from(srcLedgerAddr, 'hex'),
    Buffer.from(chgLedgerAddr, 'hex'),
    amount,
    changeAmount,
    fee,
    blkToLive
  );

  // Create destination
  const destinations = [createMDST(destinationTag, memo, amount)];

  // Set destination count in header
  hdr.options[2] = destinations.length - 1;

  // Calculate message to sign (SHA-256 of header + data)
  const hdrBytes = serializeTXHDR(hdr);
  const datBytes = serializeTXDAT(destinations);
  const message = crypto.createHash('sha256').update(Buffer.concat([hdrBytes, datBytes])).digest();

  // Sign the message
  const secretBytes = Buffer.from(secret, 'hex');
  const keypair = keygen(secretBytes);

  // Verify that the public key DSA matches the source ledger address DSA (last 20 bytes)
  const derivedWotsDsaHash = addrFromWots(keypair.publicKey);
  const derivedDsa = derivedWotsDsaHash.subarray(20, 40).toString('hex');  // Use bytes 20-39 (DSA hash portion)
  const srcDsa = srcLedgerAddrBuf.subarray(20, 40).toString('hex');
  if (derivedDsa !== srcDsa) {
    throw new Error('DSA PK hash derived from secret does not match source ledger address DSA hash');
  }

  const signature = sign(message, keypair);

  // Create address seed with default tag (last 12 bytes)
  const addrSeedWithTag = Buffer.alloc(WOTS_ADDR_LEN);
  keypair.components.addrSeed.copy(addrSeedWithTag, 0, 0, 20);
  Buffer.from([0x42, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00])
    .copy(addrSeedWithTag, 20);

  // Create DSA structure
  const dsa = {
    signature,
    pubSeed: keypair.components.publicSeed,
    adrs: addrSeedWithTag
  };

  // Create trailer
  const tlr = {
    nonce: Buffer.alloc(8),         // Nonce is 0 for offline transactions
    id: Buffer.alloc(HASHLEN)       // ID will be filled by network
  };

  // Serialize complete transaction
  const txBytes = Buffer.concat([
    serializeTXHDR(hdr),
    serializeTXDAT(destinations),
    serializeTXDSA(dsa),
    serializeTXTLR(tlr)
  ]);

  return {
    transaction: txBytes,
    transactionHex: txBytes.toString('hex'),
    transactionBase64: txBytes.toString('base64'),
    messageHash: message.toString('hex'),
    sourceLedgerAddress: srcLedgerAddr,
    changeLedgerAddress: chgLedgerAddr,
    destinationAccountTag: destinationTag,
    sendAmount: amount,
    changeAmount,
    fee,
    size: txBytes.length
  };
}

/**
 * Sign a transaction (alias for createTransaction)
 * Provided for API consistency
 */
export function signTransaction(params) {
  return createTransaction(params);
}

/**
 * Serialize transaction to hex format
 *
 * @param {Object} transaction - Transaction object from createTransaction()
 * @returns {string} Transaction as hex string
 */
export function serializeTransaction(transaction) {
  if (transaction.transactionHex) {
    return transaction.transactionHex;
  }
  if (Buffer.isBuffer(transaction.transaction)) {
    return transaction.transaction.toString('hex');
  }
  throw new Error('Invalid transaction object');
}
