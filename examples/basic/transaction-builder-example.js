/**
 * Example: Using Transaction Builder Helpers
 *
 * This example demonstrates the new transaction builder utilities that
 * simplify transaction creation and prevent common errors.
 */

import fs from 'fs';
import {
  buildTransaction,
  prepareTransactionFromWallet,
  getAddressInfo,
  extractTag
} from '../../src/index.js';
import { broadcastTransaction } from '../../src/network/broadcast.js';

async function main() {
  console.log('=== Transaction Builder Example ===\n');

  // Load wallet configuration
  const wallet = JSON.parse(fs.readFileSync('wallet-config.json', 'utf8'));

  // 1. Inspect source address
  console.log('1. Source Address Information:');
  const sourceInfo = getAddressInfo(wallet.source.address);
  console.log(`   Full Address: ${sourceInfo.full}`);
  console.log(`   Tag (Account): ${sourceInfo.tag}`);
  console.log(`   DSA (WOTS Key): ${sourceInfo.dsa}`);
  console.log(`   Type: ${sourceInfo.type}`);
  console.log(`   Implicit: ${sourceInfo.implicit ? 'Yes (first-time address)' : 'No (previously spent)'}`);
  console.log();

  // 2. Using buildTransaction (simplest method)
  console.log('2. Building transaction with buildTransaction():');
  const destinationTag = 'cd1234567890abcdef1234567890abcdef123456'; // 40 hex chars

  try {
    const tx = buildTransaction({
      sourceAddress: wallet.source.address,        // Full 80-char address (automatic tag extraction!)
      sourcePublicKey: wallet.source.publicKey,
      sourceSecret: wallet.source.seed,            // Secret key from wallet
      balance: wallet.source.balance,
      changePublicKey: wallet.change.publicKey,
      destinationAddress: destinationTag,          // Can be 40 or 80 hex chars
      amount: '5000',
      fee: '500',
      memo: 'EXAMPLE-1'
    });

    console.log('   ✅ Transaction created successfully!');
    console.log(`   Size: ${tx.length} bytes`);
    console.log();
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    console.log();
  }

  // 3. Using prepareTransactionFromWallet (even simpler!)
  console.log('3. Using prepareTransactionFromWallet():');
  try {
    const txParams = prepareTransactionFromWallet(
      wallet,
      destinationTag,
      '5000',
      {
        fee: '500',
        memo: 'EXAMPLE-2',
        blocksToLive: 1000
      }
    );

    console.log('   Transaction parameters prepared:');
    console.log(`   - Source: ${extractTag(txParams.sourceAddress)}...`);
    console.log(`   - Amount: ${txParams.amount} nanoMCM`);
    console.log(`   - Fee: ${txParams.fee} nanoMCM`);
    console.log(`   - Memo: ${txParams.memo}`);

    const tx = buildTransaction(txParams);
    console.log(`   ✅ Transaction built: ${tx.length} bytes`);
    console.log();
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    console.log();
  }

  // 4. Error handling examples
  console.log('4. Error Handling Examples:');

  // Example 4a: Invalid source address (wrong length)
  console.log('   4a. Testing with invalid source address length:');
  try {
    buildTransaction({
      sourceAddress: 'ab8599ef',  // Too short!
      sourcePublicKey: wallet.source.publicKey,
      sourceSecret: wallet.source.seed,
      balance: wallet.source.balance,
      changePublicKey: wallet.change.publicKey,
      destinationAddress: destinationTag,
      amount: '5000'
    });
  } catch (error) {
    console.log('   ❌ Expected error caught:', error.message.split('\n')[0]);
  }
  console.log();

  // Example 4b: Insufficient balance
  console.log('   4b. Testing with insufficient balance:');
  try {
    buildTransaction({
      sourceAddress: wallet.source.address,
      sourcePublicKey: wallet.source.publicKey,
      sourceSecret: wallet.source.seed,
      balance: '100',  // Only 100 nanoMCM!
      changePublicKey: wallet.change.publicKey,
      destinationAddress: destinationTag,
      amount: '5000',
      fee: '500'
    });
  } catch (error) {
    console.log('   ❌ Expected error caught:', error.message.split('\n')[0]);
  }
  console.log();

  // Example 4c: Invalid destination (wrong length)
  console.log('   4c. Testing with invalid destination length:');
  try {
    buildTransaction({
      sourceAddress: wallet.source.address,
      sourcePublicKey: wallet.source.publicKey,
      sourceSecret: wallet.source.seed,
      balance: wallet.source.balance,
      changePublicKey: wallet.change.publicKey,
      destinationAddress: 'cd1234',  // Too short!
      amount: '5000'
    });
  } catch (error) {
    console.log('   ❌ Expected error caught:', error.message.split('\n')[0]);
  }
  console.log();

  // 5. Understanding tag movement
  console.log('5. Understanding Tag Movement:');
  console.log('   When you spend from an address, the source TAG moves to the change address.');
  console.log('   This maintains your account identifier across multiple transactions.');
  console.log();
  console.log('   Example:');
  console.log('   Source Address:  TAG=ab8599ef... + DSA=ab8599ef... (implicit, first-time)');
  console.log('   Change Address:  TAG=ab8599ef... + DSA=1f98b520... (explicit, TAG moved!)');
  console.log();
  console.log('   After spending, your account TAG (ab8599ef...) persists,');
  console.log('   but the DSA portion changes (new WOTS+ keypair for quantum security).');
  console.log();

  console.log('=== Example Complete ===');
  console.log();
  console.log('Key Takeaways:');
  console.log('  ✅ Use buildTransaction() for automatic tag extraction');
  console.log('  ✅ Use prepareTransactionFromWallet() for wallet-based TXs');
  console.log('  ✅ The SDK validates all parameters and provides helpful errors');
  console.log('  ✅ Tags automatically move from source to change address');
  console.log('  ✅ Supports both 40-char (tag) and 80-char (full) destination addresses');
}

main().catch(console.error);
