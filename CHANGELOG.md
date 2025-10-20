# Changelog

All notable changes to the Mochimo Node.js SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-10-19

### 🎉 Complete SDK Rewrite

This is a ground-up rewrite of the Mochimo SDK with a focus on exchange integration with Masterseed, deterministic key generation, and production readiness.

**Breaking Changes:**
- Complete API redesign focused on exchange integration workflows
- New deterministic wallet architecture (BIP32-style hierarchical derivation)
- Removed legacy pool-based address generation (moved to separate module)
- Updated transaction format handling and validation
- New module structure and exports

**New Features:**
- **Deterministic HD Wallet Support**: Master seed → Account seed → WOTS+ keypairs with spend index management
- **Exchange Integration Examples**: Complete workflow examples (generate, deposit, withdraw, validate, recover)
- **Address Validation**: Base58 encoding with CRC16-XMODEM checksum validation
- **Comprehensive Documentation**: Exchange integration guide with security best practices
- **Production-Ready Spend Index Management**: Atomic increment safeguards and recovery procedures
- **Withdrawal Address Validation**: Built-in validation utilities and integration examples

**Architecture:**
- Deterministic key derivation using SHA-512 HMAC
- Per-user master seed architecture for exchanges
- Spend index tracking and WOTS+ one-time signature enforcement
- Improved error handling with detailed validation messages

**Documentation:**
- Complete exchange integration guide (`EXCHANGE_INTEGRATION.md`)
- Working examples with detailed inline documentation
- API documentation with Mochimo terminology and architecture
- Security best practices for production deployment

**Code Quality:**
- 76 passing unit tests
- Modernized Buffer usage (`.subarray()` instead of deprecated `.slice()`)
- Implementation-agnostic documentation (no prescriptive backend/database details)
- Clean, maintainable codebase with clear separation of concerns

---

## [1.1.0] - 2025-10-13

### Changed - Nomenclature Improvements

#### Function Names
- **RENAMED**: `generateAddress()` → `generateAccountKeypair()` (legacy alias maintained)
- **RENAMED**: `generateAddresses()` → `generateAccountKeypairs()` (legacy alias maintained)

#### Parameter Names (Transaction Creation)
- **RENAMED**: `dstAddress` → `dstAccountTag` (legacy parameter maintained)
- **CLARIFIED**: `srcTag` now explicitly documented as "Account Tag" (20-byte persistent identifier)
- **CLARIFIED**: `sourcePk` and `changePk` now explicitly documented as "WOTS+ public keys"

#### Return Object Properties
- **ADDED**: `dsaHash` (Buffer) - DSA public key hash (can become Account Tag on first use)
- **ADDED**: `accountTag` (Buffer) - 20-byte persistent account identifier
- **ADDED**: `sourceLedgerAddress` - Full 40-byte source ledger entry
- **ADDED**: `changeLedgerAddress` - Full 40-byte change ledger entry
- **ADDED**: `destinationAccountTag` - 20-byte destination identifier
- **MAINTAINED**: Legacy aliases (`address`, `tag`, `sourceAddress`, `changeAddress`, `destinationAddress`)

### Documentation Updates
- Updated README.md with comprehensive "Understanding Mochimo Terminology" section
- Updated SDK_API_DOCUMENTATION.md with new function names and terminology
- Updated all 8 example scripts to use new nomenclature
- Updated all unit tests to use new nomenclature
- Added detailed explanations of Account Tag persistence and WOTS+ key rotation

### Verified
- All 46 unit tests passing with new nomenclature
- Successful mainnet transactions broadcast and confirmed
- Account Tag persistence verified across multiple transaction chains
- Legacy function names and parameters confirmed working (backward compatible)

### Backward Compatibility
- All legacy function names maintained as aliases
- All legacy parameter names still accepted
- All legacy return properties still present
- No breaking changes for existing code

## [1.0.0] - 2025-10-12

### Added
- Initial release of Mochimo Node.js SDK
- Complete address generation with WOTS+ (Winternitz One-Time Signature Plus) quantum-resistant signatures
- Transaction creation and signing for MCM 3.0 protocol
- Network broadcasting via Mochimo Rosetta API
- Comprehensive address utilities for validation and manipulation
- Transaction builder helpers for simplified transaction creation
- Full documentation (README.md and SDK_API_DOCUMENTATION.md)
- Working examples in `examples/reference/` and `examples/exchange/` directories
- Unit test suite with 39 passing tests

### Features
- **Address Generation**: Generate random or deterministic WOTS+ keypairs and Mochimo addresses
- **Transaction Creation**: Build and sign 2408-byte MCM 3.0 transactions offline
- **Network Integration**: Broadcast transactions to live Mochimo network
- **Post-Quantum Security**: Full WOTS+ implementation with w=16, 67 chains
- **Tag Persistence**: Correct handling of implicit and explicit addresses across transaction chains
- **Input Validation**: Comprehensive validation with helpful error messages
- **Base58 Encoding**: CRC16-XMODEM checksum for address encoding

### Validated
- Successfully broadcasting transactions to Mochimo mainnet:
- Tag persistence verified across multiple transaction hops
- WOTS+ signatures validated against 5 test vectors
- 100% byte-perfect parity with previous tool implementations

### Documentation
- Complete API reference with usage examples
- Quick start guide in README.md
- Inline JSDoc comments for all public functions
- 8 working example scripts demonstrating all features

### Dependencies
- `bs58`: ^6.0.0 - Base58 encoding
- `crc`: ^4.3.2 - CRC checksum computation

### Development Dependencies
- `@jest/globals`: ^29.7.0 - Testing framework
- `jest`: ^29.7.0 - Test runner

### Notes
- Node.js >= 18.0.0 required
- ES Modules (type: "module")
- Mochimo Cryptocurrency Engine License Agreement Version 1.0 (Modified MPL 2.0)
