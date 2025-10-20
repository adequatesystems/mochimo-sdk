# Data Directory

This directory is automatically created by the exchange integration examples.

**WARNING: Do not commit master seeds or account data to version control!**

## Generated Files

When you run `1-generate-user-account.js`, it will create:
- `master-seed.txt` - 32-byte master seed (hex encoded)
- `user-account.json` - User account configuration

These files are used by examples 2-4.

## Usage

Run the examples in order:
1. `1-generate-user-account.js` → Creates data files
2. `2-check-deposit.js` → Uses data files
3. `3-send-withdrawal.js` → Uses data files
4. `4-recover-spend-index.js` → Uses data files
