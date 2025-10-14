# Mochimo SDK - Complete API Documentation

## Table of Contents

- [Installation](#installation)
- [Core Modules](#core-modules)
  - [Address Generation](#address-generation)
  - [Transaction Creation](#transaction-creation)
  - [Network Operations](#network-operations)
- [Advanced Usage](#advanced-usage)
- [Transaction Format](#transaction-format)
- [Security Best Practices](#security-best-practices)

## Installation

```bash
npm install mochimo-sdk
```

## Core Modules

### Address Generation

Generate WOTS+ keypairs and Mochimo addresses.

#### Import

```javascript
import { generateAddress, generateAddresses } from 'mochimo-sdk';
// Or
import { generateAddress, generateAddresses } from 'mochimo-sdk/address';
```

#### `generateAddress(options?)`

Generate a single address with WOTS+ keypair.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options.seed` | Buffer | No | 32-byte seed for deterministic generation |
| `options.index` | number | No | Address index (default: 0) |

**Returns:**

```typescript
{
  address: string,           // 40-char hex (20-byte hash)
  accountNumber: string,     // 20-char hex (10-byte account)
  publicKey: string,         // 4416-char hex (2208 bytes)
  secretKey: string,         // 64-char hex (32 bytes)
  publicKeyBuffer: Buffer,   // Public key as Buffer
  secretKeyBuffer: Buffer    // Secret key as Buffer
}
```

**Examples:**

```javascript
// Random address
const addr = generateAddress();

// Deterministic address
const seed = Buffer.from('0'.repeat(64), 'hex');
const addr = generateAddress({ seed, index: 0 });
```

#### `generateAddresses(count, options?)`

Generate multiple addresses.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `count` | number | Yes | Number of addresses to generate |
| `options.masterSeed` | Buffer | No | 32-byte master seed for deterministic generation |

**Returns:** `Array<AddressObject>`

**Example:**

```javascript
// Random addresses
const addrs = generateAddresses(5);

// Deterministic addresses (each uses SHA256(previous_seed))
const masterSeed = Buffer.from('0'.repeat(64), 'hex');
const addrs = generateAddresses(3, { masterSeed });
```

---

### Transaction Creation

Create and sign MCM 3.0 transactions.

#### Import

```javascript
import { createTransaction, signTransaction, serializeTransaction } from 'mochimo-sdk';
// Or
import { createTransaction } from 'mochimo-sdk/transaction';
```

#### `createTransaction(params)`

Create and sign a transaction.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `srcTag` | string | Yes | Source address tag (40 hex chars = 20 bytes) |
| `sourcePk` | string | Yes | Source public key (4416 hex chars) |
| `changePk` | string | Yes | Change public key (4416 hex chars) |
| `balance` | number\|bigint | Yes | Source balance in nanoMCM |
| `dstAddress` | string | Yes | Destination address (20 hex chars = 10 bytes) |
| `amount` | number\|bigint | Yes | Amount to send in nanoMCM |
| `secret` | string | Yes | Secret key for signing (64 hex chars) |
| `memo` | string | No | Transaction memo (max 16 chars, see rules below) |
| `fee` | number | No | Transaction fee in nanoMCM (default: 500) |
| `blkToLive` | number | No | Blocks to live (default: 0) |

**Memo Rules:**

- Maximum 16 characters
- Only uppercase letters [A-Z], digits [0-9], and dashes [-]
- **Groups of letters and groups of numbers MUST be separated by dashes**
- **Cannot have two consecutive letter groups (even with dash between)**
- **Cannot have two consecutive number groups (even with dash between)**

**Valid Memos:**
- `ABC-123` ✓ (letters then numbers)
- `123-ABC` ✓ (numbers then letters)
- `AB-12-CD` ✓ (alternating letter-number-letter)
- `ABC-123-XYZ` ✓ (letter-number-letter)
- `12-AB-34` ✓ (number-letter-number)

**Invalid Memos:**
- `ABC-XYZ` ✗ (two letter groups)
- `123-456` ✗ (two number groups)
- `AB-CD-12` ✗ (two consecutive letter groups)
- `ABC` ✗ (single group without dash)
- `abc-123` ✗ (lowercase not allowed)

**Returns:**

```typescript
{
  transaction: Buffer,           // Transaction as Buffer
  transactionHex: string,        // Transaction as hex string
  transactionBase64: string,     // Transaction as base64 string
  messageHash: string,           // Message hash that was signed
  sourceAddress: string,         // Full source address (80 hex chars)
  changeAddress: string,         // Full change address (80 hex chars)
  destinationAddress: string,    // Destination address
  sendAmount: number|bigint,     // Amount sent
  changeAmount: number|bigint,   // Change amount
  fee: number,                   // Transaction fee
  size: number                   // Transaction size in bytes (2408)
}
```

**Example:**

```javascript
import { generateAddress, createTransaction } from 'mochimo-sdk';

// Generate addresses
const sourceAddr = generateAddress();
const changeAddr = generateAddress();

// Create transaction
const tx = createTransaction({
  srcTag: 'a'.repeat(40),
  sourcePk: sourceAddr.publicKey,
  changePk: changeAddr.publicKey,
  balance: 10000,
  dstAddress: 'b'.repeat(20),
  amount: 5000,
  secret: sourceAddr.secretKey,
  memo: 'ABC-123',
  fee: 500
});

console.log('Transaction hex:', tx.transactionHex);
console.log('Size:', tx.size, 'bytes'); // Always 2408
```

#### `signTransaction(params)`

Alias for `createTransaction()`. Provided for API consistency.

#### `serializeTransaction(transaction)`

Extract hex string from transaction object.

**Parameters:**
- `transaction` - Transaction object from `createTransaction()`

**Returns:** Hex string

---

### Network Operations

Broadcast transactions and query network status.

#### Import

```javascript
import { broadcastTransaction, getNetworkStatus, getAccountBalance } from 'mochimo-sdk';
// Or
import { broadcastTransaction } from 'mochimo-sdk/network';
```

#### `broadcastTransaction(signedTransaction, apiUrl, options?)`

Broadcast a signed transaction to the network.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `signedTransaction` | string\|Buffer | Yes | Transaction (hex, base64, or Buffer) |
| `apiUrl` | string | Yes | API endpoint URL |
| `options.timeout` | number | No | Timeout in ms (default: 30000) |
| `options.retries` | number | No | Number of retries (default: 2) |
| `options.retryDelay` | number | No | Delay between retries in ms (default: 1000) |

**Returns:**

```typescript
Promise<{
  txid: string,      // Transaction ID
  success: boolean,  // Success status
  status: number,    // HTTP status code
  data: object       // Full API response
}>
```

**Example:**

```javascript
const result = await broadcastTransaction(
  tx.transactionHex,
  'https://api.mochimo.org',
  { timeout: 30000, retries: 2 }
);

console.log('Transaction ID:', result.txid);
console.log('Success:', result.success);
```

#### `getNetworkStatus(apiUrl)`

Get network status information.

**Parameters:**
- `apiUrl` (string) - API endpoint URL

**Returns:** `Promise<object>` - Network status data

**Example:**

```javascript
const status = await getNetworkStatus('https://api.mochimo.org');
console.log('Current block:', status.current_block_identifier);
```

#### `getAccountBalance(address, apiUrl)`

Query account balance.

**Parameters:**
- `address` (string) - Account address (40 hex characters)
- `apiUrl` (string) - API endpoint URL

**Returns:**

```typescript
Promise<{
  address: string,       // Account address
  balance: string,       // Balance (string to handle large numbers)
  currency: object,      // Currency info (symbol, decimals)
  block: object          // Block identifier
}>
```

**Example:**

```javascript
const balance = await getAccountBalance(
  'aabbccdd...',
  'https://api.mochimo.org'
);
console.log('Balance:', balance.balance, 'nanoMCM');
```

---

## Advanced Usage

### Low-Level Cryptography

Access WOTS+ primitives directly.

```javascript
import { keygen, sign, wotsPkFromSig } from 'mochimo-sdk';
import { mochimoHash, addrFromWots } from 'mochimo-sdk/crypto';
```

#### `keygen(seed)`

Generate WOTS+ keypair from seed.

**Parameters:**
- `seed` (Buffer) - 32-byte seed

**Returns:**

```typescript
{
  publicKey: Buffer,     // 2144-byte WOTS+ public key
  secretKey: Buffer,     // 32-byte secret seed
  components: {
    publicSeed: Buffer,  // 32-byte public seed
    addrSeed: Buffer     // 32-byte address seed
  }
}
```

#### `sign(message, keypair)`

Sign a message with WOTS+.

**Parameters:**
- `message` (Buffer) - 32-byte message hash
- `keypair` (object) - Keypair from `keygen()`

**Returns:** Buffer (2144-byte signature)

#### `wotsPkFromSig(signature, message, publicSeed, addrSeed)`

Recover public key from signature.

**Parameters:**
- `signature` (Buffer) - 2144-byte signature
- `message` (Buffer) - 32-byte message hash
- `publicSeed` (Buffer) - 32-byte public seed
- `addrSeed` (Buffer) - 32-byte address seed

**Returns:** Buffer (2144-byte public key)

#### `mochimoHash(data)`

Compute Mochimo hash (SHA-256 + RIPEMD-160).

**Parameters:**
- `data` (Buffer) - Data to hash

**Returns:** Buffer (20-byte hash)

#### `addrFromWots(publicKey)`

Compute address hash from WOTS+ public key.

**Parameters:**
- `publicKey` (Buffer) - 2144-byte WOTS+ public key

**Returns:** Buffer (20-byte address hash)

---

## Transaction Format

MCM 3.0 transaction structure (2408 bytes total):

### TXHDR (Header) - 116 bytes

| Field | Size | Description |
|-------|------|-------------|
| Options | 4 | Type flags (MDST, WOTS, dest count) |
| Source Address | 40 | Source address (tag + hash) |
| Change Address | 40 | Change address (tag + hash) |
| Send Total | 8 | Total amount to send (uint64 LE) |
| Change Total | 8 | Total change amount (uint64 LE) |
| Fee Total | 8 | Total fee amount (uint64 LE) |
| Blocks to Live | 8 | Transaction lifetime in blocks |

### MDST (Multi-Destination) - 44 bytes per destination

| Field | Size | Description |
|-------|------|-------------|
| Tag | 20 | Destination address tag |
| Ref | 16 | Memo/reference string |
| Amount | 8 | Amount to send (uint64 LE) |

### DSA (Digital Signature) - 2208 bytes

| Field | Size | Description |
|-------|------|-------------|
| Signature | 2144 | WOTS+ signature |
| Public Seed | 32 | WOTS+ public seed |
| Address Seed | 32 | WOTS+ address seed (with tag) |

### TXTLR (Trailer) - 40 bytes

| Field | Size | Description |
|-------|------|-------------|
| Nonce | 8 | Transaction nonce (0 for offline) |
| ID | 32 | Transaction ID (filled by network) |

---

## Security Best Practices

### 1. One-Time Signatures

⚠️ **WOTS+ signatures are one-time use only!**

- Never reuse an address after sending from it
- Always generate a new change address for each transaction
- The public key is revealed when signing, weakening security on reuse

### 2. Secret Key Management

- Store secret keys securely (encrypted at rest)
- Never commit secret keys to version control
- Use environment variables or secure key management systems
- Back up keys in multiple secure locations

### 3. Deterministic Generation

When using master seeds:
- Keep master seeds secret and backed up
- Use strong entropy for seed generation
- Consider using hardware security modules (HSMs)
- Implement key derivation standards (BIP32/BIP44 patterns)

### 4. Transaction Validation

Before broadcasting:
- Verify balance is sufficient (balance ≥ amount + fee)
- Validate all addresses are correct
- Double-check amounts (nanoMCM units)
- Verify memo format is valid
- Test with small amounts first

### 5. Network Communication

- Use HTTPS for API endpoints
- Validate API responses
- Implement proper error handling
- Use retry logic with exponential backoff
- Never log sensitive data (secret keys, seeds)

### 6. Amount Handling

- Always use exact integer arithmetic for amounts
- Be aware of nanoMCM units (1 MCM = 1,000,000,000 nanoMCM)
- Use `BigInt` for large amounts to avoid floating point errors
- Validate amounts are positive and within reasonable bounds

---

## Error Handling

All SDK functions throw descriptive errors:

```javascript
try {
  const tx = createTransaction(params);
} catch (error) {
  if (error.message.includes('Insufficient balance')) {
    console.error('Not enough funds');
  } else if (error.message.includes('Invalid memo')) {
    console.error('Memo format is incorrect');
  } else {
    console.error('Transaction creation failed:', error.message);
  }
}
```

---

## Testing

The SDK includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration
```

Test coverage includes:
- ✅ 21 WOTS+ cryptographic primitive tests
- ✅ 14 Address generation tests
- ✅ 28 Transaction creation tests
- ✅ 5 Test vectors with byte-perfect Go parity

---

## Resources

- [Mochimo Website](https://mochimo.org)
- [API Documentation](https://docs.mochimo.org)
- [GitHub Repository](https://github.com/mochimodev/mochimo-nodesdk)
- [WOTS+ Paper](https://eprint.iacr.org/2011/191.pdf)

---

## License

MIT License - see LICENSE file for details
