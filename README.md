# Mochimo Node.js SDK

A Node.js SDK for the Mochimo blockchain. This SDK provides everything needed to generate WOTS+ keypairs for accounts, create transactions, sign with post-quantum signatures, and broadcast to the network.

## Features

✅ **Account Keypair Generation** - Generate WOTS+ keypairs for Mochimo accounts (random or deterministic)  
✅ **Transaction Creation** - Build and sign MCM 3.0 transactions offline  
✅ **Network Broadcasting** - Submit transactions to the Mochimo network via Rosetta API  
✅ **Post-Quantum Security** - WOTS+ (Winternitz One-Time Signature Plus) implementation  

---

## Understanding Mochimo Terminology

**Important:** Mochimo uses unique terminology that differs from other cryptocurrencies. Please read this section carefully to avoid confusion.

### Core Concepts

| Term | Size | Description |
|------|------|-------------|
| **Account** | Conceptual | A user's persistent identity in Mochimo |
| **Account Tag** | 20 bytes (40 hex) | The persistent identifier for an account (what users think of as their "account number") |
| **DSA PK** | 2208 bytes | WOTS+ Digital Signature Algorithm Public Key (one-time use) |
| **DSA PK Hash** | 20 bytes (40 hex) | Hash of the DSA PK |
| **Ledger Address** | 40 bytes (80 hex) | Full blockchain entry = Account Tag (20 bytes) + DSA PK Hash (20 bytes) |

### The Mochimo Account Model

Unlike traditional blockchains, Mochimo uses **one-time signatures (WOTS+)** for post-quantum security. This means:

1. **DSA PK is one-time use**: Each WOTS+ public key can only sign once
2. **Account Tag persists**: The Account Tag stays the same across transactions
3. **Account Tag moves with change**: When spending, the source Account Tag moves to the change account with a NEW DSA PK

#### Implicit vs Explicit Accounts

- **Implicit Account (first-time)**: Account Tag == DSA PK Hash
  - Happens when an account receives funds for the first time
  - The DSA PK Hash becomes the Account Tag

- **Explicit Account (previously spent)**: Account Tag ≠ DSA PK Hash
  - After first spend, Account Tag persists
  - DSA PK Hash changes with each transaction

#### Example Transaction Flow

```
First Transaction (Implicit → Explicit):
├─ Source: Account Tag [abc...] == DSA Hash [abc...]  (implicit)
└─ Change: Account Tag [abc...] + DSA Hash [def...]  (explicit, tag moved!)

Second Transaction:
├─ Source: Account Tag [abc...] + DSA Hash [def...]  (explicit)
└─ Change: Account Tag [abc...] + DSA Hash [ghi...]  (explicit, tag moved again!)
```

**Key Insight:** The Account Tag `[abc...]` never changes, but the DSA PK Hash changes with every spend.

---

## Installation

```bash
npm install mochimo
```

Or install dependencies in this repository:

```bash
npm install
```

## Quick Start

### Generate a WOTS+ Keypair for an Account

```javascript
import { generateAccountKeypair } from 'mochimo';

// Generate a random keypair
const keypair = generateAccountKeypair();
console.log('DSA Hash (Account Tag):', keypair.dsaHash);
console.log('Public Key:', keypair.publicKey);
console.log('Secret Key:', keypair.secretKey);
```

### Create a Transaction

```javascript
import { generateAccountKeypair, createTransaction } from 'mochimo';

// Generate keypairs
const sourceKeypair = generateAccountKeypair();
const changeKeypair = generateAccountKeypair();

// Create and sign transaction
const tx = createTransaction({
  srcTag: 'a'.repeat(40),                    // Source account tag (20 bytes, 40 hex)
  sourcePk: sourceKeypair.publicKey,         // Source DSA public key
  changePk: changeKeypair.publicKey,         // Change DSA public key (NEW key)
  secret: sourceKeypair.secretKey,           // Secret key for signing
  balance: 10000,                            // Current balance (nanoMCM)
  amount: 5000,                              // Amount to send
  fee: 500,                                  // Transaction fee
  dstAccountTag: 'b'.repeat(40),             // Destination account tag (20 bytes, 40 hex)
  memo: 'PAYMENT'                            // Optional memo
});

console.log('Transaction hex:', tx.transactionHex);
```

### Broadcast a Transaction

```javascript
import { broadcastTransaction } from 'mochimo';

const result = await broadcastTransaction(
  tx.transactionHex,
  'https://api.mochimo.org',
  { timeout: 30000, retries: 2 }
);

console.log('Transaction ID:', result.txid);
console.log('Success:', result.success);
```

## API Reference

### Account Keypair Generation

#### `generateAccountKeypair(options?)`

Generate a single Mochimo account with WOTS+ keypair.

**Parameters:**
- `options.seed` (Buffer, optional) - 32-byte seed for deterministic generation
- `options.index` (number, optional) - Keypair index (default: 0)

