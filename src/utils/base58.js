import bs58 from 'bs58';
import { crc16xmodem } from 'crc';

/**
 * Utility functions for base58 encoding/decoding of Mochimo addresses.
 * Use these to convert between user-facing (base58+CRC) and backend (hex/binary) formats.
 */

/**
 * Parse a Mochimo Base58 address and expose its components.
 * Returns the raw 20-byte tag, the checksum embedded in the payload,
 * and whether that checksum matches the CRC16-XMODEM of the tag.
 *
 * @param {string} addr - Base58-encoded account tag with checksum
 * @returns {{tag: Buffer, storedChecksum: number, isChecksumValid: boolean}}
 * @throws {Error} If the address is not 22 bytes once decoded
 */
export function deconstructBase58Tag(addr) {
  const decoded = bs58.decode(addr);
  if (decoded.length !== 22) {
    throw new Error('Invalid base58 tag length');
  }

  // Deconstruct and return elements
  const tag = Buffer.from(decoded.subarray(0, 20));
  const storedChecksum = (decoded[21] << 8) | decoded[20];
  const isChecksumValid = storedChecksum === crc16xmodem(tag);

  return {
    tag,
    storedChecksum,
    isChecksumValid,
  };
}

/**
 * Convert a 20-byte address tag to base58 format with CRC16-XMODEM checksum
 * @param {Buffer} tag - 20 byte address tag
 * @returns {string} - Base58 encoded address with checksum
 */
export function addrTagToBase58(tag) {
  if (tag.length !== 20) {
    throw new Error('Invalid address tag length');
  }

  // Create combined buffer: tag (20 bytes) + checksum (2 bytes)
  const combined = Buffer.alloc(22);
  tag.copy(combined, 0);

  // Calculate CRC using XMODEM
  const crc = crc16xmodem(tag);

  // Append in little-endian
  combined[20] = crc & 0xFF;
  combined[21] = (crc >>> 8) & 0xFF;

  return bs58.encode(combined);
}

/**
 * Validate a base58 address by checking its checksum
 * @param {string} addr - Base58 address string
 * @returns {boolean} - True if valid, false otherwise
 */
export function validateBase58Tag(addr) {
  try {
    // Deconstruct and return checksum validity
    const { isChecksumValid } = deconstructBase58Tag(addr);
    return isChecksumValid;
  } catch (e) {
    return false;
  }
}

/**
 * Convert a base58 address to a 20-byte address tag
 * @param {string} addr - Base58 address string
 * @returns {Buffer} - 20 byte address tag
 */
export function base58ToAddrTag(addr) {
  const { tag, isChecksumValid } = deconstructBase58Tag(addr);

  // Validate the checksum
  if (!isChecksumValid) {
    throw new Error('Invalid base58 checksum');
  }

  return tag;
}
