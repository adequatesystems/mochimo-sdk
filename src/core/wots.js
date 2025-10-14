import { sha256, mochimoHash } from './crypto.js';

// Constants from WOTS implementation (Mochimo uses w=16)
const PARAMSN = 32;  // Parameter n (hash size)
const WOTSW = 16;    // Winternitz parameter (w=16 for Mochimo)
const WOTSLEN1 = 64; // Message length in base-w
const WOTSLEN2 = 3;  // Checksum length in base-w
const WOTSLEN = WOTSLEN1 + WOTSLEN2;  // Total chain length (67)
const WOTSLOGW = 4;  // log2(w) = log2(16) = 4

// Hash padding parameters
const XMSS_HASH_PADDING_F = 0;
const XMSS_HASH_PADDING_PRF = 3;

/**
 * Converts a number to bytes in big-endian byte order
 * @param {number} value - The value to convert
 * @param {number} outlen - Number of bytes to output
 * @returns {Buffer} - Big-endian bytes
 */
function ullToBytes(value, outlen) {
  const out = Buffer.alloc(outlen);
  for (let i = outlen - 1; i >= 0; i--) {
    out[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  return out;
}

/**
 * Converts address array to bytes
 * @param {Uint32Array} addr - 8-element address array
 * @returns {Buffer} - 32-byte address as bytes
 */
function addrToBytes(addr) {
  const bytes = Buffer.alloc(32);
  for (let i = 0; i < 8; i++) {
    const word = ullToBytes(addr[i], 4);
    word.copy(bytes, i * 4);
  }
  return bytes;
}

/**
 * Sets the key_and_mask field in address
 * @param {Uint32Array} addr - Address array
 * @param {number} keyAndMask - Value to set
 */
function setKeyAndMask(addr, keyAndMask) {
  addr[7] = keyAndMask;
}

/**
 * Sets the chain address field
 * @param {Uint32Array} addr - Address array
 * @param {number} chain - Chain value
 */
function setChainAddr(addr, chain) {
  addr[5] = chain;
}

/**
 * Sets the hash address field
 * @param {Uint32Array} addr - Address array
 * @param {number} hash - Hash value
 */
function setHashAddr(addr, hash) {
  addr[6] = hash;
}

/**
 * Computes PRF(key, in) - Pseudorandom function
 * @param {Buffer} input - 32-byte input
 * @param {Buffer} key - n-byte key (32 bytes)
 * @returns {Buffer} - 32-byte output
 */
function prf(input, key) {
  const buf = Buffer.alloc(2 * PARAMSN + 32);
  ullToBytes(XMSS_HASH_PADDING_PRF, PARAMSN).copy(buf, 0);
  key.copy(buf, PARAMSN);
  input.copy(buf, 2 * PARAMSN);
  return sha256(buf);
}

/**
 * Hash function for WOTS chains
 * @param {Buffer} input - Input data (32 bytes)
 * @param {Buffer} pubSeed - Public seed (32 bytes)
 * @param {Uint32Array} addr - Address array
 * @returns {Buffer} - 32-byte hash output
 */
function thashF(input, pubSeed, addr) {
  const buf = Buffer.alloc(3 * PARAMSN);

  // Set the function padding
  ullToBytes(XMSS_HASH_PADDING_F, PARAMSN).copy(buf, 0);

  // Generate the n-byte key
  setKeyAndMask(addr, 0);
  const addrAsBytes = addrToBytes(addr);
  const key = prf(addrAsBytes, pubSeed);
  key.copy(buf, PARAMSN);

  // Generate the n-byte mask
  setKeyAndMask(addr, 1);
  const addrAsBytesForMask = addrToBytes(addr);
  const bitmask = prf(addrAsBytesForMask, pubSeed);

  // XOR input with bitmask
  for (let i = 0; i < PARAMSN; i++) {
    buf[2 * PARAMSN + i] = input[i] ^ bitmask[i];
  }

  return sha256(buf);
}

/**
 * Expands a seed into WOTSLEN seeds using PRF
 * @param {Buffer} inseed - Input seed (32 bytes)
 * @returns {Buffer} - Expanded seeds (67 * 32 bytes)
 */
function expandSeed(inseed) {
  const outseeds = Buffer.alloc(WOTSLEN * PARAMSN);

  for (let i = 0; i < WOTSLEN; i++) {
    const ctr = ullToBytes(i, 32);
    const seed = prf(ctr, inseed);
    seed.copy(outseeds, i * PARAMSN);
  }

  return outseeds;
}

/**
 * Computes a chain of hash functions
 * @param {Buffer} input - Input value (32 bytes)
 * @param {number} start - Starting position in chain
 * @param {number} steps - Number of steps to iterate
 * @param {Buffer} pubSeed - Public seed (32 bytes)
 * @param {Uint32Array} addr - Address array
 * @returns {Buffer} - Output after 'steps' iterations
 */
function genChain(input, start, steps, pubSeed, addr) {
  let out = Buffer.from(input);

  for (let i = start; i < start + steps && i < WOTSW; i++) {
    setHashAddr(addr, i);
    out = thashF(out, pubSeed, addr);
  }

  return out;
}

/**
 * Converts bytes to base-w representation
 * @param {Buffer} input - Input bytes
 * @param {number} outLen - Output length
 * @returns {number[]} - Array of base-w digits
 */
function baseW(input, outLen) {
  const output = [];
  let inIdx = 0;
  let out = 0;
  let total = 0;
  let bits = 0;

  for (let consumed = 0; consumed < outLen; consumed++) {
    if (bits === 0) {
      total = input[inIdx];
      inIdx++;
      bits += 8;
    }
    bits -= WOTSLOGW;
    output[out] = (total >>> bits) & (WOTSW - 1);
    out++;
  }

  return output;
}

/**
 * Computes checksum for WOTS
 * @param {number[]} msgBaseW - Message in base-w (64 elements for w=16)
 * @returns {number[]} - Checksum in base-w (3 elements)
 */
function wotsChecksum(msgBaseW) {
  let csum = 0;

  // Sum up (w-1 - msgBaseW[i]) for all message elements
  for (let i = 0; i < WOTSLEN1; i++) {
    csum += WOTSW - 1 - msgBaseW[i];
  }

  // Left shift: csum <<= (8 - ((WOTSLEN2 * WOTSLOGW) % 8))
  // For w=16: WOTSLEN2=3, WOTSLOGW=4, so (3*4)%8 = 12%8 = 4
  // Shift = 8-4 = 4
  csum = csum << 4;

  // Convert to bytes (need enough bytes to hold the checksum in base-w)
  // For 3 elements in base-16, we need ceil(3*4/8) = 2 bytes
  const csumBytes = Buffer.alloc(2);
  csumBytes.writeUInt16BE(csum, 0);

  // Convert to base-w (3 elements)
  const csumBaseW = baseW(csumBytes, WOTSLEN2);

  return csumBaseW;
}

/**
 * Generate WOTS+ public key from seed
 * @param {Buffer} seed - Private seed (32 bytes)
 * @param {Buffer} pubSeed - Public seed (32 bytes)
 * @param {Buffer} addr - Address seed (32 bytes)
 * @returns {Buffer} - Public key (2144 bytes)
 */
export function wotsPkgen(seed, pubSeed, addr) {
  const addrArray = new Uint32Array(8);

  // Convert addr buffer to uint32 array - NOTE: addr is used as uint32[8] in C
  // The first 20 bytes of addr are the actual address, rest is tag
  // We need to interpret it as 8 uint32 values in little-endian
  for (let i = 0; i < 8; i++) {
    addrArray[i] = addr.readUInt32LE(i * 4);
  }

  // Expand the seed
  const seeds = expandSeed(seed);

  const pk = Buffer.alloc(WOTSLEN * PARAMSN);

  // Generate public key by chaining each seed to the maximum
  for (let i = 0; i < WOTSLEN; i++) {
    setChainAddr(addrArray, i);
    const seedPart = seeds.slice(i * PARAMSN, (i + 1) * PARAMSN);
    const pkPart = genChain(seedPart, 0, WOTSW - 1, pubSeed, addrArray);
    pkPart.copy(pk, i * PARAMSN);
  }

  return pk;
}

/**
 * Sign a message using WOTS+
 * @param {Buffer} msg - Message to sign (32 bytes)
 * @param {Buffer} seed - Private seed (32 bytes)
 * @param {Buffer} pubSeed - Public seed (32 bytes)
 * @param {Buffer} addr - Address seed (32 bytes)
 * @returns {Buffer} - Signature (2144 bytes)
 */
export function wotsSign(msg, seed, pubSeed, addr) {
  const addrArray = new Uint32Array(8);

  // Convert addr buffer to uint32 array (little-endian)
  for (let i = 0; i < 8; i++) {
    addrArray[i] = addr.readUInt32LE(i * 4);
  }

  // Convert message to base-w (WOTSLEN1 elements)
  const msgBaseW = baseW(msg, WOTSLEN1);

  // Compute checksum
  const csumBaseW = wotsChecksum(msgBaseW);

  // Combine message and checksum
  const lengths = msgBaseW.concat(csumBaseW);

  // Expand the seed
  const seeds = expandSeed(seed);

  const sig = Buffer.alloc(WOTSLEN * PARAMSN);

  // Generate signature
  for (let i = 0; i < WOTSLEN; i++) {
    setChainAddr(addrArray, i);
    const seedPart = seeds.slice(i * PARAMSN, (i + 1) * PARAMSN);
    const sigPart = genChain(seedPart, 0, lengths[i], pubSeed, addrArray);
    sigPart.copy(sig, i * PARAMSN);
  }

  return sig;
}

/**
 * Verify a WOTS+ signature and recover public key
 * @param {Buffer} sig - Signature (2144 bytes)
 * @param {Buffer} msg - Message (32 bytes)
 * @param {Buffer} pubSeed - Public seed (32 bytes)
 * @param {Buffer} addr - Address seed (32 bytes)
 * @returns {Buffer} - Recovered public key (2144 bytes)
 */
export function wotsPkFromSig(sig, msg, pubSeed, addr) {
  const addrArray = new Uint32Array(8);

  // Convert addr buffer to uint32 array (little-endian)
  for (let i = 0; i < 8; i++) {
    addrArray[i] = addr.readUInt32LE(i * 4);
  }

  // Convert message to base-w (WOTSLEN1 elements)
  const msgBaseW = baseW(msg, WOTSLEN1);

  // Compute checksum
  const csumBaseW = wotsChecksum(msgBaseW);

  // Combine message and checksum
  const lengths = msgBaseW.concat(csumBaseW);

  const pk = Buffer.alloc(WOTSLEN * PARAMSN);

  // Recover public key from signature
  for (let i = 0; i < WOTSLEN; i++) {
    setChainAddr(addrArray, i);
    const sigPart = sig.slice(i * PARAMSN, (i + 1) * PARAMSN);
    const pkPart = genChain(sigPart, lengths[i], WOTSW - 1 - lengths[i], pubSeed, addrArray);
    pkPart.copy(pk, i * PARAMSN);
  }

  return pk;
}

/**
 * Components generator - derives three seeds from initial WOTS seed
 * @param {Buffer} wotsSeed - 32-byte WOTS seed
 * @returns {{privateSeed: Buffer, publicSeed: Buffer, addrSeed: Buffer}}
 */
export function componentsGenerator(wotsSeed) {
  const seedAscii = wotsSeed.toString('binary');
  const privateSeed = mochimoHash(Buffer.from(seedAscii + 'seed', 'binary'));
  const publicSeed = mochimoHash(Buffer.from(seedAscii + 'publ', 'binary'));
  const addrSeed = mochimoHash(Buffer.from(seedAscii + 'addr', 'binary'));

  return {
    privateSeed,
    publicSeed,
    addrSeed
  };
}

/**
 * Generate a WOTS+ keypair from a private key seed
 * @param {Buffer} privateKey - 32-byte private key seed
 * @returns {{publicKey: Buffer, privateKey: Buffer, components: Object}}
 */
export function keygen(privateKey) {
  const components = componentsGenerator(privateKey);
  const publicKey = wotsPkgen(components.privateSeed, components.publicSeed, components.addrSeed);

  return {
    publicKey,
    privateKey: Buffer.from(privateKey),
    components
  };
}

/**
 * Sign a message with a keypair
 * @param {Buffer} message - 32-byte message to sign
 * @param {Object} keypair - Keypair object with components
 * @returns {Buffer} - 2144-byte signature
 */
export function sign(message, keypair) {
  return wotsSign(message, keypair.components.privateSeed,
                  keypair.components.publicSeed, keypair.components.addrSeed);
}

/**
 * Verify a signature
 * @param {Buffer} message - 32-byte message
 * @param {Buffer} signature - 2144-byte signature
 * @param {Object} keypair - Keypair with publicKey and components
 * @returns {boolean} - True if signature is valid
 */
export function verify(message, signature, keypair) {
  const recoveredPk = wotsPkFromSig(signature, message,
                                     keypair.components.publicSeed,
                                     keypair.components.addrSeed);
  return recoveredPk.equals(keypair.publicKey);
}