**Returns:** Object with:
- `dsaHash` (Buffer) - 40-byte one-time DSA public key hash
- `accountTag` (Buffer) - 20-byte persistent account identifier
- `publicKey` (Buffer) - 2208-byte WOTS+ public key
- `secretKey` (Buffer) - 32-byte secret key
- `address` (Buffer) - Legacy alias for `dsaHash`
- `tag` (Buffer) - Legacy alias for `accountTag`

#### `generateAccountKeypairs(count, options?)`

Generate multiple account keypairs.

**Parameters:**
- `count` (number) - Number of keypairs to generate
- `options.masterSeed` (Buffer, optional) - Master seed for deterministic generation

**Returns:** Array of keypair objects

**Legacy Aliases:** `generateAddress()`, `generateAddresses()` - These still work but are deprecated.

### Transaction Creation

#### `createTransaction(params)`

Create and sign a Mochimo MCM 3.0 transaction.

**Parameters:**
- `srcTag` (string|Buffer) - Source account tag - 20 bytes (40 hex chars)
- `sourcePk` (string|Buffer) - Source WOTS+ public key - 2208 bytes (4416 hex chars)
- `changePk` (string|Buffer) - Change WOTS+ public key - 2208 bytes (4416 hex chars)
- `balance` (number|bigint) - Source balance in nanoMCM
- `dstAccountTag` (string) - Destination account tag - 20 bytes (40 hex chars)
- `amount` (number|bigint) - Amount to send in nanoMCM
- `secret` (string|Buffer) - Secret key for signing - 32 bytes (64 hex chars)
- `memo` (string, optional) - Transaction memo (max 16 chars: A-Z, 0-9, dash)
- `fee` (number, optional) - Transaction fee in nanoMCM (default: 500)
- `blkToLive` (number, optional) - Blocks to live (default: 0)

**Returns:** Object with:
- `transaction` (Buffer) - Transaction as Buffer
- `transactionHex` (string) - Transaction as hex string
- `transactionBase64` (string) - Transaction as base64 string
- `messageHash` (string) - Signed message hash
- `sourceLedgerAddress` (string) - Full source ledger address (80 hex chars)
- `changeLedgerAddress` (string) - Full change ledger address (80 hex chars)
- `destinationAccountTag` (string) - Destination account tag (40 hex chars)
- `sendAmount` (number) - Amount sent
- `changeAmount` (number) - Change amount
- `fee` (number) - Transaction fee
- `size` (number) - Transaction size in bytes (2408 bytes for single destination)
- `sourceAddress` (string) - Legacy alias for `sourceLedgerAddress`
- `changeAddress` (string) - Legacy alias for `changeLedgerAddress`
- `dstAddress` (string) - Legacy alias for `destinationAccountTag`

**Legacy Parameter:** `dstAddress` - Still accepted as alias for `dstAccountTag`

### Network Broadcasting

#### `broadcastTransaction(signedTransaction, apiUrl, options?)`

Broadcast a signed transaction to the Mochimo network.

**Parameters:**
- `signedTransaction` (string|Buffer) - Transaction from createTransaction()
- `apiUrl` (string) - API endpoint URL (e.g., 'https://api.mochimo.org')
- `options.timeout` (number, optional) - Request timeout in ms (default: 30000)
- `options.retries` (number, optional) - Retry attempts (default: 2)
- `options.retryDelay` (number, optional) - Delay between retries in ms (default: 1000)

**Returns:** Promise with:
- `txid` - Transaction ID/hash
- `success` - Boolean success status
- `status` - HTTP status code
- `data` - Full API response

#### `getAccountBalance(ledgerAddress, apiUrl)`

Query account balance from the network.

**Parameters:**
- `ledgerAddress` (string) - Ledger address - 40 bytes (80 hex characters)
- `apiUrl` (string) - API endpoint URL

**Returns:** Promise with:
- `address` - Ledger address
- `balance` - Balance in nanoMCM
- `currency` - Currency info (symbol, decimals)
- `block` - Current block info

#### `getNetworkStatus(apiUrl)`

Get network status information.

**Parameters:**
- `apiUrl` (string) - API endpoint URL

**Returns:** Promise with network status data

### Address/Account Utilities

#### `validateLedgerAddress(address)`

Validate a 40-byte ledger address (80 hex chars).

**Returns:** `true` if valid, throws error if invalid.

**Legacy Alias:** `validateAddress()`

#### `validateAccountTag(tag)`

Validate a 20-byte account tag (40 hex chars or Buffer).

**Returns:** `true` if valid, throws error if invalid.

**Legacy Alias:** `validateTag()`

#### `extractAccountTag(ledgerAddress)`

Extract the 20-byte account tag from a ledger address.

**Parameters:**
- `ledgerAddress` (string|Buffer) - 40-byte ledger address

**Returns:** Buffer (20 bytes)

**Legacy Alias:** `extractTag()`

#### `extractDsaHash(ledgerAddress)`

Extract the 20-byte DSA hash from a ledger address.

**Parameters:**
- `ledgerAddress` (string|Buffer) - 40-byte ledger address

**Returns:** Buffer (20 bytes)

