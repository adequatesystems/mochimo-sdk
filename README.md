# Mochimo Node.js SDK

A production-ready Node.js SDK for the Mochimo blockchain. This SDK provides everything needed for cryptocurrency exchange integration with Masterseeds including: deterministic key generation, transaction creation/signing, and network broadcasting with post-quantum security.

> **Version 2.0** - Complete rewrite focused on exchange integration with deterministic key derivation. See [CHANGELOG.md](CHANGELOG.md) for details.

## Quick Start

### Installation

```bash
npm install mochimo
```

### Basic Example

```javascript
import {
  generateMasterSeed,
  getAccountFromMasterSeed,
  deriveKeypairForSpend,
  addrTagToBase58
} from 'mochimo';

// STEP 1: Generate master seed for new user (at registration)
const masterSeed = generateMasterSeed();
const account = getAccountFromMasterSeed(masterSeed, 0);

// Show user their deposit address
const depositAddress = addrTagToBase58(account.accountTag);
console.log('Deposit Address:', depositAddress);

// Store in database:
// - masterSeed (encrypted!)
// - account.accountTagHex (for deposit tracking)
// - spendIndex: 0 (initial value)

// STEP 2: When user requests withdrawal
const spendIndex = 0; // Retrieved from database
const keypair = deriveKeypairForSpend(masterSeed, spendIndex, 0);

// Use keypair.publicKey and keypair.secretKey to create/sign transaction
// After successful broadcast, increment spendIndex to 1 in database
```

### Exchange Integration

**For complete production integration including:**
- Deposit monitoring workflows
- Withdrawal processing with spend index management
- Address validation and conversion
- Error handling and security best practices
- Database schema recommendations

**See: [examples/exchange/EXCHANGE_INTEGRATION.md](examples/exchange/EXCHANGE_INTEGRATION.md)**

## Understanding Mochimo

### Key Concepts for Exchanges

Mochimo uses **WOTS+ (Winternitz One-Time Signature Plus)** - a quantum-resistant signature scheme.

**What you need to know:**
- Each user gets **one master seed** (generate once, store encrypted)
- User **account addresses remain unchanged** (persistent deposit addresses)
- The SDK **automatically handles keypair derivation** for each transaction
- You only need to **track and increment a spend index** after successful withdrawals
- Never reuse a spend index (similar to nonce management in other blockchains)

The SDK handles all the cryptographic complexity transparently. You just manage the spend index counter.

### What to Store Per User

For each user account, store in your database:

1. **master_seed** (VARCHAR(64)) - The 32-byte master seed as hex string (store encrypted!)
2. **account_tag** (VARCHAR(40)) - The 20-byte account tag as hex string (deposit identifier)
3. **spend_index** (INTEGER) - Current spend index, starts at 0, increment after each withdrawal
4. **account_index** (INTEGER) - Usually 0 for primary account

**Do NOT store**: Individual keypairs, account seeds, or derived keys. Always derive fresh from `master_seed` + `spend_index` for each withdrawal.

## Address Format Requirements

Mochimo uses **Account Tags** as persistent user addresses:
- **20 bytes** (40 hex characters)
- Encoded as **base58 with CRC checksum** for user-facing display (~30 characters)
- Decoded to hex/binary for internal transaction processing

### Exchange Integration

Exchanges should:
1. **Only accept base58 addresses from users** (user-friendly, includes checksum)
2. **Convert base58 to hex internally** using `base58ToAddrTag()`
3. **Validate base58 before conversion** using `validateBase58Tag()`
4. **Store hex format in database** (efficient, 2208 chars)
5. **Display base58 to users** by converting hex back with `addrTagToBase58()`

```javascript
import { validateBase58Tag, base58ToAddrTag, addrTagToBase58 } from 'mochimo';

// User submits withdrawal address
const userAddress = "4bbb3..."; // ~30-char base58 with CRC

// Validate format and checksum
if (!validateBase58Tag(userAddress)) {
  throw new Error('Invalid Mochimo address');
}

// Convert to hex for transaction
const hexAddress = base58ToAddrTag(userAddress); // 40-char hex (20 bytes)

// Create transaction using hex format
const tx = createTransaction({
  dstAccountTag: hexAddress, // Use hex internally
  // ... other params
});

// Display address to user in base58
const displayAddress = addrTagToBase58(hexAddress);
```

### Why Both Formats Exist

| Format | Length | Use Case | Advantage |
|--------|--------|----------|-----------|
| **Hex** | 40 chars | Internal/database | Efficient storage, exact bytes |
| **Base58** | ~30 chars | User-facing | Shorter, includes CRC checksum |

**Always validate base58 addresses with `validateBase58Tag()` before conversion** to ensure:
- Valid base58 characters only
- CRC checksum matches (detects typos)
- Decodes to exactly 20 bytes

