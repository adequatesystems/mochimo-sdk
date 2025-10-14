# Mochimo Node.js SDK

A Node.js SDK for the Mochimo blockchain. This SDK provides everything needed to generate addresses, create transactions, sign with WOTS+ post-quantum signatures, and broadcast to the network.

## Features

✅ **Address Generation** - Generate WOTS+ keypairs and Mochimo addresses (random or deterministic)  
✅ **Transaction Creation** - Build and sign MCM 3.0 transactions offline  
✅ **Network Broadcasting** - Submit transactions to the Mochimo network via Rosetta API  
✅ **Post-Quantum Security** - WOTS+ (Winternitz One-Time Signature Plus) implementation  

## Installation

```bash
npm install mochimo-sdk
```

Or install dependencies in this repository:

```bash
npm install
```

## Quick Start

### Generate an Address

```javascript
import { generateAddress } from 'mochimo-sdk';

// Generate a random address
const address = generateAddress();
console.log('Address:', address.address);
console.log('Public Key:', address.publicKey);
console.log('Secret Key:', address.secretKey);
```

### Create a Transaction

```javascript
import { generateAddress, createTransaction } from 'mochimo-sdk';

// Generate addresses
const source = generateAddress();
const change = generateAddress();

// Create and sign transaction
const tx = createTransaction({
  srcTag: 'a'.repeat(40),              // Source address tag
  sourcePk: source.publicKey,          // Source public key
  changePk: change.publicKey,          // Change public key
  secret: source.secretKey,            // Secret key for signing
  balance: 10000,                      // Current balance (nanoMCM)
  amount: 5000,                        // Amount to send
  fee: 500,                            // Transaction fee
  dstAddress: 'b'.repeat(20),          // Destination address
  memo: 'PAYMENT'                      // Optional memo
});

console.log('Transaction hex:', tx.transactionHex);
```

### Broadcast a Transaction

```javascript
import { broadcastTransaction } from 'mochimo-sdk';

const result = await broadcastTransaction(
  tx.transactionHex,
  'https://api.mochimo.org',
  { timeout: 30000, retries: 2 }
);

console.log('Transaction ID:', result.txid);
console.log('Success:', result.success);
```

## API Reference

### Address Generation

#### `generateAddress(options?)`

Generate a single Mochimo address with WOTS+ keypair.

**Parameters:**
- `options.seed` (Buffer, optional) - 32-byte seed for deterministic generation
- `options.index` (number, optional) - Address index for account number (default: 0)

**Returns:** Object with:
- `address` - Mochimo address (20 hex characters)
- `accountNumber` - Account number (20 hex characters)
- `publicKey` - Full public key with components (4416 hex characters)
- `secretKey` - Secret key (64 hex characters)
- `publicKeyBuffer` - Public key as Buffer
- `secretKeyBuffer` - Secret key as Buffer

#### `generateAddresses(count, options?)`

Generate multiple addresses.

**Parameters:**
- `count` (number) - Number of addresses to generate
- `options.masterSeed` (Buffer, optional) - Master seed for deterministic generation

**Returns:** Array of address objects

### Transaction Creation

#### `createTransaction(params)`

Create and sign a Mochimo MCM 3.0 transaction.

**Parameters:**
- `srcTag` (string) - Source address tag (40 hex characters)
- `sourcePk` (string) - Source public key (4416 hex characters)
- `changePk` (string) - Change public key (4416 hex characters)
- `balance` (number|bigint) - Source balance in nanoMCM
- `dstAddress` (string) - Destination address (20 hex characters)
- `amount` (number|bigint) - Amount to send in nanoMCM
- `secret` (string) - Secret key for signing (64 hex characters)
- `memo` (string, optional) - Transaction memo (max 16 chars: A-Z, 0-9, dash)
- `fee` (number, optional) - Transaction fee in nanoMCM (default: 500)
- `blkToLive` (number, optional) - Blocks to live (default: 0)

**Returns:** Object with:
- `transaction` - Transaction as Buffer
- `transactionHex` - Transaction as hex string
- `transactionBase64` - Transaction as base64 string
- `messageHash` - Signed message hash
- `sourceAddress` - Full source address (80 hex chars)
- `changeAddress` - Full change address (80 hex chars)
- `destinationAddress` - Destination address
- `sendAmount` - Amount sent
- `changeAmount` - Change amount
- `fee` - Transaction fee
- `size` - Transaction size in bytes (2408 bytes for single destination)

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

#### `getAccountBalance(address, apiUrl)`

Query account balance from the network.

**Parameters:**
- `address` (string) - Account address (40 hex characters)
- `apiUrl` (string) - API endpoint URL

**Returns:** Promise with:
- `address` - Account address
- `balance` - Balance in nanoMCM
- `currency` - Currency info (symbol, decimals)
- `block` - Current block info

#### `getNetworkStatus(apiUrl)`

Get network status information.

**Parameters:**
- `apiUrl` (string) - API endpoint URL

**Returns:** Promise with network status data

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
- Documentation: See `examples/` directory for usage examples
- API Reference: See `SDK_API_DOCUMENTATION.md` for detailed API documentation

## Changelog

### v1.0.0 (Current)
- Initial release
- Address generation (random and deterministic)
- Transaction creation and signing
- Network broadcasting via Rosetta API
- 63 unit tests with 100% Go parity
- Complete documentation and examples
