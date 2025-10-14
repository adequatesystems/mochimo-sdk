import crypto from 'crypto';

/**
 * SHA3-512 hash function
 * @param {Buffer} data - Input data to hash
 * @returns {Buffer} - 64 byte hash
 */
export function sha3_512(data) {
  return crypto.createHash('sha3-512').update(data).digest();
}

/**
 * SHA256 hash function
 * @param {Buffer} data - Input data to hash
 * @returns {Buffer} - 32 byte hash
 */
export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest();
}

/**
 * RIPEMD160 hash function
 * @param {Buffer} data - Input data to hash
 * @returns {Buffer} - 20 byte hash
 */
export function ripemd160(data) {
  return crypto.createHash('ripemd160').update(data).digest();
}

/**
 * Generate Mochimo Address hash using SHA3-512 and RIPEMD160
 * @param {Buffer} input - Input data (a WOTS public key)
 * @returns {Buffer} - 20 byte address hash
 */
export function addrHashGenerate(input) {
  // First pass: SHA3-512
  const sha3Hash = sha3_512(input);
  // Second pass: RIPEMD160
  return ripemd160(sha3Hash);
}

/**
 * Convert a tag to a full 40-byte implicit address
 * In implicit addresses, both the tag and address hash are the same value
 * @param {Buffer} tag - 20 byte tag
 * @returns {Buffer} - 40 byte full address (tag repeated twice)
 */
export function addrFromImplicit(tag) {
  if (tag.length !== 20) {
    throw new Error('Tag must be 20 bytes');
  }
  // Create 40-byte address with tag in both tag and hash portions
  const addr = Buffer.alloc(40);
  tag.copy(addr, 0);   // First 20 bytes: tag
  tag.copy(addr, 20);  // Last 20 bytes: same tag
  return addr;
}

/**
 * Convert WOTS+ public key to Mochimo Address (40 bytes)
 * @param {Buffer} wots - WOTS public key (2144 bytes)
 * @returns {Buffer} - 40 byte implicit address
 */
export function addrFromWots(wots) {
  if (wots.length !== 2144) {
    throw new Error('WOTS public key must be 2144 bytes');
  }
  // Generate hash of WOTS public key (20 bytes)
  const hash = addrHashGenerate(wots);
  // Convert to implicit 40-byte address
  return addrFromImplicit(hash);
}

/**
 * Mochimo hash function (SHA256)
 * @param {Buffer} data - Input data
 * @returns {Buffer} - 32 byte hash
 */
export function mochimoHash(data) {
  return sha256(data);
}
