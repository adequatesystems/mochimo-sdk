# Mochimo Exchange Integration

Complete guide for integrating Mochimo cryptocurrency into your exchange platform.

## Table of Contents

1. [Quick Start - Run The Examples](#quick-start---run-the-examples)
2. [Core Concepts](#core-concepts)
3. [Architecture Workflows](#architecture-workflows)
4. [SDK Reference](#sdk-reference)
5. [Detailed Examples Walkthrough](#detailed-examples-walkthrough)
6. [Security Best Practices](#security-best-practices)
7. [Data Persistence Requirements](#data-persistence-requirements)
8. [Testing & Troubleshooting](#testing--troubleshooting)
9. [Additional Resources](#additional-resources)

---

## Quick Start - Run The Examples

### Prerequisites

- Node.js 18+ installed
- Terminal/Command prompt
- Text editor

### Configuration

Before running examples, configure the network endpoint in each example file:

```javascript
const NETWORK_ENDPOINT = 'https://api.mochimo.org';  // Mainnet
```

**CRITICAL: Rosetta API Requirements**

All API requests must follow these requirements:

1. **Network Identifier - Must be lowercase:**
   ```javascript
   network_identifier: {
     blockchain: 'mochimo',  // NOT 'Mochimo' (case-sensitive!)
     network: 'mainnet'
   }
   ```

2. **Addresses - Different endpoints require different formats:**
   
   **For Balance Queries (`/account/balance`)** - Use 40-byte ledger address:
   ```javascript
   // New account (implicit)
   address: `0x${accountTag}${accountTag}`
   
   // Spent account (explicit)
   address: `0x${accountTag}${dsaHash}`
   ```
   
   **For Transaction Search (`/search/transactions`)** - Use 20-byte account tag:
   ```javascript
   // Use just the account tag
   address: `0x${accountTag}`
   ```

3. **Transaction Hashes - API returns with `0x` prefix:**
   ```javascript
   // API returns: "hash": "0xd1abb31..."
   // When comparing, strip prefix:
   tx.hash.replace('0x', '') === userTxId
   ```

### Run the Examples

Navigate to the examples directory:
```bash
cd examples/exchange
```

**Example 1: Generate User Account**
```bash
node 1-generate-user-account.js
```
Creates a new master seed and derives the first account (deposit address).

**Example 2: Check Deposits**
```bash
node 2-check-deposit.js
```
Queries the network for account balance and transaction history.

**Example 3: Send Withdrawal**
```bash
node 3-send-withdrawal.js
```
Creates, signs, and broadcasts a withdrawal transaction.

**Example 4: Validate Withdrawal Address**
```bash
node 4-validate-withdrawal-address.js
```
Demonstrates how to validate user-supplied withdrawal addresses before processing.

**Example 5: Recover Spend Index**
```bash
node 5-recover-spend-index.js
```
Recovers account state from blockchain by finding current spend index.

---

## Core Concepts

### 1. Master Seed (ONE PER USER)

- **32 bytes** of cryptographic randomness
- **Generated once per user** during account registration
- **Derives infinite accounts** via account index (0, 1, 2...)
- **Must be stored encrypted** in your system
- **Never share or reuse** across users

```javascript
import { generateMasterSeed } from 'mochimo';
const masterSeed = generateMasterSeed();  // 32 bytes per user
```

**CRITICAL ARCHITECTURE:**
```
WRONG: One master seed for entire exchange
CORRECT: One master seed PER USER
```

### 2. Account Derivation

```javascript
import { getAccountFromMasterSeed } from 'mochimo';

// Derive account for a specific user
const account = getAccountFromMasterSeed(masterSeed, accountIndex);
// Returns:
//   - accountSeed: Buffer (32 bytes) - intermediate value (do NOT store this)
//   - accountTag: Buffer (20 bytes) - persistent account identifier (STORE THIS)
//   - accountTagHex: string (40 chars) - hex representation
//   - depositAddress.dsaHash: Buffer (40 bytes) - implicit address format
```

**Exchange Integration Pattern:**
- **STORE**: `masterSeed` (encrypted), `accountTag`, `spendIndex`, `accountIndex`
- **DO NOT STORE**: `accountSeed` (intermediate value, not needed)
- **FOR EACH WITHDRAWAL**: Always derive fresh keypairs using `deriveKeypairForSpend(masterSeed, spendIndex, accountIndex)`

**Why this pattern?**
- Simpler: Only track master seed and spend index
- More secure: Keypairs never persist, always derived fresh
- Easier recovery: Master seed + spend index = full account state

### 3. Address Format Requirements

**User-Facing:**  
- Always present deposit and withdrawal addresses as base58-encoded with CRC.
- Accept only base58+CRC addresses from users.
- Validate all user-supplied addresses before processing withdrawals.

**Backend:**  
- Decode base58+CRC addresses to binary/hex before transaction construction or API calls.
- Never expose or request raw hex addresses from users.

**Example:**
```js
import { addrTagToBase58, base58ToAddrTag, validateBase58Tag } from 'mochimo';

// Generate base58+CRC address for user display
const depositAddress = addrTagToBase58(accountTag);

// Validate user-supplied withdrawal address
if (!validateBase58Tag(userInputAddress)) {
  throw new Error('Invalid Mochimo address format');
}

// Decode user-supplied address for backend processing
const accountTagBuffer = base58ToAddrTag(userInputAddress);
```

**Key Rules:**
- Account Tag (deposit address) = first 20 bytes of DSA hash from Spend Index 0 keypair
- Spend Index MUST increment after each withdrawal (never reuse, unless recovering from a chain fork)
- Same master seed + different account index = different deposit addresses

### 3. Account Tag (Deposit Address)

- **20 bytes** (40 hex characters)
- **Example:** `04676a3e43bedec50555a653f4377316379cc7bc`
- **Never changes** for a given account index
- **Show this to users** as their deposit address (or convert to Base58)
- **Persistent** across all transactions

### 4. Spend Index (Transaction Counter)

- **Integer starting at 0**, increments after each withdrawal: 0 → 1 → 2 → 3...
- **CRITICAL:** Do not reuse (reduces WOTS+ security), except during chain fork recovery
- **Must persist** per account with appropriate safeguards against concurrent modification
- **WOTS+ Requirement:** Each keypair can only sign ONE transaction

### 5. DSA Hash (WOTS+ Public Key Hash)

- **20 bytes** (40 hex characters) - as a **component** of ledger addresses
- **Changes after each spend** (WOTS+ is one-time use)
- Combined with Account Tag for full ledger address
- Derived from current spend index keypair

**Important:** When the SDK returns `dsaHash`, it returns the full **40-byte implicit address format** (see section 6 below), not just the 20-byte DSA hash component. This is for convenience in transaction building.

### 6. Ledger Addresses

The blockchain uses 40-byte addresses: `[Account Tag (20 bytes)][DSA PK Hash (20 bytes)]`

**Before first spend (Spend Index 0):**
```
Address: [tag][tag]  ← Implicit address (tag repeated, from spend index 0)
```

**After spending (Spend Index 1+):**
```
Address: [tag][new_dsa_pk_hash]  ← Explicit address (same tag + new DSA PK hash)
```

**What you need to know:**
- Account Tag stays the same across all spends
- DSA PK Hash changes with each spend (derived from each WOTS+ public key)
- The `dsaHash` returned by SDK is a 40-byte implicit address format
- Transaction building extracts the first 20 bytes as the DSA PK Hash component
- SDK handles this automatically

---

## Architecture Workflows

### User Registration Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User Creates Account                                     │
│     ├─> Generate NEW Master Seed (32 bytes)                  │
│     ├─> Derive Account Tag (Acct Index = 0, Spend Index 0)   │
│     └─> Persist securely:                                    │
│         - Master seed (encrypted)                            │
│         - Account index: 0 (primary deposit address)         │
│         - Account tag: 04676a3e... (20 bytes)                │
│         - Spend index: 0                                     │
│                                                              │
│  2. Generate Additional Deposit Address (Optional)           │
│     ├─> Retrieve user's encrypted master seed                │
│     ├─> Decrypt master seed                                  │
│     ├─> Use next account_index (0 → 1)                       │
│     ├─> Derive new Account Tag (Account Index = 1)           │
│     └─> Persist as separate account:                         │
│         - Master seed (same, encrypted)                      │
│         - Account index: 1 (secondary deposit address)       │
│         - Account tag: 9ea689e7... (different tag)           │
│         - Spend index: 0                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Deposit Processing Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                    DEPOSIT WORKFLOW                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User Receives Deposit Address                            │
│     └─> Show account_tag as hex or Base58:                   │
│         Hex: result.accountTagHex (40 chars)                 │
│         Base58: addrTagToBase58(result.accountTag)           │
│                                                              │
│  2. User Sends MCM to Deposit Address                        │
│     └─> Transaction appears on blockchain                    │
│                                                              │
│  3. Exchange Monitors All Accounts (Periodic)                │
│     ├─> Query API balance endpoint for each account_tag      │
│     ├─> Compare network balance vs tracked balance           │
│     ├─> If balance changed:                                  │
│     │   ├─> Wait for appropriate confirmations               │
│     │   ├─> (Optional) Query transactions endpoint for       │
│     │   │   transaction details                              │
│     │   └─> Update tracked balance                           │
│     └─> Repeat for all accounts                              │
│                                                              │
│  4. Credit User Balance (After Confirmations)                │
│     └─> Update user balance based on network balance         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Withdrawal Processing Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                   WITHDRAWAL WORKFLOW                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User Requests Withdrawal                                 │
│     ├─> Verify user balance sufficient                       │
│     ├─> Retrieve account information                         │
│     └─> Query current blockchain balance for transaction     │
│                                                              │
│  2. Generate Keypairs Using SDK                              │
│     ├─> deriveKeypairForSpend(masterSeed, spendIndex, ...)   │
│     │   for source address (current spend index)             │
│     └─> deriveKeypairForSpend(masterSeed, spendIndex+1, ...) │
│         for change address (current spend index +1)          │
│                                                              │
│  3. Create & Sign Transaction (Offline)                      │
│     ├─> Call createTransaction() with:                       │
│     │   - srcTag (account tag)                               │
│     │   - sourcePk (source keypair public key)               │
│     │   - changePk (change keypair public key)               │
│     │   - balance (current blockchain balance)               │
│     │   - dstAccountTag (destination account tag)            │
│     │   - amount, secret, fee                                │
│     └─> Returns signed transaction object with hex/buffer    │
│         ready for broadcasting                               │
│                                                              │
│  4. Broadcast Transaction                                    │
│     ├─> Submit signed transaction to Mochimo network         │
│     ├─> Verify broadcast successful                          │
│     └─> Get transaction ID                                   │
│                                                              │
│  5. Update State (ATOMIC)                                    │
│     ├─> INCREMENT spend_index (0 → 1, 1 → 2, etc.)           │
│     ├─> Update balance tracking (subtract amount + fee)      │
│                                                              │
│  Do not reuse spend_index unless recovering from chain fork! │
│     Each WOTS+ keypair can only sign ONE transaction         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Account Recovery Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                   ACCOUNT RECOVERY                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Scenario: Database lost/corrupted, need to recover state    │
│                                                              │
│  What You Have:                                              │
│     Yes User's encrypted master seed (from backup)           │
│     Yes User's account_index                                 │
│     Yes User's account_tag                                   │
│      No Current spend_index (LOST - need to recover)         │
│                                                              │
│  Recovery Process:                                           │
│     1. Query blockchain for account_tag                      │
│     2. Get current DSA Hash from network                     │
│     3. Iterate through spend indices (0, 1, 2, 3...)         │
│     4. For each: derive WOTS keypair, compute DSA hash       │
│     5. Compare with network's DSA hash                       │
│     6. When match found: that's your current spend_index!    │
│     7. Persist recovered spend_index                         │
│                                                              │
│  Result: Account fully recovered from master seed alone      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## � Production Implementation Guide

### Complete Workflow with Code Examples

This section provides production-ready code patterns for implementing the full exchange integration workflow.

#### Step 1: Creating Deposit Addresses for New Users

```javascript
import { generateMasterSeed, getAccountFromMasterSeed, addrTagToBase58 } from 'mochimo';

async function createUserDepositAddress(userId) {
  // Generate a unique master seed for this user (ONE TIME ONLY)
  const masterSeed = generateMasterSeed();
  
  // Derive the primary account (accountIndex = 0)
  const account = getAccountFromMasterSeed(masterSeed, 0);
  
  // Convert to user-friendly base58 format
  const depositAddress = addrTagToBase58(account.accountTag);
  
  // Store in database (CRITICAL: encrypt masterSeed!)
  await db.users.insert({
    user_id: userId,
    master_seed: encryptMasterSeed(masterSeed), // Use AES-256-GCM or HSM
    account_tag_hex: account.accountTagHex,
    account_index: 0,
    spend_index: 0,
    balance: '0',
    spend_pending: false,
    created_at: new Date()
  });
  
  return depositAddress;
}
```

#### Step 2: Monitor Deposits (Ongoing Background Process)

```javascript
import { deriveKeypairForSpend } from 'mochimo';

// Run this continuously (e.g., every 180 seconds) as a background service
async function monitorDeposits() {
  const accounts = await db.users.findAll(); // Get all managed accounts
  
  for (const account of accounts) {
    // Query blockchain balance using just the account tag
    const response = await fetch('https://api.mochimo.org/account/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network_identifier: { blockchain: 'mochimo', network: 'mainnet' },
        account_identifier: { address: account.account_tag_hex }
      })
    });
    
    const data = await response.json();
    const networkBalance = data.balances[0]?.value || '0';
    
    // Compare with tracked balance
    if (networkBalance !== account.balance) {
      const difference = BigInt(networkBalance) - BigInt(account.balance);
      
      if (difference > 0) {
        console.log(`Deposit detected for user ${account.user_id}: ${difference} nanoMCM`);
        
        // Update database balance and credit user (atomic transaction)
        await db.transaction(async (trx) => {
          await trx.users.update(
            { user_id: account.user_id },
            { balance: networkBalance }
          );
          await trx.user_balances.increment(
            { user_id: account.user_id },
            { available_balance: difference.toString() }
          );
          await trx.transactions.insert({
            user_id: account.user_id,
            type: 'deposit',
            amount: difference.toString(),
            timestamp: new Date()
          });
        });
      }
    }
  }
}

// Schedule monitoring
setInterval(monitorDeposits, 180000); // Every 3 minutes
```

#### Step 3: Processing Withdrawal Requests

```javascript
import {
  deriveKeypairForSpend,
  createTransaction,
  broadcastTransaction,
  validateBase58Tag,
  base58ToAddrTag
} from 'mochimo';

async function processWithdrawal(userId, destinationAddressBase58, withdrawalAmount) {
  // 3.1: Pre-flight checks
  const account = await db.users.findOne({ user_id: userId });
  
  // Check if already pending
  if (account.spend_pending) {
    throw new Error('Address already has a pending spend - please wait');
  }
  
  // Verify internal balance
  const totalRequired = BigInt(withdrawalAmount) + BigInt(500); // amount + fee
  if (BigInt(account.balance) < totalRequired) {
    throw new Error('Insufficient balance');
  }
  
  // Validate destination address
  if (!validateBase58Tag(destinationAddressBase58)) {
    throw new Error('Invalid withdrawal address');
  }
  
  const destinationTag = base58ToAddrTag(destinationAddressBase58).toString('hex');
  
  // 3.2: Decrypt master seed and derive keypairs
  const masterSeed = decryptMasterSeed(account.master_seed);
  const currentSpendIndex = account.spend_index;
  
  const sourceKeypair = deriveKeypairForSpend(masterSeed, currentSpendIndex, account.account_index);
  const changeKeypair = deriveKeypairForSpend(masterSeed, currentSpendIndex + 1, account.account_index);
  
  // 3.3: Query current blockchain balance
  const balanceResponse = await fetch('https://api.mochimo.org/account/balance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      network_identifier: { blockchain: 'mochimo', network: 'mainnet' },
      account_identifier: { 
        address: `0x${account.account_tag_hex}${sourceKeypair.dsaHashHex.substring(0, 40)}` 
      }
    })
  });
  
  const balanceData = await balanceResponse.json();
  const currentBalance = balanceData.balances[0].value;
  
  // Verify blockchain balance
  if (BigInt(currentBalance) < totalRequired) {
    throw new Error('Insufficient blockchain balance');
  }
  
  // 3.4: Create and sign transaction
  const txResult = createTransaction({
    srcTag: account.account_tag_hex,
    sourcePk: sourceKeypair.publicKeyHex,
    changePk: changeKeypair.publicKeyHex,
    balance: currentBalance,
    dstAccountTag: destinationTag,
    amount: withdrawalAmount,
    secret: sourceKeypair.secretKeyHex,
    fee: 500
  });
  
  // 3.5: Mark as pending BEFORE broadcast
  await db.users.update(
    { user_id: userId },
    { spend_pending: true }
  );
  
  // 3.6: Broadcast transaction
  try {
    await broadcastTransaction(txResult.transaction);
  } catch (error) {
    // If broadcast fails, unmark pending and allow retry
    await db.users.update(
      { user_id: userId },
      { spend_pending: false }
    );
    throw new Error(`Broadcast failed: ${error.message}`);
  }
  
  // 3.7: Verify in mempool
  const mempoolResponse = await fetch('https://api.mochimo.org/mempool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      network_identifier: { blockchain: 'mochimo', network: 'mainnet' }
    })
  });
  const mempoolData = await mempoolResponse.json();
  
  // Log for monitoring (implement your mempool verification logic)
  console.log(`Transaction broadcast for user ${userId}. Monitor for confirmation.`);
  
  // 3.8: Return transaction ID for tracking
  return {
    txId: txResult.transactionHash,
    status: 'pending',
    message: 'Transaction broadcast successfully. Awaiting confirmation.'
  };
}
```

#### Step 4: Monitor Confirmations and Finalize

```javascript
// Run this as a separate background service
async function monitorPendingWithdrawals() {
  const pendingAccounts = await db.users.findAll({ spend_pending: true });
  
  for (const account of pendingAccounts) {
    // Query current blockchain state
    const masterSeed = decryptMasterSeed(account.master_seed);
    const nextSpendIndex = account.spend_index + 1;
    const nextKeypair = deriveKeypairForSpend(masterSeed, nextSpendIndex, account.account_index);
    
    // Check if the change address (next spend) has balance
    const response = await fetch('https://api.mochimo.org/account/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network_identifier: { blockchain: 'mochimo', network: 'mainnet' },
        account_identifier: { 
          address: `0x${account.account_tag_hex}${nextKeypair.dsaHashHex.substring(0, 40)}` 
        }
      })
    });
    
    const data = await response.json();
    const changeBalance = data.balances[0]?.value || '0';
    
    // If change address has balance, transaction is confirmed
    if (BigInt(changeBalance) > 0) {
      console.log(`Withdrawal confirmed for user ${account.user_id}`);
      
      // Finalize: unmark pending and increment spend index (atomic)
      await db.transaction(async (trx) => {
        await trx.users.update(
          { user_id: account.user_id },
          {
            spend_index: nextSpendIndex,
            spend_pending: false,
            balance: changeBalance
          }
        );
      });
    }
  }
}

// Schedule confirmation monitoring
setInterval(monitorPendingWithdrawals, 60000); // Every minute
```

---

## SDK Reference

### Generate Master Seed

```javascript
import { generateMasterSeed } from 'mochimo';

const masterSeed = generateMasterSeed();
// Returns: Buffer (32 bytes)
// Store encrypted per user
```

### Get Account from Master Seed

```javascript
import { getAccountFromMasterSeed } from 'mochimo';

const account = getAccountFromMasterSeed(masterSeed, accountIndex);
// Parameters:
//   - masterSeed: Buffer (32 bytes) or hex string (64 chars)
//   - accountIndex: number (0, 1, 2... for multiple deposit addresses per user)
//
// Returns:
//   - accountSeed: Buffer (32 bytes) - intermediate value, not needed for exchange integration
//   - accountTag: Buffer (20 bytes) - persistent account identifier
//   - accountTagHex: string (40 hex chars) - deposit address to show users
//   - depositAddress: Object - first address info (spend index 0)
//     - dsaHash: Buffer (40 bytes) - full ledger address (implicit)
//     - dsaHashHex: string (80 hex chars) - hex representation
//     - publicKey: Buffer (2208 bytes) - WOTS+ public key
//     - publicKeyHex: string (4416 hex chars) - hex representation
//
// Usage: Call once at user registration to get their deposit address
// Store masterSeed (encrypted), accountTag, and spendIndex (starts at 0)
```

### Derive Keypair for Spend

```javascript
import { deriveKeypairForSpend } from 'mochimo';

const keypair = deriveKeypairForSpend(masterSeed, spendIndex, accountIndex);
// Parameters:
//   - masterSeed: Buffer (32 bytes) - same master seed stored at registration
//   - spendIndex: number (0, 1, 2... increments with each withdrawal)
//   - accountIndex: number (0, 1, 2... matches account derivation, usually 0)
//
// Returns:
//   - secretKey: Buffer (32 bytes) - WOTS+ secret key for signing
//   - secretKeyHex: string (64 hex chars) - hex representation
//   - publicKey: Buffer (2208 bytes) - WOTS+ public key
//   - publicKeyHex: string (4416 hex chars) - hex representation
//   - dsaHash: Buffer (40 bytes) - full ledger address (implicit format)
//   - dsaHashHex: string (80 hex chars) - hex representation
//   - accountTag: Buffer (20 bytes) - persistent account identifier
//   - accountTagHex: string (40 hex chars) - hex representation
//
// Usage: Call this for every withdrawal transaction
// Always pass the same masterSeed that was generated at registration
```

### Create Transaction

```javascript
import { createTransaction } from 'mochimo';

const tx = createTransaction({
  srcTag: account.accountTagHex,           // Source account tag (40 hex chars)
  sourcePk: sourceKP.publicKeyHex,         // Source WOTS+ public key (hex)
  secret: sourceKP.secretKeyHex,           // Source WOTS+ secret key (hex)
  balance: currentBalance,                 // Current balance in nanoMCM (string)
  changePk: changeKP.publicKeyHex,         // Change WOTS+ public key (hex)
  dstAccountTag: destinationTag,           // Destination account tag (40 hex chars)
  amount: amountNanoMCM,                   // Amount to send in nanoMCM (string)
  fee: '500'                               // Transaction fee in nanoMCM (string)
});

// Returns:
//   - txHex: string (hex-encoded signed transaction)
//   - txBuffer: Buffer (binary signed transaction)
//   - txid: string (transaction ID)
```

**Unit Conversion:**
- 1 MCM = 1,000,000,000 nanoMCM (9 decimals)
- SDK uses nanoMCM (smallest unit)
- Display to users in MCM

---

## 📝 Detailed Examples Walkthrough

### Example 1: Generate User Account

**File:** `1-generate-user-account.js`

**What it demonstrates:**
- Generating a cryptographically secure master seed (ONE PER USER)
- Deriving the first account (account index 0) from the master seed
- Creating a persistent deposit address (Account Tag)
- Persisting master seed and account information

**Key Code:**
```javascript
const masterSeed = generateMasterSeed();  // 32 bytes per user
const account = getAccountFromMasterSeed(masterSeed, 0);  // accountIndex = 0
console.log('Deposit Address:', account.accountTagHex);
```

**Use Cases:**
- New user registration
- Generating additional deposit addresses (increment accountIndex)

**Prerequisites:** None - run this first

**Result:** Creates `data/master-seed.txt` and `data/user-account.json`

---

### Example 2: Check Deposits

**File:** `2-check-deposit.js`

**What it demonstrates:**
- Querying network API for account balance
- Checking transaction history
- Monitoring deposits for a specific Account Tag
- Parsing network responses

**Key Code:**
```javascript
// Query balance
const balanceResponse = await fetch(
  `${NETWORK_ENDPOINT}/balance/${accountTag}`
);

// Query transactions
const txResponse = await fetch(
  `${NETWORK_ENDPOINT}/transaction?tag=${accountTag}`
);
```

**Use Cases:**
- Periodic deposit monitoring
- Balance verification
- Transaction confirmation checking
- Crediting user balances after confirmations

**Prerequisites:**
- Run Example 1 first
- (Optional) Send MCM to the generated Account Tag to see deposits

**Result:** Displays current balance and transaction history

---

### Example 3: Send Withdrawal

**File:** `3-send-withdrawal.js`

**What it demonstrates:**
- Deriving source and change keypairs from master seed
- Creating and signing a withdrawal transaction
- Broadcasting transaction to network
- Updating spend index tracking after successful broadcast

**Key Code:**
```javascript
// Derive keypairs
const sourceKP = deriveKeypairForSpend(masterSeed, spendIndex, accountIndex);
const changeKP = deriveKeypairForSpend(masterSeed, spendIndex + 1, accountIndex);

// Create transaction
const tx = createTransaction({
  srcTag: accountTag,
  sourcePk: sourceKP.publicKeyHex,
  secret: sourceKP.secretKeyHex,
  balance: currentBalance,
  changePk: changeKP.publicKeyHex,
  dstAccountTag: destination,
  amount: amountNanoMCM,
  fee: '500'
});

// Broadcast
await fetch(`${NETWORK_ENDPOINT}/transaction`, {
  method: 'POST',
  body: tx.txHex
});

// CRITICAL: Increment spend index atomically
spendIndex++;
```

**Use Cases:**
- Processing user withdrawals
- Internal transfers
- Cold wallet transfers
- Consolidation transactions

**Prerequisites:**
- Run Example 1 first
- Account must have sufficient balance
- Valid destination Account Tag (40 hex chars)

**Result:** Transaction broadcast, spend index incremented, balance updated

---

### Example 4: Recover Spend Index

**File:** `4-recover-spend-index.js`

**What it demonstrates:**
- Account recovery from blockchain state
- Querying network for current account information
- Iterating through spend indices to find matching keypair
- Verifying persisted spend index against derived keypairs

**Key Code:**
```javascript
// Get current ledger address from network
const accountInfo = await fetch(
  `${NETWORK_ENDPOINT}/balance/${accountTag}`
);
const networkAddress = accountInfo.address;  // 40-byte full address
const networkDsaHash = networkAddress.slice(40);  // Last 20 bytes (DSA PK Hash component)

// Iterate to find matching spend index
for (let testIndex = 0; testIndex < 1000; testIndex++) {
  const kp = deriveKeypairForSpend(masterSeed, testIndex, accountIndex);
  // Extract DSA hash component from the 40-byte implicit address
  const derivedDsaHash = kp.dsaHash.toString('hex').slice(40, 80);
  
  if (derivedDsaHash === networkDsaHash) {
    console.log('Recovered spend index:', testIndex);
    break;
  }
}
```

**Use Cases:**
- State loss or corruption recovery
- Network fork or chain reorganization recovery
- Disaster recovery scenarios
- Audit and verification procedures
- System migration validation

**Prerequisites:**
- Run Example 1 first
- (Optional) Run Example 3 to have spent transactions for verification

**Result:** Recovers and verifies the current spend index from blockchain

---

## Security Best Practices

### Address Validation for Withdrawals

**CRITICAL:** Always validate user-supplied withdrawal addresses before processing transactions.

**Best Practices:**
```javascript
import { validateBase58Tag, base58ToAddrTag } from 'mochimo';

// In your withdrawal API endpoint
function processWithdrawal(userAddress, amount) {
  // Step 1: Validate format
  if (!validateBase58Tag(userAddress)) {
    throw new Error('Invalid Mochimo address format');
  }
  
  // Step 2: Decode to get account tag buffer
  let accountTagBuffer;
  try {
    accountTagBuffer = base58ToAddrTag(userAddress);
  } catch (error) {
    throw new Error('Address decoding failed: ' + error.message);
  }
  
  // Step 3: Verify decoded length
  if (accountTagBuffer.length !== 20) {
    throw new Error('Invalid account tag length');
  }
  
  // Step 4: Convert to hex for transaction
  const destinationTag = accountTagBuffer.toString('hex');
  
  // Step 5: Proceed with transaction
  // ... create and sign transaction ...
}
```

**Validation Checklist:**
- Base58 format validation (detects typos, invalid characters)
- CRC checksum verification (catches corruption)
- Length verification (must decode to exactly 20 bytes)
- Error handling for decode failures
- User-friendly error messages

**Common Mistakes to Avoid:**
- Do not accept raw hex addresses from users
- Do not skip validation and assume user input is correct
- Do not process withdrawals with failed validation
- Do not display hex addresses to users

**Example User Interface Flow:**
```javascript
// Frontend validation (immediate feedback)
function validateAddressInput(input) {
  try {
    if (!validateBase58Tag(input)) {
      return { valid: false, error: 'Invalid address format' };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid address' };
  }
}

// Backend validation (before processing)
app.post('/api/withdraw', async (req, res) => {
  const { address, amount } = req.body;
  
  // Validate address
  if (!validateBase58Tag(address)) {
    return res.status(400).json({ 
      error: 'Invalid withdrawal address. Please check and try again.' 
    });
  }
  
  // Process withdrawal
  try {
    const accountTag = base58ToAddrTag(address);
    await processWithdrawal(accountTag, amount);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### Master Seed Protection

The master seed is the most critical piece of data - it can regenerate all user accounts and sign transactions.

**Best Practices:**
- Generate once per user and store encrypted
- Use strong encryption (AES-256-GCM or better)
- Keep offline backups in secure locations
- Implement multi-signature access controls
- Use hardware security modules (HSMs) in production
- Audit access logs regularly

**Common Mistakes to Avoid:**
- Do not store unencrypted (these examples are DEMO only)
- Do not transmit over network without encryption
- Do not log or print in production code
- Do not keep only one backup copy
- Do not share master seeds across users
- Do not use predictable entropy sources

### Spend Index Management

**CRITICAL:** Don't reuse a spend index - it compromises WOTS+ security with each additional spend. The only time a spend index should be re-used is if recovering from a chain split.

**Best Practices:**
- Ensure atomic spend index increments
- Prevent concurrent withdrawals for the same account
- Increment spend index BEFORE broadcasting transaction
- Implement appropriate redundancy for spend index persistence
- Use transactions or locks to prevent race conditions
- Validate spend index before each withdrawal

**Common Mistakes to Avoid:**
- Do not allow concurrent withdrawals for the same account
- Decrement or reset spend index (except when recovering from a chain fork/split)
- Skip spend indices (always sequential: 0, 1, 2, 3...)
- Reuse spend indices in normal operation
- Broadcast transaction without incrementing spend index

### Network Security

**Best Practices:**
- Use HTTPS endpoints only
- Validate API responses
- Implement request timeouts
- Retry failed broadcasts with exponential backoff
- Verify transaction confirmations

**Common Mistakes to Avoid:**
- Do not trust network responses without validation
- Do not expose API keys in client code
- Do not retry indefinitely on failures

---

## Data Persistence Requirements

Your system must persist the following per user:

### Required Fields

| Field | Type | Description | Critical |
|-------|------|-------------|----------|
| `master_seed` | 32 bytes | User's master seed (ENCRYPTED) | YES |
| `account_tag` | 20 bytes | Persistent deposit address | YES |
| `account_index` | integer | Account derivation index (usually 0) | YES |
| `spend_index` | integer | Current transaction counter | YES |

### Optional Fields (Recommended)

| Field | Type | Description |
|-------|------|-------------|
| `balance` | string | Tracked balance in nanoMCM |
| `last_tx_id` | string | Last transaction ID |
| `last_sync` | timestamp | Last network sync time |
| `confirmations` | integer | Required confirmations |

### Critical Requirements

1. **Atomic Spend Index Updates:**
   - Use transactional updates or locks
   - Increment MUST succeed before broadcasting
   - Never allow concurrent modifications

2. **Master Seed Encryption:**
   - AES-256-GCM minimum
   - Per-user encryption keys
   - Secure key management

3. **Backup Strategy:**
   - Automated encrypted backups
   - Multiple geographic locations
   - Regular recovery testing

---

## Testing & Troubleshooting

### Run SDK Tests

```bash
# Full test suite (79 tests)
npm run test:unit

# Specific test categories
npm test -- test/unit/deterministic.test.js
npm test -- test/unit/core/HDWallet.test.ts
npm test -- test/unit/crypto/
```

### Common Issues

#### "User account file not found"
**Solution:** Run Example 1 first to generate the account
```bash
node 1-generate-user-account.js
```

#### "Master seed file not found"
**Solution:** Run Example 1 first to generate the master seed
```bash
node 1-generate-user-account.js
```

#### "Insufficient balance"
**Solution:** 
1. Send MCM to the Account Tag first
2. Wait for network confirmation
3. Run Example 2 to verify balance
```bash
node 2-check-deposit.js
```

#### "Invalid destination Account Tag"
**Solution:** Destination must be exactly 40 hex characters (20 bytes)
```javascript
// Valid format:
const destination = '26e6ba48b6f5353184f3fb5b8d473b575ee17c03';
```

#### "API request fails with 400 or 500 error"
**Cause:** Incorrect network identifier or missing `0x` prefix on address

**Solution:**
```javascript
// WRONG - will fail
network_identifier: { blockchain: 'Mochimo', network: 'mainnet' }  // Capital M
account_identifier: { address: accountTag }  // Missing 0x

// CORRECT
network_identifier: { blockchain: 'mochimo', network: 'mainnet' }  // Lowercase
account_identifier: { address: `0x${accountTag}${accountTag}` }  // With 0x prefix
```

#### "Transaction hash comparison not working"
**Cause:** API returns hashes with `0x` prefix

**Solution:**
```javascript
// User provides: d1abb3165ecec2768ac5d4f2fa3a5c07dd0f33d12bc54d31623af7493524e90b
// API returns: 0xd1abb3165ecec2768ac5d4f2fa3a5c07dd0f33d12bc54d31623af7493524e90b

// Strip prefix when comparing:
const match = tx.hash.toLowerCase().replace('0x', '') === userTxId.toLowerCase();
```

#### "Transaction rejected"
**Solution:**
1. Verify spend index is correct
2. Check keypair derivation matches current state
3. Ensure balance is sufficient (amount + fee)
4. Validate all transaction parameters

#### "Spend index mismatch"
**Solution:** Run Example 5 to recover current spend index from blockchain
```bash
node 5-recover-spend-index.js
```

### Debug Mode

Enable verbose logging in examples:
```javascript
const DEBUG = true;  // Set at top of example files
```

---

## 📖 Additional Resources

### Official Links
- **Mochimo Website:** https://mochimo.org
- **Network API:** https://api.mochimo.org (Rosetta-compliant)
- **SDK Documentation:** `../../docs/API.md`
- **GitHub Repository:** https://github.com/adequatesystems/mochimo-wallet

### Technical Documentation
- **WOTS+ Signatures:** Winternitz One-Time Signature Plus (post-quantum)
- **HD Wallets:** Hierarchical Deterministic wallet structure (BIP32-inspired)
- **Network Protocol:** Rosetta API specification compliance

### Directory Structure

```
examples/exchange/
├── EXCHANGE_INTEGRATION.md          # This file - complete guide
├── 1-generate-user-account.js       # Generate master seed & account
├── 2-check-deposit.js               # Check balance & transactions
├── 3-send-withdrawal.js             # Process withdrawal
├── 4-validate-withdrawal-address.js # Validate user withdrawal addresses
├── 5-recover-spend-index.js         # Recover account from blockchain
├── example-integration-test/        # Complete integration test walkthrough
│   ├── INTEGRATION_TESTING_GUIDE.md # Step-by-step testing documentation
│   ├── step1-generate-account.js    # Test: Account generation
│   ├── step2a-check-mempool.js      # Test: Mempool monitoring
│   ├── step2b-check-balance.js      # Test: Balance queries
│   ├── step2c-check-transactions.js # Test: Transaction history
│   ├── step3-send-withdrawal.js     # Test: First withdrawal
│   ├── step3a-check-mempool.js      # Test: Withdrawal in mempool
│   ├── step3b-check-balance.js      # Test: Recipient balance
│   ├── step3c-check-transactions.js # Test: Recipient TX history
│   └── step4-send-remaining-balance.js # Test: Change address spending
└── data/                            # Generated by examples (gitignored)
    ├── master-seed.txt              # 32-byte master seed (HEX)
    └── user-account.json            # User account information
```

### Example Integration Test

**See a complete working example:** [`example-integration-test/`](./example-integration-test/)

This directory contains a full integration test that was performed following this documentation:
- Complete deposit workflow (account generation, monitoring)
- Multiple withdrawal transactions (testing spend index increment)
- All monitoring scripts (mempool, balance, transaction history)
- Proves that change addresses are spendable
- Verifies all Rosetta API endpoints

Read [`example-integration-test/INTEGRATION_TESTING_GUIDE.md`](./example-integration-test/INTEGRATION_TESTING_GUIDE.md) to see the step-by-step process and results.

### Support

For issues or questions:
1. Review this integration guide thoroughly
2. Check the troubleshooting section above
3. Run the test suite to verify SDK functionality: `npm run test:unit`
4. Visit https://mochimo.org for community support
5. Review example code in `examples/exchange/` directory

---

**Last Updated:** October 19, 2025  
**SDK Version:** 1.1.0+deterministic  
**Network:** Mochimo Mainnet  
**Protocol:** WOTS+ Post-Quantum Signatures
