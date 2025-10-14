#!/usr/bin/env node

/**
 * Example: Generate Mochimo Addresses
 *
 * Demonstrates how to generate WOTS+ keypairs and addresses using the SDK.
 */

import { generateAddress, generateAddresses } from '../../src/index.js';

console.log('=== Mochimo SDK - Address Generation Examples ===\n');

// Example 1: Generate a single random address
console.log('1. Generate a single random address:');
const singleAddress = generateAddress();
console.log('   Address:', singleAddress.address);
console.log('   Account Number:', singleAddress.accountNumber);
console.log('   Public Key (first 64 chars):', singleAddress.publicKey.substring(0, 64) + '...');
console.log('   Secret Key:', singleAddress.secretKey);
console.log();

// Example 2: Generate multiple random addresses
console.log('2. Generate 3 random addresses:');
const randomAddresses = generateAddresses(3);
randomAddresses.forEach((addr, idx) => {
  console.log(`   Address ${idx + 1}:`, addr.address);
});
console.log();

// Example 3: Generate deterministic addresses from a master seed
console.log('3. Generate 3 deterministic addresses from master seed:');
const masterSeed = Buffer.from('0'.repeat(64), 'hex');
const deterministicAddresses = generateAddresses(3, { masterSeed });
deterministicAddresses.forEach((addr, idx) => {
  console.log(`   Address ${idx + 1}:`, addr.address);
  console.log(`   Secret Key ${idx + 1}:`, addr.secretKey);
});
console.log();

// Example 4: Generate a single deterministic address
console.log('4. Generate a single deterministic address from seed:');
const seed = Buffer.from('1'.repeat(64), 'hex');
const detAddress = generateAddress({ seed, index: 0 });
console.log('   Address:', detAddress.address);
console.log('   Secret Key:', detAddress.secretKey);
console.log();

console.log('=== Examples Complete ===');
console.log('\nNote: Keep your secret keys safe! They control access to funds.');
console.log('Public keys and addresses can be shared safely.');
