/**
 * Account and Ledger Address Utility Functions for Mochimo SDK
 *
 * TERMINOLOGY GUIDE:
 * - Account: The persistent user identity in Mochimo
 * - Account Tag: 20-byte persistent identifier (what users think of as their account number)
 * - DSA PK: WOTS+ Digital Signature Algorithm public key (one-time use, changes each transaction)
 * - DSA PK Hash (DSA Hash): 20-byte hash of the DSA PK
 * - Ledger Address: 40-byte entry on the blockchain (Account Tag + DSA PK Hash)
 *
 * Mochimo ledger addresses are 40 bytes (80 hex chars):
 * - First 20 bytes: Account Tag (persistent identifier)
 * - Last 20 bytes: DSA PK Hash (WOTS+ public key hash, changes each spend)
 */

/**
 * Validate a Mochimo ledger address format (full 40-byte entry)
 * @param {string|Buffer} ledgerAddress - Ledger address to validate
 * @param {string} name - Parameter name for error messages
 * @returns {Buffer} - Validated ledger address as Buffer
 * @throws {Error} - If ledger address is invalid
 */
export function validateLedgerAddress(ledgerAddress, name = 'ledgerAddress') {
  let addrBuf;

  if (typeof ledgerAddress === 'string') {
    // Remove 0x prefix if present
    const cleanAddr = ledgerAddress.startsWith('0x') ? ledgerAddress.substring(2) : ledgerAddress;

    if (!/^[0-9a-fA-F]+$/.test(cleanAddr)) {
      throw new Error(`${name} must contain only hexadecimal characters`);
    }

    if (cleanAddr.length !== 80) {
      throw new Error(`${name} must be 80 hex characters (40 bytes), got ${cleanAddr.length} characters`);
    }

    addrBuf = Buffer.from(cleanAddr, 'hex');
  } else if (Buffer.isBuffer(ledgerAddress)) {
    if (ledgerAddress.length !== 40) {
      throw new Error(`${name} must be 40 bytes, got ${ledgerAddress.length} bytes`);
    }
    addrBuf = ledgerAddress;
  } else {
    throw new Error(`${name} must be a hex string or Buffer`);
  }

  return addrBuf;
}

/**
 * Validate an account tag (20 bytes)
 * @param {string|Buffer} accountTag - Account tag to validate
 * @param {string} name - Parameter name for error messages
 * @returns {Buffer} - Validated account tag as Buffer
 * @throws {Error} - If account tag is invalid
 */
export function validateAccountTag(accountTag, name = 'accountTag') {
  let tagBuf;

  if (typeof accountTag === 'string') {
    const cleanTag = accountTag.startsWith('0x') ? accountTag.substring(2) : accountTag;

    if (!/^[0-9a-fA-F]+$/.test(cleanTag)) {
      throw new Error(`${name} must contain only hexadecimal characters`);
    }

    if (cleanTag.length !== 40) {
      throw new Error(`${name} must be 40 hex characters (20 bytes), got ${cleanTag.length} characters`);
    }

    tagBuf = Buffer.from(cleanTag, 'hex');
  } else if (Buffer.isBuffer(accountTag)) {
    if (accountTag.length !== 20) {
      throw new Error(`${name} must be 20 bytes, got ${accountTag.length} bytes`);
    }
    tagBuf = accountTag;
  } else {
    throw new Error(`${name} must be a hex string or Buffer`);
  }

  return tagBuf;
}

/**
 * Extract the Account Tag from a full ledger address (first 20 bytes)
 * @param {string|Buffer} ledgerAddress - Full 40-byte ledger address
 * @returns {Buffer} - 20-byte account tag
 * @throws {Error} - If ledger address is invalid
 */
export function extractAccountTag(ledgerAddress) {
  const addrBuf = validateLedgerAddress(ledgerAddress, 'ledgerAddress');
  return addrBuf.subarray(0, 20);
}

/**
 * Extract the DSA PK Hash from a full ledger address (last 20 bytes)
 * @param {string|Buffer} ledgerAddress - Full 40-byte ledger address
 * @returns {Buffer} - 20-byte DSA PK hash
 * @throws {Error} - If ledger address is invalid
 */
export function extractDsaHash(ledgerAddress) {
  const addrBuf = validateLedgerAddress(ledgerAddress, 'ledgerAddress');
  return addrBuf.subarray(20, 40);
}

/**
 * Check if an account is implicitly tagged (Account Tag == DSA Hash)
 * This indicates a first-time account that has never been spent from.
 *
 * @param {string|Buffer} ledgerAddress - Full 40-byte ledger address
 * @returns {boolean} - True if implicit (first-time account)
 */
export function isImplicitAccount(ledgerAddress) {
  const addrBuf = validateLedgerAddress(ledgerAddress, 'ledgerAddress');
  const accountTag = addrBuf.slice(0, 20);
  const dsaHash = addrBuf.slice(20, 40);
  return accountTag.equals(dsaHash);
}

/**
 * Construct a full ledger address from Account Tag and DSA Hash components
 * @param {string|Buffer} accountTag - 20-byte account tag
 * @param {string|Buffer} dsaHash - 20-byte DSA PK hash
 * @returns {Buffer} - 40-byte full ledger address
 * @throws {Error} - If components are invalid
 */
export function constructLedgerAddress(accountTag, dsaHash) {
  const tagBuf = validateAccountTag(accountTag, 'accountTag');
  const dsaBuf = validateAccountTag(dsaHash, 'dsaHash');

  const ledgerAddress = Buffer.alloc(40);
  tagBuf.copy(ledgerAddress, 0);
  dsaBuf.copy(ledgerAddress, 20);

  return ledgerAddress;
}

/**
 * Format ledger address for display (with 0x prefix)
 * @param {string|Buffer} ledgerAddress - Ledger address to format
 * @returns {string} - Formatted hex string with 0x prefix
 */
export function formatLedgerAddress(ledgerAddress) {
  const addrBuf = validateLedgerAddress(ledgerAddress, 'ledgerAddress');
  return '0x' + addrBuf.toString('hex');
}

/**
 * Get human-readable account and ledger address info
 * @param {string|Buffer} ledgerAddress - Full 40-byte ledger address
 * @returns {Object} - Address components and metadata
 */
export function getAccountInfo(ledgerAddress) {
  const addrBuf = validateLedgerAddress(ledgerAddress, 'ledgerAddress');
  const accountTag = addrBuf.slice(0, 20);
  const dsaHash = addrBuf.slice(20, 40);
  const implicit = accountTag.equals(dsaHash);

  return {
    fullLedgerAddress: addrBuf.toString('hex'),
    accountTag: accountTag.toString('hex'),
    dsaHash: dsaHash.toString('hex'),
    implicit: implicit,
    accountType: implicit ? 'implicit (first-time, never spent)' : 'explicit (previously spent)',
    formatted: '0x' + addrBuf.toString('hex')
  };
}
