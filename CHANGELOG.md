# Changelog

All notable changes to the Mochimo Node.js SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-10-14
[@NickP005](https://github.com/NickP005)
### Added
- **NEW**: `resolveTag(tag, apiUrl)` function for resolving Account Tags to full ledger addresses
  - Queries Mochimo MeshAPI `/call` endpoint with `tag_resolve` method
  - Returns full ledger address (Account Tag + DSA Hash), balance in nanoMCM and formatted MCM
  - Supports hex string, Buffer, and 0x-prefixed formats
  - Distinguishes between implicit and explicit accounts
  - Located in new `src/network/account.js` module
- **NEW**: `base58ToAddrTag(addr)` export added to main index for Base58 decoding
- **NEW**: Example script `examples/basic/resolve-tag.js` demonstrating tag resolution
- **NEW**: Complete documentation in `SDK_FUNCTIONS.md` for `resolveTag()` with real API examples
- **NEW**: Export path `./account` added to package.json for direct module access
- **NEW**: Professional CI/CD pipeline with GitHub Actions (`.github/workflows/ci.yml`)
  - 🔍 Code quality checks (console.log, TODO/FIXME, file sizes, sensitive data patterns)
  - 🛡️ Security audit (npm audit, outdated dependencies)
  - 🧪 Multi-version testing (Node.js 18.x, 20.x, 22.x)
  - 📦 Package validation (structure, documentation files, .npmignore)
  - ✅ Automatic status badges (red/green indicators in repository)
  - Runs on every commit to main/develop branches and pull requests

### Changed
- **REFACTORED**: `getAccountBalance()` moved from `src/network/broadcast.js` to `src/network/account.js`
  - Groups account query functions together logically
  - `broadcast.js` now focused solely on transaction broadcasting and network status
  - Export maintained in main index, no breaking changes
- **FIXED**: `transaction-builder.js` import errors resolved
  - Removed invalid imports: `extractTag`, `getAddressInfo`, `validateAddress`
  - Fixed undefined variable `srcLedgerAddr` → `sourceLedgerAddress`
  - All transaction builder utilities now working correctly

### Documentation
- **UPDATED**: `SDK_FUNCTIONS.md` with comprehensive `resolveTag()` documentation
  - Real API call examples with actual output from `kHtV35ttVpyiH42FePCiHo2iFmcJS3` tag
- **UPDATED**: `README.md` with "Resolve an Account Tag" quick start example
- **ADDED**: Table of Contents entry for `resolveTag()` in function reference

### DevOps
- **ADDED**: GitHub Actions CI/CD workflow for automated testing and quality assurance
  - Ensures all 46 unit tests pass before merge
  - Validates package structure and npm publication readiness
  - Multi-version Node.js compatibility testing
  - Security vulnerability scanning

### Technical Details
- MeshAPI `/call` endpoint integration with `tag_resolve` method
- Proper error handling for tags not found on blockchain
- Balance formatting helper function (nanoMCM to MCM conversion)
- Validation for 20-byte Account Tag format (40 hex characters)

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
- ✅ All legacy function names maintained as aliases
- ✅ All legacy parameter names still accepted
- ✅ All legacy return properties still present
- ✅ No breaking changes for existing code

## [1.0.0] - 2025-10-12

### Added
- Initial release of Mochimo Node.js SDK
- Complete address generation with WOTS+ (Winternitz One-Time Signature Plus) quantum-resistant signatures
- Transaction creation and signing for MCM 3.0 protocol
- Network broadcasting via Mochimo Rosetta API
- Comprehensive address utilities for validation and manipulation
- Transaction builder helpers for simplified transaction creation
- Full documentation (README.md and SDK_API_DOCUMENTATION.md)
- Working examples in `examples/basic/` directory
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