## Rosetta API Integration

When querying the Mochimo network via the Rosetta API, follow these requirements:

### API Endpoint

```javascript
const API_URL = 'https://api.mochimo.org';
```

### Network Identifier

**Must be lowercase:**
```javascript
network_identifier: {
  blockchain: 'mochimo',  // CRITICAL: Must be lowercase, not 'Mochimo'
  network: 'mainnet'
}
```

### Address Format for API Queries

**CRITICAL: Different endpoints require different address formats:**

#### 1. Balance Queries (`/account/balance`)

Uses **40-byte ledger address** (account tag + DSA hash):

```javascript
// For new accounts (implicit address = account tag repeated twice)
const ledgerAddress = `0x${accountTag}${accountTag}`;

// For spent accounts (explicit address = account tag + DSA hash)
const ledgerAddress = `0x${accountTag}${dsaHash}`;

// Example balance query
const response = await fetch('https://api.mochimo.org/account/balance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    network_identifier: {
      blockchain: 'mochimo',
      network: 'mainnet'
    },
    account_identifier: {
      address: ledgerAddress  // 40 bytes (80 hex chars) with 0x prefix
    }
  })
});
```

#### 2. Transaction History (`/search/transactions`)

Uses **20-byte account tag only:**

```javascript
// Use just the account tag, NOT the full ledger address
const accountTagHex = `0x${accountTag}`;

// Example transaction search
const response = await fetch('https://api.mochimo.org/search/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    network_identifier: {
      blockchain: 'mochimo',
      network: 'mainnet'
    },
    account_identifier: {
      address: accountTagHex  // 20 bytes (40 hex chars) with 0x prefix
    }
  })
});
```

**Common Mistake:** Using the 40-byte ledger address for transaction search will fail. Always use the 20-byte account tag for `/search/transactions`.

### Transaction Hash Format

**API returns transaction hashes with `0x` prefix:**

```javascript
// Mempool response
{
  "transaction_identifiers": [
    { "hash": "0xd1abb3165ecec2768ac5d4f2fa3a5c07dd0f33d12bc54d31623af7493524e90b" }
  ]
}

// When comparing with user-provided TX IDs, strip the prefix:
const txFound = transactions.find(
  tx => tx.hash.toLowerCase().replace('0x', '') === userTxId.toLowerCase()
);
```

### Key Points

- Use `blockchain: 'mochimo'` (lowercase)
- Prefix all addresses with `0x` for API queries
- Strip `0x` prefix when comparing transaction hashes
- Do not use capitalized `'Mochimo'` in network identifier
- Do not omit `0x` prefix from addresses in API requests

## Exchange Integration

For complete exchange integration guidance, see [examples/exchange/EXCHANGE_INTEGRATION.md](examples/exchange/EXCHANGE_INTEGRATION.md), which covers:
- Database schema recommendations
- Master seed storage and encryption
- Spend index management
- Deposit address generation
- Withdrawal processing
- Transaction monitoring
- Error handling and recovery

## API Reference

### Deterministic Key Generation (Recommended for Exchanges)

#### `generateMasterSeed()`
Generates a cryptographically secure 32-byte master seed.

```javascript
import { generateMasterSeed } from 'mochimo';

const masterSeed = generateMasterSeed();
// Returns: Buffer (32 bytes)
// Store this encrypted in your database!
```

**Returns**: `Buffer` - 32-byte cryptographically secure random seed

**Security**: Uses `crypto.randomBytes(32)` - cryptographically secure random number generator.

---

#### `getAccountFromMasterSeed(masterSeed, accountIndex = 0)`
Derives complete account information from master seed and account index.

```javascript
import { generateMasterSeed, getAccountFromMasterSeed } from 'mochimo';

const masterSeed = generateMasterSeed();
const account = getAccountFromMasterSeed(masterSeed, 0);

console.log(account);
// {
//   accountSeed: Buffer(32),
//   accountTag: Buffer(20),
//   accountTagHex: '40-character hex string',
//   depositAddress: {
//     dsaHash: Buffer(40),  // Full ledger address (implicit)
//     dsaHashHex: '80-character hex string',
//     publicKey: Buffer(2208),
//     publicKeyHex: '4416-character hex string'
//   }
// }
```

**Parameters**:
- `masterSeed` (Buffer|string) - 32-byte master seed (Buffer or 64-char hex string)
- `accountIndex` (number, optional) - Account index, default: 0

