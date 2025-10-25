/**
 * Example 3: Send Withdrawal
 *
 * This example demonstrates:
 * - Loading user account and master seed
 * - Deriving the current WOTS+ keypair (for signing)
 * - Deriving the next WOTS+ keypair (for change)
 * - Creating a signed transaction
 * - Broadcasting to the network
 * - Verifying transaction in mempool
 * - Updating spend index
 *
 * Prerequisites:
 * - Run Example 1 to create user account
 * - Run Example 2 to verify account has funds
 * - Have a destination Account Tag to send to
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deriveKeypairForSpend } from '../../src/core/deterministic.js';
import { createTransaction } from '../../src/core/transaction.js';
import { base58ToAddrTag } from '../../src/utils/base58.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://api.mochimo.org';
const dataDir = path.join(__dirname, 'data');

console.log('='.repeat(70));
console.log('  Mochimo Exchange Integration - Example 3: Send Withdrawal');
console.log('='.repeat(70));
console.log();

// ============================================================================
// Configuration
// ============================================================================

// CHANGE THIS: Enter the destination Account Tag (must be Base58+CRC)
const DESTINATION_ACCOUNT_TAG_BASE58 = 'tq2WffaSEfQ2ZPGq7mNy7Svj1SiApG';

// Withdrawal amount in nanoMCM (1 MCM = 1,000,000,000 nanoMCM)
const WITHDRAWAL_AMOUNT = '4000';  // Amount to send in nanoMCM
const TX_FEE = '500';  // Transaction fee in nanoMCM

// Convert Base58 to hex
let DESTINATION_ACCOUNT_TAG;
try {
  const destTagBuffer = base58ToAddrTag(DESTINATION_ACCOUNT_TAG_BASE58);
  DESTINATION_ACCOUNT_TAG = destTagBuffer.toString('hex');
  console.log('✓ Destination address decoded:');
  console.log('  Base58:', DESTINATION_ACCOUNT_TAG_BASE58);
  console.log('  Hex:', DESTINATION_ACCOUNT_TAG);
} catch (error) {
  console.error('✗ Invalid Base58 address:', error.message);
  process.exit(1);
}
console.log();

console.log('⚙️  Configuration:');
console.log('  Destination (Base58):', DESTINATION_ACCOUNT_TAG_BASE58);
console.log('  Destination (Hex):', DESTINATION_ACCOUNT_TAG);
console.log('  Amount:', WITHDRAWAL_AMOUNT, 'nanoMCM');
console.log('  Fee:', TX_FEE, 'nanoMCM');
console.log();

if (!DESTINATION_ACCOUNT_TAG || DESTINATION_ACCOUNT_TAG.length !== 40) {
  console.error('✗ Invalid destination Account Tag!');
  console.error('  Must be exactly 40 hex characters (20 bytes).');
  console.error('  Got:', DESTINATION_ACCOUNT_TAG?.length || 0, 'characters');
  console.error();
  process.exit(1);
}

// ============================================================================
// STEP 1: Load User Account and Master Seed
// ============================================================================

console.log('Step 1: Load User Account and Master Seed');
console.log('-'.repeat(70));
console.log();

const userAccountPath = path.join(dataDir, 'user-account.json');
const masterSeedPath = path.join(dataDir, 'master-seed.txt');

if (!fs.existsSync(userAccountPath)) {
  console.error('✗ User account file not found!');
  console.error('  Please run example 1-generate-user-account.js first.');
  process.exit(1);
}

if (!fs.existsSync(masterSeedPath)) {
  console.error('✗ Master seed file not found!');
  console.error('  Please run example 1-generate-user-account.js first.');
  process.exit(1);
}

const userAccount = JSON.parse(fs.readFileSync(userAccountPath, 'utf8'));
const masterSeedHex = fs.readFileSync(masterSeedPath, 'utf8').trim();
const masterSeed = Buffer.from(masterSeedHex, 'hex');

console.log('✓ User Account Loaded:');
console.log('  User ID:', userAccount.user_id);
console.log('  Account Index:', userAccount.account_index);
console.log('  Account Tag:', userAccount.account_tag);
console.log('  Current Spend Index:', userAccount.spend_index);
console.log();

console.log('✓ Master Seed Loaded:');
console.log('  Length:', masterSeed.length, 'bytes');
console.log('  (In production: decrypt from secure storage)');
console.log();

// ============================================================================
// STEP 2: Check Balance
// ============================================================================

console.log('Step 2: Verify Sufficient Balance');
console.log('-'.repeat(70));
console.log();

async function checkBalance(accountTag, currentSpendIndex) {
  try {
    let ledgerAddress;

    if (currentSpendIndex === 0) {
      // Implicit address (never spent before)
      ledgerAddress = `0x${accountTag}${accountTag}`;
    } else {
      // Derive the current address from the previous spend's change
      const currentKeypair = deriveKeypairForSpend(masterSeed, currentSpendIndex, userAccount.account_index);
      const currentDsaHash = currentKeypair.dsaHashHex.substring(0, 40);
      ledgerAddress = `0x${accountTag}${currentDsaHash}`;
    }

    console.log(`Querying balance at spend index ${currentSpendIndex}...`);
    console.log('  Ledger Address:', ledgerAddress);
    console.log();

    const response = await fetch(`${API_URL}/account/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network_identifier: {
          blockchain: 'mochimo',
          network: 'mainnet'
        },
        account_identifier: {
          address: ledgerAddress
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.balances && data.balances.length > 0) {
      const balanceNanoMCM = data.balances[0].value;
      const balanceMCM = (parseFloat(balanceNanoMCM) / 1_000_000_000).toFixed(9);

      console.log('✓ Current Balance:');
      console.log('  ' + balanceNanoMCM + ' nanoMCM');
      console.log('  ' + balanceMCM + ' MCM');
      console.log();

      return balanceNanoMCM;
    } else {
      throw new Error('No balance found - account may not have funds');
    }

  } catch (error) {
    console.error('✗ Error checking balance:', error.message);
    console.error();
    console.error('Account needs funds before withdrawal can be processed.');
    console.error('Please run example 2-check-deposit.js to verify deposits.');
    console.error();
    throw error;
  }
}

let currentBalance;

try {
  currentBalance = await checkBalance(userAccount.account_tag, userAccount.spend_index);
} catch (error) {
  process.exit(1);
}

// Verify sufficient balance
const totalNeeded = BigInt(WITHDRAWAL_AMOUNT) + BigInt(TX_FEE);
if (BigInt(currentBalance) < totalNeeded) {
  console.error('✗ Insufficient Balance!');
  console.error('  Need:', totalNeeded.toString(), 'nanoMCM');
  console.error('  Have:', currentBalance, 'nanoMCM');
  console.error('  Short:', (totalNeeded - BigInt(currentBalance)).toString(), 'nanoMCM');
  console.error();
  process.exit(1);
}

console.log('✓ Sufficient balance for withdrawal');
console.log();

// ============================================================================
// STEP 3: Derive WOTS+ Keypairs
// ============================================================================

console.log('Step 3: Derive WOTS+ Keypairs');
console.log('-'.repeat(70));
console.log();

console.log('⚠️  CRITICAL: WOTS+ Security');
console.log('  WOTS+ (Winternitz One-Time Signature Plus) is quantum-resistant');
console.log('  but each keypair can only sign ONE transaction.');
console.log('  Never reuse a spend index!');
console.log();

// Derive source keypair (current spend index) - for signing this transaction
console.log(`Deriving SOURCE keypair (spend index ${userAccount.spend_index})...`);
const sourceKeypair = deriveKeypairForSpend(
  masterSeed,
  userAccount.spend_index,
  userAccount.account_index
);

console.log('✓ Source Keypair Derived:');
console.log('  Account Tag:', sourceKeypair.accountTagHex);
console.log('  DSA Hash:', sourceKeypair.dsaHashHex);
console.log('  Public Key: 2208 bytes');
console.log('  Secret Key: 32 bytes');
console.log('  (This keypair will be used to sign the transaction)');
console.log();

// Derive change keypair (next spend index) - for receiving change
const nextSpendIndex = userAccount.spend_index + 1;
console.log(`Deriving CHANGE keypair (spend index ${nextSpendIndex})...`);
const changeKeypair = deriveKeypairForSpend(
  masterSeed,
  nextSpendIndex,
  userAccount.account_index
);

console.log('✓ Change Keypair Derived:');
console.log('  Account Tag:', changeKeypair.accountTagHex);
console.log('  DSA Hash:', changeKeypair.dsaHashHex);
console.log('  Public Key: 2208 bytes');
console.log('  (Change from this transaction will go to this new address)');
console.log();

console.log('📌 Important Notes:');
console.log('  • Account Tag stays the same:', sourceKeypair.accountTagHex);
console.log('  • DSA Hash changes with each spend');
console.log('  • Source DSA:', sourceKeypair.dsaHashHex.substring(0, 20) + '...');
console.log('  • Change DSA:', changeKeypair.dsaHashHex.substring(0, 20) + '...');
console.log();

// ============================================================================
// STEP 4: Create Transaction
// ============================================================================

console.log('Step 4: Create and Sign Transaction');
console.log('-'.repeat(70));
console.log();

console.log('Creating transaction with parameters:');
console.log('  Source Account Tag:', userAccount.account_tag);
console.log('  Source Public Key:', '2208 bytes (WOTS+)');
console.log('  Balance:', currentBalance, 'nanoMCM');
console.log('  Change Public Key:', '2208 bytes (WOTS+)');
console.log('  Destination Tag:', DESTINATION_ACCOUNT_TAG);
console.log('  Amount:', WITHDRAWAL_AMOUNT, 'nanoMCM');
console.log('  Fee:', TX_FEE, 'nanoMCM');
console.log();

let transaction;
let txResult;

try {
  txResult = createTransaction({
    srcTag: userAccount.account_tag,
    sourcePk: sourceKeypair.publicKey.toString('hex'),
    secret: sourceKeypair.secretKey.toString('hex'),
    balance: currentBalance,
    changePk: changeKeypair.publicKey.toString('hex'),
    dstAccountTag: DESTINATION_ACCOUNT_TAG,
    amount: WITHDRAWAL_AMOUNT,
    fee: TX_FEE,
    memo: ''  // Optional memo field
  });

  // Extract transaction buffer from result object
  transaction = txResult.transaction;

  console.log('✓ Transaction Created and Signed!');
  console.log('  Transaction Size:', txResult.size, 'bytes');
  console.log('  Send Amount:', txResult.sendAmount, 'nanoMCM');
  console.log('  Change Amount:', txResult.changeAmount, 'nanoMCM');
  console.log('  Fee:', txResult.fee, 'nanoMCM');
  console.log('  Transaction Hex:', txResult.transactionHex.substring(0, 100) + '...');
  console.log();

} catch (error) {
  console.error('✗ Error creating transaction:', error.message);
  console.error();
  process.exit(1);
}

// ============================================================================
// STEP 5: Broadcast Transaction
// ============================================================================

console.log('Step 5: Broadcast Transaction to Network');
console.log('-'.repeat(70));
console.log();

async function broadcastTransaction(txBuffer) {
  try {
    const txHex = txBuffer.toString('hex');

    console.log('Broadcasting transaction...');
    console.log('  API Endpoint:', API_URL);
    console.log('  Transaction size:', txHex.length / 2, 'bytes');
    console.log();

    const response = await fetch(`${API_URL}/construction/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network_identifier: {
          blockchain: 'mochimo',
          network: 'mainnet'
        },
        signed_transaction: txHex
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();

    console.log('✓ Transaction Broadcast Successful!');
    console.log();
    console.log('Transaction Identifier:');
    console.log('  TX ID:', data.transaction_identifier?.hash || 'N/A');
    console.log();

    return data;

  } catch (error) {
    console.error('✗ Broadcast failed:', error.message);
    console.error();
    throw error;
  }
}

let broadcastResult;

try {
  broadcastResult = await broadcastTransaction(transaction);
} catch (error) {
  console.error('⚠️  Transaction was created but broadcast failed.');
  console.error('   Spend index should NOT be incremented.');
  process.exit(1);
}

// ============================================================================
// STEP 6: Update Spend Index
// ============================================================================

console.log('Step 6: Update Spend Index');
console.log('-'.repeat(70));
console.log();

console.log('⚠️  CRITICAL: Spend Index Management');
console.log('  The spend index MUST be incremented after successful broadcast.');
console.log('  In production: Use atomic database transaction.');
console.log();

console.log('⚠️  Important:');
console.log('  In production: Ensure atomic spend index updates.');
console.log('  1. Broadcast transaction');
console.log('  2. If successful, increment spend_index');
console.log('  3. If broadcast fails, DO NOT increment spend_index');
console.log();

// In production: Implement atomic spend index increment
userAccount.spend_index = nextSpendIndex;
userAccount.last_withdrawal_at = new Date().toISOString();

fs.writeFileSync(userAccountPath, JSON.stringify(userAccount, null, 2));

console.log('✓ Spend Index Updated:');
console.log('  Previous Index:', userAccount.spend_index - 1);
console.log('  New Index:', userAccount.spend_index);
console.log();

console.log('⚠️  The keypair for spend index', userAccount.spend_index - 1, 'has been used');
console.log('   and MUST NEVER be used again!');
console.log();

// ============================================================================
// STEP 7: Verify Transaction in Mempool
// ============================================================================

console.log('Step 7: Verify Transaction in Mempool');
console.log('-'.repeat(70));
console.log();

async function checkMempool() {
  try {
    console.log('Checking mempool for transaction...');
    console.log();

    const response = await fetch(`${API_URL}/mempool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network_identifier: {
          blockchain: 'mochimo',
          network: 'mainnet'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.transaction_identifiers && data.transaction_identifiers.length > 0) {
      console.log(`✓ Mempool contains ${data.transaction_identifiers.length} transaction(s)`);

      const txId = broadcastResult.transaction_identifier?.hash;
      if (txId) {
        const found = data.transaction_identifiers.some(tx => tx.hash === txId);
        if (found) {
          console.log('✅ Your transaction is in the mempool!');
          console.log('   TX ID:', txId);
        } else {
          console.log('⏳ Transaction not yet visible in mempool');
          console.log('   (This is normal - may take a few seconds)');
        }
      }
    } else {
      console.log('ℹ️  Mempool is empty');
    }
    console.log();

    return data;

  } catch (error) {
    console.error('⚠️  Could not verify mempool:', error.message);
    console.error('   Transaction was broadcast but mempool check failed.');
    console.error();
  }
}

await checkMempool();

// ============================================================================
// Summary
// ============================================================================

console.log('='.repeat(70));
console.log('Withdrawal Summary:');
console.log('='.repeat(70));
console.log();

console.log('📤 Transaction Details:');
console.log('  From Account:', userAccount.account_tag);
console.log('  To Account:', DESTINATION_ACCOUNT_TAG);
console.log('  Amount:', (parseFloat(WITHDRAWAL_AMOUNT) / 1_000_000_000).toFixed(9), 'MCM');
console.log('  Fee:', (parseFloat(TX_FEE) / 1_000_000_000).toFixed(9), 'MCM');
console.log();

console.log('🔑 Keypairs Used:');
console.log('  Source (spend index', userAccount.spend_index - 1, '):', sourceKeypair.dsaHashHex.substring(0, 20) + '...');
console.log('  Change (spend index', userAccount.spend_index, '):', changeKeypair.dsaHashHex.substring(0, 20) + '...');
console.log();

console.log('📊 Account State:');
console.log('  Account Tag (unchanged):', userAccount.account_tag);
console.log('  Current Spend Index:', userAccount.spend_index);
console.log('  Next Spend Index:', userAccount.spend_index + 1);
console.log();

console.log('✅ Withdrawal Complete!');
console.log();

console.log('Next Steps:');
console.log('  1. Wait for transaction to be confirmed on blockchain');
console.log('  2. Monitor transaction status via TX ID');
console.log('  3. Update user balance tracking after confirmation');
console.log('  4. For next withdrawal, use spend index:', userAccount.spend_index);
console.log();

console.log('⚠️  IMPORTANT REMINDERS:');
console.log('  • Spend index has been incremented to:', userAccount.spend_index);
console.log('  • Previous spend index (', userAccount.spend_index - 1, ') is now BURNED');
console.log('  • Account Tag remains the same for all future deposits');
console.log('  • DSA Hash will change with each spend');
console.log();

console.log('='.repeat(70));
