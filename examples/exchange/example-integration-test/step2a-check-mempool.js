/**
 * Step 2a: Check Mempool
 * Check if transaction is in the mempool
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://api.mochimo.org';
const TX_ID = 'd1abb3165ecec2768ac5d4f2fa3a5c07dd0f33d12bc54d31623af7493524e90b';

console.log('='.repeat(70));
console.log('  Step 2a: Check Mempool');
console.log('='.repeat(70));
console.log();

console.log('Looking for TX ID:', TX_ID);
console.log();

async function checkMempool() {
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

    console.log('Mempool response received');
    console.log('Transaction identifiers:', data.transaction_identifiers?.length || 0, 'transactions');
    console.log();

    if (data.transaction_identifiers && data.transaction_identifiers.length > 0) {
      const txFound = data.transaction_identifiers.find(
        tx => tx.hash.toLowerCase().replace('0x', '') === TX_ID.toLowerCase()
      );

      if (txFound) {
        console.log('✓ Transaction found in mempool!');
        console.log('  Hash:', txFound.hash);
      } else {
        console.log('✗ Transaction not found in mempool');
        console.log('  (May have already been confirmed in a block)');
      }
    } else {
      console.log('Mempool is empty or transaction already confirmed');
    }
    console.log();
    console.log('Full mempool data:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('✗ Error checking mempool:', error.message);
  }
}

checkMempool();
