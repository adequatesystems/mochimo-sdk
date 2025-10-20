/**
 * Example 4: Validate Withdrawal Address
 * 
 * This example demonstrates how to validate user-supplied withdrawal addresses
 * before processing transactions. This is critical for exchange integration to
 * prevent sending funds to invalid or malformed addresses.
 * 
 * Key Points:
 * - Users always provide base58+CRC addresses
 * - Validate format and checksum before processing
 * - Decode to hex/binary for backend transaction construction
 * - Provide clear error messages to users
 */

import { validateBase58Tag, base58ToAddrTag, addrTagToBase58 } from '../../src/utils/base58.js';

console.log('='.repeat(70));
console.log('  Mochimo Exchange Integration - Example 4: Validate Withdrawal Address');
console.log('='.repeat(70));
console.log();

// ============================================================================
// Example Addresses for Testing
// ============================================================================

const VALID_ADDRESS = 'tq2WffaSEfQ2ZPGq7mNy7Svj1SiApG';  // Valid base58+CRC
const INVALID_CHECKSUM = 'tq2WffaSEfQ2ZPGq7mNy7Svj1SiApH';  // Wrong checksum
const INVALID_FORMAT = '04676a3e43bedec50555a653f4377316379cc7bc';  // Hex (not base58)
const INVALID_CHARS = 'tq2WffaSEfQ2ZPGq7mNy7Svj1SiApG!';  // Contains invalid char

// ============================================================================
// Validation Function (Use This in Your Withdrawal API)
// ============================================================================

/**
 * Validate and decode a user-supplied withdrawal address
 * @param {string} userAddress - Base58+CRC address from user
 * @returns {Object} { valid: boolean, accountTag?: Buffer, error?: string }
 */
function validateWithdrawalAddress(userAddress) {
  // Step 1: Basic input validation
  if (!userAddress || typeof userAddress !== 'string') {
    return {
      valid: false,
      error: 'Address is required and must be a string'
    };
  }

  // Step 2: Validate base58+CRC format
  try {
    if (!validateBase58Tag(userAddress)) {
      return {
        valid: false,
        error: 'Invalid Mochimo address format or checksum'
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid address format: ' + error.message
    };
  }

  // Step 3: Decode to account tag buffer
  let accountTagBuffer;
  try {
    accountTagBuffer = base58ToAddrTag(userAddress);
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to decode address: ' + error.message
    };
  }

  // Step 4: Verify decoded length
  if (accountTagBuffer.length !== 20) {
    return {
      valid: false,
      error: `Invalid account tag length: expected 20 bytes, got ${accountTagBuffer.length}`
    };
  }

  // Success!
  return {
    valid: true,
    accountTag: accountTagBuffer
  };
}

// ============================================================================
// Test Cases
// ============================================================================

console.log('Testing Address Validation:');
console.log('-'.repeat(70));
console.log();

const testCases = [
  { label: 'Valid Address', address: VALID_ADDRESS },
  { label: 'Invalid Checksum', address: INVALID_CHECKSUM },
  { label: 'Invalid Format (Hex)', address: INVALID_FORMAT },
  { label: 'Invalid Characters', address: INVALID_CHARS },
  { label: 'Empty String', address: '' },
  { label: 'Null/Undefined', address: null }
];

testCases.forEach(({ label, address }) => {
  console.log(`Test: ${label}`);
  console.log(`Input: ${address || '(empty/null)'}`);
  
  const result = validateWithdrawalAddress(address);
  
  if (result.valid) {
    console.log('✅ VALID');
    console.log(`   Account Tag (hex): ${result.accountTag.toString('hex')}`);
    console.log(`   Account Tag (base58): ${addrTagToBase58(result.accountTag)}`);
  } else {
    console.log('❌ INVALID');
    console.log(`   Error: ${result.error}`);
  }
  console.log();
});

// ============================================================================
// Example API Integration
// ============================================================================

console.log('Example API Integration:');
console.log('-'.repeat(70));
console.log();

/**
 * Example Express.js withdrawal endpoint
 */
function exampleWithdrawalEndpoint() {
  return `
// Express.js example
app.post('/api/withdraw', async (req, res) => {
  const { address, amount, userId } = req.body;
  
  // Validate withdrawal address
  const validation = validateWithdrawalAddress(address);
  
  if (!validation.valid) {
    return res.status(400).json({ 
      success: false,
      error: validation.error,
      message: 'Please check your withdrawal address and try again.'
    });
  }
  
  try {
    // Convert to hex for transaction
    const destinationTag = validation.accountTag.toString('hex');
    
    // Process withdrawal with validated address
    const txId = await processUserWithdrawal({
      userId,
      destinationTag,
      amount
    });
    
    res.json({ 
      success: true, 
      transactionId: txId,
      destinationAddress: address  // Echo back the base58 address
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Withdrawal processing failed: ' + error.message 
    });
  }
});
`;
}

console.log(exampleWithdrawalEndpoint());

// ============================================================================
// Frontend Validation Example
// ============================================================================

console.log('Example Frontend Validation (JavaScript):');
console.log('-'.repeat(70));
console.log();

const frontendExample = `
// Frontend real-time validation (as user types)
function validateAddressInput(input) {
  if (!input) {
    return { valid: false, message: 'Address is required' };
  }
  
  // You can import the SDK in frontend if using a bundler
  // Or make an API call to your backend for validation
  try {
    if (!validateBase58Tag(input)) {
      return { 
        valid: false, 
        message: 'Invalid Mochimo address format' 
      };
    }
    return { valid: true, message: 'Valid address' };
  } catch (error) {
    return { 
      valid: false, 
      message: 'Invalid address: ' + error.message 
    };
  }
}

// React example
function WithdrawalForm() {
  const [address, setAddress] = useState('');
  const [validation, setValidation] = useState(null);
  
  const handleAddressChange = (e) => {
    const input = e.target.value;
    setAddress(input);
    
    // Validate on change
    const result = validateAddressInput(input);
    setValidation(result);
  };
  
  return (
    <div>
      <input 
        type="text"
        value={address}
        onChange={handleAddressChange}
        placeholder="Enter Mochimo address (base58+CRC)"
      />
      {validation && (
        <div className={validation.valid ? 'success' : 'error'}>
          {validation.message}
        </div>
      )}
      <button 
        disabled={!validation?.valid}
        onClick={handleSubmit}
      >
        Withdraw
      </button>
    </div>
  );
}
`;

console.log(frontendExample);

console.log('='.repeat(70));
console.log('✅ Validation complete!');
console.log();
console.log('Key Takeaways:');
console.log('  1. Always validate base58+CRC format before processing');
console.log('  2. Provide clear error messages to users');
console.log('  3. Decode to hex/binary for backend transaction construction');
console.log('  4. Never expose or accept raw hex addresses from users');
console.log('='.repeat(70));
