# Changelog

All notable changes to the Mochimo Node.js SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
