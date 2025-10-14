/**
 * Check Account Balance Script
 *
 * Queries the balance of a Mochimo account using the ledger address.
 *
 * TERMINOLOGY:
 * - Ledger Address: 40-byte entry (Account Tag + DSA Hash) = 80 hex chars
 */

import fs from 'fs';

const API_URL = 'https://api.mochimo.org';

console.log('=== Mochimo SDK - Balance Checker ===\n');

async function checkBalance(ledgerAddressHex) {
  // Ensure ledger address has 0x prefix for balance API
  const formattedAddress = ledgerAddressHex.startsWith('0x') ? ledgerAddressHex : `0x${ledgerAddressHex}`;
  console.log(`Checking balance for ledger address: ${formattedAddress}\n`);

  try {
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
          address: formattedAddress
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('✓ Balance retrieved successfully!\n');
    console.log('Block:', data.block_identifier?.index || 'N/A');
    console.log('Block Hash:', data.block_identifier?.hash || 'N/A');

    if (data.balances && data.balances.length > 0) {
      const balance = data.balances[0];
      const balanceNanoMCM = balance.value;
      const balanceMCM = (parseFloat(balanceNanoMCM) / 1_000_000_000).toFixed(9);

      console.log('\nBalance:');
      console.log(`  ${balanceNanoMCM} nanoMCM`);
      console.log(`  ${balanceMCM} MCM`);
      console.log(`  (${balance.currency?.symbol || 'MCM'}, decimals: ${balance.currency?.decimals || 9})`);
    } else {
      console.log('\n⚠️  No balance found (address may not exist or have zero balance)');
    }

    return data;

  } catch (error) {
    console.error('✗ Error checking balance:', error.message);
    throw error;
  }
}

async function main() {
  // Load wallet config
  if (!fs.existsSync('wallet-config.json')) {
    console.error('✗ wallet-config.json not found. Run setup-wallets.js first.');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync('wallet-config.json', 'utf8'));

  console.log('Source Wallet:');
  console.log('  Address (hex):', config.source.address);
  console.log('  Address (Base58):', config.source.addressBase58);
  console.log();

  // Check source address balance
  await checkBalance(config.source.address);

  console.log('\n=== Balance Check Complete ===');
}

main().catch(error => {
  console.error('\nFailed:', error.message);
  process.exit(1);
});
