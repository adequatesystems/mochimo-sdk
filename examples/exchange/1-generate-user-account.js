/**
 * Example 1: Generate User Account
 *
 * This example demonstrates:
 * - Generating a master seed (done once PER USER at registration)
 * - Deriving a user account from that user's master seed
 * - Getting the Account Tag (deposit address) for the user
 *
 * In production:
 * - Master seed is generated ONCE PER USER and stored encrypted
 * - Each user has their own isolated master seed
 * - Account Tag is shown to user as their deposit address (base58+CRC)
 */

import { generateMasterSeed, getAccountFromMasterSeed } from '../../src/core/deterministic.js';
import { addrTagToBase58 } from '../../src/utils/base58.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(70));
console.log('  Mochimo Exchange Integration - Example 1: Generate User Account');
console.log('='.repeat(70));
console.log();

// ============================================================================
// STEP 1: Generate Master Seed (ONE TIME ONLY)
// ============================================================================

console.log('Step 1: Generate Master Seed');
console.log('-'.repeat(70));
console.log();
console.log('⚠️  In production:');
console.log('   - Generate this ONCE PER USER at registration');
console.log('   - Each user gets their own isolated master seed');
console.log('   - Store encrypted with AES-256-GCM or in HSM/KMS');
console.log('   - Keep offline backups in multiple secure locations');
console.log('   - NEVER log or print in production code');
console.log();

const masterSeed = generateMasterSeed();

console.log('✓ Master Seed Generated (32 bytes)');
console.log('  Hex:', masterSeed.toString('hex'));
console.log('  Length:', masterSeed.length, 'bytes');
console.log();

// Save master seed to file for use in other examples
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const masterSeedPath = path.join(dataDir, 'master-seed.txt');
fs.writeFileSync(masterSeedPath, masterSeed.toString('hex'));

console.log('✓ Master seed saved to:', masterSeedPath);
console.log('  (For demo purposes - in production, store encrypted!)');
console.log();

// ============================================================================
// STEP 2: Create User Account
// ============================================================================

console.log('Step 2: Create User Account');
console.log('-'.repeat(70));
console.log();

// ARCHITECTURE NOTE:
// In production, EACH USER gets their own master seed (generated above)
// The account index lets you create multiple deposit addresses for a single user
// Most exchanges use accountIndex = 0 (one deposit address per user)
//
// If you need multiple deposit addresses for the same user:
//   - accountIndex = 0: Primary deposit address
//   - accountIndex = 1: Secondary deposit address (optional)
//   - etc.

const userId = 1;  // First user
const accountIndex = 0;  // Use account index 0 for primary deposit address

console.log(`Creating account for User ID: ${userId}`);
console.log(`Using Account Index: ${accountIndex}`);
console.log(`(Most exchanges use Account Index 0 for each user)`);
console.log();

const account = getAccountFromMasterSeed(masterSeed, accountIndex);

console.log('✓ Account Derived Successfully!');
console.log();

// Convert to Base58 for user-facing display
const accountTagBase58 = addrTagToBase58(account.accountTag);

// ============================================================================
// STEP 3: Display Account Information
// ============================================================================

console.log('Account Information:');
console.log('-'.repeat(70));
console.log();

console.log('📍 DEPOSIT ADDRESS (Account Tag):');
console.log('   Base58: ' + accountTagBase58);
console.log('   Hex:    ' + account.accountTagHex);
console.log();
console.log('   ⭐ Users should send MCM to the Base58 address.');
console.log('   It is 20 bytes encoded with CRC16 checksum.');
console.log('   It NEVER changes, even after spending.');
console.log();

console.log('🔑 Initial DSA Hash (First-time deposit address):');
console.log('   → ' + account.depositAddress.dsaHashHex);
console.log();
console.log('   This is the WOTS+ public key hash for spend index 0.');
console.log('   For a NEW account: Account Tag = DSA Hash (implicit account)');
console.log('   After first spend: Only DSA Hash changes, Tag stays same');
console.log();

console.log('📊 Full Ledger Address (40 bytes):');
console.log('   → ' + account.accountTagHex + account.depositAddress.dsaHashHex);
console.log();
console.log('   Format: [Account Tag (20 bytes)] + [DSA Hash (20 bytes)]');
console.log('   Total: 80 hex characters');
console.log();

// ============================================================================
// STEP 4: Data to Persist
// ============================================================================

console.log('Data to Persist:');
console.log('-'.repeat(70));
console.log();

const userRecord = {
  user_id: userId,
  account_index: accountIndex,
  account_tag: account.accountTagHex,
  account_tag_base58: accountTagBase58,
  spend_index: 0,  // Start at 0, increment after each withdrawal
  balance_nanomcm: 0,
  created_at: new Date().toISOString()
};

console.log('Required data for this user account:');
console.log(JSON.stringify(userRecord, null, 2));
console.log();

// Save user account info for use in other examples
const userAccountPath = path.join(dataDir, 'user-account.json');
fs.writeFileSync(userAccountPath, JSON.stringify({
  ...userRecord,
  masterSeedPath: masterSeedPath  // Reference only, not the seed itself!
}, null, 2));

console.log('✓ User account info saved to:', userAccountPath);
console.log();

// ============================================================================
// STEP 5: What to Show the User
// ============================================================================

console.log('User-Facing Information:');
console.log('-'.repeat(70));
console.log();

console.log('Show this to your user:');
console.log();
console.log('  ┌─────────────────────────────────────────────────────────────┐');
console.log('  │  Your Mochimo (MCM) Deposit Address:                       │');
console.log('  │                                                             │');
console.log(`  │  ${accountTagBase58}                              │`);
console.log('  │                                                             │');
console.log('  │  Send MCM to this address to deposit funds.                │');
console.log('  │  This address never changes.                               │');
console.log('  └─────────────────────────────────────────────────────────────┘');
console.log();

// ============================================================================
// Summary
// ============================================================================

console.log('='.repeat(70));
console.log('Summary:');
console.log('='.repeat(70));
console.log();
console.log('✅ Master Seed Generated: 32 bytes');
console.log('✅ User Account Created: User ID', userId);
console.log('✅ Account Tag (Base58):', accountTagBase58);
console.log('✅ Account Tag (Hex):', account.accountTagHex);
console.log('✅ Initial Spend Index: 0');
console.log();
console.log('Next Steps:');
console.log('  1. User sends MCM to the Account Tag');
console.log('  2. Monitor deposits (see example 2-check-deposit.js)');
console.log('  3. Process withdrawals (see example 3-send-withdrawal.js)');
console.log();
console.log('⚠️  IMPORTANT REMINDERS:');
console.log('  • ONE master seed PER USER (each user isolated)');
console.log('  • Master Seed must be stored encrypted in production');
console.log('  • Account Tag is the permanent deposit address');
console.log('  • Spend Index starts at 0 and increments with each withdrawal');
console.log('  • NEVER reuse a spend index (breaks WOTS+ security)');
console.log();
console.log('='.repeat(70));
