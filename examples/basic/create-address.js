#!/usr/bin/env node

/**
 * Example: Generate Mochimo Account Keypairs
 *
 * Demonstrates how to generate WOTS+ keypairs for Mochimo accounts.
 *
 * TERMINOLOGY:
 * - Account Keypair: WOTS+ public/private key pair for signing transactions
 * - DSA Hash: 40-byte one-time signature public key (derived from WOTS+ public key)
 * - Account Tag: 20-byte persistent account identifier (first 20 bytes of DSA Hash)
 */

import { generateAccountKeypair, generateAccountKeypairs } from '../../src/index.js';

console.log('=== Mochimo SDK - Account Keypair Generation Examples ===\n');

// Example 1: Generate a single random account keypair
console.log('1. Generate a single random account keypair:');
const singleKeypair = generateAccountKeypair();
console.log('   DSA Hash (40 bytes):', singleKeypair.dsaHash.toString('hex'));
console.log('   Account Tag (20 bytes):', singleKeypair.accountTag.toString('hex'));
console.log('   Public Key length:', singleKeypair.publicKey.length, 'bytes');
console.log('   Secret Key:', singleKeypair.secretKey.toString('hex'));
console.log();

// Example 2: Generate multiple random account keypairs
console.log('2. Generate 3 random account keypairs:');
const randomKeypairs = generateAccountKeypairs(3);
randomKeypairs.forEach((keypair, idx) => {
  console.log(`   Keypair ${idx + 1} DSA Hash:`, keypair.dsaHash.toString('hex'));
  console.log(`   Keypair ${idx + 1} Account Tag:`, keypair.accountTag.toString('hex'));
});
console.log();

// Example 3: Generate deterministic keypairs from a master seed
console.log('3. Generate 3 deterministic keypairs from master seed:');
const masterSeed = Buffer.from('0'.repeat(64), 'hex');
const deterministicKeypairs = generateAccountKeypairs(3, { masterSeed });
deterministicKeypairs.forEach((keypair, idx) => {
  console.log(`   Keypair ${idx + 1} DSA Hash:`, keypair.dsaHash.toString('hex'));
  console.log(`   Keypair ${idx + 1} Account Tag:`, keypair.accountTag.toString('hex'));
  console.log(`   Keypair ${idx + 1} Secret Key:`, keypair.secretKey.toString('hex'));
});
console.log();

// Example 4: Generate a single deterministic keypair
console.log('4. Generate a single deterministic keypair from seed:');
const seed = Buffer.from('1'.repeat(64), 'hex');
const detKeypair = generateAccountKeypair({ seed, index: 0 });
console.log('   DSA Hash:', detKeypair.dsaHash.toString('hex'));
console.log('   Account Tag:', detKeypair.accountTag.toString('hex'));
console.log('   Secret Key:', detKeypair.secretKey.toString('hex'));
console.log();

console.log('=== Examples Complete ===');
console.log('\nNote: Keep your secret keys safe! They control access to funds.');
console.log('Account tags (20 bytes) persist across transactions and identify your account.');
console.log('DSA hashes (40 bytes) are one-time use and change with each transaction.');
