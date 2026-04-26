/**
 * Operational Transformation utilities for Quill Delta format
 * Handles conflict resolution for concurrent edits
 */

const Delta = require('quill-delta');

/**
 * Transform op2 against op1 with given priority
 * Returns transformed op2 that can be applied after op1
 * Priority: 'left' = op1 wins ties, 'right' = op2 wins ties
 */
function transform(op1, op2, priority = 'left') {
  const ops1 = Array.isArray(op1.ops) ? op1.ops : [op1];
  const ops2 = Array.isArray(op2.ops) ? op2.ops : [op2];
  
  let index1 = 0; // Position in op1
  let index2 = 0; // Position in op2
  let offset = 0; // Net offset from op1's inserts/deletes
  const resultOps = [];

  let i1 = 0, i2 = 0;

  while (i1 < ops1.length && i2 < ops2.length) {
    const current1 = ops1[i1];
    const current2 = ops2[i2];

    // op1 insert: shift op2 right
    if (current1.insert !== undefined) {
      const len = typeof current1.insert === 'string' 
        ? current1.insert.length 
        : 1;
      offset += len;
      resultOps.push(current1);
      i1++;
      continue;
    }

    // op2 insert: keep it, don't advance i1
    if (current2.insert !== undefined) {
      const len = typeof current2.insert === 'string'
        ? current2.insert.length
        : 1;
      resultOps.push(current2);
      index2 += len;
      i2++;
      continue;
    }

    // Both are retains or deletes
    const len1 = current1.retain !== undefined ? current1.retain : current1.delete || 0;
    const len2 = current2.retain !== undefined ? current2.retain : current2.delete || 0;
    const minLen = Math.min(len1, len2);

    // Both retain: keep op2's retain
    if (current1.retain !== undefined && current2.retain !== undefined) {
      resultOps.push({ retain: minLen });
    }
    // op1 delete, op2 retain: op1 deleted what op2 retained, so remove from op2
    else if (current1.delete !== undefined && current2.retain !== undefined) {
      // Don't include anything - the deletion "consumes" the retain
    }
    // op1 retain, op2 delete: keep the delete
    else if (current1.retain !== undefined && current2.delete !== undefined) {
      resultOps.push({ delete: minLen });
    }
    // Both delete: cancel out
    else if (current1.delete !== undefined && current2.delete !== undefined) {
      // Don't include - both delete same content
    }

    index1 += minLen;
    index2 += minLen;

    // Advance whichever op was fully consumed
    if (len1 === minLen) i1++;
    if (len2 === minLen) i2++;
  }

  // Append remaining ops
  while (i2 < ops2.length) {
    const op = ops2[i2];
    if (op.insert !== undefined) {
      resultOps.push(op);
    } else if (op.retain !== undefined) {
      resultOps.push(op);
    } else if (op.delete !== undefined) {
      resultOps.push(op);
    }
    i2++;
  }

  return new Delta(resultOps);
}

/**
 * Compose two sequential operations into one
 * Useful for combining multiple edits into a single delta
 */
function compose(op1, op2) {
  const d1 = new Delta(op1.ops || op1);
  const d2 = new Delta(op2.ops || op2);
  return d1.compose(d2);
}

/**
 * Adjust cursor position after an operation
 * isOwnOp: true if cursor owner made the operation
 */
function transformCursor(cursorIndex, op, isOwnOp = false) {
  const ops = Array.isArray(op.ops) ? op.ops : [op];
  let offset = 0;

  for (const operation of ops) {
    if (operation.insert !== undefined) {
      const len = typeof operation.insert === 'string'
        ? operation.insert.length
        : 1;

      if (isOwnOp) {
        // Own insert: cursor moves right past it
        offset += len;
      } else {
        // Other's insert: moves cursor right
        offset += len;
      }
    } else if (operation.delete !== undefined) {
      // Delete: cursor moves left
      offset -= operation.delete;
    } else if (operation.retain !== undefined) {
      // Skip ahead
      offset = operation.retain;
    }
  }

  return Math.max(0, cursorIndex + offset);
}

module.exports = {
  transform,
  compose,
  transformCursor,
};