**Returns**: Object with:
- `accountSeed` (Buffer) - 32-byte account seed (intermediate derivation value, not needed for exchange integration)
- `accountTag` (Buffer) - 20-byte persistent account identifier
- `accountTagHex` (string) - Account tag as hex (40 chars)
- `depositAddress` (Object) - First address info (spend index 0)
  - `dsaHash` (Buffer) - 40-byte full ledger address (implicit: accountTag repeated twice)
  - `dsaHashHex` (string) - Full ledger address as hex (80 chars)
  - `publicKey` (Buffer) - 2208-byte public key
  - `publicKeyHex` (string) - Public key as hex (4416 chars)

**Exchange Integration Workflow**:
- **At Registration**: Call this once to get the user's deposit address (`accountTag`)
- **Store in Database**: `masterSeed` (encrypted), `accountTagHex`, `spendIndex` (initially 0)
- **For Withdrawals**: Always use `deriveKeypairForSpend(masterSeed, spendIndex, accountIndex)` - do NOT store or reuse `accountSeed`

---

#### `deriveKeypairForSpend(masterSeed, spendIndex, accountIndex = 0)`
Derives a WOTS+ keypair for a specific spend transaction. **Use this for every withdrawal.**

```javascript
import { deriveKeypairForSpend } from 'mochimo';

// Retrieve from database
const masterSeed = Buffer.from(user.master_seed, 'hex');
const spendIndex = user.spend_index; // Current spend index
const accountIndex = 0; // Usually 0 for primary account

const keypair = deriveKeypairForSpend(masterSeed, spendIndex, accountIndex);

// Use keypair to create and sign transaction
// keypair.publicKey, keypair.secretKey, keypair.dsaHash, etc.
```

**Parameters**:
- `masterSeed` (Buffer|string) - 32-byte master seed (same one stored at registration)
- `spendIndex` (number) - Current spend index from database (0, 1, 2, ...)
- `accountIndex` (number, optional) - Account index, default: 0

**Returns**: Object with:
- `secretKey` (Buffer) - 32-byte secret key for signing
- `secretKeyHex` (string) - Secret key as hex (64 chars)
- `publicKey` (Buffer) - 2208-byte WOTS+ public key
- `publicKeyHex` (string) - Public key as hex (4416 chars)
- `dsaHash` (Buffer) - 40-byte full ledger address (accountTag + DSA hash portion)
- `dsaHashHex` (string) - Full ledger address as hex (80 chars)
- `accountTag` (Buffer) - 20-byte account tag
- `accountTagHex` (string) - Account tag as hex (40 chars)

**Exchange Workflow**:
1. Retrieve user's `masterSeed` and current `spendIndex` from database
2. Call `deriveKeypairForSpend(masterSeed, spendIndex, accountIndex)`
3. Use returned keypair to create and sign transaction
4. Broadcast transaction to network
5. **ONLY after confirmation**, increment `spendIndex` in database
6. Never reuse a spend index (WOTS+ security requirement)

**Workflow**:
1. Retrieve current `spendIndex` from database
2. Derive keypair using this function
3. Create and sign transaction
4. Confirm the account is not marked "Spend Pending" in database.
5. Broadcast transaction
6. Confirm TX_ID is in the Mempool (Retransmit after 180 seconds)
7. Confirm Block Solves
8. ONLY if transactions succeeds, increment `spendIndex`, and set account "Spend Pending" flag back to not pending.

---

#### `deriveAccountSeed(masterSeed, accountIndex = 0)`
Derives just the account seed (intermediate step). Most exchanges won't need this directly.

```javascript
import { deriveAccountSeed } from 'mochimo';

const masterSeed = Buffer.from('a'.repeat(64), 'hex');
const accountSeed = deriveAccountSeed(masterSeed, 0);
// Returns: Buffer(32)
```

**Parameters**:
- `masterSeed` (Buffer|string) - 32-byte master seed (Buffer or 64-char hex string)
- `accountIndex` (number, optional) - Account index, default: 0

**Returns**: `Buffer` - 32-byte account seed

---

#### `deriveAccountTag(masterSeed, accountIndex = 0)`
Derives the account tag (persistent identifier).

```javascript
import { deriveAccountTag } from 'mochimo';

const masterSeed = Buffer.from('a'.repeat(64), 'hex');
const result = deriveAccountTag(masterSeed, 0);

console.log(result);
// {
//   accountTag: Buffer(20),
//   accountTagHex: '40-character hex string'
// }
```

**Parameters**:
- `masterSeed` (Buffer|string) - 32-byte master seed (Buffer or 64-char hex string)
- `accountIndex` (number, optional) - Account index, default: 0

**Returns**: Object with:
- `accountTag` (Buffer) - 20-byte account tag
- `accountTagHex` (string) - Account tag as hex (40 chars)

---

### Pool-Based Generation (Legacy - Not for Exchanges)

**WARNING**: These functions are for non-custodial wallets only. DO NOT use for exchange integration as they don't track spend indices.

