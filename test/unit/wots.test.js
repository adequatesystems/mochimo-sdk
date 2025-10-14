import { describe, expect, test } from '@jest/globals';
import {
  componentsGenerator,
  keygen,
  sign,
  verify
} from '../../src/core/wots.js';
import { WOTS_TEST_VECTORS, validateImplementation, hexToBuffer } from './wots-test-vectors.js';

describe('WOTS Implementation Tests - Exact Parity with Go', () => {

  describe('componentsGenerator', () => {
    test('should generate identical components for sequential seed (0x00-0x1F)', () => {
      const seed = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
        0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
      ]);

      const components = componentsGenerator(seed);

      // Expected from Go output
      expect(components.privateSeed.toString('hex')).toBe(
        '2cdf53d3e63a021a895b2ea8397b2f1d5ee12a9dae0eb4ebd9e2c33b2a517811'
      );
      expect(components.publicSeed.toString('hex')).toBe(
        'fa8564d4667d4f1bf130e0b6ae2c267cbe0bcf113a915c0b9e8082525ec31c1b'
      );
      expect(components.addrSeed.toString('hex')).toBe(
        'fa83b390a063642b71b64e25da39e1b3aa35cbf9ea3a8b39c77cd4a9ccf76d48'
      );
    });

    test('should generate identical components for different seed pattern', () => {
      const seed = Buffer.alloc(32);
      for (let i = 0; i < 32; i++) {
        seed[i] = (i * 7 + 13) % 256;
      }

      const components = componentsGenerator(seed);

      // Expected from Go output (Test 5)
      expect(components.privateSeed.toString('hex')).toBe(
        '2892705c2f8b516321a578c4a307838c3886d22f02e3973786d0ecddedfa5ae3'
      );
      expect(components.publicSeed.toString('hex')).toBe(
        'e09ed3333a25ec51822035e15c9033232aa9da678ae212f89f4ee7105ae80b3d'
      );
      expect(components.addrSeed.toString('hex')).toBe(
        '0174f50c94560791e961b4af1eeef2c380f660a8e50d0a3d9cd02041f103b13e'
      );
    });

    test('should generate identical components for all zeros seed', () => {
      const seed = Buffer.alloc(32, 0);

      const components = componentsGenerator(seed);

      // Expected from Go output (Test 6)
      expect(components.privateSeed.toString('hex')).toBe(
        'd946a8cb7816cc2df74220a5240743725e6887bbdd7118d3f055e0069d66b7e6'
      );
      expect(components.publicSeed.toString('hex')).toBe(
        'e91fbaa1089e91c5b2e8c781e1602f97db2591423c11baffb70fa2118d204339'
      );
      expect(components.addrSeed.toString('hex')).toBe(
        '01dd935548226652b4f0f29e5bb6d62d900f794019e7fca1e6c3426c9ee2dec6'
      );
    });

    test('should generate identical components for all ones seed', () => {
      const seed = Buffer.alloc(32, 0xff);

      const components = componentsGenerator(seed);

      // Expected from Go output (Test 7)
      expect(components.privateSeed.toString('hex')).toBe(
        'f84009264c33fc1423e6d66fc6be92b1cf30a02590af991a44577e3da4022000'
      );
      expect(components.publicSeed.toString('hex')).toBe(
        '037189e94eb47fd30b082ae0e9f75b697d4174ed847745f119f5d9a9138ecd7f'
      );
      expect(components.addrSeed.toString('hex')).toBe(
        '33580eb7aa5132587712f6ce411055236ae7d5b863cd43bcbebd9b2c8303b1ad'
      );
    });
  });

  describe('keygen', () => {
    test('should generate identical public key for sequential seed', () => {
      const seed = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
        0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
      ]);

      const keypair = keygen(seed);

      expect(keypair.publicKey.length).toBe(2144);

      // Check first 64 bytes
      expect(keypair.publicKey.slice(0, 64).toString('hex')).toBe(
        'edd0ad035adf12b83227aa5f86918015f6c49da5560936ed31e3498f540f4a348e8bec4b05b1e556f645422c97e0843e129b8c8810d9a4b1c970cf99cffef3a6'
      );

      // Check last 64 bytes
      expect(keypair.publicKey.slice(-64).toString('hex')).toBe(
        'cda1e98234ba42e1e1de08199b419fd7929d8f0fc248ee1c1c0e7fbff796d9e6bac4651df67e5c09591f3d557ecc11e54b004456f91bced00132983859665bba'
      );
    });

    test('should generate identical public key for different seed pattern', () => {
      const seed = Buffer.alloc(32);
      for (let i = 0; i < 32; i++) {
        seed[i] = (i * 7 + 13) % 256;
      }

      const keypair = keygen(seed);

      // Check first 64 bytes (Test 5)
      expect(keypair.publicKey.slice(0, 64).toString('hex')).toBe(
        'ab1ab7bb43322b0d0ae47b81e11158ebc09f438c44a8d31b07d11939396adfe5655c4092efd3435ebe78a23db5afa4dd46ebdb4c4ebda9c761b3bfd7a9ae4d17'
      );
    });

    test('should generate identical public key for all zeros seed', () => {
      const seed = Buffer.alloc(32, 0);

      const keypair = keygen(seed);

      // Check first 64 bytes (Test 6)
      expect(keypair.publicKey.slice(0, 64).toString('hex')).toBe(
        '7adab3007c3d9c99abf5439f72f06545710963c8f531d4b6b1d3ae65c31172d9d14ed65d81b21fd67d4de9eb8fe1757da4c55e16eb3cfdb11377fe9a55a51480'
      );
    });

    test('should generate identical public key for all ones seed', () => {
      const seed = Buffer.alloc(32, 0xff);

      const keypair = keygen(seed);

      // Check first 64 bytes (Test 7)
      expect(keypair.publicKey.slice(0, 64).toString('hex')).toBe(
        '50e62d03cfa7d7c3bdd9cfe944b5d9b0738573d8ffe9afc9e202a79e9221bdc10787e91dc9e84397071ba4793edf79b5ae95f8b01b5872aeabaae15ff9a34a1e'
      );
    });
  });

  describe('sign', () => {
    test('should generate identical signature for sequential seed and descending message', () => {
      const seed = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
        0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
      ]);

      const message = Buffer.from([
        0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8,
        0xf7, 0xf6, 0xf5, 0xf4, 0xf3, 0xf2, 0xf1, 0xf0,
        0xef, 0xee, 0xed, 0xec, 0xeb, 0xea, 0xe9, 0xe8,
        0xe7, 0xe6, 0xe5, 0xe4, 0xe3, 0xe2, 0xe1, 0xe0
      ]);

      const keypair = keygen(seed);
      const signature = sign(message, keypair);

      expect(signature.length).toBe(2144);

      // Check first 64 bytes
      expect(signature.slice(0, 64).toString('hex')).toBe(
        'edd0ad035adf12b83227aa5f86918015f6c49da5560936ed31e3498f540f4a348e8bec4b05b1e556f645422c97e0843e129b8c8810d9a4b1c970cf99cffef3a6'
      );

      // Check last 64 bytes
      expect(signature.slice(-64).toString('hex')).toBe(
        'b7046784d08995e98d881c7033c2745e6053668357238103a26c5f0ae5fe5dff837e07a2a81841fe86af21623decbf2765e14c8e64a4f9e24f08b647ae5c64b9'
      );
    });
  });

  describe('verify', () => {
    test('should verify signature correctly', () => {
      const seed = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
        0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
      ]);

      const message = Buffer.from([
        0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8,
        0xf7, 0xf6, 0xf5, 0xf4, 0xf3, 0xf2, 0xf1, 0xf0,
        0xef, 0xee, 0xed, 0xec, 0xeb, 0xea, 0xe9, 0xe8,
        0xe7, 0xe6, 0xe5, 0xe4, 0xe3, 0xe2, 0xe1, 0xe0
      ]);

      const keypair = keygen(seed);
      const signature = sign(message, keypair);

      const isValid = verify(message, signature, keypair);
      expect(isValid).toBe(true);
    });

    test('should reject invalid signature', () => {
      const seed = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
        0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
      ]);

      const message = Buffer.from([
        0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8,
        0xf7, 0xf6, 0xf5, 0xf4, 0xf3, 0xf2, 0xf1, 0xf0,
        0xef, 0xee, 0xed, 0xec, 0xeb, 0xea, 0xe9, 0xe8,
        0xe7, 0xe6, 0xe5, 0xe4, 0xe3, 0xe2, 0xe1, 0xe0
      ]);

      const keypair = keygen(seed);
      const signature = sign(message, keypair);

      // Tamper with signature
      signature[0] ^= 0xff;

      const isValid = verify(message, signature, keypair);
      expect(isValid).toBe(false);
    });
  });

  describe('Integration: Complete WOTS workflow', () => {
    test('should maintain parity across all operations', () => {
      // Use the same test vectors from Go
      const testVectors = [
        {
          name: 'Sequential seed',
          seed: Buffer.from(Array.from({length: 32}, (_, i) => i)),
          privateExpected: '2cdf53d3e63a021a895b2ea8397b2f1d5ee12a9dae0eb4ebd9e2c33b2a517811',
          publicExpected: 'fa8564d4667d4f1bf130e0b6ae2c267cbe0bcf113a915c0b9e8082525ec31c1b',
          addrExpected: 'fa83b390a063642b71b64e25da39e1b3aa35cbf9ea3a8b39c77cd4a9ccf76d48'
        },
        {
          name: 'Pattern seed',
          seed: Buffer.from(Array.from({length: 32}, (_, i) => (i * 7 + 13) % 256)),
          privateExpected: '2892705c2f8b516321a578c4a307838c3886d22f02e3973786d0ecddedfa5ae3',
          publicExpected: 'e09ed3333a25ec51822035e15c9033232aa9da678ae212f89f4ee7105ae80b3d',
          addrExpected: '0174f50c94560791e961b4af1eeef2c380f660a8e50d0a3d9cd02041f103b13e'
        },
        {
          name: 'Zero seed',
          seed: Buffer.alloc(32, 0),
          privateExpected: 'd946a8cb7816cc2df74220a5240743725e6887bbdd7118d3f055e0069d66b7e6',
          publicExpected: 'e91fbaa1089e91c5b2e8c781e1602f97db2591423c11baffb70fa2118d204339',
          addrExpected: '01dd935548226652b4f0f29e5bb6d62d900f794019e7fca1e6c3426c9ee2dec6'
        },
        {
          name: 'Ones seed',
          seed: Buffer.alloc(32, 0xff),
          privateExpected: 'f84009264c33fc1423e6d66fc6be92b1cf30a02590af991a44577e3da4022000',
          publicExpected: '037189e94eb47fd30b082ae0e9f75b697d4174ed847745f119f5d9a9138ecd7f',
          addrExpected: '33580eb7aa5132587712f6ce411055236ae7d5b863cd43bcbebd9b2c8303b1ad'
        }
      ];

      for (const vector of testVectors) {
        const components = componentsGenerator(vector.seed);

        expect(components.privateSeed.toString('hex')).toBe(vector.privateExpected);
        expect(components.publicSeed.toString('hex')).toBe(vector.publicExpected);
        expect(components.addrSeed.toString('hex')).toBe(vector.addrExpected);

        // Verify keygen produces consistent results
        const keypair = keygen(vector.seed);
        expect(keypair.components.privateSeed.toString('hex')).toBe(vector.privateExpected);
        expect(keypair.components.publicSeed.toString('hex')).toBe(vector.publicExpected);
        expect(keypair.components.addrSeed.toString('hex')).toBe(vector.addrExpected);
      }
    });
  });

  describe('Test Vector Validation', () => {
    test('should validate implementation against all test vectors', () => {
      const impl = { componentsGenerator, keygen, sign, verify };

      for (const vector of WOTS_TEST_VECTORS) {
        const result = validateImplementation(impl, vector);

        // Check components
        expect(result.componentsMatch.privateSeed).toBe(true);
        expect(result.componentsMatch.publicSeed).toBe(true);
        expect(result.componentsMatch.addrSeed).toBe(true);

        // Check public key
        expect(result.publicKeyMatch.length).toBe(true);
        expect(result.publicKeyMatch.firstBytes).toBe(true);

        // Check signature if present
        if (result.signatureMatch) {
          expect(result.signatureMatch.length).toBe(true);
          expect(result.signatureMatch.firstBytes).toBe(true);
          expect(result.signatureMatch.lastBytes).toBe(true);
          expect(result.signatureMatch.verifies).toBe(true);
        }

        // Overall validation
        expect(result.allPassed).toBe(true);
      }
    });

    test('test vectors should be loadable and parseable', () => {
      expect(WOTS_TEST_VECTORS).toBeDefined();
      expect(Array.isArray(WOTS_TEST_VECTORS)).toBe(true);
      expect(WOTS_TEST_VECTORS.length).toBeGreaterThan(0);

      // Verify structure of each vector
      for (const vector of WOTS_TEST_VECTORS) {
        expect(vector.name).toBeDefined();
        expect(vector.seed).toBeDefined();
        expect(vector.components).toBeDefined();
        expect(vector.components.privateSeed).toBeDefined();
        expect(vector.components.publicSeed).toBeDefined();
        expect(vector.components.addrSeed).toBeDefined();
        expect(vector.publicKey).toBeDefined();
        expect(vector.publicKey.length).toBe(2144);
      }
    });
  });
});
