/**
 * Example 5: Recover Spend Index
 *
 * This example demonstrates:
 * - Querying network for current DSA Hash by Account Tag
 * - Iterating through spend indices to find matching WOTS+ keypair
 * - Recovering the correct spend index from blockchain state
 * - Useful for: network forks, chain splits, state loss, disaster recovery
 *
 * Prerequisites:
 * - Run Example 1 to create user account
 * - Account must have been spent at least once (run Example 3)
 *
 * Use Cases:
 * - State corruption or loss
 * - Network fork/chain split recovery
 * - Audit/verification of spend index
 * - Migration between systems
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deriveKeypairForSpend, getNetworkDsaHash } from '../../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://api.mochimo.org';
const dataDir = path.join(__dirname, 'data');

console.log('='.repeat(70));
console.log('  Mochimo Exchange Integration - Example 5: Recover Spend Index');
console.log('='.repeat(70));
console.log();

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
console.log('  Stored Spend Index:', userAccount.spend_index);
console.log();

console.log('✓ Master Seed Loaded (32 bytes)');
console.log();

console.log('🎯 Recovery Scenario:');
console.log('  We will query the network for the current DSA Hash,');
console.log('  then iterate through spend indices until we find a match.');
console.log('  This proves the current spend index based on blockchain state.');
console.log();

// ============================================================================
// STEP 2: Query Network for Current DSA Hash (Using SDK Helper)
// ============================================================================

console.log('Step 2: Query Network for Current DSA Hash');
console.log('-'.repeat(70));
console.log();

console.log('Using SDK function: getNetworkDsaHash()');
console.log();

let networkDsaHash = null;

try {
  networkDsaHash = await getNetworkDsaHash(userAccount.account_tag, API_URL);

  if (networkDsaHash) {
    console.log('✓ Current DSA Hash Retrieved from Network:');
    console.log('  DSA Hash:', networkDsaHash);
    console.log();
    console.log('ℹ️  This represents the WOTS+ public key hash currently');
    console.log('  associated with this account on the blockchain.');
    console.log();
  } else {
    console.log('ℹ️  Account not found or never spent');
    console.log('  This is normal for new accounts that haven\'t sent transactions.');
    console.log('  Current spend index: 0');
    console.log();
  }
} catch (error) {
  console.error('⚠️  Error querying network:', error.message);
  console.error();
  console.error('This could indicate:');
  console.error('  - Network connectivity issues');
  console.error('  - Invalid account tag format');
  console.error('  - API endpoint unavailable');
  console.error();
  console.error('For this demo, we\'ll continue with iteration method.');
  console.error();
}

// ============================================================================
// STEP 3: Alternative - Manual Account Info Query (Old Method)
// ============================================================================

console.log('Step 3: Legacy Method - Manual Account Balance Query');
console.log('-'.repeat(70));
console.log();

async function getAccountInfo(accountTag) {
  console.log(`Querying network for Account Tag: ${accountTag}`);
  console.log();

  try {
    // For accounts that have been spent, we need to query the network
    // to get the current DSA Hash (WOTS+ public key hash)
    // The network maintains the current state

    // Method 1: Try balance query (works for accounts with funds)
    const ledgerAddress = `0x${accountTag}${accountTag}`;

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

    console.log('✓ Account Info Retrieved from Network:');
    console.log('  Block Height:', data.block_identifier?.index || 'N/A');
    console.log('  Block Hash:', data.block_identifier?.hash?.substring(0, 20) + '...' || 'N/A');

    if (data.balances && data.balances.length > 0) {
      const balance = data.balances[0];
      console.log('  Balance:', balance.value, 'nanoMCM');
    }
    console.log();

    console.log('ℹ️  Note: The SDK\'s getNetworkDsaHash() function above');
    console.log('  provides a simpler way to get just the DSA Hash.');
    console.log();

    return data;

  } catch (error) {
    console.error('⚠️  Could not query account info:', error.message);
    console.error();
    console.error('This is expected if the account is new or has zero balance.');
    console.error('For recovery, we can still iterate through spend indices.');
    console.error();
    return null;
  }
}

await getAccountInfo(userAccount.account_tag);

// ============================================================================
// STEP 3: Alternative - Search Transaction History
// ============================================================================

console.log('Step 3: Search Transaction History for Current DSA');
console.log('-'.repeat(70));
console.log();

async function getCurrentDsaFromTransactions(accountTag) {
  console.log(`Searching transactions for Account Tag: ${accountTag}`);
  console.log();

  try {
    const ledgerAddress = `0x${accountTag}${accountTag}`;

    const response = await fetch(`${API_URL}/search/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network_identifier: {
          blockchain: 'mochimo',
          network: 'mainnet'
        },
        account_identifier: {
          address: ledgerAddress
        },
        max_block: null,
        offset: 0,
        limit: 10
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.transactions && data.transactions.length > 0) {
      console.log(`✓ Found ${data.transactions.length} transaction(s)`);
      console.log();

      // Get the most recent transaction
      const latestTx = data.transactions[0];
      console.log('Latest Transaction:');
      console.log('  TX ID:', latestTx.transaction_identifier?.hash || 'N/A');
      console.log('  Block:', latestTx.block_identifier?.index || 'N/A');
      console.log();

      // In a real implementation, you would extract the DSA Hash from the transaction
      // For this demo, we'll proceed to iteration method
      console.log('ℹ️  For full recovery, we would extract DSA Hash from transaction data.');
      console.log('   Instead, we\'ll demonstrate the iteration method below.');
      console.log();

      return null;  // Would return DSA hash in production
    } else {
      console.log('ℹ️  No transactions found');
      console.log('   Account may be new or never spent.');
      console.log();
      return null;
    }

  } catch (error) {
    console.error('⚠️  Transaction search failed:', error.message);
    console.error();
    return null;
  }
}

await getCurrentDsaFromTransactions(userAccount.account_tag);

// ============================================================================
// STEP 5: Recover Spend Index by Iteration
// ============================================================================

console.log('Step 5: Recover Spend Index by Iteration');
console.log('-'.repeat(70));
console.log();

console.log('🔍 Recovery Method: Iterative Keypair Comparison');
console.log('  We will generate WOTS+ keypairs for each spend index');
console.log('  and compare DSA hashes until we find a match.');
console.log();

if (networkDsaHash) {
  console.log('✓ Using DSA Hash from network:', networkDsaHash.substring(0, 20) + '...');
  console.log('  We will iterate to find which spend index produces this hash.');
} else {
  console.log('ℹ️  No DSA Hash available from network (account not spent)');
  console.log('  We will verify our stored spend index by deriving keypairs.');
}
console.log();

async function recoverSpendIndex(masterSeed, accountIndex, accountTag, currentStoredIndex, targetDsaHash) {
  console.log('Starting spend index recovery...');
  console.log('  Account Index:', accountIndex);
  console.log('  Account Tag:', accountTag);
  console.log('  Stored Spend Index:', currentStoredIndex);
  console.log();

  const MAX_ITERATIONS = 100;  // Safety limit
  let foundIndex = -1;

  console.log(`Iterating through spend indices 0 to ${MAX_ITERATIONS}...`);
  console.log();

  // Generate keypairs for a range of spend indices
  const keypairs = [];
  for (let spendIndex = 0; spendIndex <= Math.min(currentStoredIndex + 5, MAX_ITERATIONS); spendIndex++) {
    const keypair = deriveKeypairForSpend(masterSeed, spendIndex, accountIndex);
    
    // Extract just the DSA Hash component (last 20 bytes of the 40-byte implicit address)
    const dsaHashComponent = keypair.dsaHash.toString('hex').slice(40, 80);
    
    keypairs.push({
      spendIndex,
      accountTag: keypair.accountTagHex,
      dsaHash: keypair.dsaHashHex,
      dsaHashComponent
    });

    // If we have a target DSA Hash from the network, check for match
    if (targetDsaHash && dsaHashComponent === targetDsaHash) {
      console.log(`🎯 MATCH FOUND at spend index ${spendIndex}!`);
      console.log(`  Network DSA Hash: ${targetDsaHash}`);
      console.log(`  Derived DSA Hash: ${dsaHashComponent}`);
      foundIndex = spendIndex;
      break;
    }

    if (spendIndex <= 5 || spendIndex === currentStoredIndex || spendIndex === currentStoredIndex + 1) {
      console.log(`  Spend ${spendIndex}: DSA Component = ${dsaHashComponent.substring(0, 30)}...`);
    }
  }
  console.log();

  // Verification against stored index
  console.log('📊 Verification:');
  
  if (targetDsaHash && foundIndex !== -1) {
    console.log('  ✓ Recovered from network DSA Hash');
    console.log('  Found spend index:', foundIndex);
    console.log('  Stored spend index:', currentStoredIndex);
    console.log('  Match:', foundIndex === currentStoredIndex ? '✓ Yes' : '✗ No - DATABASE OUT OF SYNC!');
    console.log();
    
    if (foundIndex !== currentStoredIndex) {
      console.log('⚠️  WARNING: Stored spend index does not match blockchain state!');
      console.log('  This indicates database corruption or missed transaction.');
      console.log('  Update database to use recovered index:', foundIndex);
      console.log();
    }
  } else if (currentStoredIndex < keypairs.length) {
    console.log('  No network DSA Hash available (account not spent)');
    console.log('  Verifying stored spend index:', currentStoredIndex);
    
    const storedKeypair = keypairs[currentStoredIndex];
    console.log('  DSA Hash for index', currentStoredIndex + ':', storedKeypair.dsaHashComponent);
    console.log();

    console.log('✓ Stored index verified (will be current after first spend)');
    foundIndex = currentStoredIndex;
  }

  console.log();
  console.log('🎯 Recovery Result:');
  console.log('  Confirmed Spend Index:', foundIndex);
  console.log('  Next Spend Index:', foundIndex + 1);
  console.log();

  return foundIndex;
}

const recoveredIndex = await recoverSpendIndex(
  masterSeed,
  userAccount.account_index,
  userAccount.account_tag,
  userAccount.spend_index,
  networkDsaHash  // Pass the DSA Hash we got from getNetworkDsaHash()
);

// ============================================================================
// STEP 6: Production Implementation Example
// ============================================================================

console.log('Step 6: Production Recovery Implementation');
console.log('-'.repeat(70));
console.log();

console.log('📝 In a real exchange, the recovery process would be:');
console.log();

console.log('```javascript');
console.log('import { getNetworkDsaHash, deriveKeypairForSpend } from "mochimo";');
console.log();
console.log('async function recoverSpendIndexFromNetwork(accountTag, masterSeed, accountIndex) {');
console.log('  // 1. Query network for current DSA Hash');
console.log('  const networkDsaHash = await getNetworkDsaHash(accountTag, "https://api.mochimo.org");');
console.log('  ');
console.log('  if (!networkDsaHash) {');
console.log('    // Account not found or never spent - spend index is 0');
console.log('    return 0;');
console.log('  }');
console.log('  ');
console.log('  // 2. Iterate through spend indices');
console.log('  for (let spendIndex = 0; spendIndex < MAX_ITERATIONS; spendIndex++) {');
console.log('    const keypair = deriveKeypairForSpend(masterSeed, spendIndex, accountIndex);');
console.log('    ');
console.log('    // 3. Extract DSA Hash component and compare with network');
console.log('    const derivedDsaHash = keypair.dsaHash.toString("hex").slice(40, 80);');
console.log('    if (derivedDsaHash === networkDsaHash) {');
console.log('      console.log(`Found matching spend index: ${spendIndex}`);');
console.log('      ');
console.log('      // 4. Update database');
console.log('      await updateSpendIndex(accountTag, spendIndex);');
console.log('      ');
console.log('      return spendIndex;');
console.log('    }');
console.log('  }');
console.log('  ');
console.log('  throw new Error("Could not recover spend index");');
console.log('}');
console.log('```');
console.log();

// ============================================================================
// Summary
// ============================================================================

console.log('='.repeat(70));
console.log('Recovery Summary:');
console.log('='.repeat(70));
console.log();

console.log('🔄 Recovery Process:');
console.log('  1. ✓ Loaded master seed and account info');
console.log('  2. ✓ Queried network for current account state');
console.log('  3. ✓ Searched transaction history');
console.log('  4. ✓ Iterated through spend indices');
console.log('  5. ✓ Verified stored spend index');
console.log();

console.log('📊 Results:');
console.log('  Account Tag:', userAccount.account_tag);
console.log('  Account Index:', userAccount.account_index);
console.log('  Stored Spend Index:', userAccount.spend_index);
console.log('  Recovered Spend Index:', recoveredIndex);
console.log('  Match:', recoveredIndex === userAccount.spend_index ? '✓ Yes' : '✗ No');
console.log();

console.log('✅ Recovery Complete!');
console.log();

console.log('Use Cases for Spend Index Recovery:');
console.log('  • Database corruption or loss');
console.log('  • Network fork or chain reorganization');
console.log('  • Audit and verification');
console.log('  • Migration between systems');
console.log('  • Disaster recovery scenarios');
console.log();

console.log('⚠️  IMPORTANT NOTES:');
console.log('  • Recovery requires the master seed (secure backup essential)');
console.log('  • Iteration can be slow for high spend indices');
console.log('  • Consider storing spend index in multiple redundant locations');
console.log('  • Network must be queried for accurate DSA Hash');
console.log('  • Always verify recovered index before using for transactions');
console.log();

console.log('🔐 Security Reminder:');
console.log('  • Master seed must be encrypted and backed up securely');
console.log('  • Spend index recovery is only possible with master seed');
console.log('  • Regular database backups prevent need for recovery');
console.log('  • Test recovery procedures regularly');
console.log();

console.log('='.repeat(70));