#### `generateAccountKeypair(options)`
Generates a single random WOTS+ keypair.

```javascript
import { generateAccountKeypair } from 'mochimo';

const keypair = generateAccountKeypair();
// Returns: { dsaHash, accountTag, publicKey, secretKey }
```

**Options**:
- `seed` (Buffer, optional) - 32-byte seed for deterministic generation
- `index` (number, optional) - Keypair index for derivation, default: 0

**Returns**: Object with:
- `dsaHash` (Buffer) - 40-byte DSA hash (one-time use)
- `accountTag` (Buffer) - 20-byte persistent account identifier
- `publicKey` (Buffer) - 2208-byte WOTS+ public key
- `secretKey` (Buffer) - 32-byte secret seed

**Note**: Does NOT track spend index. For exchanges, use `deriveKeypairForSpend()` instead.

---

#### `generateAccountKeypairs(count, options)`
Generates multiple random WOTS+ keypairs (different accounts, not multiple spends).

```javascript
import { generateAccountKeypairs } from 'mochimo';

const keypairs = generateAccountKeypairs(5);
// Returns array of 5 different account keypairs
```

**Parameters**:
- `count` (number) - Number of keypairs to generate
- `options.masterSeed` (Buffer, optional) - 32-byte master seed for deterministic generation

**Returns**: Array of keypair objects (same structure as `generateAccountKeypair()`)

**Warning**: This generates multiple DIFFERENT ACCOUNTS, not multiple spend keypairs for the same account.

---

### Address Utilities

#### `validateBase58Tag(base58Tag)`
Validates a base58-encoded address with CRC checksum.

```javascript
import { validateBase58Tag } from 'mochimo';

const userAddress = "4bbb3..."; // User-provided base58 address
const isValid = validateBase58Tag(userAddress);

if (!isValid) {
  throw new Error('Invalid Mochimo address');
}
```

**Parameters**:
- `base58Tag` (string) - Base58-encoded address with CRC

**Returns**: `boolean` - `true` if valid, `false` otherwise

**Checks**:
- Contains only valid base58 characters
- CRC16-XMODEM checksum is valid
- Decodes to exactly 22 bytes (20-byte tag + 2-byte CRC)

---

#### `base58ToAddrTag(base58Tag)`
Converts base58 address to 20-byte account tag (hex format).

```javascript
import { base58ToAddrTag } from 'mochimo';

const base58Address = "4bbb3..."; // ~30 chars
const accountTagBuffer = base58ToAddrTag(base58Address);
// Returns: Buffer(20)

const accountTagHex = accountTagBuffer.toString('hex');
// Use this in transactions: '40-character hex string'
```

**Parameters**:
- `base58Tag` (string) - Base58-encoded address with CRC

**Returns**: `Buffer` - 20-byte account tag

**Throws**: Error if invalid base58 or wrong length

**Use Case**: Convert user-provided base58 addresses to hex for transaction creation.

---

#### `addrTagToBase58(addrTag)`
Converts 20-byte account tag to base58 format with CRC checksum.

```javascript
import { addrTagToBase58 } from 'mochimo';

const accountTagHex = 'ab8599ef698c629d499909917d15c291dddc2760'; // 40 hex chars
const accountTagBuffer = Buffer.from(accountTagHex, 'hex');

const base58Address = addrTagToBase58(accountTagBuffer);
// Returns: '4bbb3...' (~30 characters with CRC)
```

**Parameters**:
- `addrTag` (Buffer) - 20-byte account tag

**Returns**: `string` - Base58-encoded address with CRC checksum (~30 chars)

**Throws**: Error if tag is not exactly 20 bytes

**Use Case**: Display addresses to users in user-friendly format.

---

#### `validateLedgerAddress(ledgerAddress, name)`
Validates a 40-byte ledger address (Account Tag + DSA Hash).

```javascript
import { validateLedgerAddress } from 'mochimo';

const ledgerAddrHex = 'ab85...2760ab85...2760'; // 80 hex chars
const validatedBuffer = validateLedgerAddress(ledgerAddrHex);
// Returns: Buffer(40) if valid
```

**Parameters**:
- `ledgerAddress` (string|Buffer) - 40-byte ledger address (80 hex chars or Buffer)
- `name` (string, optional) - Parameter name for error messages

**Returns**: `Buffer` - 40-byte validated ledger address

**Throws**: Error if invalid format or wrong length

---

#### `validateAccountTag(accountTag, name)`
Validates a 20-byte account tag.

```javascript
import { validateAccountTag } from 'mochimo';

const accountTagHex = 'ab8599ef698c629d499909917d15c291dddc2760'; // 40 hex chars
const validatedBuffer = validateAccountTag(accountTagHex);
// Returns: Buffer(20) if valid
```

