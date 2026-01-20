/**
 * Shared transform helpers for DataTransform and AgenticAI.
 * Applies new column from two columns with op: add|subtract|multiply|divide|percentage|concat.
 */
export function applyTransform(rows, colA, colB, op, newName, separator = ' ') {
  return rows.map((row) => {
    const v1 = row[colA];
    const v2 = row[colB];
    let res;
    if (op === 'concat') {
      res = (v1 != null ? String(v1) : '') + (separator || ' ') + (v2 != null ? String(v2) : '');
    } else {
      const a = parseFloat(v1) || 0;
      const b = parseFloat(v2) || 0;
      if (op === 'add') res = a + b;
      else if (op === 'subtract') res = a - b;
      else if (op === 'multiply') res = a * b;
      else if (op === 'divide') res = b !== 0 ? a / b : 0;
      else if (op === 'percentage') res = b !== 0 ? (a / b) * 100 : 0;
      else res = 0;
      res = Math.round(res * 100) / 100;
    }
    return { ...row, [newName]: res };
  });
}
