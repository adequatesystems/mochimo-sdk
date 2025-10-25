/**
 * Account query module
 *
 * Provides functions for querying account information from the Mochimo network.
 */

import { extractAccountTag, extractDsaHash } from '../utils/address-utils.js';

/**
 * Query account balance from API
 *
 * @param {string} address - Account address (40 hex characters for tag, or 80 hex for full ledger address)
 * @param {string} apiUrl - API endpoint URL
 * @returns {Promise<Object>} Account balance information
 *
 * @example
 * const balance = await getAccountBalance('9f810c2447a76e93b17ebff96c0b29952e4355f1', 'https://api.mochimo.org');
 * console.log('Balance:', balance.balance);
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

/**
 * Resolve an Account Tag to get full ledger address and balance
 *
 * This function queries the Mochimo network to resolve a 20-byte Account Tag
 * to its current full ledger address (40 bytes: Account Tag + DSA Hash) and balance.
 *
 * @param {string|Buffer} tag - Account Tag (20 bytes / 40 hex characters)
 * @param {string} apiUrl - API endpoint URL (e.g., 'https://api.mochimo.org')
 * @returns {Promise<Object>} Resolved tag information
 *
 * @example
 * const result = await resolveTag('9f810c2447a76e93b17ebff96c0b29952e4355f1', 'https://api.mochimo.org');
 * console.log('Full address:', result.ledgerAddress);
 * console.log('Balance:', result.balance);
 * console.log('DSA Hash:', result.dsaHash);
 */
export async function resolveTag(tag, apiUrl) {
  // Validate and normalize tag
  let tagHex;
  if (Buffer.isBuffer(tag)) {
    if (tag.length !== 20) {
      throw new Error('Tag must be 20 bytes');
    }
    tagHex = tag.toString('hex');
  } else if (typeof tag === 'string') {
    // Remove 0x prefix if present
    const cleanTag = tag.startsWith('0x') ? tag.slice(2) : tag;

    if (!/^[0-9a-fA-F]+$/.test(cleanTag)) {
      throw new Error('Tag must contain only hexadecimal characters');
    }

    if (cleanTag.length !== 40) {
      throw new Error('Tag must be 40 hex characters (20 bytes)');
    }

    tagHex = cleanTag;
  } else {
    throw new Error('Tag must be a hex string or Buffer');
  }

  // Construct URL for Mochimo MeshAPI call endpoint
  const url = apiUrl.replace(/\/+$/, '') + '/call';

  // Prepare request
  const requestBody = {
    network_identifier: {
      blockchain: 'mochimo',
      network: 'mainnet'
    },
    method: 'tag_resolve',
    parameters: {
      tag: '0x' + tagHex
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to resolve tag (${response.status}): ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();

    // Parse response
    if (!data.result || !data.result.address) {
      throw new Error('Invalid response from API: missing address');
    }

    // Extract full ledger address (remove 0x prefix)
    const ledgerAddress = data.result.address.startsWith('0x')
      ? data.result.address.slice(2)
      : data.result.address;

    // Validate ledger address length (should be 80 hex chars = 40 bytes)
    if (ledgerAddress.length !== 80) {
      throw new Error(`Invalid ledger address length: expected 80 hex chars, got ${ledgerAddress.length}`);
    }

    // Extract components
    const accountTag = extractAccountTag(ledgerAddress).toString('hex');
    const dsaHash = extractDsaHash(ledgerAddress).toString('hex');

    return {
      accountTag,                           // 20 bytes (40 hex) - Persistent account identifier
      dsaHash,                              // 20 bytes (40 hex) - Current DSA PK Hash
      ledgerAddress,                        // 40 bytes (80 hex) - Full ledger address
      balance: data.result.amount || 0,     // Balance in nanoMCM
      balanceFormatted: formatBalance(data.result.amount || 0), // Formatted balance in MCM
      found: true
    };

  } catch (error) {
    // Check if tag was not found
    if (error.message.includes('404') || error.message.includes('not found')) {
      return {
        accountTag: tagHex,
        dsaHash: null,
        ledgerAddress: null,
        balance: 0,
        balanceFormatted: '0 MCM',
        found: false,
        error: 'Tag not found on the blockchain'
      };
    }
    throw error;
  }
}

/**
 * Format balance from nanoMCM to MCM
 * @param {number|string} nanoMCM - Balance in nanoMCM
 * @returns {string} Formatted balance with MCM unit
 */
function formatBalance(nanoMCM) {
  const balance = BigInt(nanoMCM);
  const mcm = Number(balance) / 1000000000; // 1 MCM = 1,000,000,000 nanoMCM
  return `${mcm.toLocaleString()} MCM`;
}
