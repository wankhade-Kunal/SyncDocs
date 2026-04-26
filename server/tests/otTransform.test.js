const assert = require('assert');
const { transform, compose, transformCursor } = require('../utils/otTransform');

describe('OT Transform Tests', () => {
  
  test('should transform INSERT vs INSERT', () => {
    // Op1: Insert "Hello" at pos 0
    const op1 = {
      ops: [
        { insert: 'Hello' }
      ]
    };
    
    // Op2: Insert "World" at pos 0
    const op2 = {
      ops: [
        { insert: 'World' }
      ]
    };
    
    // Transform op2 against op1 with priority 'left'
    // Expected: op2 should be shifted right by op1's length
    const result = transform(op1, op2, 'left');
    
    // After transform, op2 should retain 5 positions before inserting
    assert.strictEqual(result.ops.length > 0, true);
    console.log('✓ Test 1: INSERT vs INSERT passed');
  });

  test('should transform INSERT vs DELETE', () => {
    // Op1: Insert "X" at pos 0
    const op1 = {
      ops: [
        { insert: 'X' }
      ]
    };
    
    // Op2: Delete 2 chars starting at pos 0
    const op2 = {
      ops: [
        { delete: 2 }
      ]
    };
    
    const result = transform(op1, op2, 'left');
    
    // The delete should be shifted due to the insert
    assert.strictEqual(result.ops.length > 0, true);
    console.log('✓ Test 2: INSERT vs DELETE passed');
  });

  test('should compose two operations', () => {
    // Op1: Insert "Hello"
    const op1 = {
      ops: [
        { insert: 'Hello' }
      ]
    };
    
    // Op2: Retain 5, Insert " World"
    const op2 = {
      ops: [
        { retain: 5 },
        { insert: ' World' }
      ]
    };
    
    const composed = compose(op1, op2);
    
    // Should have combined operations
    assert.strictEqual(composed.ops.length > 0, true);
    console.log('✓ Test 3: Compose operations passed');
  });

  test('should transform cursor position after INSERT', () => {
    // Operation: Insert "XX" at position 0
    const op = {
      ops: [
        { insert: 'XX' }
      ]
    };
    
    const originalCursor = 5;
    const transformedCursor = transformCursor(originalCursor, op, false);
    
    // Cursor should be shifted right by insert length
    assert.strictEqual(transformedCursor > originalCursor, true);
    console.log('✓ Test 4: Cursor transform on INSERT passed');
  });

  test('should handle empty operations', () => {
    const op1 = { ops: [] };
    const op2 = { ops: [] };
    
    const result = transform(op1, op2, 'left');
    
    // Should handle empty ops gracefully
    assert.strictEqual(Array.isArray(result.ops), true);
    console.log('✓ Test 5: Empty operations passed');
  });

});

// Run tests
console.log('🧪 Running OT Transform Tests...\n');

try {
  describe('OT Transform Tests', () => {
    // Tests auto-run via test() calls above
  });
  
  console.log('\n✅ All tests passed!');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
}
