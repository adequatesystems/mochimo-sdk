import { describe, expect, test } from '@jest/globals';
import crypto from 'crypto';
import { generateAccount, generateAccounts } from './address-test-adapter.js';
import { keygen } from '../../src/core/wots.js';

describe('Address Generator - WOTS+ Keypair Generation', () => {

  describe('generateAccount', () => {
    test('should generate account with correct structure', () => {
      const seed = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
        0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
      ]);

      const account = generateAccount(seed, 0);

      // Check structure
      expect(account).toHaveProperty('accountTag');
      expect(account).toHaveProperty('dsaHash');
      expect(account).toHaveProperty('wotsPublicKey');
      expect(account).toHaveProperty('wotsSecretKey');

      // Check lengths (hex encoded, so double the byte count)
      expect(account.accountTag).toHaveLength(40);     // 20 bytes * 2 = 40 hex chars
      expect(account.dsaHash).toHaveLength(80);        // 40 bytes * 2 = 80 hex chars
      expect(account.wotsPublicKey).toHaveLength(4416); // 2208 bytes * 2
      expect(account.wotsSecretKey).toHaveLength(64);   // 32 bytes * 2
    });

    test('should have accountTag as first 20 bytes of dsaHash', () => {
      const seed = Buffer.alloc(32, 0);
      const account = generateAccount(seed, 0);

      // Account Tag should be the first 20 bytes (40 hex chars) of DSA Hash
      const firstPartOfDsaHash = account.dsaHash.substring(0, 40);
      expect(account.accountTag).toBe(firstPartOfDsaHash);
    });

    test('should preserve the secret key', () => {
      const seed = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
        0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
      ]);

      const account = generateAccount(seed, 0);

      expect(account.wotsSecretKey).toBe(seed.toString('hex'));
    });

    test('should include WOTS public key in correct format', () => {
      const seed = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
        0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
      ]);

      const account = generateAccount(seed, 0);
      const keypair = keygen(seed);

      // The first 2144 bytes should match the WOTS public key
      const accountPubKey = account.wotsPublicKey.substring(0, 2144 * 2);
      expect(accountPubKey).toBe(keypair.publicKey.toString('hex'));
    });

    test('should include public seed in correct position', () => {
      const seed = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
        0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
      ]);

      const account = generateAccount(seed, 0);
      const keypair = keygen(seed);

      // Extract public seed from position 2144 to 2176 (32 bytes)
      const publicSeedFromAccount = account.wotsPublicKey.substring(2144 * 2, (2144 + 32) * 2);
      expect(publicSeedFromAccount).toBe(keypair.components.publicSeed.toString('hex'));
    });

    test('should include address seed in correct position', () => {
      const seed = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
        0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
      ]);

      const account = generateAccount(seed, 0);
      const keypair = keygen(seed);

      // Extract address seed from position 2176 to 2208-12=2196 (20 bytes)
      // The last 12 bytes are the default tag, so address seed is only the first 20 bytes
      const addrSeedFromAccount = account.wotsPublicKey.substring((2144 + 32) * 2, 2208 * 2 - 12 * 2);
      const expectedAddrSeed = keypair.components.addrSeed.toString('hex').substring(0, 40); // First 20 bytes
      expect(addrSeedFromAccount).toBe(expectedAddrSeed);
    });

    test('should include default tag in last 12 bytes', () => {
      const seed = Buffer.alloc(32, 0);
      const account = generateAccount(seed, 0);

      // Extract last 12 bytes
      const lastBytes = account.wotsPublicKey.substring(account.wotsPublicKey.length - 24);

      // Expected: [0x42, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]
      expect(lastBytes).toBe('420000000e00000001000000');
    });

    test('should throw error for invalid seed length', () => {
      const invalidSeed = Buffer.alloc(16); // Wrong length

      expect(() => generateAccount(invalidSeed, 0)).toThrow('Seed must be a 32-byte Buffer');
    });
  });

  describe('generateAccounts', () => {
    test('should generate single account by default', () => {
      const output = generateAccounts(1);

      expect(output).toHaveProperty('accounts');
      expect(Array.isArray(output.accounts)).toBe(true);
      expect(output.accounts).toHaveLength(1);
    });

    test('should generate multiple accounts', () => {
      const output = generateAccounts(5);

      expect(output.accounts).toHaveLength(5);

      // Check each account has correct structure
      output.accounts.forEach((account) => {
        expect(account).toHaveProperty('accountTag');
        expect(account).toHaveProperty('dsaHash');
        expect(account).toHaveProperty('wotsPublicKey');
        expect(account).toHaveProperty('wotsSecretKey');
        
        // Verify Account Tag is first 20 bytes of DSA Hash
        expect(account.accountTag).toBe(account.dsaHash.substring(0, 40));
      });
    });

    test('should generate unique keys for each account', () => {
      const output = generateAccounts(3);

      const secretKeys = output.accounts.map(a => a.wotsSecretKey);
      const publicKeys = output.accounts.map(a => a.wotsPublicKey);
      const accountTags = output.accounts.map(a => a.accountTag);

      // All secret keys should be unique
      const uniqueSecretKeys = new Set(secretKeys);
      expect(uniqueSecretKeys.size).toBe(3);

      // All public keys should be unique
      const uniquePublicKeys = new Set(publicKeys);
      expect(uniquePublicKeys.size).toBe(3);
      
      // All account tags should be unique
      const uniqueTags = new Set(accountTags);
      expect(uniqueTags.size).toBe(3);
    });
  });

  describe('Output Format', () => {
    test('should have correct Mochimo structure', () => {
      const output = generateAccounts(2);

      // Check top-level structure
      expect(output).toHaveProperty('accounts');
      expect(Array.isArray(output.accounts)).toBe(true);

      // Check each account structure
      output.accounts.forEach(account => {
        // Must have exactly these 4 properties
        const keys = Object.keys(account).sort();
        expect(keys).toEqual(['accountTag', 'dsaHash', 'wotsPublicKey', 'wotsSecretKey']);

        // Check types
        expect(typeof account.accountTag).toBe('string');
        expect(typeof account.dsaHash).toBe('string');
        expect(typeof account.wotsPublicKey).toBe('string');
        expect(typeof account.wotsSecretKey).toBe('string');

        // Check they're valid hex strings
        expect(/^[0-9a-f]+$/.test(account.accountTag)).toBe(true);
        expect(/^[0-9a-f]+$/.test(account.dsaHash)).toBe(true);
        expect(/^[0-9a-f]+$/.test(account.wotsPublicKey)).toBe(true);
        expect(/^[0-9a-f]+$/.test(account.wotsSecretKey)).toBe(true);
      });
    });

    test('output should be valid JSON', () => {
      const output = generateAccounts(1);
      const jsonString = JSON.stringify(output, null, 2);

      // Should be parseable
      expect(() => JSON.parse(jsonString)).not.toThrow();

      // Should match original
      const parsed = JSON.parse(jsonString);
      expect(parsed).toEqual(output);
    });
  });

  describe('Edge Cases', () => {
    test('should generate consistent output for same seed', () => {
      const seed = Buffer.from([
        0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00, 0x11,
        0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99,
        0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00, 0x11,
        0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99
      ]);

      const account1 = generateAccount(seed, 0);
      const account2 = generateAccount(seed, 0);

      // Should be identical
      expect(account1).toEqual(account2);
    });
  });

  describe('Deterministic Generation', () => {
    test('should generate accounts deterministically from master seed', () => {
      const masterSeed = Buffer.alloc(32, 0);
      const output = generateAccounts(3, masterSeed);

      expect(output.accounts).toHaveLength(3);

      // First account should use master seed directly
      expect(output.accounts[0].wotsSecretKey).toBe('0000000000000000000000000000000000000000000000000000000000000000');

      // Second account should use SHA256(master seed)
      const expectedSeed1 = crypto.createHash('sha256').update(masterSeed).digest();
      expect(output.accounts[1].wotsSecretKey).toBe(expectedSeed1.toString('hex'));

      // Third account should use SHA256(SHA256(master seed))
      const expectedSeed2 = crypto.createHash('sha256').update(expectedSeed1).digest();
      expect(output.accounts[2].wotsSecretKey).toBe(expectedSeed2.toString('hex'));
    });

    test('should produce same accounts when called with same master seed', () => {
      const masterSeed = Buffer.alloc(32, 1);

      const output1 = generateAccounts(3, masterSeed);
      const output2 = generateAccounts(3, masterSeed);

      expect(output1).toEqual(output2);
    });

    test('should produce different accounts without master seed (random)', () => {
      const output1 = generateAccounts(2);
      const output2 = generateAccounts(2);

      // Random generation should produce different results
      expect(output1.accounts[0].wotsSecretKey).not.toBe(output2.accounts[0].wotsSecretKey);
      expect(output1.accounts[1].wotsSecretKey).not.toBe(output2.accounts[1].wotsSecretKey);
    });

    test('deterministic generation with all-zeros seed', () => {
      const masterSeed = Buffer.alloc(32, 0);
      const output = generateAccounts(1, masterSeed);

      // Verify deterministic output
      expect(output.accounts[0].accountTag).toHaveLength(40);  // 20 bytes = 40 hex chars
      expect(output.accounts[0].dsaHash).toHaveLength(80);     // 40 bytes = 80 hex chars
      expect(output.accounts[0].wotsPublicKey).toMatch(/^7adab3007c3d9c99/);
      expect(output.accounts[0].wotsSecretKey).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    });
  });
});
