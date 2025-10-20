/**
 * Step 3a: Check Mempool for Withdrawal
 * 
 * Monitors the mempool for our withdrawal transaction.
 * Built from README.md documentation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://api.mochimo.org';

console.log('='.repeat(70));
console.log('  Step 3a: Check Mempool for Withdrawal');
console.log('='.repeat(70));
console.log();

// Load account to get TX ID
const accountData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'account.json'), 'utf8')
);

if (!accountData.lastWithdrawal || !accountData.lastWithdrawal.txId) {
  console.error('ERROR: No withdrawal transaction found');
  console.error('Please run step3-send-withdrawal.js first');
  process.exit(1);
}

const TX_ID = accountData.lastWithdrawal.txId.replace('0x', '');

console.log('Withdrawal Details:');
console.log('  Destination:', accountData.lastWithdrawal.destination);
console.log('  Amount:', accountData.lastWithdrawal.amount, 'nanoMCM');
console.log('  TX ID:', TX_ID);
console.log();

async function checkMempool() {
  try {
    console.log('Querying mempool...');
    
    // Per README.md: Network identifier must be lowercase 'mochimo'
    const response = await fetch(`${API_URL}/mempool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network_identifier: {
          blockchain: 'mochimo',  // lowercase per documentation
          network: 'mainnet'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('Mempool query successful');
    console.log('  Total transactions:', data.transaction_identifiers?.length || 0);
    console.log();

    // Per README.md: API returns hashes with 0x prefix, must strip for comparison
    const txFound = data.transaction_identifiers?.find(
      tx => tx.hash.toLowerCase().replace('0x', '') === TX_ID.toLowerCase()
    );

    if (txFound) {
      console.log('SUCCESS: Transaction found in mempool!');
      console.log('  Hash:', txFound.hash);
    } else {
      console.log('Transaction not found in mempool');
      console.log('  It may have already been confirmed');
      console.log('  Check balance to verify confirmation');
    }

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

await checkMempool();
