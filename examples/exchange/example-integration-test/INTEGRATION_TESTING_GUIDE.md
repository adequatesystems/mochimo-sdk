# Mochimo SDK Integration Test

This document provides a complete step-by-step breakdown of how we tested the integrating SDK for the Mochimo cryptocurrency. Each script was built directly from the documentation in README.md and EXCHANGE_INTEGRATION.md to verify accuracy and completeness.

## Purpose

This guide serves as:
1. **Verification** - Confirms that the SDK documentation is accurate and complete
2. **Reference** - Provides working examples for exchange integrators
3. **Testing Record** - Documents the full deposit and withdrawal workflow including all necessary scripts.

## Testing Summary

**Complete Integration Workflow Tested:**

1. ✓ Account Generation - Generated master seed and deposit address
2. ✓ Deposit Monitoring - Checked mempool, balance, and transaction history
3. ✓ First Withdrawal - Sent 10,000 nanoMCM (spend index 0 → 1)
4. ✓ Second Withdrawal - Sent remaining balance (spend index 1 → 2)

**Key Achievements:**
- All scripts built from documentation worked correctly
- Deposit detection successful
- Withdrawal workflow verified
- Change address spending confirmed (proves spend index increment works)
- Rosetta API integration fully tested

---

## Step 1: Generate User Account

**Goal:** Generate master seed and derive deposit address.

### Code

```javascript
import { generateMasterSeed, getAccountFromMasterSeed } from '../src/core/deterministic.js';
import { addrTagToBase58 } from '../src/utils/base58.js';

// Generate master seed (32 bytes)
const masterSeed = generateMasterSeed();

// Derive account at index 0
const account = getAccountFromMasterSeed(masterSeed, 0);

// Convert to Base58 for user display
const depositAddressBase58 = addrTagToBase58(account.accountTag);

// Save account data
const accountData = {
  masterSeed: masterSeed.toString('hex'),
  accountIndex: 0,
  accountTag: account.accountTagHex,
  depositAddressBase58: depositAddressBase58,
  spendIndex: 0
};
```

### Result

```
Master Seed: 00bae01a60c474a417009b062f57775e58a0326e65ec4d18618f4188d79d1ad7
Account Tag: 72f723d5299a86fe1d8392cfbf03e0820e6fb583
Deposit Address: YCmTsK1kTwP8z3vdvUdFH6SFVczYJR
```

**User receives:** `YCmTsK1kTwP8z3vdvUdFH6SFVczYJR` to send MCM to.

---

## Step 2: Monitor Deposit

**Received Transaction:** `d1abb3165ecec2768ac5d4f2fa3a5c07dd0f33d12bc54d31623af7493524e90b`

### Step 2a: Check Mempool

```javascript
const response = await fetch(`${API_URL}/mempool`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    network_identifier: {
      blockchain: 'mochimo',  // lowercase
      network: 'mainnet'
    }
  })
});

// API returns hashes with '0x' prefix, strip for comparison
const txFound = data.transaction_identifiers.find(
  tx => tx.hash.replace('0x', '') === TX_ID
);
```

**Result:** Transaction found in mempool.

---

### Step 2b: Check Balance

```javascript
// Balance queries use 40-byte ledger address
const ledgerAddress = `0x${accountTag}${accountTag}`;

const response = await fetch(`${API_URL}/account/balance`, {
  method: 'POST',
  body: JSON.stringify({
    network_identifier: { blockchain: 'mochimo', network: 'mainnet' },
    account_identifier: { address: ledgerAddress }
  })
});
```

**Result:** Balance confirmed: 1,000,000 nanoMCM (0.001 MCM) at block 845893.

---

### Step 2c: Check Transaction History

```javascript
// Transaction search uses 20-byte account tag (NOT 40-byte address)
const accountTagHex = `0x${accountTag}`;

const response = await fetch(`${API_URL}/search/transactions`, {
  method: 'POST',
  body: JSON.stringify({
    network_identifier: { blockchain: 'mochimo', network: 'mainnet' },
    account_identifier: { address: accountTagHex }
  })
});
```

**Result:** Transaction found at block 845888 with memo "1-SDKINTEGRATION".

**Important:** Balance queries use 40-byte ledger address; transaction search uses 20-byte account tag.

---

## Step 3: Send Withdrawal

**Reference:** EXCHANGE_INTEGRATION.md - Example 3

**Goal:** Create and broadcast a withdrawal transaction.

**Configuration:**
- Destination: `tq2WffaSEfQ2ZPGq7mNy7Svj1SiApG`
- Amount: 10,000 nanoMCM
- Fee: 500 nanoMCM
- Current Spend Index: 0

### Code Pattern

