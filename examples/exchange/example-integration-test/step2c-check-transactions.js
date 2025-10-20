/**
 * Step 2c: Check Transaction History
 * Query transaction history for the account
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://api.mochimo.org';

console.log('='.repeat(70));
console.log('  Step 2c: Check Transaction History');
console.log('='.repeat(70));
console.log();

// Load account data
const accountData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'account.json'), 'utf8')
);

console.log('Account Tag:', accountData.accountTag);
console.log();

async function checkTransactionHistory() {
  try {
    // CRITICAL: /search/transactions uses the 20-byte ACCOUNT TAG, not the 40-byte ledger address
    // Must prefix with '0x' for Rosetta API
    const accountTagHex = `0x${accountData.accountTag}`;
    
    console.log('Querying transaction history for account tag:', accountTagHex);
    console.log('(Note: search/transactions uses 20-byte account tag, NOT 40-byte ledger address)');
    console.log();

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
          address: accountTagHex
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✓ Transaction history query successful!');
    console.log();

    if (data.transactions && data.transactions.length > 0) {
      console.log(`Found ${data.transactions.length} transaction(s):`);
      console.log();
      
      data.transactions.forEach((tx, index) => {
        console.log(`Transaction ${index + 1}:`);
        console.log('  Block:', tx.block_identifier?.index);
        console.log('  TX Hash:', tx.transaction_identifier?.hash);
        
        if (tx.transaction?.operations) {
          console.log('  Operations:', tx.transaction.operations.length);
          tx.transaction.operations.forEach((op, i) => {
            console.log(`    Op ${i + 1}:`, op.type);
            console.log('      Amount:', op.amount?.value, 'nanoMCM');
            console.log('      Address:', op.account?.address?.substring(0, 20) + '...');
          });
        }
        console.log();
      });
    } else {
      console.log('⚠ No transactions found for this address');
      console.log('  Transaction may still be pending confirmation');
    }
    
    console.log('Full response:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('✗ Error checking transaction history:', error.message);
  }
}

checkTransactionHistory();
