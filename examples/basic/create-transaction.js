#!/usr/bin/env node

/**
 * Example: Create and Sign a Mochimo Transaction
 *
 * Demonstrates how to create and sign offline transactions using the SDK.
 *
 * TERMINOLOGY:
 * - srcTag: 20-byte persistent account identifier (Account Tag)
 * - dstAccountTag: 20-byte destination account identifier
 * - sourceLedgerAddress: 40-byte source entry (Account Tag + DSA Hash)
 * - changeLedgerAddress: 40-byte change entry (Account Tag + new DSA Hash)
 */

import { generateAccountKeypair, createTransaction } from '../../src/index.js';

console.log('=== Mochimo SDK - Transaction Creation Example ===\n');

// Step 1: Create (or pass in) source and change keypairs
console.log('1. Generate source and change keypairs...');
const sourceKeypair = generateAccountKeypair({ seed: Buffer.from('0'.repeat(64), 'hex'), index: 0 });
const changeKeypair = generateAccountKeypair({ seed: Buffer.from('1'.repeat(64), 'hex'), index: 1 });

console.log('   Source DSA Hash:', sourceKeypair.dsaHash.toString('hex'));
console.log('   Source Account Tag:', sourceKeypair.accountTag.toString('hex'));
console.log('   Change DSA Hash:', changeKeypair.dsaHash.toString('hex'));
console.log('   Change Account Tag:', changeKeypair.accountTag.toString('hex'));
console.log();

// Step 2: Define transaction parameters
console.log('2. Set up transaction parameters...');
const txParams = {
  // Source account details (for first transaction, srcTag = first 20 bytes of dsaHash)
  srcTag: sourceKeypair.accountTag,          // 20 bytes - persistent account identifier
  sourcePk: sourceKeypair.publicKey,         // 2208 bytes (4416 hex chars) - WOTS+ public key
  changePk: changeKeypair.publicKey,         // 2208 bytes (4416 hex chars) - change public key
  secret: sourceKeypair.secretKey,           // 32 bytes (64 hex chars) - secret key for signing

  // Transaction amounts
  balance: 10000,                            // Current balance in nanoMCM
  amount: 5000,                              // Amount to send in nanoMCM
  fee: 500,                                  // Transaction fee in nanoMCM

  // Destination (20-byte account tag)
  dstAccountTag: 'b'.repeat(40),             // 20 bytes (40 hex chars) - destination account tag
  memo: 'ABC-123'                            // Optional memo (max 16 chars)
};

console.log('   Balance:', txParams.balance, 'nanoMCM');
console.log('   Amount:', txParams.amount, 'nanoMCM');
console.log('   Fee:', txParams.fee, 'nanoMCM');
console.log('   Change:', txParams.balance - txParams.amount - txParams.fee, 'nanoMCM');
console.log('   Memo:', txParams.memo);
console.log();

// Step 3: Create and sign the transaction
console.log('3. Create and sign transaction...');
try {
  const transaction = createTransaction(txParams);

  console.log('   ✓ Transaction created successfully!');
  console.log('   Transaction Size:', transaction.size, 'bytes');
  console.log('   Message Hash:', transaction.messageHash);
  console.log('   Source Ledger Address:', transaction.sourceLedgerAddress);
  console.log('   Change Ledger Address:', transaction.changeLedgerAddress);
  console.log('   Destination Account Tag:', transaction.destinationAccountTag);
  console.log();

  console.log('4. Transaction hex (first 128 chars):');
  console.log('  ', transaction.transactionHex.substring(0, 128) + '...');
  console.log();

  console.log('=== Transaction Ready for Broadcast ===');
  console.log('\nTo broadcast this transaction:');
  console.log('  1. Ensure the source address has sufficient balance');
  console.log('  2. Use the broadcastTransaction() function with a valid API endpoint');
  console.log('  3. Pass transaction.transactionHex to the broadcast function');

} catch (error) {
  console.error('   ✗ Transaction creation failed:', error.message);
}
