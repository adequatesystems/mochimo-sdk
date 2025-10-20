/**
 * Step 1: Generate User Account
 * Following EXCHANGE_INTEGRATION.md Example 1
 */

import { generateMasterSeed, getAccountFromMasterSeed } from '../../../src/core/deterministic.js';
import { addrTagToBase58 } from '../../../src/utils/base58.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(70));
console.log('  Step 1: Generate User Account');
console.log('='.repeat(70));
console.log();

// Generate Master Seed
const masterSeed = generateMasterSeed();
console.log('✓ Master Seed Generated (32 bytes)');
console.log('  Hex:', masterSeed.toString('hex'));
console.log();

// Derive Account at index 0
const accountIndex = 0;
const account = getAccountFromMasterSeed(masterSeed, accountIndex);
console.log('✓ Account Derived (index 0)');
console.log('  Account Tag (hex):', account.accountTagHex);
console.log();

// Convert to Base58 for user display
const depositAddressBase58 = addrTagToBase58(account.accountTag);
console.log('✓ Deposit Address (base58 with checksum):');
console.log('  ', depositAddressBase58);
console.log();

// Save to data directory
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const accountData = {
  masterSeed: masterSeed.toString('hex'),
  accountIndex: accountIndex,
  accountTag: account.accountTagHex,
  depositAddressBase58: depositAddressBase58,
  spendIndex: 0,
  generatedAt: new Date().toISOString()
};

fs.writeFileSync(
  path.join(dataDir, 'account.json'),
  JSON.stringify(accountData, null, 2)
);

console.log('✓ Account data saved to: data/account.json');
console.log();
console.log('Next step: Send test MCM to the deposit address above');
