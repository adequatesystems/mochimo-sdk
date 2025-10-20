# SDK Reference Examples

These examples demonstrate **low-level SDK primitives** and **alternative usage patterns** for non-custodial applications.

## Important: Start with Exchange Examples

**If you're integrating Mochimo into an exchange or custodial service:**
- Start with [`examples/exchange/`](../exchange/) instead
- Read the [Exchange Integration Guide](../exchange/EXCHANGE_INTEGRATION.md)
- Do NOT use these reference examples - they demonstrate random keypair generation, not the deterministic HD approach exchanges require

## When to Use These Examples

These examples are useful for:
- Building **non-custodial wallet applications**
- Understanding **individual SDK functions** in isolation
- Exploring **helper utilities** for transaction building
- Learning SDK primitives **after** understanding the exchange integration pattern

## When NOT to Use These Examples

Do not use these examples if:
- You're building an **exchange or custodial service** (use `examples/exchange/` instead)
- You need **deterministic key derivation** from a master seed
- You're managing **multiple user accounts** (exchanges must use HD wallets)

## Examples Overview

### Address Generation
- **`create-address.js`** - Generate random or one-off deterministic WOTS+ keypairs
  - Shows: Random keypair generation, single deterministic keypair from seed
  - Use case: Non-custodial wallets where users control their own keys

### Transaction Operations
- **`create-transaction.js`** - Create and sign offline transactions
  - Shows: Low-level transaction creation API
  - Use case: Understanding transaction structure and signing

- **`send-transaction.js`** - Complete send workflow
  - Shows: End-to-end transaction flow from configuration to broadcast
  - Use case: Wallet applications sending transactions

- **`transaction-builder-example.js`** - Helper utilities for transaction building
  - Shows: Higher-level helper functions that simplify transaction creation
  - Use case: Reducing boilerplate in wallet applications

### Network Operations
- **`broadcast-transaction.js`** - Broadcast signed transactions to the network
  - Shows: Low-level broadcast API
  - Use case: Understanding network communication

- **`check-balance.js`** - Query account balances
  - Shows: Balance query API using ledger addresses
  - Use case: Checking account balances

- **`check-mempool.js`** - Check transaction status in mempool
  - Shows: Mempool query API
  - Use case: Monitoring unconfirmed transactions

- **`search-transactions.js`** - Search transaction history
  - Shows: Transaction history API
  - Use case: Building transaction explorers

## Key Differences from Exchange Examples

| Aspect | Reference Examples | Exchange Examples |
|--------|-------------------|-------------------|
| **Key Generation** | Random or one-off | Deterministic HD from master seed |
| **Use Case** | Non-custodial wallets | Custodial exchanges/services |
| **Account Management** | Individual accounts | Multiple users, one master seed |
| **Production Ready** | For wallet apps | For exchange integration |
| **Target Audience** | Wallet developers | Exchange engineers |

## Running the Examples

Most examples require the SDK to be installed:

```bash
cd mochimo-sdk
npm install
```

Then run individual examples:

```bash
node examples/reference/create-address.js
node examples/reference/check-balance.js
# ... etc
```

Some examples (like `send-transaction.js`) may require additional configuration files. Check the comments at the top of each file for specific prerequisites.

## Additional Resources

- **Exchange Integration**: [`examples/exchange/`](../exchange/)
- **SDK API Documentation**: [`docs/API.md`](../../docs/API.md)
- **Main README**: [`README.md`](../../README.md)

---

**Remember**: For exchange integration, always use the deterministic approach in `examples/exchange/`. These reference examples are for educational purposes and alternative use cases only.
