/**
 * Step 3: Send Withdrawal
 * 
 * Demonstrates the complete withdrawal workflow:
 * - Validate destination address
 * - Check current balance
 * - Derive source and change keypairs
 * - Create and sign transaction
 * - Broadcast to network
 * - Update spend index
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
console.log('  Step 3: Send Withdrawal');
console.log('='.repeat(70));
console.log();

// Configuration
const DESTINATION_ADDRESS_BASE58 = 'tq2WffaSEfQ2ZPGq7mNy7Svj1SiApG';
const WITHDRAWAL_AMOUNT = '10000';  // 10000 nanoMCM
const TX_FEE = '500';  // 500 nanoMCM

console.log('Configuration:');
console.log('  Destination:', DESTINATION_ADDRESS_BASE58);
console.log('  Amount:', WITHDRAWAL_AMOUNT, 'nanoMCM');
console.log('  Fee:', TX_FEE, 'nanoMCM');
console.log();

// Step 1: Validate destination address
console.log('Step 1: Validate Destination Address');
console.log('-'.repeat(70));

if (!validateBase58Tag(DESTINATION_ADDRESS_BASE58)) {
  console.error('ERROR: Invalid Base58 address format');
  process.exit(1);
}

let destinationAccountTag;
try {
  const destTagBuffer = base58ToAddrTag(DESTINATION_ADDRESS_BASE58);
  destinationAccountTag = destTagBuffer.toString('hex');
  console.log('SUCCESS: Address validated');
  console.log('  Base58:', DESTINATION_ADDRESS_BASE58);
  console.log('  Hex:', destinationAccountTag);
} catch (error) {
  console.error('ERROR: Failed to decode address:', error.message);
  process.exit(1);
}
console.log();

// Step 2: Load account data
console.log('Step 2: Load Account Data');
console.log('-'.repeat(70));

const accountData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'account.json'), 'utf8')
);

const masterSeed = Buffer.from(accountData.masterSeed, 'hex');

console.log('Account loaded:');
console.log('  Account Tag:', accountData.accountTag);
console.log('  Current Spend Index:', accountData.spendIndex);
console.log('  Master Seed: 32 bytes');
console.log();

// Step 3: Check current balance
console.log('Step 3: Check Current Balance');
console.log('-'.repeat(70));

async function checkBalance(accountTag, spendIndex) {
  let ledgerAddress;
  
  if (spendIndex === 0) {
    // For new accounts (never spent), use account tag repeated
    ledgerAddress = `0x${accountTag}${accountTag}`;
  } else {
    // For spent accounts, derive current address from previous spend's change
    const currentKeypair = deriveKeypairForSpend(masterSeed, spendIndex, accountData.accountIndex);
    const currentDsaHash = currentKeypair.dsaHashHex.substring(0, 40);
    ledgerAddress = `0x${accountTag}${currentDsaHash}`;
  }

  console.log('Querying balance...');
  console.log('  Ledger Address:', ledgerAddress);

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

// Verify sufficient balance
const totalNeeded = BigInt(WITHDRAWAL_AMOUNT) + BigInt(TX_FEE);
if (BigInt(currentBalance) < totalNeeded) {
  console.error('ERROR: Insufficient balance');
  console.error('  Need:', totalNeeded.toString(), 'nanoMCM');
  console.error('  Have:', currentBalance, 'nanoMCM');
  process.exit(1);
}

console.log('SUCCESS: Sufficient balance for withdrawal');
console.log();

// Step 4: Derive keypairs
console.log('Step 4: Derive WOTS+ Keypairs');
console.log('-'.repeat(70));

// Source keypair (current spend index) - for signing
console.log(`Deriving source keypair (spend index ${accountData.spendIndex})...`);
const sourceKeypair = deriveKeypairForSpend(
  masterSeed,
  accountData.spendIndex,
  accountData.accountIndex
);

console.log('SUCCESS: Source keypair derived');
console.log('  Will sign this transaction');

// Change keypair (next spend index) - for receiving change
const nextSpendIndex = accountData.spendIndex + 1;
console.log(`Deriving change keypair (spend index ${nextSpendIndex})...`);
const changeKeypair = deriveKeypairForSpend(
  masterSeed,
  nextSpendIndex,
  accountData.accountIndex
);

console.log('SUCCESS: Change keypair derived');
console.log('  Will receive change from this transaction');
console.log();

// Step 5: Create transaction
console.log('Step 5: Create and Sign Transaction');
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
    amount: WITHDRAWAL_AMOUNT,
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

// Step 6: Broadcast transaction
console.log('Step 6: Broadcast Transaction');
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

// Step 7: Update spend index
console.log('Step 7: Update Account State');
console.log('-'.repeat(70));

accountData.spendIndex = nextSpendIndex;
accountData.lastTransactionId = txId;
accountData.lastWithdrawal = {
  destination: DESTINATION_ADDRESS_BASE58,
  amount: WITHDRAWAL_AMOUNT,
  fee: TX_FEE,
  txId: txId,
  timestamp: new Date().toISOString()
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
console.log('  Withdrawal Complete!');
console.log('='.repeat(70));
console.log();
console.log('Transaction ID:', txId);
console.log();
console.log('Next Steps:');
console.log('  1. Run step3a-check-mempool.js to verify TX in mempool');
console.log('  2. Run step3b-check-balance.js to verify recipient balance');
console.log('  3. Run step3c-check-transactions.js to verify TX history');
