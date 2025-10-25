# Mochimo SDK - Complete Function Reference

Complete documentation of all functions available in the Mochimo SDK, including those not documented in the README.

---

## 📑 Table of Contents

### Account & Keypair Generation
- [`generateAccountKeypair(options?)`](#generateaccountkeypair)
- [`generateAccountKeypairs(count, options?)`](#generateaccountkeypairs)

### Transactions
- [`createTransaction(params)`](#createtransaction)
- [`signTransaction(params)`](#signtransaction)
- [`serializeTransaction(transaction)`](#serializetransaction)

### Network Functions
- [`broadcastTransaction(signedTransaction, apiUrl, options?)`](#broadcasttransaction)
- [`getNetworkStatus(apiUrl)`](#getnetworkstatus)
- [`getAccountBalance(address, apiUrl)`](#getaccountbalance)
- [`resolveTag(tag, apiUrl)`](#resolvetag)

### Base58 Encoding/Decoding
- [`addrTagToBase58(tag)`](#addrtagtobase58)
- [`validateBase58Tag(addr)`](#validatebase58tag)
- [`base58ToAddrTag(addr)`](#base58toaddrtag)
- [`encodeBase58WithChecksum(tag)`](#encodebase58withchecksum)
- [`decodeBase58WithChecksum(addr)`](#decodebase58withchecksum)

### Address & Ledger Utilities
- [`validateLedgerAddress(ledgerAddress, name?)`](#validateledgeraddress)
- [`validateAccountTag(accountTag, name?)`](#validateaccounttag)
- [`extractAccountTag(ledgerAddress)`](#extractaccounttag)
- [`extractDsaHash(ledgerAddress)`](#extractdsahash)
- [`isImplicitAccount(ledgerAddress)`](#isimplicitaccount)
- [`constructLedgerAddress(accountTag, dsaHash)`](#constructledgeraddress)
- [`formatLedgerAddress(ledgerAddress)`](#formatledgeraddress)
- [`getAccountInfo(ledgerAddress)`](#getaccountinfo)

### Transaction Builder Utilities
- [`buildTransaction(params)`](#buildtransaction)
- [`prepareTransactionFromWallet(wallet, destination, amount, options?)`](#preparetransactionfromwallet)
- [`validateTransactionParams(params)`](#validatetransactionparams)

### Low-Level Cryptographic Functions (WOTS+)
- [`keygen(privateKey)`](#keygen)
- [`sign(message, keypair)`](#sign)
- [`verify(message, signature, keypair)`](#verify)
- [`wotsPkFromSig(sig, msg, pubSeed, addr)`](#wotspkfromsig)

### Cryptographic Hash Functions
- [`mochimoHash(data)`](#mochimohash)
- [`addrFromWots(wots)`](#addrfromwots)

### Constants
- [`VERSION`](#version)

---

## 📦 Account & Keypair Generation

### `generateAccountKeypair(options?)` {#generateaccountkeypair}

Generates a single WOTS+ keypair for a Mochimo account.

**Input:**
- `options.seed` (Buffer, optional) - 32-byte seed for deterministic generation
- `options.index` (number, optional) - Keypair index (default: 0)

**Output:**
```javascript
{
  dsaHash: Buffer,          // 40 bytes - DSA PK Hash (can become Account Tag)
  accountTag: Buffer,       // 20 bytes - Persistent account identifier
  accountNumber: string,    // 20 hex characters
  publicKey: Buffer,        // 2208 bytes - WOTS+ public key
  secretKey: Buffer         // 32 bytes - Secret key
}
```

**Example:**
```javascript
import { generateAccountKeypair } from 'mochimo';
const keypair = generateAccountKeypair();
console.log(keypair.accountTag.toString('hex'));
// Output: 4cf12a97c7e6ff6c01ddacce8b175ffcd7a7eab7
console.log('Public key length:', keypair.publicKey.length, 'bytes');
// Output: Public key length: 2208 bytes
console.log('Secret key length:', keypair.secretKey.length, 'bytes');
// Output: Secret key length: 32 bytes
```

---

### `generateAccountKeypairs(count, options?)` {#generateaccountkeypairs}

Generates multiple WOTS+ keypairs for accounts.

**Input:**
- `count` (number) - Number of keypairs to generate
- `options.masterSeed` (Buffer, optional) - 32-byte master seed for deterministic generation

**Output:** Array of keypair objects

**Example:**
```javascript
import { generateAccountKeypairs } from 'mochimo';
const keypairs = generateAccountKeypairs(3);
keypairs.forEach((kp, i) => console.log(`Keypair ${i}:`, kp.accountTag.toString('hex')));
// Output: Keypair 0: 608ff2c8610d0fea3d971a4f3a6861eee03fa43a
// Output: Keypair 1: 5c3b6c731c1cbcc4f279c1b3978b5192b77dc8ea
// Output: Keypair 2: 2b61162e45e8e1d63b2f212a0d30cac96833d667
```

---

## 💸 Transactions

### `createTransaction(params)` {#createtransaction}

Creates and signs a Mochimo MCM 3.0 transaction.

**Input:**
- `srcTag` (string|Buffer) - Source Account Tag (40 hex = 20 bytes)
- `sourcePk` (string|Buffer) - Source DSA public key (4416 hex = 2208 bytes)
- `changePk` (string|Buffer) - Change DSA public key (4416 hex = 2208 bytes)
- `balance` (number|bigint) - Balance in nanoMCM
- `dstAccountTag` (string) - Destination Account Tag (40 hex = 20 bytes)
- `amount` (number|bigint) - Amount to send in nanoMCM
- `secret` (string|Buffer) - Secret key for signing (64 hex = 32 bytes)
- `memo` (string, optional) - Transaction memo (max 16 characters: A-Z, 0-9, dash)
- `fee` (number, optional) - Transaction fee in nanoMCM (default: 500)
- `blkToLive` (number, optional) - Blocks to live (default: 0)

**Output:**
```javascript
{
  transaction: Buffer,                // Transaction as Buffer
  transactionHex: string,             // Transaction as hex string
  transactionBase64: string,          // Transaction as base64 string
  messageHash: string,                // Signed message hash
  sourceLedgerAddress: string,        // Full source ledger address (80 hex)
  changeLedgerAddress: string,        // Full change ledger address (80 hex)
  destinationAccountTag: string,      // Destination Account Tag (40 hex)
  sendAmount: number|bigint,          // Amount sent
  changeAmount: number|bigint,        // Change amount
  fee: number,                        // Transaction fee
  size: number                        // Transaction size in bytes
}
```

**Example:**
```javascript
import { generateAccountKeypair, createTransaction } from 'mochimo';
const sourceKeypair = generateAccountKeypair();
const changeKeypair = generateAccountKeypair();
const tx = createTransaction({
  srcTag: sourceKeypair.accountTag.toString('hex'),
  sourcePk: sourceKeypair.publicKey.toString('hex'),
  changePk: changeKeypair.publicKey.toString('hex'),
  balance: 10000,
  dstAccountTag: 'b'.repeat(40),
  amount: 5000,
  secret: sourceKeypair.secretKey.toString('hex'),
  memo: 'TEST-123',
  fee: 500
});
console.log('Transaction size:', tx.size, 'bytes');
// Output: Transaction size: 2408 bytes
console.log('Send amount:', tx.sendAmount);
// Output: Send amount: 5000
console.log('Change amount:', tx.changeAmount);
// Output: Change amount: 4500
console.log('Fee:', tx.fee);
// Output: Fee: 500
```

---

### `signTransaction(params)` {#signtransaction}

Alias for `createTransaction`. Signs a transaction (same parameters).

**Input:** Identical to `createTransaction`

**Output:** Identical to `createTransaction`

**Example:**
```javascript
import { signTransaction } from 'mochimo';
const tx = signTransaction({ srcTag, sourcePk, changePk, balance, dstAccountTag, amount, secret });
```

---

### `serializeTransaction(transaction)` {#serializetransaction}

Serializes a transaction to hex format.

**Input:**
- `transaction` (Object) - Transaction object from `createTransaction()`

**Output:** Hex string of the transaction

**Example:**
```javascript
import { serializeTransaction } from 'mochimo';
const txHex = serializeTransaction(transaction);
```

---

## 🌐 Network Functions

### `broadcastTransaction(signedTransaction, apiUrl, options?)` {#broadcasttransaction}

Broadcasts a signed transaction to the Mochimo network.

**Input:**
- `signedTransaction` (string|Buffer) - Signed transaction in hex or Buffer
- `apiUrl` (string) - API endpoint URL (e.g., 'https://api.mochimo.org')
- `options.timeout` (number, optional) - Request timeout in ms (default: 30000)
- `options.retries` (number, optional) - Number of retry attempts (default: 2)
- `options.retryDelay` (number, optional) - Delay between retries in ms (default: 1000)

**Output:**
```javascript
{
  txid: string,          // Transaction ID
  success: boolean,      // Success status
  status: number,        // HTTP status code
  data: Object           // API response data
}
```

**Example:**
```javascript
import { broadcastTransaction } from 'mochimo';
const result = await broadcastTransaction(
  tx.transactionHex,
  'https://api.mochimo.org',
  { timeout: 30000, retries: 2 }
);
console.log('TX ID:', result.txid);
console.log('Success:', result.success);
```

---

### `getNetworkStatus(apiUrl)` {#getnetworkstatus}

Gets the network status from the API.

**Input:**
- `apiUrl` (string) - API endpoint URL

**Output:** Object with network status information

**Example:**
```javascript
import { getNetworkStatus } from 'mochimo';
const status = await getNetworkStatus('https://api.mochimo.org');
console.log('Current block:', status.current_block_identifier?.index);
```

---

### `getAccountBalance(address, apiUrl)` {#getaccountbalance}

Queries an account balance from the API.

**Input:**
- `address` (string) - Account address (40 hex characters)
- `apiUrl` (string) - API endpoint URL

**Output:**
```javascript
{
  address: string,         // Account address
  balance: string,         // Balance in nanoMCM
  currency: Object,        // Currency info (symbol, decimals)
  block: Object            // Block info
}
```

**Example:**
```javascript
import { getAccountBalance } from 'mochimo';
const balance = await getAccountBalance('a'.repeat(40), 'https://api.mochimo.org');
console.log('Balance:', balance.balance);
```

---

### `resolveTag(tag, apiUrl)` {#resolvetag}

Resolves an Account Tag to get the full ledger address, DSA Hash, and balance.

This function queries the Mochimo network via the MeshAPI `/call` endpoint to resolve a 20-byte Account Tag to its current full ledger address (40 bytes: Account Tag + DSA Hash) and balance. This is useful to find the current state of an account and its associated WOTS+ public key hash.

**Input:**
- `tag` (string|Buffer) - Account Tag (20 bytes / 40 hex characters, with or without 0x prefix)
- `apiUrl` (string) - API endpoint URL (e.g., 'https://api.mochimo.org')

**Output:**
```javascript
{
  accountTag: string,           // 20 bytes (40 hex) - Persistent account identifier
  dsaHash: string,              // 20 bytes (40 hex) - Current DSA PK Hash
  ledgerAddress: string,        // 40 bytes (80 hex) - Full ledger address
  balance: number,              // Balance in nanoMCM
  balanceFormatted: string,     // Formatted balance in MCM (e.g., "90,740 MCM")
  found: boolean                // Whether the tag was found on blockchain
}
```

**Example:**
```javascript
import { resolveTag } from 'mochimo';
const result = await resolveTag('9f810c2447a76e93b17ebff96c0b29952e4355f1', 'https://api.mochimo.org');
console.log('Account Tag:', result.accountTag);
// Output: Account Tag: 9f810c2447a76e93b17ebff96c0b29952e4355f1
console.log('DSA Hash:', result.dsaHash);
// Output: DSA Hash: 8b1b7658642e0a3c3465bf58e34c8c9085317bbc
console.log('Full Ledger Address:', result.ledgerAddress);
// Output: Full Ledger Address: 9f810c2447a76e93b17ebff96c0b29952e4355f18b1b7658642e0a3c3465bf58e34c8c9085317bbc
console.log('Balance:', result.balanceFormatted);
// Output: Balance: 90,740 MCM
console.log('Found:', result.found);
// Output: Found: true
```

---

## 🔐 Base58 Encoding/Decoding

### `addrTagToBase58(tag)` {#addrtagtobase58}

Converts a 20-byte Account Tag to base58 format with CRC16-XMODEM checksum.

**Input:**
- `tag` (Buffer) - 20-byte Account Tag

**Output:** Base58 string with checksum

**Example:**
```javascript
import { addrTagToBase58 } from 'mochimo';
const tag = Buffer.from('4cf12a97c7e6ff6c01ddacce8b175ffcd7a7eab7', 'hex');
const base58Addr = addrTagToBase58(tag);
console.log('Base58:', base58Addr);
// Output: Base58: MtD9VLwrXHZ1HjpNv5F9bGeoaovstn
```

---

### `validateBase58Tag(addr)` {#validatebase58tag}

Validates a base58 address by checking its checksum.

**Input:**
- `addr` (string) - Base58 address string

**Output:** Boolean - true if valid, false otherwise

**Example:**
```javascript
import { validateBase58Tag } from 'mochimo';
const isValid = validateBase58Tag('kHtV35ttVpyiH42FePCiHo2iFmcJS3');
console.log('Valid:', isValid);
// Output: Valid: true
```

---

### `base58ToAddrTag(addr)` {#base58toaddrtag}

Converts a base58 address to a 20-byte Account Tag.

**Input:**
- `addr` (string) - Base58 address string

**Output:** 20-byte Buffer (Account Tag)

**Example:**
```javascript
import { base58ToAddrTag } from 'mochimo';
const tag = base58ToAddrTag('kHtV35ttVpyiH42FePCiHo2iFmcJS3');
console.log('Tag:', tag.toString('hex'));
// Output: Tag: 9f810c2447a76e93b17ebff96c0b29952e4355f1
```

---

### `encodeBase58WithChecksum(tag)` {#encodebase58withchecksum}

Alias for `addrTagToBase58`. Encodes with checksum.

**Input:** 20-byte Buffer

**Output:** Base58 string

**Example:**
```javascript
import { encodeBase58WithChecksum } from 'mochimo';
const encoded = encodeBase58WithChecksum(Buffer.from('9f810c2447a76e93b17ebff96c0b29952e4355f1', 'hex'));
console.log('Encoded:', encoded);
// Output: Encoded: kHtV35ttVpyiH42FePCiHo2iFmcJS3
```

---

### `decodeBase58WithChecksum(addr)` {#decodebase58withchecksum}

Alias for `validateBase58Tag`. Decodes and validates checksum.

**Input:** Base58 string

**Output:** Boolean

**Example:**
```javascript
import { decodeBase58WithChecksum } from 'mochimo';
const isValid = decodeBase58WithChecksum('kHtV35ttVpyiH42FePCiHo2iFmcJS3');
console.log('Valid:', isValid);
// Output: Valid: true
```

---

## 🔍 Address & Ledger Utilities

### `validateLedgerAddress(ledgerAddress, name?)` {#validateledgeraddress}

Validates a full ledger address format (40 bytes).

**Input:**
- `ledgerAddress` (string|Buffer) - Ledger address to validate
- `name` (string, optional) - Parameter name for error messages

**Output:** Validated ledger address Buffer

**Example:**
```javascript
import { validateLedgerAddress } from 'mochimo';
const addr = validateLedgerAddress('a'.repeat(80));
console.log('Address length:', addr.length, 'bytes');
// Output: Address length: 40 bytes
```

---

### `validateAccountTag(accountTag, name?)` {#validateaccounttag}

Validates an Account Tag (20 bytes).

**Input:**
- `accountTag` (string|Buffer) - Account Tag to validate
- `name` (string, optional) - Parameter name for error messages

**Output:** Validated Account Tag Buffer

**Example:**
```javascript
import { validateAccountTag } from 'mochimo';
const tag = validateAccountTag('9f810c2447a76e93b17ebff96c0b29952e4355f1');
console.log('Tag length:', tag.length, 'bytes');
// Output: Tag length: 20 bytes
```

---

### `extractAccountTag(ledgerAddress)` {#extractaccounttag}

Extracts the Account Tag from a full ledger address (first 20 bytes).

**Input:**
- `ledgerAddress` (string|Buffer) - Full 40-byte ledger address

**Output:** 20-byte Buffer (Account Tag)

**Example:**
```javascript
import { extractAccountTag } from 'mochimo';
const tag = extractAccountTag('4cf12a97c7e6ff6c01ddacce8b175ffcd7a7eab74cf12a97c7e6ff6c01ddacce8b175ffcd7a7eab7');
console.log('Tag:', tag.toString('hex'));
// Output: Tag: 4cf12a97c7e6ff6c01ddacce8b175ffcd7a7eab7
```

---

### `extractDsaHash(ledgerAddress)` {#extractdsahash}

Extracts the DSA PK Hash from a full ledger address (last 20 bytes).

**Input:**
- `ledgerAddress` (string|Buffer) - Full 40-byte ledger address

**Output:** 20-byte Buffer (DSA PK Hash)

**Example:**
```javascript
import { extractDsaHash } from 'mochimo';
const dsaHash = extractDsaHash('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
console.log('DSA Hash:', dsaHash.toString('hex'));
// Output: DSA Hash: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
```

---

### `isImplicitAccount(ledgerAddress)` {#isimplicitaccount}

Checks if an account is implicitly tagged (Account Tag == DSA Hash).
Indicates a first-time account that has never been spent from.

**Input:**
- `ledgerAddress` (string|Buffer) - Full 40-byte ledger address

**Output:** Boolean - true if implicit (first-time account)

**Example:**
```javascript
import { isImplicitAccount } from 'mochimo';
const implicit = isImplicitAccount('4cf12a97c7e6ff6c01ddacce8b175ffcd7a7eab74cf12a97c7e6ff6c01ddacce8b175ffcd7a7eab7');
console.log('Implicit account:', implicit);
// Output: Implicit account: true
```

---

### `constructLedgerAddress(accountTag, dsaHash)` {#constructledgeraddress}

Constructs a full ledger address from Account Tag and DSA Hash components.

**Input:**
- `accountTag` (string|Buffer) - 20-byte Account Tag
- `dsaHash` (string|Buffer) - 20-byte DSA PK Hash

**Output:** 40-byte Buffer (full ledger address)

**Example:**
```javascript
import { constructLedgerAddress } from 'mochimo';
const ledgerAddr = constructLedgerAddress('a'.repeat(40), 'b'.repeat(40));
console.log('Ledger address:', ledgerAddr.toString('hex'));
// Output: Ledger address: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
```

---

### `formatLedgerAddress(ledgerAddress)` {#formatledgeraddress}

Formats a ledger address for display (with 0x prefix).

**Input:**
- `ledgerAddress` (string|Buffer) - Ledger address to format

**Output:** Hex string with 0x prefix

**Example:**
```javascript
import { formatLedgerAddress } from 'mochimo';
const formatted = formatLedgerAddress('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
console.log('Formatted:', formatted);
// Output: Formatted: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
```

---

### `getAccountInfo(ledgerAddress)` {#getaccountinfo}

Gets human-readable account and ledger address info.

**Input:**
- `ledgerAddress` (string|Buffer) - Full 40-byte ledger address

**Output:**
```javascript
{
  fullLedgerAddress: string,    // Full ledger address (80 hex)
  accountTag: string,           // Account Tag (40 hex)
  dsaHash: string,              // DSA Hash (40 hex)
  implicit: boolean,            // If implicit account
  accountType: string,          // Account type description
  formatted: string             // With 0x prefix
}
```

**Example:**
```javascript
import { getAccountInfo } from 'mochimo';
const info = getAccountInfo('4cf12a97c7e6ff6c01ddacce8b175ffcd7a7eab74cf12a97c7e6ff6c01ddacce8b175ffcd7a7eab7');
console.log('Account Tag:', info.accountTag);
// Output: Account Tag: 4cf12a97c7e6ff6c01ddacce8b175ffcd7a7eab7
console.log('Account Type:', info.accountType);
// Output: Account Type: implicit (first-time, never spent)
console.log('Is implicit:', info.implicit);
// Output: Is implicit: true
```

---

## 🛠️ Transaction Builder Utilities

### `buildTransaction(params)` {#buildtransaction}

Builds a transaction with automatic Account Tag extraction from source ledger address.

**Input:**
- `sourceLedgerAddress` (string) - Full 40-byte source ledger address (80 hex)
- `sourcePublicKey` (string) - Source DSA public key (4416 hex)
- `sourceSecret` (string) - Source secret key (64 hex)
- `balance` (string|bigint) - Current balance in nanoMCM
- `changePublicKey` (string) - New DSA public key for change (4416 hex)
- `destinationAccountTag` (string) - Destination Account Tag (40 or 80 hex)
- `amount` (string|bigint) - Amount to send in nanoMCM
- `fee` (string|bigint, optional) - Fee in nanoMCM (default: 500)
- `memo` (string, optional) - Optional memo (max 16 characters)
- `blocksToLive` (number, optional) - Expiry in blocks (default: 1000)

**Output:** Buffer of serialized signed transaction

**Example:**
```javascript
import { buildTransaction } from 'mochimo';
const tx = buildTransaction({
  sourceLedgerAddress: 'ab859...2760ab859...2760',
  sourcePublicKey: '0123...',
  sourceSecret: 'a1b2...',
  balance: '100000',
  changePublicKey: '4567...',
  destinationAccountTag: 'cd1234...',
  amount: '5000',
  fee: '500',
  memo: 'TEST-123'
});
```

---

### `prepareTransactionFromWallet(wallet, destination, amount, options?)` {#preparetransactionfromwallet}

Prepares transaction parameters from a wallet configuration.

**Input:**
- `wallet` (Object) - Wallet configuration
  - `wallet.source.address` (string) - Full ledger address
  - `wallet.source.publicKey` (string) - DSA public key
  - `wallet.source.seed` (string) - Secret key
  - `wallet.source.balance` (string|bigint) - Current balance
  - `wallet.change.publicKey` (string) - New DSA public key for change
- `destination` (string) - Destination Account Tag or full ledger address
- `amount` (string|bigint) - Amount to send
- `options.fee` (string|bigint, optional) - Fee (default: 500)
- `options.memo` (string, optional) - Optional memo
- `options.blocksToLive` (number, optional) - Blocks until expiry (default: 1000)

**Output:** Object with parameters ready for `buildTransaction()`

**Example:**
```javascript
import { prepareTransactionFromWallet, buildTransaction } from 'mochimo';
const wallet = { source: {...}, change: {...} };
const txParams = prepareTransactionFromWallet(wallet, 'cd1234...', '5000');
const tx = buildTransaction(txParams);
```

---

### `validateTransactionParams(params)` {#validatetransactionparams}

Validates transaction parameters before creating a transaction.

**Input:**
- `params` (Object) - Transaction parameters to validate

**Output:**
```javascript
{
  valid: boolean,        // If parameters are valid
  errors: string[]       // Array of error messages
}
```

**Example:**
```javascript
import { validateTransactionParams } from 'mochimo';
const validation = validateTransactionParams(params);
console.log('Valid:', validation.valid);
// Output: Valid: true
console.log('Errors:', validation.errors.length === 0 ? 'none' : validation.errors);
// Output: Errors: none
```

---

## 🔒 Low-Level Cryptographic Functions (WOTS+)

### `keygen(privateKey)` {#keygen}

Generates a WOTS+ keypair from a private key seed.

**Input:**
- `privateKey` (Buffer) - 32-byte private key seed

**Output:**
```javascript
{
  publicKey: Buffer,       // 2144 bytes - WOTS+ public key
  privateKey: Buffer,      // 32 bytes - Private key
  components: {
    privateSeed: Buffer,   // 32 bytes
    publicSeed: Buffer,    // 32 bytes
    addrSeed: Buffer       // 32 bytes
  }
}
```

**Example:**
```javascript
import { keygen } from 'mochimo';
const seed = Buffer.from('a'.repeat(64), 'hex');
const keypair = keygen(seed);
console.log('Public key length:', keypair.publicKey.length, 'bytes');
// Output: Public key length: 2144 bytes
console.log('Private key length:', keypair.privateKey.length, 'bytes');
// Output: Private key length: 32 bytes
console.log('Has components:', !!keypair.components);
// Output: Has components: true
```

---

### `sign(message, keypair)` {#sign}

Signs a message with a WOTS+ keypair.

**Input:**
- `message` (Buffer) - 32-byte message to sign
- `keypair` (Object) - Keypair object with components

**Output:** 2144-byte Buffer (signature)

**Example:**
```javascript
import { sign, keygen } from 'mochimo';
const keypair = keygen(Buffer.from('a'.repeat(64), 'hex'));
const message = Buffer.from('b'.repeat(64), 'hex');
const signature = sign(message, keypair);
console.log('Signature length:', signature.length, 'bytes');
// Output: Signature length: 2144 bytes
```

---

### `verify(message, signature, keypair)` {#verify}

Verifies a WOTS+ signature.

**Input:**
- `message` (Buffer) - 32-byte message
- `signature` (Buffer) - 2144-byte signature
- `keypair` (Object) - Keypair with publicKey and components

**Output:** Boolean - true if signature is valid

**Example:**
```javascript
import { verify, sign, keygen } from 'mochimo';
const keypair = keygen(Buffer.from('a'.repeat(64), 'hex'));
const message = Buffer.from('b'.repeat(64), 'hex');
const signature = sign(message, keypair);
const isValid = verify(message, signature, keypair);
console.log('Signature valid:', isValid);
// Output: Signature valid: true
```

---

### `wotsPkFromSig(sig, msg, pubSeed, addr)` {#wotspkfromsig}

Recovers WOTS+ public key from a signature (for verification).

**Input:**
- `sig` (Buffer) - 2144-byte signature
- `msg` (Buffer) - 32-byte message
- `pubSeed` (Buffer) - 32-byte public seed
- `addr` (Buffer) - 32-byte address seed

**Output:** 2144-byte Buffer (recovered public key)

**Example:**
```javascript
import { wotsPkFromSig } from 'mochimo';
const recoveredPk = wotsPkFromSig(signature, message, pubSeed, addrSeed);
```

---

## 🧮 Cryptographic Hash Functions

### `mochimoHash(data)` {#mochimohash}

Mochimo hash function (SHA-256).

**Input:**
- `data` (Buffer) - Data to hash

**Output:** 32-byte Buffer (hash)

**Example:**
```javascript
import { mochimoHash } from 'mochimo';
const hash = mochimoHash(Buffer.from('test'));
console.log('Hash:', hash.toString('hex'));
// Output: Hash: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
```

---

### `addrFromWots(wots)` {#addrfromwots}

Converts a WOTS+ public key to a Mochimo address (40 bytes).

**Input:**
- `wots` (Buffer) - 2144-byte WOTS+ public key

**Output:** 40-byte Buffer (implicit address)

**Example:**
```javascript
import { addrFromWots, keygen } from 'mochimo';
const keypair = keygen(Buffer.from('a'.repeat(64), 'hex'));
const addr = addrFromWots(keypair.publicKey);
console.log('Address:', addr.toString('hex'));
// Output: Address: 87bb6d226e66aeb71de5f1a0607ffaa4f4d1f05187bb6d226e66aeb71de5f1a0607ffaa4f4d1f051
console.log('Address length:', addr.length, 'bytes');
// Output: Address length: 40 bytes
```

---

## 📊 Constants

### `VERSION` {#version}

Current SDK version.

**Output:** String (e.g., '1.0.0')

**Example:**
```javascript
import { VERSION } from 'mochimo';
console.log('SDK Version:', VERSION);
// Output: SDK Version: 1.0.0
```

---

## 📝 Important Notes

### Mochimo Terminology
- **Account Tag**: 20-byte persistent identifier (stays the same)
- **DSA PK Hash**: 20-byte WOTS+ public key hash (changes each transaction)
- **Ledger Address**: 40-byte full address (Account Tag + DSA PK Hash)
- **Implicit Account**: First time, Account Tag == DSA Hash
- **Explicit Account**: After first spend, Account Tag ≠ DSA Hash

### Memo Format
- Maximum 16 characters
- Only uppercase [A-Z], digits [0-9], and dash [-]
- Letter groups and number groups MUST be separated by dashes
- Valid: `ABC-123`, `123-ABC`, `AB-12-CD`
- Invalid: `ABC-XYZ`, `123-456`, `abc-123`

### Units
- **nanoMCM**: Base unit (1 MCM = 1,000,000,000 nanoMCM)
- **Default fee**: 500 nanoMCM

### WOTS+ Security
- WOTS+ keys are **one-time use**: each public key can only sign once
- Always generate a new keypair for change
- Account Tag persists, but DSA PK Hash changes with each transaction
