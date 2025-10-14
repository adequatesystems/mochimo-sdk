/**
 * Address utility functions for Mochimo SDK
 *
 * Mochimo ledger addresses are 40 bytes (80 hex chars):
 * - First 20 bytes: TAG (account identifier that persists)
 * - Last 20 bytes: DSA (WOTS+ public key hash)
 */

/**
 * Validate a Mochimo address format
 * @param {string|Buffer} address - Address to validate
 * @param {string} name - Parameter name for error messages
 * @returns {Buffer} - Validated address as Buffer
 * @throws {Error} - If address is invalid
 */
export function validateAddress(address, name = 'address') {
  let addrBuf;

  if (typeof address === 'string') {
    // Remove 0x prefix if present
    const cleanAddr = address.startsWith('0x') ? address.slice(2) : address;

    if (!/^[0-9a-fA-F]+$/.test(cleanAddr)) {
      throw new Error(`${name} must contain only hexadecimal characters`);
    }

    if (cleanAddr.length !== 80) {
      throw new Error(`${name} must be 80 hex characters (40 bytes), got ${cleanAddr.length} characters`);
    }

    addrBuf = Buffer.from(cleanAddr, 'hex');
  } else if (Buffer.isBuffer(address)) {
    if (address.length !== 40) {
      throw new Error(`${name} must be 40 bytes, got ${address.length} bytes`);
    }
    addrBuf = address;
  } else {
    throw new Error(`${name} must be a hex string or Buffer`);
  }

  return addrBuf;
}

/**
 * Validate an address tag (20 bytes)
 * @param {string|Buffer} tag - Tag to validate
 * @param {string} name - Parameter name for error messages
 * @returns {Buffer} - Validated tag as Buffer
 * @throws {Error} - If tag is invalid
 */
export function validateTag(tag, name = 'tag') {
  let tagBuf;

  if (typeof tag === 'string') {
    const cleanTag = tag.startsWith('0x') ? tag.slice(2) : tag;

    if (!/^[0-9a-fA-F]+$/.test(cleanTag)) {
      throw new Error(`${name} must contain only hexadecimal characters`);
    }

    if (cleanTag.length !== 40) {
      throw new Error(`${name} must be 40 hex characters (20 bytes), got ${cleanTag.length} characters`);
    }

    tagBuf = Buffer.from(cleanTag, 'hex');
  } else if (Buffer.isBuffer(tag)) {
    if (tag.length !== 20) {
      throw new Error(`${name} must be 20 bytes, got ${tag.length} bytes`);
    }
    tagBuf = tag;
  } else {
    throw new Error(`${name} must be a hex string or Buffer`);
  }

  return tagBuf;
}

/**
 * Extract the TAG portion from a full address (first 20 bytes)
 * @param {string|Buffer} address - Full 40-byte address
 * @returns {Buffer} - 20-byte tag
 * @throws {Error} - If address is invalid
 */
export function extractTag(address) {
  const addrBuf = validateAddress(address, 'address');
  return addrBuf.slice(0, 20);
}

/**
 * Extract the DSA portion from a full address (last 20 bytes)
 * @param {string|Buffer} address - Full 40-byte address
 * @returns {Buffer} - 20-byte DSA hash
 * @throws {Error} - If address is invalid
 */
export function extractDsa(address) {
  const addrBuf = validateAddress(address, 'address');
  return addrBuf.slice(20, 40);
}

/**
 * Check if an address is implicitly tagged (TAG == DSA)
 * @param {string|Buffer} address - Full 40-byte address
 * @returns {boolean} - True if implicit (first-time address)
 */
export function isImplicitAddress(address) {
  const addrBuf = validateAddress(address, 'address');
  const tag = addrBuf.slice(0, 20);
  const dsa = addrBuf.slice(20, 40);
  return tag.equals(dsa);
}

/**
 * Construct a full address from tag and DSA components
 * @param {string|Buffer} tag - 20-byte tag
 * @param {string|Buffer} dsa - 20-byte DSA hash
 * @returns {Buffer} - 40-byte full address
 * @throws {Error} - If components are invalid
 */
export function constructAddress(tag, dsa) {
  const tagBuf = validateTag(tag, 'tag');
  const dsaBuf = validateTag(dsa, 'dsa');

  const address = Buffer.alloc(40);
  tagBuf.copy(address, 0);
  dsaBuf.copy(address, 20);

  return address;
}

/**
 * Format address for display (with 0x prefix)
 * @param {string|Buffer} address - Address to format
 * @returns {string} - Formatted hex string with 0x prefix
 */
export function formatAddress(address) {
  const addrBuf = validateAddress(address, 'address');
  return '0x' + addrBuf.toString('hex');
}

/**
 * Get human-readable address info
 * @param {string|Buffer} address - Full 40-byte address
 * @returns {Object} - Address components and metadata
 */
export function getAddressInfo(address) {
  const addrBuf = validateAddress(address, 'address');
  const tag = addrBuf.slice(0, 20);
  const dsa = addrBuf.slice(20, 40);
  const implicit = tag.equals(dsa);

  return {
    full: addrBuf.toString('hex'),
    tag: tag.toString('hex'),
    dsa: dsa.toString('hex'),
    implicit: implicit,
    type: implicit ? 'implicit (first-time)' : 'explicit (tagged)',
    formatted: '0x' + addrBuf.toString('hex')
  };
}
