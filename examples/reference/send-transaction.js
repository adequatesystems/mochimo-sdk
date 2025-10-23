/**
 * Create and Broadcast Transaction Script
 *
 * Creates an offline transaction from the funded source account,
 * sends 5000 nanoMCM to the destination account, with change to the change address,
 * then broadcasts it to the Mochimo network.
 *
 * TERMINOLOGY:
 * - Account Tag: 20-byte persistent account identifier (40 hex chars)
 * - Ledger Address: 40-byte entry (Account Tag + DSA Hash) = 80 hex chars
 * - dstAccountTag: Destination's 20-byte account tag (40 hex chars)
 */

import { createTransaction, broadcastTransaction, base58ToAddrTag } from '../../src/index.js';
import fs from 'fs';

const API_URL = 'https://api.mochimo.org';

console.log('=== Mochimo SDK - Create and Broadcast Transaction ===\n');

async function main() {
  // Load wallet configuration
  if (!fs.existsSync('wallet-config.json')) {
    console.error('✗ wallet-config.json not found. Run setup-wallets.js first.');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync('wallet-config.json', 'utf8'));

  console.log('Wallet Configuration:');
  console.log('  Source Address:', config.source.addressBase58);
  console.log('  Change Address:', config.change.address);
  console.log('  Destination:', config.destination.addressBase58);
  console.log();

  // Decode destination Base58 address
  console.log('1. Decoding destination address...');
  const destinationHex = base58ToAddrTag(config.destination.addressBase58).toString('hex');
  console.log(`   ✓ Destination hex (40 chars / 20 bytes): ${destinationHex}`);
  console.log();

  // Transaction parameters
  const balance = 100000; // Current balance in nanoMCM (0.0001 MCM)
  const amount = 5000;    // Amount to send in nanoMCM
  const fee = 500;        // Transaction fee in nanoMCM
  const changeAmount = balance - amount - fee; // 94500 nanoMCM

  console.log('2. Transaction Parameters:');
  console.log(`   Balance:       ${balance} nanoMCM`);
  console.log(`   Send Amount:   ${amount} nanoMCM`);
  console.log(`   Fee:           ${fee} nanoMCM`);
  console.log(`   Change Amount: ${changeAmount} nanoMCM`);
  console.log();

  // Create the transaction
  console.log('3. Creating and signing transaction...');
  try {
    // Extract the tag from the source address (first 20 bytes of the 40-byte address)
    // For implicit addresses (first time spent), tag == DSA hash
    // For subsequent spends, the tag persists and must move to change address
    const srcTag = config.source.address.substring(0, 40); // First 20 bytes (40 hex chars)

    const tx = createTransaction({
      srcTag: srcTag,                    // 40 hex chars (20 bytes) - the account tag
      sourcePk: config.source.publicKey, // 4416 hex chars
      changePk: config.change.publicKey, // 4416 hex chars
      balance: balance,                  // Current balance
      dstAddress: destinationHex,        // 40 hex chars (20 bytes)
      amount: amount,                    // Amount to send
      secret: config.source.seed,        // Secret key for signing
      memo: 'SDK-123',                   // Memo (must alternate: letters-numbers)
      fee: fee                           // Transaction fee
    });

    console.log('   ✓ Transaction created successfully!');
    console.log(`   Transaction Size: ${tx.size} bytes`);
    console.log(`   Message Hash: ${tx.messageHash}`);
    console.log(`   Source Address: ${tx.sourceAddress}`);
    console.log(`   Change Address: ${tx.changeAddress}`);
    console.log(`   Destination: ${tx.destinationAddress}`);
    console.log(`   TX Hex (first 100 chars): ${tx.transactionHex.substring(0, 100)}...`);
    console.log();

    // Broadcast the transaction
    console.log('4. Broadcasting transaction to network...');
    console.log(`   API Endpoint: ${API_URL}`);
    console.log();

    const result = await broadcastTransaction(
      tx.transactionHex,
      API_URL,
      {
        timeout: 30000,
        retries: 2,
        retryDelay: 1000
      }
    );

    console.log('   ✓ Transaction broadcast successful!');
    console.log();
    console.log('=== Broadcast Result ===');
    console.log('   Transaction ID:', result.txid);
    console.log('   Success:', result.success);
    console.log('   HTTP Status:', result.status);
    console.log();

    // Save transaction details
    const txRecord = {
      timestamp: new Date().toISOString(),
      txid: result.txid,
      messageHash: tx.messageHash,
      sourceAddress: tx.sourceAddress,
      changeAddress: tx.changeAddress,
      destinationAddress: tx.destinationAddress,
      amount: amount,
      fee: fee,
      changeAmount: changeAmount,
      memo: 'SDK-TEST',
      transactionHex: tx.transactionHex,
      broadcastResult: result
    };

    const txHistoryFile = 'transaction-history.json';
    let history = [];
    if (fs.existsSync(txHistoryFile)) {
      history = JSON.parse(fs.readFileSync(txHistoryFile, 'utf8'));
    }
    history.push(txRecord);
    fs.writeFileSync(txHistoryFile, JSON.stringify(history, null, 2));

    console.log('   ✓ Transaction saved to transaction-history.json');
    console.log();

    // Provide next steps
    console.log('=== Next Steps ===');
    console.log('1. Check mempool to see your transaction:');
    console.log(`   npm run check:mempool`);
    console.log();
    console.log('2. Check transaction details:');
    console.log(`   node examples/reference/check-mempool.js --tx ${result.txid}`);
    console.log();
    console.log('3. Monitor transaction status:');
    console.log(`   node examples/reference/search-transactions.js --tx ${result.txid}`);
    console.log();
    console.log('4. Once confirmed, check balances:');
    console.log('   npm run check:balance');

  } catch (error) {
    console.error('   ✗ Transaction failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
