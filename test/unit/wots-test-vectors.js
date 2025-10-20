/**
 * WOTS+ Test Vectors for Mochimo Implementation
 *
 * These test vectors are generated from the reference Go implementation
 * using github.com/NickP005/WOTS-Go
 *
 * All values are hex-encoded strings for easy comparison and portability.
 * These vectors ensure long-term compatibility and can be used for:
 * - Regression testing
 * - Cross-implementation validation
 * - Reference implementation verification
 *
 * Generated: 2025-10-12
 * Winternitz Parameter: w=16
 * Hash Function: SHA256
 */

export const WOTS_TEST_VECTORS = [
  {
    name: 'Sequential Seed (0x00-0x1F)',
    description: 'Test with incrementing byte values from 0x00 to 0x1F',
    seed: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
    components: {
      privateSeed: '2cdf53d3e63a021a895b2ea8397b2f1d5ee12a9dae0eb4ebd9e2c33b2a517811',
      publicSeed: 'fa8564d4667d4f1bf130e0b6ae2c267cbe0bcf113a915c0b9e8082525ec31c1b',
      addrSeed: 'fa83b390a063642b71b64e25da39e1b3aa35cbf9ea3a8b39c77cd4a9ccf76d48'
    },
    publicKey: {
      length: 2144,
      firstBytes: 'edd0ad035adf12b83227aa5f86918015f6c49da5560936ed31e3498f540f4a348e8bec4b05b1e556f645422c97e0843e129b8c8810d9a4b1c970cf99cffef3a6',
      lastBytes: 'cda1e98234ba42e1e1de08199b419fd7929d8f0fc248ee1c1c0e7fbff796d9e6bac4651df67e5c09591f3d557ecc11e54b004456f91bced00132983859665bba'
    },
    signature: {
      message: 'fffefdfcfbfaf9f8f7f6f5f4f3f2f1f0efeeedecebeae9e8e7e6e5e4e3e2e1e0',
      length: 2144,
      firstBytes: 'edd0ad035adf12b83227aa5f86918015f6c49da5560936ed31e3498f540f4a348e8bec4b05b1e556f645422c97e0843e129b8c8810d9a4b1c970cf99cffef3a6',
      lastBytes: 'b7046784d08995e98d881c7033c2745e6053668357238103a26c5f0ae5fe5dff837e07a2a81841fe86af21623decbf2765e14c8e64a4f9e24f08b647ae5c64b9',
      isValid: true
    }
  },
  {
    name: 'Pattern Seed ((i*7+13)%256)',
    description: 'Test with mathematical pattern seed generation',
    seed: '0d141b222930373e454c535a61686f767d848b9299a0a7aeb5bcc3cad1d8dfe6',
    components: {
      privateSeed: '2892705c2f8b516321a578c4a307838c3886d22f02e3973786d0ecddedfa5ae3',
      publicSeed: 'e09ed3333a25ec51822035e15c9033232aa9da678ae212f89f4ee7105ae80b3d',
      addrSeed: '0174f50c94560791e961b4af1eeef2c380f660a8e50d0a3d9cd02041f103b13e'
    },
    publicKey: {
      length: 2144,
      firstBytes: 'ab1ab7bb43322b0d0ae47b81e11158ebc09f438c44a8d31b07d11939396adfe5655c4092efd3435ebe78a23db5afa4dd46ebdb4c4ebda9c761b3bfd7a9ae4d17',
      lastBytes: null // Not captured in reference test
    }
  },
  {
    name: 'All Zeros Seed',
    description: 'Test with seed containing all zero bytes',
    seed: '0000000000000000000000000000000000000000000000000000000000000000',
    components: {
      privateSeed: 'd946a8cb7816cc2df74220a5240743725e6887bbdd7118d3f055e0069d66b7e6',
      publicSeed: 'e91fbaa1089e91c5b2e8c781e1602f97db2591423c11baffb70fa2118d204339',
      addrSeed: '01dd935548226652b4f0f29e5bb6d62d900f794019e7fca1e6c3426c9ee2dec6'
    },
    publicKey: {
      length: 2144,
      firstBytes: '7adab3007c3d9c99abf5439f72f06545710963c8f531d4b6b1d3ae65c31172d9d14ed65d81b21fd67d4de9eb8fe1757da4c55e16eb3cfdb11377fe9a55a51480',
      lastBytes: null
    }
  },
  {
    name: 'All Ones Seed (0xFF)',
    description: 'Test with seed containing all 0xFF bytes',
    seed: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    components: {
      privateSeed: 'f84009264c33fc1423e6d66fc6be92b1cf30a02590af991a44577e3da4022000',
      publicSeed: '037189e94eb47fd30b082ae0e9f75b697d4174ed847745f119f5d9a9138ecd7f',
      addrSeed: '33580eb7aa5132587712f6ce411055236ae7d5b863cd43bcbebd9b2c8303b1ad'
    },
    publicKey: {
      length: 2144,
      firstBytes: '50e62d03cfa7d7c3bdd9cfe944b5d9b0738573d8ffe9afc9e202a79e9221bdc10787e91dc9e84397071ba4793edf79b5ae95f8b01b5872aeabaae15ff9a34a1e',
      lastBytes: null
    }
  }
];

