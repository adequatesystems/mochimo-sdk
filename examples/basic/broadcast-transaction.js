#!/usr/bin/env node

/**
 * Example: Broadcast a Transaction to the Mochimo Network
 *
 * Demonstrates how to broadcast a signed transaction and query account balances.
 *
 * TERMINOLOGY:
 * - Account Keypair: WOTS+ public/private key pair
 * - Ledger Address: 40-byte entry (Account Tag + DSA Hash)
 * - Account Tag: 20-byte persistent identifier
 *
 * IMPORTANT: This example requires:
 * 1. A valid API endpoint (e.g., https://api.mochimo.org)
 * 2. A funded source account with sufficient balance
 * 3. Network connectivity
 */

import { generateAccountKeypair, createTransaction, broadcastTransaction, getAccountBalance } from '../../src/index.js';

// Configuration
const API_URL = process.env.MOCHIMO_API_URL || 'https://api.mochimo.org';
const USE_LIVE_NETWORK = process.env.MOCHIMO_LIVE === 'true';

console.log('=== Mochimo SDK - Transaction Broadcast Example ===\n');

if (!USE_LIVE_NETWORK) {
  console.log('⚠️  DRY RUN MODE - Set MOCHIMO_LIVE=true to broadcast to real network\n');
}

async function main() {
  try {
    // Step 1: Create account keypairs
    console.log('1. Generate account keypairs...');
    const sourceKeypair = generateAccountKeypair({ seed: Buffer.from('0'.repeat(64), 'hex'), index: 0 });
    const changeKeypair = generateAccountKeypair({ seed: Buffer.from('1'.repeat(64), 'hex'), index: 1 });

    console.log('   Source DSA Hash:', sourceKeypair.dsaHash.toString('hex'));
    console.log('   Source Account Tag:', sourceKeypair.accountTag.toString('hex'));
    console.log('   Change DSA Hash:', changeKeypair.dsaHash.toString('hex'));
    console.log('   Change Account Tag:', changeKeypair.accountTag.toString('hex'));
    console.log();

    if (USE_LIVE_NETWORK) {
      // Step 2: Check balance (live network only)
      console.log('2. Query source account balance...');
      try {
        const sourceLedgerAddress = sourceKeypair.dsaHash.toString('hex');
        const balance = await getAccountBalance(sourceLedgerAddress, API_URL);
        console.log('   Ledger Address:', balance.address);
        console.log('   Balance:', balance.balance, 'nanoMCM');
        console.log('   Block:', balance.block?.index || 'unknown');
        console.log();

        if (BigInt(balance.balance) < 1001) {
          console.log('   ⚠️  Insufficient balance for transaction (need at least 1001 nanoMCM)');
          console.log('   Please fund this address and try again.');
          return;
        }
      } catch (error) {
        console.log('   ⚠️  Could not query balance:', error.message);
        console.log('   Proceeding with example balance...');
        console.log();
      }
    }

    // Step 3: Create transaction
    console.log(USE_LIVE_NETWORK ? '3. Create transaction...' : '2. Create transaction...');
    const txParams = {
      srcTag: 'a'.repeat(40),
      sourcePk: sourceAddress.publicKey,
      changePk: changeAddress.publicKey,
      secret: sourceAddress.secretKey,
      balance: 10000,
      amount: 5000,
      fee: 500,
      dstAddress: 'b'.repeat(20),
      memo: 'SDK-123-DEMO'
    };

    const transaction = createTransaction(txParams);
    console.log('   ✓ Transaction created');
    console.log('   Size:', transaction.size, 'bytes');
    console.log('   Hash:', transaction.messageHash);
    console.log();

    // Step 4: Broadcast transaction
    if (USE_LIVE_NETWORK) {
      console.log('4. Broadcasting transaction to network...');
      console.log('   API:', API_URL);

      const result = await broadcastTransaction(
        transaction.transactionHex,
        API_URL,
        {
          timeout: 30000,
          retries: 2,
          retryDelay: 1000
        }
      );

      console.log('   ✓ Transaction broadcast successful!');
      console.log('   Transaction ID:', result.txid);
      console.log('   Status:', result.status);
      console.log();

      console.log('=== Broadcast Complete ===');
      console.log('\nTransaction has been submitted to the network.');
      console.log('Monitor the transaction ID to track confirmation.');

    } else {
      console.log('3. Broadcast (dry run)...');
      console.log('   Transaction ready for broadcast:');
      console.log('   - Size:', transaction.size, 'bytes');
      console.log('   - Hex (first 64 chars):', transaction.transactionHex.substring(0, 64) + '...');
      console.log();
      console.log('=== Dry Run Complete ===');
      console.log('\nTo broadcast to live network:');
      console.log('  export MOCHIMO_LIVE=true');
      console.log('  export MOCHIMO_API_URL=https://api.mochimo.org');
      console.log('  node examples/basic/broadcast-transaction.js');
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the example
main();