**Parameters**:
- `accountTag` (string|Buffer) - 20-byte account tag (40 hex chars or Buffer)
- `name` (string, optional) - Parameter name for error messages

**Returns**: `Buffer` - 20-byte validated account tag

**Throws**: Error if invalid format or wrong length

---

#### `extractAccountTag(ledgerAddress)`
Extracts the 20-byte account tag from a 40-byte ledger address (first 20 bytes).

```javascript
import { extractAccountTag } from 'mochimo';

const ledgerAddrHex = 'ab85...2760cd12...9876'; // 80 hex chars (40 bytes)
const accountTag = extractAccountTag(ledgerAddrHex);
// Returns: Buffer(20) - first 20 bytes
```

**Parameters**:
- `ledgerAddress` (string|Buffer) - 40-byte ledger address

**Returns**: `Buffer` - 20-byte account tag (first 20 bytes of ledger address)

---

#### `extractDsaHash(ledgerAddress)`
Extracts the 20-byte DSA hash from a 40-byte ledger address (last 20 bytes).

```javascript
import { extractDsaHash } from 'mochimo';

const ledgerAddrHex = 'ab85...2760cd12...9876'; // 80 hex chars (40 bytes)
const dsaHash = extractDsaHash(ledgerAddrHex);
// Returns: Buffer(20) - last 20 bytes
```

**Parameters**:
- `ledgerAddress` (string|Buffer) - 40-byte ledger address

**Returns**: `Buffer` - 20-byte DSA hash (last 20 bytes of ledger address)

---

#### `isImplicitAccount(ledgerAddress)`
Checks if an account is implicitly tagged (first-time account that has never been spent from).

```javascript
import { isImplicitAccount } from 'mochimo';

const ledgerAddrHex = 'ab85...2760ab85...2760'; // 80 hex chars
const isImplicit = isImplicitAccount(ledgerAddrHex);
// Returns: true if Account Tag == DSA Hash (never spent)
// Returns: false if Account Tag != DSA Hash (previously spent)
```

**Parameters**:
- `ledgerAddress` (string|Buffer) - 40-byte ledger address

**Returns**: `boolean` - `true` if implicit (never spent), `false` otherwise

---

#### `constructLedgerAddress(accountTag, dsaHash)`
Constructs a 40-byte ledger address from account tag and DSA hash components.

```javascript
import { constructLedgerAddress } from 'mochimo';

const accountTagHex = 'ab8599ef698c629d499909917d15c291dddc2760'; // 40 hex chars
const dsaHashHex = 'cd1234ef698c629d499909917d15c291dddc9876';     // 40 hex chars

const ledgerAddress = constructLedgerAddress(accountTagHex, dsaHashHex);
// Returns: Buffer(40)
```

**Parameters**:
- `accountTag` (string|Buffer) - 20-byte account tag
- `dsaHash` (string|Buffer) - 20-byte DSA hash

**Returns**: `Buffer` - 40-byte ledger address (accountTag + dsaHash)

---

#### `formatLedgerAddress(ledgerAddress)`
Formats ledger address for display with 0x prefix.

```javascript
import { formatLedgerAddress } from 'mochimo';

const ledgerAddrHex = 'ab85...2760cd12...9876'; // 80 hex chars
const formatted = formatLedgerAddress(ledgerAddrHex);
// Returns: '0xab85...2760cd12...9876'
```

**Parameters**:
- `ledgerAddress` (string|Buffer) - 40-byte ledger address

**Returns**: `string` - Formatted hex string with 0x prefix

---

#### `getAccountInfo(ledgerAddress)`
Gets human-readable account and ledger address information.

```javascript
import { getAccountInfo } from 'mochimo';

const ledgerAddrHex = 'ab85...2760cd12...9876';
const info = getAccountInfo(ledgerAddrHex);

console.log(info);
// {
//   fullLedgerAddress: 'ab85...2760cd12...9876',
//   accountTag: 'ab85...2760',
//   dsaHash: 'cd12...9876',
//   implicit: false,
//   accountType: 'explicit (previously spent)',
//   formatted: '0xab85...2760cd12...9876'
// }
```

**Parameters**:
- `ledgerAddress` (string|Buffer) - 40-byte ledger address

**Returns**: Object with complete address breakdown and metadata

---

### Transaction Creation

#### `createTransaction(params)`
Creates and signs a Mochimo transaction.

