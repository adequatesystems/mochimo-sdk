/**
 * Deterministic Key Generation Tests
 *
 * Tests for hierarchical deterministic key derivation functions.
 * These functions enable exchanges and services to manage Mochimo accounts
 * using a single master seed for backup and recovery.
 */

import { describe, expect, test, beforeEach } from '@jest/globals';
import crypto from 'crypto';
import {
  generateMasterSeed,
  getAccountFromMasterSeed,
  deriveKeypairForSpend,
  deriveAccountSeed,
  deriveAccountTag
} from '../../src/core/deterministic.js';

describe('Deterministic Key Generation', () => {

  describe('generateMasterSeed', () => {
    test('should generate 32-byte master seed', () => {
      const masterSeed = generateMasterSeed();

      expect(masterSeed).toBeInstanceOf(Buffer);
      expect(masterSeed.length).toBe(32);
    });

    test('should generate unique seeds on each call', () => {
      const seed1 = generateMasterSeed();
      const seed2 = generateMasterSeed();

      expect(seed1.toString('hex')).not.toBe(seed2.toString('hex'));
    });
  });

  describe('getAccountFromMasterSeed', () => {
    let masterSeed;

    beforeEach(() => {
      // Use a fixed seed for deterministic tests
      masterSeed = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
    });

    test('should derive account with correct structure', () => {
      const account = getAccountFromMasterSeed(masterSeed, 0);

      expect(account).toHaveProperty('accountSeed');
      expect(account).toHaveProperty('accountTag');
      expect(account).toHaveProperty('accountTagHex');
      expect(account).toHaveProperty('depositAddress');
      expect(account.depositAddress).toHaveProperty('dsaHash');
      expect(account.depositAddress).toHaveProperty('dsaHashHex');
    });

    test('should derive correct buffer lengths', () => {
      const account = getAccountFromMasterSeed(masterSeed, 0);

      expect(account.accountSeed.length).toBe(32);
      expect(account.accountTag.length).toBe(20);
      expect(account.accountTagHex.length).toBe(40);
      expect(account.depositAddress.dsaHash.length).toBe(40);
      expect(account.depositAddress.dsaHashHex.length).toBe(80);
    });

    test('should be deterministic for same inputs', () => {
      const account1 = getAccountFromMasterSeed(masterSeed, 0);
      const account2 = getAccountFromMasterSeed(masterSeed, 0);

      expect(account1.accountTagHex).toBe(account2.accountTagHex);
      expect(account1.depositAddress.dsaHashHex).toBe(account2.depositAddress.dsaHashHex);
    });

    test('should support hex string input', () => {
      const masterSeedHex = masterSeed.toString('hex');
      const account = getAccountFromMasterSeed(masterSeedHex, 0);

      expect(account).toHaveProperty('accountTagHex');
      expect(account.accountTagHex.length).toBe(40);
    });

    test('should derive different accounts for different indices', () => {
      const account0 = getAccountFromMasterSeed(masterSeed, 0);
      const account1 = getAccountFromMasterSeed(masterSeed, 1);
      const account2 = getAccountFromMasterSeed(masterSeed, 2);

      expect(account0.accountTagHex).not.toBe(account1.accountTagHex);
      expect(account1.accountTagHex).not.toBe(account2.accountTagHex);
      expect(account0.accountTagHex).not.toBe(account2.accountTagHex);
    });

    test('should default to account index 0', () => {
      const account1 = getAccountFromMasterSeed(masterSeed);
      const account2 = getAccountFromMasterSeed(masterSeed, 0);

      expect(account1.accountTagHex).toBe(account2.accountTagHex);
    });

    test('should throw error for invalid seed size', () => {
      const invalidSeed = Buffer.alloc(16); // Wrong size

      expect(() => {
        getAccountFromMasterSeed(invalidSeed, 0);
      }).toThrow();
    });

    test('should throw error for negative account index', () => {
      expect(() => {
        getAccountFromMasterSeed(masterSeed, -1);
      }).toThrow();
    });
  });

  describe('deriveKeypairForSpend', () => {
    let masterSeed;

    beforeEach(() => {
      masterSeed = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
    });

    test('should derive keypair with correct structure', () => {
      const keypair = deriveKeypairForSpend(masterSeed, 0);

      expect(keypair).toHaveProperty('accountTag');
      expect(keypair).toHaveProperty('accountTagHex');
      expect(keypair).toHaveProperty('dsaHash');
      expect(keypair).toHaveProperty('dsaHashHex');
      expect(keypair).toHaveProperty('publicKey');
      expect(keypair).toHaveProperty('secretKey');
    });

    test('should derive correct key lengths', () => {
      const keypair = deriveKeypairForSpend(masterSeed, 0);

      expect(keypair.accountTag.length).toBe(20);
      expect(keypair.accountTagHex.length).toBe(40);
      expect(keypair.dsaHash.length).toBe(40);
      expect(keypair.dsaHashHex.length).toBe(80);
      expect(keypair.publicKey.length).toBe(2208); // WOTS+ public key
      expect(keypair.secretKey.length).toBe(32);
    });

    test('should be deterministic for same inputs', () => {
      const kp1 = deriveKeypairForSpend(masterSeed, 5);
      const kp2 = deriveKeypairForSpend(masterSeed, 5);

      expect(kp1.dsaHashHex).toBe(kp2.dsaHashHex);
      expect(kp1.accountTagHex).toBe(kp2.accountTagHex);
      expect(kp1.publicKey.toString('hex')).toBe(kp2.publicKey.toString('hex'));
    });

    test('should derive different keypairs for different spend indices', () => {
      const kp0 = deriveKeypairForSpend(masterSeed, 0);
      const kp1 = deriveKeypairForSpend(masterSeed, 1);
      const kp2 = deriveKeypairForSpend(masterSeed, 2);

      expect(kp0.dsaHashHex).not.toBe(kp1.dsaHashHex);
      expect(kp1.dsaHashHex).not.toBe(kp2.dsaHashHex);
      expect(kp0.dsaHashHex).not.toBe(kp2.dsaHashHex);
    });

    test('should maintain same account tag across spend indices', () => {
      const kp0 = deriveKeypairForSpend(masterSeed, 0);
      const kp1 = deriveKeypairForSpend(masterSeed, 1);
      const kp2 = deriveKeypairForSpend(masterSeed, 2);

      expect(kp0.accountTagHex).toBe(kp1.accountTagHex);
      expect(kp1.accountTagHex).toBe(kp2.accountTagHex);
    });

    test('should default to account index 0', () => {
      const kp1 = deriveKeypairForSpend(masterSeed, 5);
      const kp2 = deriveKeypairForSpend(masterSeed, 5, 0);

      expect(kp1.accountTagHex).toBe(kp2.accountTagHex);
    });

    test('should throw error for negative spend index', () => {
      expect(() => {
        deriveKeypairForSpend(masterSeed, -1);
      }).toThrow();
    });

    test('should throw error for invalid seed size', () => {
      const invalidSeed = Buffer.alloc(16);

      expect(() => {
        deriveKeypairForSpend(invalidSeed, 0);
      }).toThrow();
    });
  });

  describe('deriveAccountSeed', () => {
    let masterSeed;

    beforeEach(() => {
      masterSeed = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
    });

    test('should derive 32-byte account seed', () => {
      const accountSeed = deriveAccountSeed(masterSeed, 0);

      expect(accountSeed).toBeInstanceOf(Buffer);
      expect(accountSeed.length).toBe(32);
    });

    test('should be deterministic', () => {
      const seed1 = deriveAccountSeed(masterSeed, 0);
      const seed2 = deriveAccountSeed(masterSeed, 0);

      expect(seed1.toString('hex')).toBe(seed2.toString('hex'));
    });

    test('should derive different seeds for different account indices', () => {
      const seed0 = deriveAccountSeed(masterSeed, 0);
      const seed1 = deriveAccountSeed(masterSeed, 1);
      const seed2 = deriveAccountSeed(masterSeed, 2);

      expect(seed0.toString('hex')).not.toBe(seed1.toString('hex'));
      expect(seed1.toString('hex')).not.toBe(seed2.toString('hex'));
    });

    test('should match account seed from getAccountFromMasterSeed', () => {
      const accountSeed = deriveAccountSeed(masterSeed, 0);
      const account = getAccountFromMasterSeed(masterSeed, 0);

      expect(accountSeed.toString('hex')).toBe(account.accountSeed.toString('hex'));
    });

    test('should default to account index 0', () => {
      const seed1 = deriveAccountSeed(masterSeed);
      const seed2 = deriveAccountSeed(masterSeed, 0);

      expect(seed1.toString('hex')).toBe(seed2.toString('hex'));
    });
  });

  describe('deriveAccountTag', () => {
    let masterSeed;

    beforeEach(() => {
      masterSeed = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
    });

    test('should derive account tag with correct structure', () => {
      const tagInfo = deriveAccountTag(masterSeed, 0);

      expect(tagInfo).toHaveProperty('accountTag');
      expect(tagInfo).toHaveProperty('accountTagHex');
    });

    test('should derive 20-byte account tag', () => {
      const tagInfo = deriveAccountTag(masterSeed, 0);

      expect(tagInfo.accountTag).toBeInstanceOf(Buffer);
      expect(tagInfo.accountTag.length).toBe(20);
      expect(tagInfo.accountTagHex.length).toBe(40);
    });

    test('should be deterministic', () => {
      const tag1 = deriveAccountTag(masterSeed, 0);
      const tag2 = deriveAccountTag(masterSeed, 0);

      expect(tag1.accountTagHex).toBe(tag2.accountTagHex);
    });

    test('should derive different tags for different account indices', () => {
      const tag0 = deriveAccountTag(masterSeed, 0);
      const tag1 = deriveAccountTag(masterSeed, 1);
      const tag2 = deriveAccountTag(masterSeed, 2);

      expect(tag0.accountTagHex).not.toBe(tag1.accountTagHex);
      expect(tag1.accountTagHex).not.toBe(tag2.accountTagHex);
    });

    test('should match account tag from getAccountFromMasterSeed', () => {
      const tagInfo = deriveAccountTag(masterSeed, 0);
      const account = getAccountFromMasterSeed(masterSeed, 0);

      expect(tagInfo.accountTagHex).toBe(account.accountTagHex);
    });

    test('should match account tag from deriveKeypairForSpend', () => {
      const tagInfo = deriveAccountTag(masterSeed, 0);
      const keypair = deriveKeypairForSpend(masterSeed, 0, 0);

      expect(tagInfo.accountTagHex).toBe(keypair.accountTagHex);
    });

    test('should default to account index 0', () => {
      const tag1 = deriveAccountTag(masterSeed);
      const tag2 = deriveAccountTag(masterSeed, 0);

      expect(tag1.accountTagHex).toBe(tag2.accountTagHex);
    });
  });

  describe('Integration Tests', () => {
    let masterSeed;

    beforeEach(() => {
      masterSeed = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
    });

    test('should maintain consistency across all derivation functions', () => {
      const account = getAccountFromMasterSeed(masterSeed, 0);
      const tagInfo = deriveAccountTag(masterSeed, 0);
      const accountSeed = deriveAccountSeed(masterSeed, 0);
      const keypair = deriveKeypairForSpend(masterSeed, 0, 0);

      // Account tags should all match
      expect(account.accountTagHex).toBe(tagInfo.accountTagHex);
      expect(account.accountTagHex).toBe(keypair.accountTagHex);

      // Account seeds should match
      expect(account.accountSeed.toString('hex')).toBe(accountSeed.toString('hex'));
    });

    test('should support full exchange workflow', () => {
      // Exchange generates master seed
      const seed = generateMasterSeed();
      expect(seed.length).toBe(32);

      // Get deposit address for account 0
      const account = getAccountFromMasterSeed(seed, 0);
      expect(account.depositAddress.dsaHashHex).toBeTruthy();

      // Later: derive keypair to spend from that account
      const keypair = deriveKeypairForSpend(seed, 0, 0);
      expect(keypair.accountTagHex).toBe(account.accountTagHex);
      expect(keypair.publicKey.length).toBe(2208);
      expect(keypair.secretKey.length).toBe(32);
    });

    test('should handle multiple accounts and spends', () => {
      const accounts = [];
      const keypairs = [];

      // Derive 3 accounts
      for (let i = 0; i < 3; i++) {
        accounts.push(getAccountFromMasterSeed(masterSeed, i));
      }

      // Derive 3 spend keypairs for account 0
      for (let i = 0; i < 3; i++) {
        keypairs.push(deriveKeypairForSpend(masterSeed, i, 0));
      }

      // All accounts should be unique
      expect(accounts[0].accountTagHex).not.toBe(accounts[1].accountTagHex);
      expect(accounts[1].accountTagHex).not.toBe(accounts[2].accountTagHex);

      // All keypairs should have same account tag but different DSA hashes
      expect(keypairs[0].accountTagHex).toBe(keypairs[1].accountTagHex);
      expect(keypairs[0].dsaHashHex).not.toBe(keypairs[1].dsaHashHex);
      expect(keypairs[1].dsaHashHex).not.toBe(keypairs[2].dsaHashHex);
    });
  });

});
