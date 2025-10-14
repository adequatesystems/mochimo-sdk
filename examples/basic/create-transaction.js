#!/usr/bin/env node

/**
 * Example: Create and Sign a Mochimo Transaction
 *
 * Demonstrates how to create and sign offline transactions using the SDK.
 */

import { generateAddress, createTransaction } from '../../src/index.js';

console.log('=== Mochimo SDK - Transaction Creation Example ===\n');

// Step 1: Create (or pass in) source and change addresses
console.log('1. Generate source and change addresses...');
const sourceAddress = generateAddress({ seed: Buffer.from('0'.repeat(64), 'hex'), index: 0 });
const changeAddress = generateAddress({ seed: Buffer.from('1'.repeat(64), 'hex'), index: 1 });

console.log('   Source Address:', sourceAddress.address);
console.log('   Change Address:', changeAddress.address);
console.log();

// Step 2: Define transaction parameters
console.log('2. Set up transaction parameters...');
const txParams = {
  // Source account details
  srcTag: 'a'.repeat(40),                    // 20 bytes (40 hex chars) - source tag
  sourcePk: sourceAddress.publicKey,         // 2208 bytes (4416 hex chars) - WOTS+ public key
  changePk: changeAddress.publicKey,         // 2208 bytes (4416 hex chars) - change public key
  secret: sourceAddress.secretKey,           // 32 bytes (64 hex chars) - secret key for signing

  // Transaction amounts
  balance: 10000,                            // Current balance in nanoMCM
  amount: 5000,                              // Amount to send in nanoMCM
  fee: 500,                                  // Transaction fee in nanoMCM

  // Destination
  dstAddress: 'b'.repeat(20),                // 10 bytes (20 hex chars) - destination tag
  memo: 'ABC-123-DEF'                        // Optional memo (max 16 chars)
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
  console.log('   Source Address:', transaction.sourceAddress);
  console.log('   Change Address:', transaction.changeAddress);
  console.log('   Destination:', transaction.destinationAddress);
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
