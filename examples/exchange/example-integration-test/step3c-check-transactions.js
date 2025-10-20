/**
 * Step 3c: Check Recipient Transaction History
 * 
 * Queries transaction history for the recipient address to verify withdrawal.
 * Built from README.md Rosetta API Integration documentation.
 */

import { base58ToAddrTag } from '../../../src/utils/base58.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://api.mochimo.org';

console.log('='.repeat(70));
console.log('  Step 3c: Check Recipient Transaction History');
console.log('='.repeat(70));
console.log();

// Load withdrawal info
const accountData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'account.json'), 'utf8')
);

if (!accountData.lastWithdrawal) {
  console.error('ERROR: No withdrawal found');
  console.error('Please run step3-send-withdrawal.js first');
  process.exit(1);
}

const RECIPIENT_ADDRESS_BASE58 = accountData.lastWithdrawal.destination;
const EXPECTED_TX_ID = accountData.lastWithdrawal.txId.replace('0x', '');

console.log('Recipient Address:', RECIPIENT_ADDRESS_BASE58);
console.log('Expected TX ID:', EXPECTED_TX_ID);
console.log();

async function checkTransactionHistory() {
  try {
    // Decode Base58 to get account tag
    const accountTagBuffer = base58ToAddrTag(RECIPIENT_ADDRESS_BASE58);
    const accountTag = accountTagBuffer.toString('hex');
    
    // Per README.md: Transaction search uses 20-byte account tag (NOT 40-byte ledger address)
    // Must have 0x prefix
    const accountTagHex = `0x${accountTag}`;
    
    console.log('Querying transaction history...');
    console.log('  Account Tag:', accountTag);
    console.log('  (20 bytes for transaction search)');
    console.log();

    // Per README.md: Network identifier must be lowercase 'mochimo'
    const response = await fetch(`${API_URL}/search/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network_identifier: {
          blockchain: 'mochimo',  // lowercase per documentation
          network: 'mainnet'
        },
        account_identifier: {
          address: accountTagHex  // 20 bytes with 0x prefix
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('SUCCESS: Transaction history retrieved!');
    console.log();

    if (data.transactions && data.transactions.length > 0) {
      console.log(`Found ${data.transactions.length} transaction(s):`);
      console.log();
      
      // Look for our withdrawal transaction
      let foundOurTx = false;
      
      data.transactions.forEach((tx, index) => {
        const txHash = tx.transaction_identifier?.hash.replace('0x', '');
        const isOurTx = txHash === EXPECTED_TX_ID;
        
        if (isOurTx) {
          foundOurTx = true;
          console.log(`>>> WITHDRAWAL TRANSACTION FOUND <<<`);
        }
        
        console.log(`Transaction ${index + 1}:`);
        console.log('  Block:', tx.block_identifier?.index);
        console.log('  TX Hash:', tx.transaction_identifier?.hash);
        
        if (tx.operations) {
          console.log('  Operations:', tx.operations.length);
          tx.operations.forEach((op, i) => {
            if (op.account?.address === accountTagHex) {
              console.log(`    Op ${i + 1}:`, op.type);
              console.log('      Amount:', op.amount?.value, 'nanoMCM');
              if (op.metadata?.memo) {
                console.log('      Memo:', op.metadata.memo);
              }
            }
          });
        }
        console.log();
      });
      
      if (foundOurTx) {
        console.log('SUCCESS: Withdrawal transaction confirmed on chain!');
      } else {
        console.log('Note: Expected TX not found yet - may still be pending');
      }
    } else {
      console.log('No transactions found for this address');
      console.log('Transaction may still be pending confirmation');
    }

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

await checkTransactionHistory();