```javascript
// Step 1: Validate destination address
if (!validateBase58Tag(destinationAddress)) {
  throw new Error('Invalid address');
}
const destTag = base58ToAddrTag(destinationAddress).toString('hex');

// Step 2: Check current balance
const ledgerAddress = `0x${accountTag}${accountTag}`;  // Implicit for spend index 0
const balance = await checkBalance(ledgerAddress);

// Step 3: Derive keypairs
const sourceKeypair = deriveKeypairForSpend(masterSeed, spendIndex, accountIndex);
const changeKeypair = deriveKeypairForSpend(masterSeed, spendIndex + 1, accountIndex);

// Step 4: Create transaction
const txResult = createTransaction({
  srcTag: accountTag,
  sourcePk: sourceKeypair.publicKey.toString('hex'),
  secret: sourceKeypair.secretKey.toString('hex'),
  balance: balance,
  changePk: changeKeypair.publicKey.toString('hex'),
  dstAccountTag: destTag,
  amount: '10000',
  fee: '500',
  memo: ''
});

// Step 5: Broadcast
const response = await fetch(`${API_URL}/construction/submit`, {
  method: 'POST',
  body: JSON.stringify({
    network_identifier: { blockchain: 'mochimo', network: 'mainnet' },
    signed_transaction: txResult.transaction.toString('hex')
  })
});

// Step 6: Update spend index
spendIndex = spendIndex + 1;  // 0 → 1
```

### Result

```
SUCCESS: Transaction broadcast!
  TX ID: ad9fde92cccc01a70b7eb29a06ba4f91f1f272270d29a0e4409d0c46a4c69b8e
  Send Amount: 10000 nanoMCM
  Change Amount: 989500 nanoMCM
  New Spend Index: 1
```

### Verification

**Mempool Check:**
```
SUCCESS: Transaction found in mempool!
```

**Recipient Balance (after confirmation):**
```
Block: 845898
Balance increased: 1018000 → 1028000 nanoMCM (+10000)
```

**Transaction History:**
```
SUCCESS: Withdrawal confirmed on chain!
  Block: 845898
  DESTINATION_TRANSFER: 10000 nanoMCM to recipient
```

---

## Step 4: Send Remaining Balance

**Goal:** Test that change address from spend index 1 is spendable.

**Configuration:**
- Destination: `tq2WffaSEfQ2ZPGq7mNy7Svj1SiApG` (same)
- Amount: 989,000 nanoMCM (all remaining minus fee)
- Fee: 500 nanoMCM
- Current Spend Index: 1

### Code Pattern

```javascript
// Step 1: Check balance at spend index 1 (change address from previous spend)
const currentKeypair = deriveKeypairForSpend(masterSeed, 1, accountIndex);
const currentDsaHash = currentKeypair.dsaHashHex.substring(0, 40);
const ledgerAddress = `0x${accountTag}${currentDsaHash}`;

const balance = await checkBalance(ledgerAddress);
// Result: 989500 nanoMCM

// Step 2: Calculate send amount (all balance minus fee)
const sendAmount = (balance - 500).toString();  // 989000 nanoMCM

// Step 3: Derive keypairs for spend index 1 → 2
const sourceKeypair = deriveKeypairForSpend(masterSeed, 1, accountIndex);
const changeKeypair = deriveKeypairForSpend(masterSeed, 2, accountIndex);

// Step 4: Create and broadcast transaction
// (same pattern as Step 3)
```

### Result

```
SUCCESS: Transaction broadcast!
  TX ID: 18451cdf83fcb4b0a6b77807f2dbc8849614e827319b654a1589cda250c04476
  Send Amount: 989000 nanoMCM
  Change Amount: 0 nanoMCM (sent everything)
  New Spend Index: 2
```

**Key Achievement:** Successfully spent from change address, proving spend index increment workflow works correctly.

---

## Summary

### Complete Workflow Verified

1. **Account Generation** - Master seed and deposit address created
2. **Deposit Detection** - Mempool, balance, and transaction history APIs tested
3. **First Withdrawal** - Spend index 0 → 1, change address created
4. **Second Withdrawal** - Spend index 1 → 2, change address successfully spent

### Documentation Accuracy

All scripts were built directly from README.md and EXCHANGE_INTEGRATION.md documentation:
- ✓ API endpoints correct (`https://api.mochimo.org`)
- ✓ Network identifier correct (lowercase `'mochimo'`)
- ✓ Address formats correct (20-byte for search, 40-byte for balance)
- ✓ Transaction hash handling correct (strip `0x` for comparison)
- ✓ WOTS+ keypair derivation correct
- ✓ Spend index increment workflow correct

### Key Learnings for Integrators

1. **Balance Queries:** Use 40-byte ledger address (`0x${accountTag}${dsaHash}`)
2. **Transaction Search:** Use 20-byte account tag (`0x${accountTag}`)
3. **Spend Index:** Must increment after each withdrawal (never reuse)
4. **Change Address:** Always spendable using next spend index
5. **Address Validation:** Always validate user-supplied base58 addresses before processing
