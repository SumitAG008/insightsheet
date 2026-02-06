import { tableFromArrays } from 'apache-arrow';

function getTableColumn(table, name) {
  if (!table || !name) return null;
  try {
    if (typeof table.getChild === 'function') {
      const v = table.getChild(name);
      if (v) return v;
    }
  } catch (_) {}

  try {
    if (typeof table.getColumn === 'function') {
      const v = table.getColumn(name);
      if (v) return v;
    }
  } catch (_) {}

  try {
    if (typeof table.getColumnAt === 'function') {
      const idx = table?.schema?.fields?.findIndex?.((f) => f?.name === name) ?? -1;
      if (idx >= 0) {
        const v = table.getColumnAt(idx);
        if (v) return v;
      }
    }
  } catch (_) {}

  // Fallback: some builds expose columns as an array-like
  try {
    const idx = table?.schema?.fields?.findIndex?.((f) => f?.name === name) ?? -1;
    if (idx >= 0 && table?.columns?.[idx]) return table.columns[idx];
  } catch (_) {}

  return null;
}

function isNumberLike(v) {
  if (v === null || v === undefined || v === '') return false;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n);
  }
  return false;
}

function toNumberOrNaN(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function normalizeString(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

export function buildArrowTable(data, { maxRows = 200000 } = {}) {
  const headers = (data?.headers || []).filter((h) => h && String(h).trim() !== '');
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const n = Math.min(rows.length, maxRows);

  const arrays = {};

  for (const h of headers) {
    let numericHits = 0;
    let nonEmpty = 0;
    for (let i = 0; i < Math.min(n, 2000); i++) {
      const v = rows[i]?.[h];
      if (v !== null && v !== undefined && v !== '') {
        nonEmpty++;
        if (isNumberLike(v)) numericHits++;
      }
    }

    const isNumeric = nonEmpty > 0 && numericHits / nonEmpty >= 0.8;

    if (isNumeric) {
      const col = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const v = rows[i]?.[h];
        const num = toNumberOrNaN(v);
        col[i] = Number.isFinite(num) ? num : NaN;
      }
      arrays[h] = col;
    } else {
      const col = new Array(n);
      for (let i = 0; i < n; i++) col[i] = normalizeString(rows[i]?.[h]);
      arrays[h] = col;
    }
  }

  return tableFromArrays(arrays);
}

export function inferColumns(data) {
  const headers = (data?.headers || []).filter((h) => h && String(h).trim() !== '');
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  const numeric = [];
  const text = [];
  const date = [];

  for (const h of headers) {
    let nonEmpty = 0;
    let numericHits = 0;
    let dateHits = 0;

    const sampleN = Math.min(rows.length, 2000);
    for (let i = 0; i < sampleN; i++) {
      const v = rows[i]?.[h];
      if (v === null || v === undefined || v === '') continue;
      nonEmpty++;
      if (isNumberLike(v)) numericHits++;
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) dateHits++;
    }

    if (nonEmpty === 0) {
      text.push(h);
      continue;
    }

    const numericRatio = numericHits / nonEmpty;
    const dateRatio = dateHits / nonEmpty;

    if (numericRatio >= 0.8) numeric.push(h);
    else if (dateRatio >= 0.8) date.push(h);
    else text.push(h);
  }

  return { headers, numeric, text, date };
}

export function computeArrowKPIs(table, { maxDistinct = 2000 } = {}) {
  const numRows = table.numRows;
  const numCols = table.numCols;

  let missingCells = 0;
  const columnNulls = {};

  for (const field of table.schema.fields) {
    const name = field.name;
    const col = getTableColumn(table, name);
    if (!col) continue;

    let nulls = 0;
    for (let i = 0; i < numRows; i++) {
      const v = col.get(i);
      if (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) || v === '') nulls++;
    }

    columnNulls[name] = nulls;
    missingCells += nulls;
  }

  const distinctCounts = {};
  for (const field of table.schema.fields) {
    const name = field.name;
    const col = getTableColumn(table, name);
    if (!col) continue;

    const set = new Set();
    for (let i = 0; i < numRows; i++) {
      const v = col.get(i);
      if (v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v))) continue;
      set.add(v);
      if (set.size > maxDistinct) break;
    }
    distinctCounts[name] = set.size;
  }

  return {
    numRows,
    numCols,
    missingCells,
    columnNulls,
    distinctCounts,
  };
}

export function bestColumnsForOverview({ inferred, kpis }) {
  const numeric = inferred.numeric || [];
  const text = inferred.text || [];
  const date = inferred.date || [];

  const pickNumeric = () => {
    if (numeric.length === 0) return '';
    let best = numeric[0];
    let bestMissing = Infinity;
    for (const c of numeric) {
      const miss = kpis?.columnNulls?.[c] ?? 0;
      if (miss < bestMissing) {
        bestMissing = miss;
        best = c;
      }
    }
    return best;
  };

  const pickCategory = () => {
    if (text.length === 0) return '';
    let best = text[0];
    let bestDistinct = Infinity;
    for (const c of text) {
      const distinct = kpis?.distinctCounts?.[c] ?? 0;
      if (distinct > 1 && distinct < bestDistinct) {
        bestDistinct = distinct;
        best = c;
      }
    }
    return best;
  };

  return {
    dateColumn: date[0] || '',
    valueColumn: pickNumeric(),
    categoryColumn: pickCategory(),
  };
}

