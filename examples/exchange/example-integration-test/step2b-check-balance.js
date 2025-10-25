/**
 * Step 2b: Check Balance
 * Check account balance using Rosetta API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://api.mochimo.org';

console.log('='.repeat(70));
console.log('  Step 2b: Check Balance');
console.log('='.repeat(70));
console.log();

// Load account data
const accountData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'account.json'), 'utf8')
);

console.log('Account Tag:', accountData.accountTag);
console.log('Deposit Address (base58):', accountData.depositAddressBase58);
console.log();

async function checkBalance() {
  try {
    // For a new account (never spent), the ledger address is the account tag repeated twice
    // CRITICAL: Must prefix with '0x' for Rosetta API
    const ledgerAddress = `0x${accountData.accountTag}${accountData.accountTag}`;

    console.log('Querying balance for ledger address:', ledgerAddress);
    console.log('(Account tag repeated twice = implicit address for new accounts)');
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('✓ Balance query successful!');
    console.log();
    console.log('Block:', data.block_identifier?.index);
    console.log('Block Hash:', data.block_identifier?.hash?.substring(0, 16) + '...');
    console.log();

    if (data.balances && data.balances.length > 0) {
      const balance = data.balances[0].value;
      const balanceMCM = (BigInt(balance) / BigInt(1000000000)).toString();
      const balanceDecimal = (Number(balance) / 1000000000).toFixed(9);

      console.log('Balance:', balance, 'nanoMCM');
      console.log('        ', balanceDecimal, 'MCM');
      console.log();

      if (BigInt(balance) > 0) {
        console.log('✓ Funds received!');
      } else {
        console.log('⚠ Balance is 0 - transaction may not be confirmed yet');
      }
    } else {
      console.log('⚠ No balance found - account may not exist yet or transaction pending');
    }

    console.log();
    console.log('Full response:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('✗ Error checking balance:', error.message);
  }
}

checkBalance();
