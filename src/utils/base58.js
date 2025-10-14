import bs58 from 'bs58';
import { crc16xmodem } from 'crc';

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
    const decoded = bs58.decode(addr);
    if (decoded.length !== 22) {
      return false;
    }

    // Get stored checksum (little-endian)
    const storedCsum = (decoded[21] << 8) | decoded[20];

    // Calculate CRC on tag portion using XMODEM
    const actualCrc = crc16xmodem(decoded.slice(0, 20));

    return storedCsum === actualCrc;
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
  const decoded = bs58.decode(addr);
  if (decoded.length !== 22) {
    throw new Error('Invalid base58 tag length');
  }
  return Buffer.from(decoded.slice(0, 20));
}