```javascript
import { createTransaction } from 'mochimo';

const tx = createTransaction({
  srcTag: '40-char hex',           // Source account tag (20 bytes)
  sourcePk: '4416-char hex',       // Source public key (2208 bytes)
  changePk: '4416-char hex',       // Change public key (2208 bytes) - NEW keypair
  balance: 1000000,                // Current balance in nanoMCM
  dstAccountTag: '40-char hex',    // Destination account tag (20 bytes)
  amount: 500000,                  // Amount to send in nanoMCM
  secret: '64-char hex',           // Secret key (32 bytes)
  fee: 500,                        // Transaction fee in nanoMCM
  memo: 'PAYMENT-123'              // Optional memo (max 16 chars)
  // blkToLive: 0                  // Blocks to live (optional, default: 0, recommended)
});

console.log(tx);
// {
//   transaction: Buffer,           // Signed transaction buffer
//   transactionHex: '...',         // Hex string ready to broadcast
//   id: '...',                     // Transaction ID (64-char hex)
//   sourceAccountTag: '...',
//   changeAccountTag: '...',
//   destinationAccountTag: '...',
//   sendTotal: BigInt,
//   changeTotal: BigInt,
//   feeTotal: BigInt
// }
```

**Parameters**:
- `srcTag` (string) - Source account tag (40 hex chars = 20 bytes)
- `sourcePk` (string) - Source public key (4416 hex chars = 2208 bytes)
- `changePk` (string) - Change public key (4416 hex chars = 2208 bytes)
- `balance` (number|bigint) - Current balance in nanoMCM
- `dstAccountTag` (string) - Destination account tag (40 hex chars = 20 bytes)
- `amount` (number|bigint) - Amount to send in nanoMCM
- `secret` (string) - Secret key (64 hex chars = 32 bytes)
- `fee` (number|bigint, optional) - Transaction fee in nanoMCM, default: 500
- `memo` (string, optional) - Transaction memo (max 16 chars, see format rules)
- `blkToLive` (number, optional) - Blocks to live, default: 0 (recommended: use 0 or omit)

**Returns**: Object with:
- `transaction` (Buffer) - Signed transaction buffer
- `transactionHex` (string) - Hex string ready for broadcast
- `id` (string) - Transaction ID (64-char hex)
- `sourceAccountTag` (string)
- `changeAccountTag` (string)
- `destinationAccountTag` (string)
- `sendTotal` (BigInt)
- `changeTotal` (BigInt)
- `feeTotal` (BigInt)

**Important**:
- All amounts are in **nanoMCM** (1 MCM = 1,000,000,000 nanoMCM)
- Minimum fee is **500 nanoMCM**
- Change goes to `changePk` address (should be a NEW keypair from your account)
- After broadcasting, the source keypair is **SPENT** - don't reuse it!
- Source account tag automatically moves to change address

---

#### `buildTransaction(params)`
Convenience wrapper that automatically extracts account tag from source ledger address.

```javascript
import { buildTransaction } from 'mochimo';

const tx = buildTransaction({
  sourceLedgerAddress: '80-char hex',    // Full ledger address (40 bytes)
  sourcePublicKey: '4416-char hex',
  sourceSecret: '64-char hex',
  balance: 1000000,
  changePublicKey: '4416-char hex',
  destinationAccountTag: '40-char hex',  // Can be 40 or 80 hex chars
  amount: 500000,
  fee: 500,
  memo: 'TEST-123',
  blocksToLive: 1000
});
// Returns: Buffer (transaction ready to broadcast)
```

**Parameters**:
- `sourceLedgerAddress` (string) - Full 40-byte ledger address (80 hex chars)
- `sourcePublicKey` (string) - Source public key (4416 hex chars)
- `sourceSecret` (string) - Source secret key (64 hex chars)
- `balance` (string|bigint) - Current balance in nanoMCM
- `changePublicKey` (string) - Change public key (4416 hex chars)
- `destinationAccountTag` (string) - Destination (40 or 80 hex chars)
- `amount` (string|bigint) - Amount to send in nanoMCM
- `fee` (string|bigint, optional) - Transaction fee, default: 500
- `memo` (string, optional) - Transaction memo (max 16 chars)
- `blocksToLive` (number, optional) - Transaction expiry, default: 1000

**Returns**: `Buffer` - Signed transaction ready for broadcast

**Use Case**: Simplifies transaction creation when you have full ledger addresses.

---

#### `validateTransactionParams(params)`
Validates transaction parameters before creating a transaction.

```javascript
import { validateTransactionParams } from 'mochimo';

const validation = validateTransactionParams({
  srcTag: '...',
  sourcePk: '...',
  // ... other params
});

if (!validation.valid) {
  console.error('Validation errors:');
  validation.errors.forEach(err => console.error('  -', err));
}
```

**Parameters**:
- `params` (Object) - Transaction parameters to validate

**Returns**: Object with:
- `valid` (boolean) - `true` if all validations pass
- `errors` (Array<string>) - Array of error messages (empty if valid)

---

### Network Broadcasting

