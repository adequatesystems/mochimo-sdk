/**
 * Check Mempool Script
 *
 * Lists all transactions currently in the mempool and can check specific transaction details.
 */

const API_URL = 'https://api.mochimo.org';

console.log('=== Mochimo SDK - Mempool Checker ===\n');

async function listMempool() {
  console.log('Fetching mempool transactions...\n');

  try {
    const response = await fetch(`${API_URL}/mempool`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        network_identifier: {
          blockchain: 'mochimo',
          network: 'mainnet'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.transaction_identifiers && data.transaction_identifiers.length > 0) {
      console.log(`✓ Found ${data.transaction_identifiers.length} transaction(s) in mempool:\n`);

      data.transaction_identifiers.forEach((txId, index) => {
        console.log(`${index + 1}. ${txId.hash}`);
      });

      return data.transaction_identifiers;
    } else {
      console.log('✓ Mempool is empty (no pending transactions)');
      return [];
    }

  } catch (error) {
    console.error('✗ Error fetching mempool:', error.message);
    throw error;
  }
}

async function getMempoolTransaction(txHash) {
  console.log(`\nFetching transaction details for: ${txHash}\n`);

  try {
    const response = await fetch(`${API_URL}/mempool/transaction`, {
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

    console.log('✓ Transaction details retrieved:\n');

    if (data.transaction) {
      const tx = data.transaction;
      console.log('Transaction Hash:', tx.transaction_identifier?.hash || 'N/A');

      if (tx.operations && tx.operations.length > 0) {
        console.log('\nOperations:');
        tx.operations.forEach((op, index) => {
          console.log(`\n  Operation ${index + 1}:`);
          console.log(`    Type: ${op.type}`);
          console.log(`    Status: ${op.status}`);
          console.log(`    Account: ${op.account?.address || 'N/A'}`);
          console.log(`    Amount: ${op.amount?.value || 'N/A'} ${op.amount?.currency?.symbol || 'MCM'}`);

          if (op.metadata) {
            console.log(`    Metadata:`, JSON.stringify(op.metadata, null, 6));
          }
        });
      }

      if (tx.metadata) {
        console.log('\nTransaction Metadata:');
        console.log(`  Block to Live: ${tx.metadata.block_to_live || '0'}`);
      }
    }

    return data;

  } catch (error) {
    console.error('✗ Error fetching transaction:', error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0 && args[0] === '--tx') {
    // Check specific transaction
    if (args.length < 2) {
      console.error('Usage: node check-mempool.js --tx <transaction_hash>');
      process.exit(1);
    }

    const txHash = args[1];
    await getMempoolTransaction(txHash);

  } else {
    // List all mempool transactions
    const transactions = await listMempool();

    // If there are transactions, optionally fetch details of the first one
    if (transactions.length > 0) {
      console.log('\n---');
      console.log('\nTo check details of a specific transaction, run:');
      console.log(`node examples/basic/check-mempool.js --tx ${transactions[0].hash}`);
    }
  }

  console.log('\n=== Mempool Check Complete ===');
}

main().catch(error => {
  console.error('\nFailed:', error.message);
  process.exit(1);
});