export function groupSumTopN(table, categoryColumn, valueColumn, { topN = 8 } = {}) {
  if (!categoryColumn || !valueColumn) return [];

  const cat = getTableColumn(table, categoryColumn);
  const val = getTableColumn(table, valueColumn);
  if (!cat || !val) return [];

  const sums = new Map();
  for (let i = 0; i < table.numRows; i++) {
    const k = cat.get(i);
    const v = val.get(i);
    if (k === null || k === undefined || k === '') continue;
    if (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))) continue;
    const key = String(k);
    sums.set(key, (sums.get(key) || 0) + Number(v));
  }

  const arr = Array.from(sums.entries())
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);

  return arr;
}

export function numericHistogram(table, valueColumn, { bins = 12 } = {}) {
  if (!valueColumn) return [];

  const col = getTableColumn(table, valueColumn);
  if (!col) return [];
  const values = [];
  for (let i = 0; i < table.numRows; i++) {
    const v = col.get(i);
    if (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    values.push(n);
  }
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];

  if (min === max) {
    return [{ name: `${min}`, count: values.length }];
  }

  const width = (max - min) / bins;
  const counts = Array(bins).fill(0);

  for (const v of values) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / width)));
    counts[idx]++;
  }

  return counts.map((count, i) => {
    const a = min + i * width;
    const b = a + width;
    return {
      name: `${a.toFixed(2)}-${b.toFixed(2)}`,
      count,
    };
  });
}

function normalizeHeaderName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreHeader(header, keywords) {
  const h = normalizeHeaderName(header);
  let score = 0;
  for (const kw of keywords) {
    if (h === kw) score += 3;
    else if (h.includes(kw)) score += 2;
  }
  return score;
}

export function detectFinanceColumns(headers) {
  const hs = (headers || []).filter(Boolean);

  const candidates = {
    revenue: ['revenue', 'sales', 'income', 'turnover', 'net sales', 'gross sales'],
    expense: ['expense', 'expenses', 'opex', 'operating expense', 'operating expenses', 'cost'],
    cogs: ['cogs', 'cost of goods sold', 'cost_of_goods_sold', 'cost of sales'],
    profit: ['profit', 'net income', 'net profit', 'earnings'],
    grossProfit: ['gross profit', 'gross_profit'],
  };

  const pick = (list) => {
    let best = '';
    let bestScore = 0;
    for (const h of hs) {
      const s = scoreHeader(h, list);
      if (s > bestScore) {
        bestScore = s;
        best = h;
      }
    }
    return bestScore >= 2 ? best : '';
  };

  const revenue = pick(candidates.revenue);
  const expense = pick(candidates.expense);
  const cogs = pick(candidates.cogs);
  const profit = pick(candidates.profit);
  const grossProfit = pick(candidates.grossProfit);

  const score = [revenue, expense, cogs, profit, grossProfit].filter(Boolean).length;
  const isFinanceLike = Boolean(revenue) && (Boolean(expense) || Boolean(cogs) || Boolean(profit) || Boolean(grossProfit)) && score >= 2;

  return { isFinanceLike, revenue, expense, cogs, profit, grossProfit };
}

export function computePnLFromTable(table, cols) {
  if (!table || !cols) return null;

  const sumCol = (name) => {
    if (!name) return null;
    const col = getTableColumn(table, name);
    if (!col) return null;
    let sum = 0;
    let ok = false;
    for (let i = 0; i < table.numRows; i++) {
      const v = col.get(i);
      if (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))) continue;
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      sum += n;
      ok = true;
    }
    return ok ? sum : null;
  };

  const revenue = sumCol(cols.revenue);
  const expense = sumCol(cols.expense);
  const cogs = sumCol(cols.cogs);
  const profitExplicit = sumCol(cols.profit);
  const grossProfitExplicit = sumCol(cols.grossProfit);

  const grossProfit = grossProfitExplicit ?? (revenue != null && cogs != null ? revenue - cogs : null);
  const netProfit = profitExplicit ?? (revenue != null && expense != null ? revenue - expense : null);

  const grossMarginPct = revenue ? (grossProfit != null ? (grossProfit / revenue) * 100 : null) : null;
  const netMarginPct = revenue ? (netProfit != null ? (netProfit / revenue) * 100 : null) : null;

  return {
    revenue,
    cogs,
    expense,
    grossProfit,
    netProfit,
    grossMarginPct,
    netMarginPct,
    columns: cols,
  };
}