#### `broadcastTransaction(signedTransaction, apiUrl, options)`
Broadcasts a signed transaction to the Mochimo network.

```javascript
import { broadcastTransaction } from 'mochimo';

const apiUrl = 'https://api.mochimo.org';

try {
  const result = await broadcastTransaction(
    tx.transactionHex,
    apiUrl,
    { timeout: 30000, retries: 2 }
  );

  console.log('Transaction ID:', result.txid);
  console.log('Success:', result.success);

  // NOW safe to increment spend_index in database
} catch (error) {
  console.error('Broadcast failed:', error.message);
  // DO NOT increment spend_index - retry with same keypair
}
```

**Parameters**:
- `signedTransaction` (string|Buffer) - Signed transaction (hex string or Buffer)
- `apiUrl` (string) - API endpoint URL (e.g., 'https://api.mochimo.org')
- `options` (Object, optional)
  - `timeout` (number) - Request timeout in ms, default: 30000
  - `retries` (number) - Number of retry attempts, default: 2
  - `retryDelay` (number) - Delay between retries in ms, default: 1000

**Returns**: Promise resolving to object with:
- `txid` (string) - Transaction ID
- `success` (boolean) - Broadcast success status
- `status` (string) - Status message

**Error Handling**:
- If broadcast fails, DO NOT increment spend index
- Retry with same keypair
- Only increment spend index after successful broadcast

---

### Network Requests

#### `getAccountBalance(address, apiUrl)`
Queries the Rosetta `/account/balance` endpoint for a ledger address and returns the raw balance payload.

```javascript
import { getAccountBalance } from 'mochimo';

const apiUrl = 'https://api.mochimo.org';
const ledgerAddress = `0x${accountTag}${dsaHash}`; // 40-byte ledger address with 0x prefix
const balance = await getAccountBalance(ledgerAddress, apiUrl);

console.log('Balance (nanoMCM):', balance.balance);
console.log('Currency:', balance.currency.symbol);
console.log('Block Height:', balance.block.index);
```

**Parameters**:
- `address` (string) – Ledger address to query (`0x` + 80 hex chars). Implicit accounts can use `0x${accountTag}${accountTag}`.
- `apiUrl` (string) – Rosetta API endpoint, e.g. `https://api.mochimo.org`

**Returns**: Object with:
- `address` (string) – Address that was queried (pass-through)
- `balance` (string) – Balance in nanoMCM (Rosetta integer-as-string format)
- `currency` (Object) – Rosetta currency descriptor `{ symbol, decimals }`
- `block` (Object) – Rosetta block identifier for the balance snapshot

---

#### `getNetworkStatus(apiUrl)`
Fetches chain synchronization details (current height, genesis info, peers) from the Rosetta `/network/status` endpoint.

```javascript
import { getNetworkStatus } from 'mochimo';

const apiUrl = 'https://api.mochimo.org';
const status = await getNetworkStatus(apiUrl);

console.log('Current Height:', status.current_block_identifier.index);
console.log('Current Hash:', status.current_block_identifier.hash);
console.log('Peers:', status.peers.length);
```

**Parameters**:
- `apiUrl` (string) – Rosetta API endpoint, e.g. `https://api.mochimo.org`

**Returns**: Promise resolving to the Rosetta `network/status` response containing:
- `current_block_identifier` (Object) – Latest block index/hash the node reports
- `current_block_timestamp` (number) – Milliseconds since epoch for the latest block
- `genesis_block_identifier` (Object) – Chain genesis reference
- `oldest_block_identifier` (Object|undefined) – Oldest block retained by the node (optional)
- `peers` (Array) – Known peer endpoints reported by the node

---

#### `resolveTag(tag, apiUrl)`
Resolves a 20-byte account tag to its current ledger address, balance, and implicit/explicit status via the Mesh API.

```javascript
import { resolveTag } from 'mochimo';

const result = await resolveTag(
  '9f810c2447a76e93b17ebff96c0b29952e4355f1',
  'https://api.mochimo.org'
);

console.log('Account Tag:', result.accountTag);
console.log('DSA Hash:', result.dsaHash);
console.log('Ledger Address:', result.ledgerAddress);
console.log('Account Type:', result.accountTag === result.dsaHash ? 'Implicit' : 'Explicit');
console.log('Balance:', result.balanceFormatted);
console.log('Found:', result.found);
```

**Parameters**:
- `tag` (string|Buffer) – Account tag to resolve (20 bytes / 40 hex characters)
- `apiUrl` (string) – Mesh API endpoint, e.g. `https://api.mochimo.org`

