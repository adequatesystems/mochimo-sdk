/**
 * SDK Transaction Tests
 * Tests the public createTransaction API with updated nomenclature
 */

import { describe, test, expect } from '@jest/globals';
import { createTransaction } from '../../src/core/transaction.js';
import { generateAccountKeypair } from '../../src/core/address.js';
import crypto from 'crypto';

describe('Transaction Creation - SDK API', () => {

  describe('Basic Transaction Creation', () => {
    test('should create a valid transaction with required fields', () => {
      const source = generateAccountKeypair();
      const change = generateAccountKeypair();
      const destination = generateAccountKeypair();

      const tx = createTransaction({
        srcTag: source.accountTag.toString('hex'),
        sourcePk: source.publicKey.toString('hex'),
        changePk: change.publicKey.toString('hex'),
        balance: '100000',
        dstAccountTag: destination.accountTag.toString('hex'), // 20-byte account tag
        amount: '5000',
        fee: '500',
        secret: source.secretKey.toString('hex'),
        memo: 'TEST-1'
      });

      expect(tx).toHaveProperty('transaction');
      expect(tx).toHaveProperty('transactionHex');
      expect(tx).toHaveProperty('sourceLedgerAddress');
      expect(tx).toHaveProperty('changeLedgerAddress');
      expect(tx).toHaveProperty('sendAmount');
      expect(tx).toHaveProperty('changeAmount');
      expect(tx).toHaveProperty('fee');

      // Transaction should be 2408 bytes
      expect(tx.transaction.length).toBe(2408);
      expect(tx.transactionHex.length).toBe(4816); // 2408 * 2 (hex)

      // Amounts should be correct (check numeric value, not type)
      expect(Number(tx.sendAmount)).toBe(5000);
      expect(Number(tx.changeAmount)).toBe(94500); // 100000 - 5000 - 500
      expect(Number(tx.fee)).toBe(500);
    });

    test('should handle bigint amounts', () => {
      const source = generateAccountKeypair();
      const change = generateAccountKeypair();
      const destination = generateAccountKeypair();

      const tx = createTransaction({
        srcTag: source.accountTag.toString('hex'),
        sourcePk: source.publicKey.toString('hex'),
        changePk: change.publicKey.toString('hex'),
        balance: BigInt('100000'),
        dstAccountTag: destination.accountTag.toString('hex'),
        amount: BigInt('5000'),
        fee: BigInt('500'),
        secret: source.secretKey.toString('hex'),
        memo: 'TEST-2'
      });

      expect(Number(tx.sendAmount)).toBe(5000);
      expect(Number(tx.changeAmount)).toBe(94500);
    });

    test('should create transaction without memo', () => {
      const source = generateAccountKeypair();
      const change = generateAccountKeypair();
      const destination = generateAccountKeypair();

      const tx = createTransaction({
        srcTag: source.accountTag.toString('hex'),
        sourcePk: source.publicKey.toString('hex'),
        changePk: change.publicKey.toString('hex'),
        balance: '100000',
        dstAccountTag: destination.accountTag.toString('hex'),
        amount: '5000',
        fee: '500',
        secret: source.secretKey.toString('hex')
        // No memo
      });

      expect(tx.transaction.length).toBe(2408);
    });
  });

  describe('Tag Movement', () => {
    test('should move source TAG to change address', () => {
      const source = generateAccountKeypair();
      const change = generateAccountKeypair();
      const destination = generateAccountKeypair();

      const tx = createTransaction({
        srcTag: source.accountTag.toString('hex'),
        sourcePk: source.publicKey.toString('hex'),
        changePk: change.publicKey.toString('hex'),
        balance: '100000',
        dstAccountTag: destination.accountTag.toString('hex'),
        amount: '5000',
        fee: '500',
        secret: source.secretKey.toString('hex'),
        memo: 'TAG-1'
      });

      // Source TAG should be in change address
      const srcTag = source.accountTag.toString('hex');
      const chgTag = tx.changeLedgerAddress.slice(0, 40);

      expect(chgTag).toBe(srcTag);
    });

    test('should create explicit change address (TAG ≠ DSA)', () => {
      const source = generateAccountKeypair();
      const change = generateAccountKeypair();
      const destination = generateAccountKeypair();

      const tx = createTransaction({
        srcTag: source.accountTag.toString('hex'),
        sourcePk: source.publicKey.toString('hex'),
        changePk: change.publicKey.toString('hex'),
        balance: '100000',
        dstAccountTag: destination.accountTag.toString('hex'),
        amount: '5000',
        fee: '500',
        secret: source.secretKey.toString('hex'),
        memo: 'EXPLICIT'
      });

      // Change address should be explicit (TAG ≠ DSA)
      const chgTag = tx.changeLedgerAddress.slice(0, 40);
      const chgDsa = tx.changeLedgerAddress.slice(40, 80);

      expect(chgTag).not.toBe(chgDsa);
    });
  });

  describe('Error Handling', () => {
    test('should reject insufficient balance', () => {
      const source = generateAccountKeypair();
      const change = generateAccountKeypair();
      const destination = generateAccountKeypair();

      expect(() => {
        createTransaction({
          srcTag: source.accountTag.toString('hex'),
          sourcePk: source.publicKey.toString('hex'),
          changePk: change.publicKey.toString('hex'),
          balance: '1000', // Too small
          dstAccountTag: destination.accountTag.toString('hex'),
          amount: '5000',
          fee: '500',
          secret: source.secretKey
        });
      }).toThrow();
    });

    test('should reject invalid memo format - two letter groups', () => {
      const source = generateAccountKeypair();
      const change = generateAccountKeypair();
      const destination = generateAccountKeypair();

      expect(() => {
        createTransaction({
          srcTag: source.accountTag.toString('hex'),
          sourcePk: source.publicKey.toString('hex'),
          changePk: change.publicKey.toString('hex'),
          balance: '100000',
          dstAccountTag: destination.accountTag.toString('hex'),
          amount: '5000',
          fee: '500',
          secret: source.secretKey.toString('hex'),
          memo: 'ABC-DEF' // Two letter groups - invalid
        });
      }).toThrow(/Invalid memo format/);
    });

    test('should reject invalid memo format - two number groups', () => {
      const source = generateAccountKeypair();
      const change = generateAccountKeypair();
      const destination = generateAccountKeypair();

      expect(() => {
        createTransaction({
          srcTag: source.accountTag.toString('hex'),
          sourcePk: source.publicKey.toString('hex'),
          changePk: change.publicKey.toString('hex'),
          balance: '100000',
          dstAccountTag: destination.accountTag.toString('hex'),
          amount: '5000',
          fee: '500',
          secret: source.secretKey.toString('hex'),
          memo: '123-456' // Two number groups - invalid
        });
      }).toThrow(/Invalid memo format/);
    });

    test('should reject memo with lowercase letters', () => {
      const source = generateAccountKeypair();
      const change = generateAccountKeypair();
      const destination = generateAccountKeypair();

      expect(() => {
        createTransaction({
          srcTag: source.accountTag.toString('hex'),
          sourcePk: source.publicKey.toString('hex'),
          changePk: change.publicKey.toString('hex'),
          balance: '100000',
          dstAccountTag: destination.accountTag.toString('hex'),
          amount: '5000',
          fee: '500',
          secret: source.secretKey.toString('hex'),
          memo: 'Test-1' // Lowercase - invalid
        });
      }).toThrow(/Invalid memo format/);
    });

    test('should accept valid memo formats', () => {
      const source = generateAccountKeypair();
      const change = generateAccountKeypair();
      const destination = generateAccountKeypair();

      // These should all work
      const validMemos = ['TEST-1', 'A-123', '99-B', 'PAYMENT', '42'];

      validMemos.forEach(memo => {
        expect(() => {
          createTransaction({
            srcTag: source.accountTag.toString('hex'),
            sourcePk: source.publicKey.toString('hex'),
            changePk: change.publicKey.toString('hex'),
            balance: '100000',
            dstAccountTag: destination.accountTag.toString('hex'),
            amount: '5000',
            fee: '500',
            secret: source.secretKey.toString('hex'),
            memo
          });
        }).not.toThrow();
      });
    });
  });

  describe('Deterministic Output', () => {
    test('should produce same transaction for same inputs', () => {
      const seed1 = Buffer.alloc(32, 0);
      const seed2 = Buffer.alloc(32, 1);
      const seed3 = Buffer.alloc(32, 2);

      const source = generateAccountKeypair({ seed: seed1 });
      const change = generateAccountKeypair({ seed: seed2 });
      const destination = generateAccountKeypair({ seed: seed3 });

      const tx1 = createTransaction({
        srcTag: source.accountTag.toString('hex'),
        sourcePk: source.publicKey.toString('hex'),
        changePk: change.publicKey.toString('hex'),
        balance: '100000',
        dstAccountTag: destination.accountTag.toString('hex'),
        amount: '5000',
        fee: '500',
        secret: source.secretKey.toString('hex'),
        memo: 'SAME'
      });

      const tx2 = createTransaction({
        srcTag: source.accountTag.toString('hex'),
        sourcePk: source.publicKey.toString('hex'),
        changePk: change.publicKey.toString('hex'),
        balance: '100000',
        dstAccountTag: destination.accountTag.toString('hex'),
        amount: '5000',
        fee: '500',
        secret: source.secretKey.toString('hex'),
        memo: 'SAME'
      });

      // Transactions should be identical
      expect(tx1.transactionHex).toBe(tx2.transactionHex);
    });
  });
});




