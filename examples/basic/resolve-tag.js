/**
 * Example: Resolve Account Tag
 * 
 * This example demonstrates how to resolve a 20-byte Account Tag
 * to get the full ledger address, DSA Hash, and current balance.
 */

import { resolveTag, addrTagToBase58, base58ToAddrTag } from '../../src/index.js';

async function main() {
  console.log('=== Mochimo SDK: Resolve Account Tag Example ===\n');

  // Example 1: Resolve a tag from hex format
  console.log('Example 1: Resolve tag from hex format');
  const hexTag = '9f810c2447a76e93b17ebff96c0b29952e4355f1';
  console.log('Tag (hex):', hexTag);
  
  try {
    const result = await resolveTag(hexTag, 'https://api.mochimo.org');
    
    if (result.found) {
      console.log('\n✅ Tag found on blockchain!');
      console.log('Account Tag:', result.accountTag);
      console.log('DSA Hash:', result.dsaHash);
      console.log('Full Ledger Address:', result.ledgerAddress);
      console.log('Balance:', result.balanceFormatted);
      console.log('Balance (nanoMCM):', result.balance);
    } else {
      console.log('\n❌ Tag not found on blockchain');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 2: Resolve a tag from Base58 format
  console.log('Example 2: Resolve tag from Base58 format');
  const base58Tag = 'kHtV35ttVpyiH42FePCiHo2iFmcJS3';
  console.log('Tag (Base58):', base58Tag);
  
  try {
    // First decode Base58 to hex
    const tagBuffer = base58ToAddrTag(base58Tag);
    const tagHex = tagBuffer.toString('hex');
    console.log('Decoded to hex:', tagHex);
    
    // Then resolve
    const result = await resolveTag(tagHex, 'https://api.mochimo.org');
    
    if (result.found) {
      console.log('\n✅ Tag found on blockchain!');
      console.log('Account Tag:', result.accountTag);
      console.log('DSA Hash:', result.dsaHash);
      console.log('Full Ledger Address:', result.ledgerAddress);
      console.log('Balance:', result.balanceFormatted);
      
      // Convert back to Base58 for display
      const displayBase58 = addrTagToBase58(Buffer.from(result.accountTag, 'hex'));
      console.log('Base58 representation:', displayBase58);
    } else {
      console.log('\n❌ Tag not found on blockchain');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 3: Check if an account is implicit or explicit
  console.log('Example 3: Determine account type (implicit vs explicit)');
  
  try {
    const result = await resolveTag(hexTag, 'https://api.mochimo.org');
    
    if (result.found) {
      const isImplicit = result.accountTag === result.dsaHash;
      
      console.log('Account Tag:', result.accountTag);
      console.log('DSA Hash:', result.dsaHash);
      console.log('Account Type:', isImplicit ? 'Implicit (first-time account)' : 'Explicit (previously spent)');
      
      if (!isImplicit) {
        console.log('\nℹ️  This is an explicit account, meaning:');
        console.log('   - The account has been spent from before');
        console.log('   - The Account Tag persists across transactions');
        console.log('   - The DSA Hash changes with each transaction');
      } else {
        console.log('\nℹ️  This is an implicit account, meaning:');
        console.log('   - The account has never been spent from');
        console.log('   - Account Tag equals DSA Hash');
        console.log('   - On first spend, the tag will persist but DSA will change');
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  console.log('\n=== Example Complete ===\n');
}

main().catch(console.error);