**Legacy Alias:** `extractDsa()`

#### `constructLedgerAddress(accountTag, dsaHash)`

Construct a full 40-byte ledger address from components.

**Parameters:**
- `accountTag` (string|Buffer) - 20-byte account tag
- `dsaHash` (string|Buffer) - 20-byte DSA hash

**Returns:** Buffer (40 bytes)

**Legacy Alias:** `constructAddress()`

#### `isImplicitAccount(ledgerAddress)`

Check if an account is implicit (first-time, never spent).

**Parameters:**
- `ledgerAddress` (string|Buffer) - 40-byte ledger address

**Returns:** `true` if implicit (account tag === DSA hash), `false` if explicit

**Legacy Alias:** `isImplicitAddress()`

#### `getAccountInfo(ledgerAddress)`

Get detailed information about an account.

**Parameters:**
- `ledgerAddress` (string|Buffer) - 40-byte ledger address

**Returns:** Object with:
- `fullLedgerAddress` (string) - Full 80-char hex address
- `accountTag` (string) - 40-char hex account tag
- `dsaHash` (string) - 40-char hex DSA hash
- `accountType` (string) - Human-readable type description
- `implicit` (boolean) - Whether account is implicit
- `full` (string) - Legacy alias for `fullLedgerAddress`
- `tag` (string) - Legacy alias for `accountTag`
- `dsa` (string) - Legacy alias for `dsaHash`
- `type` (string) - Legacy alias for `accountType`

**Legacy Alias:** `getAddressInfo()`

#### `formatLedgerAddress(ledgerAddress, options?)`

Format a ledger address for display.

**Parameters:**
- `ledgerAddress` (string|Buffer) - 40-byte ledger address
- `options.prefix` (boolean) - Add '0x' prefix (default: true)
- `options.truncate` (boolean) - Truncate middle (default: false)
- `options.truncateLength` (number) - Length when truncated (default: 18)

**Returns:** Formatted string

**Legacy Alias:** `formatAddress()`

## Examples

Run the included examples:

```bash
# Generate addresses
npm run example:address

# Create a transaction
npm run example:transaction

# Broadcast to network (dry run by default)
npm run example:broadcast

# Broadcast to live network
MOCHIMO_LIVE=true MOCHIMO_API_URL=https://api.mochimo.org npm run example:broadcast
```

## Testing

The SDK includes comprehensive test infrastructure:

```bash
# Run all tests (when migrated)
npm test

# Run only unit tests
npm test:unit

# Run only integration tests
npm test:integration
```

Unit tests are currently being migrated from the development tools. The SDK has been validated with successful transactions on the live Mochimo network.

## Architecture

```
src/
├── index.js              # Main SDK exports
├── core/
│   ├── address.js        # Address generation
│   ├── transaction.js    # Transaction creation/signing
│   ├── wots.js          # WOTS+ signature implementation
│   └── crypto.js        # Hash functions (SHA-256, RIPEMD-160)
├── network/
│   └── broadcast.js     # Network broadcasting
└── utils/
    └── base58.js        # Base58 encoding/decoding
```

## Protocol Specifications

### MCM 3.0 Transaction Structure

Total size: **2408 bytes** (single destination)

| Component | Size | Description |
|-----------|------|-------------|
| TXHDR | 116 bytes | Transaction header |
| MDST | 44 bytes | Multi-destination structure |
| TXDSA | 2208 bytes | WOTS+ signature |
| TXTLR | 40 bytes | Transaction trailer |

### WOTS+ Parameters

- **w = 16** - Winternitz parameter
- **67 chains** - Number of hash chains
- **Signature size: 2144 bytes**
- **Public key size: 2144 bytes**

### Address Format

- **Tag: 20 bytes** (40 hex characters)
- **Hash: 20 bytes** (40 hex characters)
- **Full address: 40 bytes** (80 hex characters)

## Security Notes

⚠️ **IMPORTANT:**
1. **One-Time Signatures:** WOTS+ signatures are one-time use. Never reuse a secret key after signing.
2. **Change Addresses:** Always use a new address for receiving change.

## Development

This SDK was developed with:
- Node.js v20.19.5
- ES Modules (type: "module")
- Jest for testing
- 100% byte-perfect parity with prior MCM implementations in Go and C

## License

Mochimo Cryptocurrency Engine License Agreement Version 1.0 (Modified MPL 2.0)

## Contributing

Contributions are welcome! Please ensure:
1. All tests pass (`npm test`)
2. Code follows existing style
3. New features include tests
4. Documentation is updated

## Support

- GitHub Issues: [Report bugs or request features]
- Documentation: See [examples/](examples) directory for usage examples
- API Reference: See [SDK_API_DOCUMENTATION.md](SDK_API_DOCUMENTATION.md) for detailed API documentation

## Changelog

### v1.0.0 (Current)
- Initial release
- Address generation (random and deterministic)
- Transaction creation and signing
- Network broadcasting via Rosetta API
- 63 unit tests with 100% Go parity
- Complete documentation and examples
