/**
 * SDK Transaction Tests
 * Tests the public createTransaction API
 */

import { describe, test, expect } from '@jest/globals';
import { createTransaction } from '../../src/core/transaction.js';
import { generateAddress } from '../../src/core/address.js';
import crypto from 'crypto';

describe('Transaction Creation - SDK API', () => {

  describe('Basic Transaction Creation', () => {
    test('should create a valid transaction with required fields', () => {
      const source = generateAddress();
      const change = generateAddress();
      const destination = generateAddress();

      const tx = createTransaction({
        srcTag: source.address.slice(0, 20),
        sourcePk: source.publicKey,
        changePk: change.publicKey,
        balance: '100000',
        dstAddress: destination.address.toString('hex').slice(0, 40), // TAG only
        amount: '5000',
        fee: '500',
        secret: source.secretKey,
        memo: 'TEST-1'
      });

      expect(tx).toHaveProperty('transaction');
      expect(tx).toHaveProperty('transactionHex');
      expect(tx).toHaveProperty('sourceAddress');
      expect(tx).toHaveProperty('changeAddress');
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
      const source = generateAddress();
      const change = generateAddress();
      const destination = generateAddress();

      const tx = createTransaction({
        srcTag: source.address.slice(0, 20),
        sourcePk: source.publicKey,
        changePk: change.publicKey,
        balance: BigInt('100000'),
        dstAddress: destination.address.toString('hex').slice(0, 40),
        amount: BigInt('5000'),
        fee: BigInt('500'),
        secret: source.secretKey,
        memo: 'TEST-2'
      });

      expect(Number(tx.sendAmount)).toBe(5000);
      expect(Number(tx.changeAmount)).toBe(94500);
    });

    test('should create transaction without memo', () => {
      const source = generateAddress();
      const change = generateAddress();
      const destination = generateAddress();

      const tx = createTransaction({
        srcTag: source.address.slice(0, 20),
        sourcePk: source.publicKey,
        changePk: change.publicKey,
        balance: '100000',
        dstAddress: destination.address.toString('hex').slice(0, 40),
        amount: '5000',
        fee: '500',
        secret: source.secretKey
        // No memo
      });

      expect(tx.transaction.length).toBe(2408);
    });
  });

  describe('Tag Movement', () => {
    test('should move source TAG to change address', () => {
      const source = generateAddress();
      const change = generateAddress();
      const destination = generateAddress();

      const tx = createTransaction({
        srcTag: source.address.slice(0, 20),
        sourcePk: source.publicKey,
        changePk: change.publicKey,
        balance: '100000',
        dstAddress: destination.address.toString('hex').slice(0, 40),
        amount: '5000',
        fee: '500',
        secret: source.secretKey,
        memo: 'TAG-1'
      });

      // Source TAG should be in change address
      const srcTag = source.address.slice(0, 20).toString('hex');
      const chgTag = tx.changeAddress.slice(0, 40);

      expect(chgTag).toBe(srcTag);
    });

    test('should create explicit change address (TAG ≠ DSA)', () => {
      const source = generateAddress();
      const change = generateAddress();
      const destination = generateAddress();

      const tx = createTransaction({
        srcTag: source.address.slice(0, 20),
        sourcePk: source.publicKey,
        changePk: change.publicKey,
        balance: '100000',
        dstAddress: destination.address.toString('hex').slice(0, 40),
        amount: '5000',
        fee: '500',
        secret: source.secretKey,
        memo: 'EXPLICIT'
      });

      // Change address should be explicit (TAG ≠ DSA)
      const chgTag = tx.changeAddress.slice(0, 40);
      const chgDsa = tx.changeAddress.slice(40, 80);

      expect(chgTag).not.toBe(chgDsa);
    });
  });

  describe('Error Handling', () => {
    test('should reject insufficient balance', () => {
      const source = generateAddress();
      const change = generateAddress();
      const destination = generateAddress();

      expect(() => {
        createTransaction({
          srcTag: source.address.slice(0, 20),
          sourcePk: source.publicKey,
          changePk: change.publicKey,
          balance: '1000', // Too small
          dstAddress: destination.address.toString('hex').slice(0, 40),
          amount: '5000',
          fee: '500',
          secret: source.secretKey
        });
      }).toThrow();
    });

    test('should reject invalid memo format - two letter groups', () => {
      const source = generateAddress();
      const change = generateAddress();
      const destination = generateAddress();

      expect(() => {
        createTransaction({
          srcTag: source.address.slice(0, 20),
          sourcePk: source.publicKey,
          changePk: change.publicKey,
          balance: '100000',
          dstAddress: destination.address.toString('hex').slice(0, 40),
          amount: '5000',
          fee: '500',
          secret: source.secretKey,
          memo: 'ABC-DEF' // Two letter groups - invalid
        });
      }).toThrow(/Invalid memo format/);
    });

    test('should reject invalid memo format - two number groups', () => {
      const source = generateAddress();
      const change = generateAddress();
      const destination = generateAddress();

      expect(() => {
        createTransaction({
          srcTag: source.address.slice(0, 20),
          sourcePk: source.publicKey,
          changePk: change.publicKey,
          balance: '100000',
          dstAddress: destination.address.toString('hex').slice(0, 40),
          amount: '5000',
          fee: '500',
          secret: source.secretKey,
          memo: '123-456' // Two number groups - invalid
        });
      }).toThrow(/Invalid memo format/);
    });

    test('should reject memo with lowercase letters', () => {
      const source = generateAddress();
      const change = generateAddress();
      const destination = generateAddress();

      expect(() => {
        createTransaction({
          srcTag: source.address.slice(0, 20),
          sourcePk: source.publicKey,
          changePk: change.publicKey,
          balance: '100000',
          dstAddress: destination.address.toString('hex').slice(0, 40),
          amount: '5000',
          fee: '500',
          secret: source.secretKey,
          memo: 'Test-1' // Lowercase - invalid
        });
      }).toThrow(/Invalid memo format/);
    });

    test('should accept valid memo formats', () => {
      const source = generateAddress();
      const change = generateAddress();
      const destination = generateAddress();

      // These should all work
      const validMemos = ['TEST-1', 'A-123', '99-B', 'PAYMENT', '42'];

      validMemos.forEach(memo => {
        expect(() => {
          createTransaction({
            srcTag: source.address.slice(0, 20),
            sourcePk: source.publicKey,
            changePk: change.publicKey,
            balance: '100000',
            dstAddress: destination.address.toString('hex').slice(0, 40),
            amount: '5000',
            fee: '500',
            secret: source.secretKey,
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

      const source = generateAddress({ seed: seed1 });
      const change = generateAddress({ seed: seed2 });
      const destination = generateAddress({ seed: seed3 });

      const tx1 = createTransaction({
        srcTag: source.address.slice(0, 20),
        sourcePk: source.publicKey,
        changePk: change.publicKey,
        balance: '100000',
        dstAddress: destination.address.toString('hex').slice(0, 40),
        amount: '5000',
        fee: '500',
        secret: source.secretKey,
        memo: 'SAME'
      });

      const tx2 = createTransaction({
        srcTag: source.address.slice(0, 20),
        sourcePk: source.publicKey,
        changePk: change.publicKey,
        balance: '100000',
        dstAddress: destination.address.toString('hex').slice(0, 40),
        amount: '5000',
        fee: '500',
        secret: source.secretKey,
        memo: 'SAME'
      });

      // Transactions should be identical
      expect(tx1.transactionHex).toBe(tx2.transactionHex);
    });
  });
});



