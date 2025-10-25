/**
 * Step 3b: Check Recipient Balance
 *
 * Checks the balance of the recipient address to verify the withdrawal was received.
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
console.log('  Step 3b: Check Recipient Balance');
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

console.log('Recipient Address:', RECIPIENT_ADDRESS_BASE58);
console.log('Expected Amount:', accountData.lastWithdrawal.amount, 'nanoMCM');
console.log();

async function checkBalance() {
  try {
    // Decode Base58 to get account tag
    const accountTagBuffer = base58ToAddrTag(RECIPIENT_ADDRESS_BASE58);
    const accountTag = accountTagBuffer.toString('hex');

    // Per README.md: Balance queries use 40-byte ledger address
    // For new accounts (implicit address), use account tag repeated twice
    // Must have 0x prefix
    const ledgerAddress = `0x${accountTag}${accountTag}`;

    console.log('Querying balance...');
    console.log('  Account Tag:', accountTag);
    console.log('  Ledger Address:', ledgerAddress);
    console.log('  (40 bytes = account tag repeated for new accounts)');
    console.log();

    // Per README.md: Network identifier must be lowercase 'mochimo'
    const response = await fetch(`${API_URL}/account/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network_identifier: {
          blockchain: 'mochimo',  // lowercase per documentation
          network: 'mainnet'
        },
        account_identifier: {
          address: ledgerAddress  // 40 bytes with 0x prefix
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('SUCCESS: Balance query successful!');
    console.log();
    console.log('Block:', data.block_identifier?.index);
    console.log('Block Hash:', data.block_identifier?.hash?.substring(0, 16) + '...');
    console.log();

    if (data.balances && data.balances.length > 0) {
      const balance = data.balances[0].value;
      const balanceMCM = (Number(balance) / 1000000000).toFixed(9);

      console.log('Balance:', balance, 'nanoMCM');
      console.log('        ', balanceMCM, 'MCM');
      console.log();

      const expectedAmount = accountData.lastWithdrawal.amount;
      if (BigInt(balance) >= BigInt(expectedAmount)) {
        console.log('SUCCESS: Funds received!');
        console.log('  Expected:', expectedAmount, 'nanoMCM');
        console.log('  Actual:', balance, 'nanoMCM');
      } else {
        console.log('Partial or no funds received yet');
        console.log('  Expected:', expectedAmount, 'nanoMCM');
        console.log('  Current:', balance, 'nanoMCM');
        console.log('  Transaction may still be pending');
      }
    } else {
      console.log('No balance found - transaction may not be confirmed yet');
    }

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

await checkBalance();
