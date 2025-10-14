/**
 * Network broadcast module
 *
 * Provides functions for broadcasting transactions to the Mochimo network.
 */

/**
 * Broadcast a signed transaction to the Mochimo network
 *
 * @param {string|Buffer} signedTransaction - Transaction hex or buffer from createTransaction()
 * @param {string} apiUrl - API endpoint URL (e.g., 'https://api.mochimo.org')
 * @param {Object} options - Optional broadcast options
 * @param {number} [options.timeout=30000] - Request timeout in milliseconds
 * @param {number} [options.retries=2] - Number of retry attempts
 * @param {number} [options.retryDelay=1000] - Delay between retries in milliseconds
 * @returns {Promise<Object>} Broadcast result with transaction ID and status
 *
 * @example
 * const result = await broadcastTransaction(
 *   transaction.transactionHex,
 *   'https://api.mochimo.org',
 *   { timeout: 30000, retries: 2 }
 * );
 * console.log('Transaction ID:', result.txid);
 * console.log('Success:', result.success);
 */
export async function broadcastTransaction(signedTransaction, apiUrl, options = {}) {
  // Set defaults
  const timeout = options.timeout ?? 30000;
  const retries = options.retries ?? 2;
  const retryDelay = options.retryDelay ?? 1000;

  // Validate inputs
  if (!signedTransaction) {
    throw new Error('Signed transaction is required');
  }
  if (!apiUrl) {
    throw new Error('API URL is required');
  }

  // Convert transaction to hex format
  let txHex;
  if (Buffer.isBuffer(signedTransaction)) {
    txHex = signedTransaction.toString('hex');
  } else if (typeof signedTransaction === 'string') {
    // Check if it's base64 or hex
    if (/^[0-9a-fA-F]+$/.test(signedTransaction)) {
      txHex = signedTransaction;
    } else {
      // Assume base64
      txHex = Buffer.from(signedTransaction, 'base64').toString('hex');
    }
  } else {
    throw new Error('Signed transaction must be a hex string, base64 string, or Buffer');
  }

  // Construct URL for Mochimo Rosetta API
  const url = apiUrl.replace(/\/+$/, '') + '/construction/submit';

  // Prepare request (Mochimo Rosetta API format)
  const requestBody = {
    network_identifier: {
      blockchain: 'mochimo',
      network: 'mainnet'
    },
    signed_transaction: txHex
  };

  // Retry logic
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check response status
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Broadcast failed (${response.status}): ${response.statusText}\n${text}`);
      }

      // Parse response
      const data = await response.json();

      // Extract transaction hash from response
      const txHash = data.transaction_identifier?.hash || data.txid || data.transactionId || '';

      // Return standardized result
      return {
        txid: txHash,
        success: true,
        status: response.status,
        data
      };

    } catch (error) {
      lastError = error;

      // If it's an abort error, it's a timeout
      if (error.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeout}ms`);
      }

      // If this was the last retry, throw the error
      if (attempt === retries) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  // All retries failed
  throw new Error(`Failed to broadcast transaction after ${retries + 1} attempts: ${lastError.message}`);
}

/**
 * Get network status from API
 *
 * @param {string} apiUrl - API endpoint URL
 * @returns {Promise<Object>} Network status information
 */
export async function getNetworkStatus(apiUrl) {
  const url = apiUrl.replace(/\/+$/, '') + '/network/status';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      network_identifier: {
        blockchain: 'mochimo',
        network: 'mainnet'
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get network status: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Query account balance from API
 *
 * @param {string} address - Account address (40 hex characters)
 * @param {string} apiUrl - API endpoint URL
 * @returns {Promise<Object>} Account balance information
 */
export async function getAccountBalance(address, apiUrl) {
  const url = apiUrl.replace(/\/+$/, '') + '/account/balance';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      network_identifier: {
        blockchain: 'mochimo',
        network: 'mainnet'
      },
      account_identifier: {
        address: address
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get account balance: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    address,
    balance: data.balances?.[0]?.value || '0',
    currency: data.balances?.[0]?.currency || { symbol: 'MCM', decimals: 9 },
    block: data.block_identifier
  };
}