/**
 * Internal hash function test vectors
 * These are extracted from C implementation debug output
 */
export const INTERNAL_TEST_VECTORS = {
  prf: {
    description: 'PRF (Pseudorandom Function) test with sequential seed components',
    input: {
      addrSeed: 'fa83b390a063642b71b64e25da39e1b3aa35cbf9ea3a8b39c77cd4a9ccf76d48',
      publicSeed: 'fa8564d4667d4f1bf130e0b6ae2c267cbe0bcf113a915c0b9e8082525ec31c1b',
      addrArray: [
        0xfa83b390, // addr[0] in little-endian becomes 90b383fa in big-endian bytes
        0xa063642b, // addr[1] in little-endian becomes 2b6463a0 in big-endian bytes
        0x71b64e25,
        0xda39e1b3,
        0xaa35cbf9,
        0xea3a8b39,
        0xc77cd4a9,
        0x00000000  // addr[7] = key_and_mask = 0
      ]
    },
    expected: {
      addrBytes_0_7: '90 b3 83 fa 2b 64 63 a0',
      addrBytes_20_27: '00 00 00 00 00 00 00 00',
      addrBytes_28_31: '00 00 00 00',
      key_0_7: '29 81 bd cb 1f d2 f2 74',
      addrBytes_28_31_after_set1: '00 00 00 01',
      bitmask_0_7: '5f 2e 43 43 90 ae ae 2c'
    }
  }
};

/**
 * Helper function to convert hex string to Buffer
 * @param {string} hex - Hex string
 * @returns {Buffer}
 */
export function hexToBuffer(hex) {
  return Buffer.from(hex, 'hex');
}

/**
 * Helper function to get a specific test vector by name
 * @param {string} name - Name of the test vector
 * @returns {object|null}
 */
export function getTestVector(name) {
  return WOTS_TEST_VECTORS.find(v => v.name === name) || null;
}

/**
 * Validate that a WOTS implementation produces correct outputs
 * @param {object} impl - WOTS implementation with componentsGenerator, keygen, sign, verify functions
 * @param {object} vector - Test vector to validate against
 * @returns {object} - Validation results
 */
export function validateImplementation(impl, vector) {
  const seed = hexToBuffer(vector.seed);

  // Test components generation
  const components = impl.componentsGenerator(seed);
  const componentsMatch = {
    privateSeed: components.privateSeed.toString('hex') === vector.components.privateSeed,
    publicSeed: components.publicSeed.toString('hex') === vector.components.publicSeed,
    addrSeed: components.addrSeed.toString('hex') === vector.components.addrSeed
  };

  // Test keypair generation
  const keypair = impl.keygen(seed);
  const publicKeyMatch = {
    length: keypair.publicKey.length === vector.publicKey.length,
  firstBytes: keypair.publicKey.subarray(0, 64).toString('hex') === vector.publicKey.firstBytes,
    lastBytes: vector.publicKey.lastBytes ?
  keypair.publicKey.subarray(keypair.publicKey.length - 64).toString('hex') === vector.publicKey.lastBytes :
      null
  };

  // Test signing (if signature test vector exists)
  let signatureMatch = null;
  if (vector.signature) {
    const message = hexToBuffer(vector.signature.message);
    const signature = impl.sign(message, keypair);
    const isValid = impl.verify(message, signature, keypair);

    signatureMatch = {
      length: signature.length === vector.signature.length,
  firstBytes: signature.subarray(0, 64).toString('hex') === vector.signature.firstBytes,
  lastBytes: signature.subarray(signature.length - 64).toString('hex') === vector.signature.lastBytes,
      verifies: isValid === vector.signature.isValid
    };
  }

  return {
    vector: vector.name,
    componentsMatch,
    publicKeyMatch,
    signatureMatch,
    allPassed: Object.values(componentsMatch).every(v => v) &&
               Object.values(publicKeyMatch).every(v => v === true || v === null) &&
               (signatureMatch ? Object.values(signatureMatch).every(v => v) : true)
  };
}

export default WOTS_TEST_VECTORS;
