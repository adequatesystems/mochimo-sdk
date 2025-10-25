/**
 * Step 4: Send Remaining Balance
 *
 * Tests that the change address from the previous withdrawal is spendable.
 * This verifies that spend index 1 works correctly after incrementing.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deriveKeypairForSpend } from '../../../src/core/deterministic.js';
import { createTransaction } from '../../../src/core/transaction.js';
import { base58ToAddrTag, validateBase58Tag } from '../../../src/utils/base58.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://api.mochimo.org';

console.log('='.repeat(70));
console.log('  Step 4: Send Remaining Balance (Test Change Address)');
console.log('='.repeat(70));
console.log();

// Load account data
const accountData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'account.json'), 'utf8')
);

const masterSeed = Buffer.from(accountData.masterSeed, 'hex');

// Use same destination as before
const DESTINATION_ADDRESS_BASE58 = accountData.lastWithdrawal.destination;
const TX_FEE = '500';  // 500 nanoMCM

console.log('Configuration:');
console.log('  Destination:', DESTINATION_ADDRESS_BASE58);
console.log('  Current Spend Index:', accountData.spendIndex);
console.log('  Fee:', TX_FEE, 'nanoMCM');
console.log('  (Will send ALL remaining balance minus fee)');
console.log();

// Validate destination address
if (!validateBase58Tag(DESTINATION_ADDRESS_BASE58)) {
  console.error('ERROR: Invalid Base58 address');
  process.exit(1);
}

const destinationAccountTag = base58ToAddrTag(DESTINATION_ADDRESS_BASE58).toString('hex');

// Check current balance
console.log('Step 1: Check Current Balance at Spend Index', accountData.spendIndex);
console.log('-'.repeat(70));

async function checkBalance(accountTag, spendIndex) {
  // For spend index > 0, we need to derive the current address
  const currentKeypair = deriveKeypairForSpend(masterSeed, spendIndex, accountData.accountIndex);
  const currentDsaHash = currentKeypair.dsaHashHex.substring(0, 40);
  const ledgerAddress = `0x${accountTag}${currentDsaHash}`;

  console.log('Querying balance...');
  console.log('  Spend Index:', spendIndex);
  console.log('  Account Tag:', accountTag);
  console.log('  DSA Hash:', currentDsaHash);
  console.log('  Ledger Address:', ledgerAddress);
  console.log('  (This is the change address from previous spend)');

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
    return data.balances[0].value;
  } else {
    throw new Error('No balance found');
  }
}

let currentBalance;
try {
  currentBalance = await checkBalance(accountData.accountTag, accountData.spendIndex);
  const balanceMCM = (parseFloat(currentBalance) / 1_000_000_000).toFixed(9);
  console.log('SUCCESS: Balance retrieved');
  console.log('  ' + currentBalance + ' nanoMCM');
  console.log('  ' + balanceMCM + ' MCM');
} catch (error) {
  console.error('ERROR: Failed to check balance:', error.message);
  process.exit(1);
}
console.log();

// Calculate amount to send (all balance minus fee)
const totalFee = BigInt(TX_FEE);
const availableBalance = BigInt(currentBalance);

if (availableBalance <= totalFee) {
  console.error('ERROR: Insufficient balance to cover fee');
  console.error('  Balance:', availableBalance.toString(), 'nanoMCM');
  console.error('  Fee:', totalFee.toString(), 'nanoMCM');
  process.exit(1);
}

const sendAmount = (availableBalance - totalFee).toString();

console.log('Calculated Send Amount:');
console.log('  Total Balance:', availableBalance.toString(), 'nanoMCM');
console.log('  Transaction Fee:', totalFee.toString(), 'nanoMCM');
console.log('  Send Amount:', sendAmount, 'nanoMCM');
console.log('  Change Amount: 0 nanoMCM (sending everything)');
console.log();

// Derive keypairs
console.log('Step 2: Derive WOTS+ Keypairs');
console.log('-'.repeat(70));

// Source keypair (current spend index 1)
console.log(`Deriving source keypair (spend index ${accountData.spendIndex})...`);
const sourceKeypair = deriveKeypairForSpend(
  masterSeed,
  accountData.spendIndex,
  accountData.accountIndex
);

console.log('SUCCESS: Source keypair derived');
console.log('  This is the change address from previous withdrawal');

// Change keypair (next spend index 2)
const nextSpendIndex = accountData.spendIndex + 1;
console.log(`Deriving change keypair (spend index ${nextSpendIndex})...`);
const changeKeypair = deriveKeypairForSpend(
  masterSeed,
  nextSpendIndex,
  accountData.accountIndex
);

console.log('SUCCESS: Change keypair derived');
console.log('  (Will receive 0 change since we are sending all funds)');
console.log();

// Create transaction
console.log('Step 3: Create and Sign Transaction');
console.log('-'.repeat(70));

let txResult;
try {
  txResult = createTransaction({
    srcTag: accountData.accountTag,
    sourcePk: sourceKeypair.publicKey.toString('hex'),
    secret: sourceKeypair.secretKey.toString('hex'),
    balance: currentBalance,
    changePk: changeKeypair.publicKey.toString('hex'),
    dstAccountTag: destinationAccountTag,
    amount: sendAmount,
    fee: TX_FEE,
    memo: ''
  });

  console.log('SUCCESS: Transaction created and signed');
  console.log('  Transaction Size:', txResult.size, 'bytes');
  console.log('  Send Amount:', txResult.sendAmount, 'nanoMCM');
  console.log('  Change Amount:', txResult.changeAmount, 'nanoMCM');
} catch (error) {
  console.error('ERROR: Failed to create transaction:', error.message);
  process.exit(1);
}
console.log();

// Broadcast transaction
console.log('Step 4: Broadcast Transaction');
console.log('-'.repeat(70));

async function broadcastTransaction(txBuffer) {
  const txHex = txBuffer.toString('hex');

  console.log('Broadcasting transaction...');
  console.log('  Size:', txBuffer.length, 'bytes');

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
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data;
}

let txId;
try {
  const broadcastResult = await broadcastTransaction(txResult.transaction);
  txId = broadcastResult.transaction_identifier.hash;

  console.log('SUCCESS: Transaction broadcast!');
  console.log('  TX ID:', txId);
} catch (error) {
  console.error('ERROR: Failed to broadcast transaction:', error.message);
  process.exit(1);
}
console.log();

// Update spend index
console.log('Step 5: Update Account State');
console.log('-'.repeat(70));

accountData.spendIndex = nextSpendIndex;
accountData.lastTransactionId = txId;
accountData.lastWithdrawal = {
  destination: DESTINATION_ADDRESS_BASE58,
  amount: sendAmount,
  fee: TX_FEE,
  txId: txId,
  timestamp: new Date().toISOString(),
  note: 'Sent remaining balance - final test'
};

fs.writeFileSync(
  path.join(__dirname, 'data', 'account.json'),
  JSON.stringify(accountData, null, 2)
);

console.log('SUCCESS: Account state updated');
console.log('  New Spend Index:', accountData.spendIndex);
console.log('  TX ID recorded:', txId);
console.log();

console.log('='.repeat(70));
console.log('  Final Withdrawal Complete!');
console.log('='.repeat(70));
console.log();
console.log('Transaction ID:', txId);
console.log();
console.log('Key Achievement:');
console.log('  Successfully spent from change address (spend index 1)');
console.log('  This proves the spend index increment workflow works correctly!');
console.log();
console.log('Next: Wait for confirmation and verify recipient received full amount');