**Returns**: Object with:
- `accountTag` (string) – Normalized 40-hex account tag
- `dsaHash` (string|null) – Current DSA hash (null if tag not found)
- `ledgerAddress` (string|null) – Full 80-hex ledger address when present
- `balance` (string|number) – Balance in nanoMCM
- `balanceFormatted` (string) – Balance formatted in MCM
- `found` (boolean) – Indicates whether the tag exists on-chain
- `error` (string, optional) – Present if `found` is `false`

---

#### `getNetworkDsaHash(accountTag, apiUrl)`
Retrieves just the current DSA Hash for an account tag from the network. This is a convenience function for spend index recovery scenarios.

```javascript
import { getNetworkDsaHash, deriveKeypairForSpend } from 'mochimo';

// Recover spend index after database loss
const networkDsaHash = await getNetworkDsaHash(
  '9f810c2447a76e93b17ebff96c0b29952e4355f1',
  'https://api.mochimo.org'
);

if (!networkDsaHash) {
  console.log('Account not found or never spent - spend index is 0');
} else {
  // Iterate to find matching spend index
  for (let spendIndex = 0; spendIndex < 1000; spendIndex++) {
    const keypair = deriveKeypairForSpend(masterSeed, spendIndex, accountIndex);
    // Extract DSA component (last 20 bytes of 40-byte implicit address)
    const derivedDsaHash = keypair.dsaHash.toString('hex').slice(40, 80);
    
    if (derivedDsaHash === networkDsaHash) {
      console.log('Recovered spend index:', spendIndex);
      break;
    }
  }
}
```

**Parameters**:
- `accountTag` (string|Buffer) – Account tag to query (20 bytes / 40 hex characters)
- `apiUrl` (string) – Mesh API endpoint, e.g. `https://api.mochimo.org`

**Returns**: Promise resolving to:
- `string` – Current DSA hash as hex string (40 characters / 20 bytes)
- `null` – If account not found on blockchain or never spent

**Use Cases**:
- Disaster recovery after database loss
- Spend index verification and audit
- System migration validation
- Network fork recovery

**See**: [examples/exchange/5-recover-spend-index.js](examples/exchange/5-recover-spend-index.js) for complete recovery workflow

---

### Low-Level Exports (Advanced Users)

These functions are exported for advanced users who need low-level control. Most integrators should use the higher-level functions above.

#### WOTS+ Functions
- `keygen(seed)` - Generate WOTS+ keypair from seed
- `sign(msg, seed, pubSeed, addr)` - Sign message with WOTS+
- `verify(sig, msg, pubKey)` - Verify WOTS+ signature
- `wotsPkFromSig(sig, msg, pubSeed, addr)` - Recover public key from signature

#### Crypto Functions
- `mochimoHash(data)` - Compute Mochimo hash (SHA-256)
- `addrFromWots(publicKey)` - Derive 40-byte address from WOTS+ public key

## Requirements

- Node.js v18 or higher
- npm

## Testing

```bash
npm test
```

All 76 unit tests must pass before deployment.

## Examples

See the [examples/](examples/) directory for complete working examples:

### Exchange Integration
- [examples/exchange/1-generate-user-account.js](examples/exchange/1-generate-user-account.js) - Generate master seed for new user
- [examples/exchange/2-check-deposit.js](examples/exchange/2-check-deposit.js) - Check for deposits
- [examples/exchange/3-send-withdrawal.js](examples/exchange/3-send-withdrawal.js) - Process user withdrawal
- [examples/exchange/4-validate-withdrawal-address.js](examples/exchange/4-validate-withdrawal-address.js) - Validate base58 addresses
- [examples/exchange/5-recover-spend-index.js](examples/exchange/5-recover-spend-index.js) - Recover from spend index errors
- [examples/exchange/EXCHANGE_INTEGRATION.md](examples/exchange/EXCHANGE_INTEGRATION.md) - Complete integration guide

### Reference Implementations
- [examples/reference/create-transaction.js](examples/reference/create-transaction.js) - Transaction creation patterns
- [examples/reference/transaction-builder-example.js](examples/reference/transaction-builder-example.js) - Low-level transaction building

## License

MOCHIMO CRYPTOCURRENCY ENGINE LICENSE

See [LICENSE.md](LICENSE.md) for full license text.

## Contributing

This SDK is maintained by Adequate Systems for the Mochimo blockchain ecosystem.

## Support

- **Documentation**: This README and [examples/exchange/EXCHANGE_INTEGRATION.md](examples/exchange/EXCHANGE_INTEGRATION.md)
- **Repository**: https://github.com/adequatesystems/mochimo-sdk
- **Issues**: https://github.com/adequatesystems/mochimo-sdk/issues

---

**Ready to integrate?** Start with the [Quick Start](#quick-start) above, then see [examples/exchange/EXCHANGE_INTEGRATION.md](examples/exchange/EXCHANGE_INTEGRATION.md) for complete production deployment guidance.
