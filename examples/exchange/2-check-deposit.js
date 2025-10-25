/**
 * Example 2: Check Deposit
 *
 * This example demonstrates:
 * - Loading the user account created in Example 1
 * - Checking for transactions in the mempool
 * - Verifying the account balance
 *
 * Prerequisites:
 * - Run Example 1 first to create user account
 * - User must send MCM to the Account Tag (deposit address)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://api.mochimo.org';
const dataDir = path.join(__dirname, 'data');

console.log('='.repeat(70));
console.log('  Mochimo Exchange Integration - Example 2: Check Deposit');
console.log('='.repeat(70));
console.log();

// ============================================================================
// STEP 1: Load User Account
// ============================================================================

console.log('Step 1: Load User Account');
console.log('-'.repeat(70));
console.log();

const userAccountPath = path.join(dataDir, 'user-account.json');

if (!fs.existsSync(userAccountPath)) {
  console.error('✗ User account file not found!');
  console.error('  Please run example 1-generate-user-account.js first.');
  process.exit(1);
}

const userAccount = JSON.parse(fs.readFileSync(userAccountPath, 'utf8'));

console.log('✓ User Account Loaded:');
console.log('  User ID:', userAccount.user_id);
console.log('  Account Index:', userAccount.account_index);
console.log('  Account Tag:', userAccount.account_tag);
console.log('  Spend Index:', userAccount.spend_index);
console.log();

// ============================================================================
// STEP 2: Check Account Balance
// ============================================================================

console.log('Step 2: Check Account Balance');
console.log('-'.repeat(70));
console.log();

async function checkBalance(accountTag) {
  console.log(`Querying balance for Account Tag: ${accountTag}`);
  console.log();

  try {
    // For balance queries, we need the full ledger address
    // For a new account that has never been spent: Account Tag = DSA Hash
    // So we repeat the Account Tag twice to form the full address
    const ledgerAddress = `0x${accountTag}${accountTag}`;

    console.log('  Ledger Address (implicit):', ledgerAddress);
    console.log('  (Account Tag repeated twice for new account)');
    console.log();

    const response = await fetch(`${API_URL}/account/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();

    console.log('✓ Balance Query Successful!');
    console.log();

    console.log('Block Information:');
    console.log('  Block Height:', data.block_identifier?.index || 'N/A');
    console.log('  Block Hash:', data.block_identifier?.hash?.substring(0, 20) + '...' || 'N/A');
    console.log();

    if (data.balances && data.balances.length > 0) {
      const balance = data.balances[0];
      const balanceNanoMCM = balance.value;
      const balanceMCM = (parseFloat(balanceNanoMCM) / 1_000_000_000).toFixed(9);

      console.log('💰 Balance:');
      console.log('  ' + balanceNanoMCM + ' nanoMCM');
      console.log('  ' + balanceMCM + ' MCM');
      console.log('  Currency:', balance.currency?.symbol || 'MCM');
      console.log('  Decimals:', balance.currency?.decimals || 9);
      console.log();

      if (parseFloat(balanceNanoMCM) > 0) {
        console.log('✅ DEPOSIT DETECTED!');
        console.log('   User has received funds on this account.');
      } else {
        console.log('ℹ️  Balance is zero.');
        console.log('   Waiting for user to send MCM to:', accountTag);
      }
    } else {
      console.log('⚠️  No balance found.');
      console.log('   This account has not received any transactions yet.');
      console.log('   User should send MCM to:', accountTag);
    }
    console.log();

    return data;

  } catch (error) {
    console.error('✗ Error checking balance:', error.message);
    console.error();
    console.error('This is normal if the account has never received funds.');
    console.error('The network returns an error for accounts that don\'t exist yet.');
    console.error();
    return null;
  }
}

// ============================================================================
// STEP 3: Search for Transactions
// ============================================================================

async function searchTransactions(accountTag) {
  console.log('Step 3: Search for Transactions');
  console.log('-'.repeat(70));
  console.log();

  console.log(`Searching transactions for Account Tag: ${accountTag}`);
  console.log();

  try {
    // Use the account tag to search for transactions
    const ledgerAddress = `0x${accountTag}${accountTag}`;

    const response = await fetch(`${API_URL}/search/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        network_identifier: {
          blockchain: 'mochimo',
          network: 'mainnet'
        },
        account_identifier: {
          address: ledgerAddress
        },
        max_block: null,  // Search all blocks
        offset: 0,
        limit: 10
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();

    console.log('✓ Transaction Search Complete!');
    console.log();

    if (data.transactions && data.transactions.length > 0) {
      console.log(`Found ${data.transactions.length} transaction(s):`);
      console.log();

      data.transactions.forEach((tx, index) => {
        console.log(`Transaction ${index + 1}:`);
        console.log('  TX ID:', tx.transaction_identifier?.hash || 'N/A');
        console.log('  Block:', tx.block_identifier?.index || 'N/A');

        if (tx.operations && tx.operations.length > 0) {
          tx.operations.forEach((op, opIndex) => {
            console.log(`  Operation ${opIndex + 1}:`);
            console.log('    Type:', op.type);
            console.log('    Amount:', op.amount?.value || '0', 'nanoMCM');
            console.log('    Account:', op.account?.address || 'N/A');
          });
        }
        console.log();
      });

      return data.transactions;
    } else {
      console.log('ℹ️  No transactions found.');
      console.log('   User has not sent/received any MCM to this account yet.');
      console.log();
      return [];
    }

  } catch (error) {
    console.error('✗ Error searching transactions:', error.message);
    console.error();
    console.error('This is normal if the account has no transaction history.');
    console.error();
    return [];
  }
}

// ============================================================================
// STEP 4: Check Mempool (Pending Transactions)
// ============================================================================

async function checkMempool(accountTag) {
  console.log('Step 4: Check Mempool (Pending Transactions)');
  console.log('-'.repeat(70));
  console.log();

  console.log(`Checking mempool for Account Tag: ${accountTag}`);
  console.log();

  try {
    const response = await fetch(`${API_URL}/mempool`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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

    console.log('✓ Mempool Query Successful!');
    console.log();

    if (data.transaction_identifiers && data.transaction_identifiers.length > 0) {
      console.log(`Total mempool transactions: ${data.transaction_identifiers.length}`);
      console.log();
      console.log('ℹ️  Note: To check if any are for your account, you would need to');
      console.log('   query each transaction individually and check if it involves');
      console.log('   your Account Tag.');
      console.log();

      // Show first few TX IDs
      const showCount = Math.min(5, data.transaction_identifiers.length);
      console.log(`First ${showCount} transactions in mempool:`);
      data.transaction_identifiers.slice(0, showCount).forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.hash}`);
      });
      console.log();

    } else {
      console.log('ℹ️  Mempool is empty.');
      console.log('   No pending transactions at this time.');
      console.log();
    }

    return data;

  } catch (error) {
    console.error('✗ Error checking mempool:', error.message);
    console.error();
    return null;
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  // Check balance
  const balanceData = await checkBalance(userAccount.account_tag);

  // Search for transactions
  const transactions = await searchTransactions(userAccount.account_tag);

  // Check mempool
  const mempoolData = await checkMempool(userAccount.account_tag);

  // ============================================================================
  // Summary
  // ============================================================================

  console.log('='.repeat(70));
  console.log('Summary:');
  console.log('='.repeat(70));
  console.log();
  console.log('Account Tag:', userAccount.account_tag);
  console.log();

  if (balanceData && balanceData.balances && balanceData.balances.length > 0) {
    const balance = balanceData.balances[0];
    const balanceMCM = (parseFloat(balance.value) / 1_000_000_000).toFixed(9);
    console.log('✅ Balance:', balanceMCM, 'MCM');
  } else {
    console.log('⚠️  Balance: No funds detected');
  }

  console.log('📊 Transactions Found:', transactions ? transactions.length : 0);
  console.log('⏳ Mempool Size:', mempoolData?.transaction_identifiers?.length || 0);
  console.log();

  console.log('Next Steps:');
  console.log('  1. If balance > 0, account is funded ✓');
  console.log('  2. Ready for withdrawal (see example 3-send-withdrawal.js)');
  console.log('  3. For production: Poll this endpoint regularly to detect deposits');
  console.log();

  console.log('⚠️  IMPORTANT FOR EXCHANGES:');
  console.log('  • Poll balance/transactions every 1-2 minutes for deposits');
  console.log('  • Wait for confirmations before crediting user balance');
  console.log('  • Store transaction IDs to prevent duplicate processing');
  console.log('  • Handle network timeouts and retry logic');
  console.log();
  console.log('='.repeat(70));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
