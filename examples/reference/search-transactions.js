/**
 * Search Transactions Script
 *
 * Searches for transactions by address or transaction ID.
 */

import fs from 'fs';

const API_URL = 'https://api.mochimo.org';

console.log('=== Mochimo SDK - Transaction Search ===\n');

async function searchTransactionsByAddress(addressHex, options = {}) {
  console.log(`Searching transactions for address: ${addressHex}\n`);

  const requestBody = {
    network_identifier: {
      blockchain: 'mochimo',
      network: 'mainnet'
    },
    account_identifier: {
      address: addressHex
    }
  };

  // Add optional filters
  if (options.limit) requestBody.limit = options.limit;
  if (options.offset) requestBody.offset = options.offset;
  if (options.maxBlock) requestBody.max_block = options.maxBlock;
  if (options.status) requestBody.status = options.status;

  try {
    const response = await fetch(`${API_URL}/search/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.transactions && data.transactions.length > 0) {
      console.log(`✓ Found ${data.transactions.length} transaction(s):\n`);

      data.transactions.forEach((tx, index) => {
        console.log(`\n─────────────────────────────────────────────`);
        console.log(`Transaction ${index + 1}:`);
        console.log(`  Hash: ${tx.transaction_identifier?.hash || 'N/A'}`);
        console.log(`  Block: ${tx.block_identifier?.index || 'N/A'}`);

        if (tx.operations && tx.operations.length > 0) {
          console.log(`  Operations:`);

          tx.operations.forEach((op, opIndex) => {
            console.log(`\n    ${opIndex + 1}. ${op.type} (${op.status})`);
            console.log(`       Account: ${op.account?.address || 'N/A'}`);

            if (op.amount) {
              const amountNano = op.amount.value;
              const amountMCM = (parseFloat(amountNano) / 1_000_000_000).toFixed(9);
              console.log(`       Amount: ${amountNano} nanoMCM (${amountMCM} MCM)`);
            }

            if (op.metadata) {
              if (op.metadata.memo) {
                console.log(`       Memo: "${op.metadata.memo}"`);
              }
              if (op.metadata.change_address_hash) {
                console.log(`       Change Address: ${op.metadata.change_address_hash}`);
              }
              if (op.metadata.from_address_hash) {
                console.log(`       From Address: ${op.metadata.from_address_hash}`);
              }
            }
          });
        }

        if (tx.metadata) {
          console.log(`\n  Metadata:`);
          console.log(`    Block to Live: ${tx.metadata.block_to_live || '0'}`);
        }
      });

      console.log(`\n─────────────────────────────────────────────`);

      // Show pagination info
      if (data.next_offset !== undefined) {
        console.log(`\n💡 More results available. Next offset: ${data.next_offset}`);
        console.log(`   Run with: node examples/reference/search-transactions.js --address ${addressHex} --offset ${data.next_offset}`);
      }

      return data.transactions;
    } else {
      console.log('✓ No transactions found for this address');
      return [];
    }

  } catch (error) {
    console.error('✗ Error searching transactions:', error.message);
    throw error;
  }
}

async function searchTransactionById(txHash) {
  console.log(`Searching for transaction: ${txHash}\n`);

  try {
    const response = await fetch(`${API_URL}/search/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        network_identifier: {
          blockchain: 'mochimo',
          network: 'mainnet'
        },
        transaction_identifier: {
          hash: txHash
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.transaction) {
      console.log('✓ Transaction found:\n');

      const tx = data.transaction;
      console.log(`Hash: ${tx.transaction_identifier?.hash || 'N/A'}`);
      console.log(`Block: ${tx.block_identifier?.index || 'N/A'}`);
      console.log(`Block Hash: ${tx.block_identifier?.hash || 'N/A'}`);

      if (tx.operations && tx.operations.length > 0) {
        console.log(`\nOperations:`);

        tx.operations.forEach((op, index) => {
          console.log(`\n  ${index + 1}. ${op.type} (${op.status})`);
          console.log(`     Account: ${op.account?.address || 'N/A'}`);

          if (op.amount) {
            const amountNano = op.amount.value;
            const amountMCM = (parseFloat(amountNano) / 1_000_000_000).toFixed(9);
            console.log(`     Amount: ${amountNano} nanoMCM (${amountMCM} MCM)`);
          }

          if (op.metadata) {
            console.log(`     Metadata:`, JSON.stringify(op.metadata, null, 8));
          }
        });
      }

      return tx;
    } else {
      console.log('✗ Transaction not found');
      return null;
    }

  } catch (error) {
    console.error('✗ Error searching transaction:', error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Default: search for source address recent transactions
    if (!fs.existsSync('wallet-config.json')) {
      console.error('✗ wallet-config.json not found. Run setup-wallets.js first.');
      console.log('\nOr specify an address manually:');
      console.log('  node examples/reference/search-transactions.js --address <hex_address>');
      console.log('  node examples/reference/search-transactions.js --tx <transaction_hash>');
      process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync('wallet-config.json', 'utf8'));
    console.log('Searching transactions for SOURCE wallet:');
    console.log(`  Address: ${config.source.address}`);
    console.log(`  Base58: ${config.source.addressBase58}\n`);

    await searchTransactionsByAddress(config.source.address, { limit: 10 });

  } else if (args[0] === '--address' || args[0] === '-a') {
    // Search by address
    if (args.length < 2) {
      console.error('Usage: node search-transactions.js --address <hex_address> [--limit <n>] [--offset <n>]');
      process.exit(1);
    }

    const address = args[1];
    const options = {};

    // Parse optional arguments
    for (let i = 2; i < args.length; i += 2) {
      if (args[i] === '--limit') options.limit = parseInt(args[i + 1]);
      if (args[i] === '--offset') options.offset = parseInt(args[i + 1]);
      if (args[i] === '--max-block') options.maxBlock = parseInt(args[i + 1]);
      if (args[i] === '--status') options.status = args[i + 1];
    }

    await searchTransactionsByAddress(address, options);

  } else if (args[0] === '--tx' || args[0] === '-t') {
    // Search by transaction hash
    if (args.length < 2) {
      console.error('Usage: node search-transactions.js --tx <transaction_hash>');
      process.exit(1);
    }

    const txHash = args[1];
    await searchTransactionById(txHash);

  } else {
    console.error('Invalid arguments.');
    console.log('\nUsage:');
    console.log('  node search-transactions.js                              # Search source wallet');
    console.log('  node search-transactions.js --address <hex_address>      # Search by address');
    console.log('  node search-transactions.js --tx <transaction_hash>      # Search by TX hash');
    console.log('\nOptions for --address:');
    console.log('  --limit <n>        Limit number of results');
    console.log('  --offset <n>       Offset for pagination');
    console.log('  --max-block <n>    Only show transactions up to this block');
    console.log('  --status <status>  Filter by status (SUCCESS, PENDING, etc.)');
    process.exit(1);
  }

  console.log('\n=== Transaction Search Complete ===');
}

main().catch(error => {
  console.error('\nFailed:', error.message);
  process.exit(1);
});
