import jsep from 'jsep';
import { format as formatDate } from 'date-fns';

const toNumber = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : 0;
};

const toText = (v) => (v == null ? '' : String(v));

const toDate = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const truthy = (v) => !!v;

const FUNCTIONS = {
  IF: (cond, a, b) => (truthy(cond) ? a : b),
  AND: (...args) => args.every((x) => truthy(x)),
  OR: (...args) => args.some((x) => truthy(x)),
  NOT: (x) => !truthy(x),

  LOWER: (x) => toText(x).toLowerCase(),
  UPPER: (x) => toText(x).toUpperCase(),
  TRIM: (x) => toText(x).trim(),
  CONCAT: (...args) => args.map(toText).join(''),
  LEFT: (x, n) => toText(x).slice(0, Math.max(0, toNumber(n))),
  RIGHT: (x, n) => {
    const s = toText(x);
    const nn = Math.max(0, toNumber(n));
    return nn ? s.slice(-nn) : '';
  },
  MID: (x, start, n) => {
    const s = toText(x);
    const st = Math.max(1, Math.floor(toNumber(start)));
    const nn = Math.max(0, Math.floor(toNumber(n)));
    return s.substr(st - 1, nn);
  },
  FIND: (needle, haystack) => {
    const idx = toText(haystack).indexOf(toText(needle));
    return idx >= 0 ? idx + 1 : 0;
  },
  CONTAINS: (haystack, needle) => toText(haystack).toLowerCase().includes(toText(needle).toLowerCase()),
  REGEXMATCH: (text, pattern) => {
    try {
      return new RegExp(toText(pattern), 'i').test(toText(text));
    } catch {
      return false;
    }
  },

  ABS: (x) => Math.abs(toNumber(x)),
  ROUND: (x, digits) => {
    const d = digits == null ? 0 : Math.floor(toNumber(digits));
    const p = Math.pow(10, d);
    return Math.round(toNumber(x) * p) / p;
  },

  YEAR: (x) => {
    const d = toDate(x);
    return d ? d.getFullYear() : 0;
  },
  MONTH: (x) => {
    const d = toDate(x);
    return d ? d.getMonth() + 1 : 0;
  },
  DAY: (x) => {
    const d = toDate(x);
    return d ? d.getDate() : 0;
  },
  TEXT: (x, fmt) => {
    const f = toText(fmt);
    const d = toDate(x);
    if (d) {
      const normalized = f
        .replace(/YYYY/g, 'yyyy')
        .replace(/YY/g, 'yy')
        .replace(/DD/g, 'dd');
      try {
        return formatDate(d, normalized);
      } catch {
        return '';
      }
    }
    return toText(x);
  },

  COALESCE: (...args) => {
    for (const a of args) {
      if (a != null && String(a).trim() !== '') return a;
    }
    return '';
  },
  ISBLANK: (x) => x == null || String(x).trim() === '',
};

const ALLOWED_IDENTIFIERS = new Set([
  'id',
  'date',
  'month',
  'amount',
  'description',
  'vendor',
  'currency',
  'category',
  'account',
  'notes',
]);

function evalAst(node, ctx) {
  if (!node) return null;
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'Identifier':
      if (!ALLOWED_IDENTIFIERS.has(node.name)) return null;
      return ctx[node.name];
    case 'UnaryExpression': {
      const v = evalAst(node.argument, ctx);
      switch (node.operator) {
        case '+':
          return toNumber(v);
        case '-':
          return -toNumber(v);
        case '!':
          return !truthy(v);
        default:
          return null;
      }
    }
    case 'BinaryExpression': {
      const l = evalAst(node.left, ctx);
      const r = evalAst(node.right, ctx);
      switch (node.operator) {
        case '+':
          return typeof l === 'string' || typeof r === 'string' ? toText(l) + toText(r) : toNumber(l) + toNumber(r);
        case '-':
          return toNumber(l) - toNumber(r);
        case '*':
          return toNumber(l) * toNumber(r);
        case '/':
          return toNumber(r) === 0 ? null : toNumber(l) / toNumber(r);
        case '%':
          return toNumber(l) % toNumber(r);
        case '==':
          return l == r;
        case '!=':
          return l != r;
        case '===':
          return l === r;
        case '!==':
          return l !== r;
        case '<':
          return toNumber(l) < toNumber(r);
        case '<=':
          return toNumber(l) <= toNumber(r);
        case '>':
          return toNumber(l) > toNumber(r);
        case '>=':
          return toNumber(l) >= toNumber(r);
        default:
          return null;
      }
    }
    case 'LogicalExpression': {
      const l = evalAst(node.left, ctx);
      if (node.operator === '&&') return truthy(l) ? evalAst(node.right, ctx) : l;
      if (node.operator === '||') return truthy(l) ? l : evalAst(node.right, ctx);
      return null;
    }
    case 'ConditionalExpression':
      return truthy(evalAst(node.test, ctx)) ? evalAst(node.consequent, ctx) : evalAst(node.alternate, ctx);
    case 'CallExpression': {
      const callee = node.callee;
      if (!callee || callee.type !== 'Identifier') return null;
      const fnName = String(callee.name || '').toUpperCase();
      const fn = FUNCTIONS[fnName];
      if (!fn) return null;
      const args = (node.arguments || []).map((a) => evalAst(a, ctx));
      try {
        return fn(...args);
      } catch {
        return null;
      }
    }
    default:
      return null;
  }
}

export function evaluateFormula(formula, rowContext) {
  const src = String(formula || '').trim();
  if (!src) return { value: null, error: 'Empty formula' };
  const clean = src.startsWith('=') ? src.slice(1) : src;
  try {
    const ast = jsep(clean);
    const ctx = rowContext || {};
    const value = evalAst(ast, ctx);
    return { value, error: null };
  } catch (e) {
    return { value: null, error: e?.message || 'Invalid formula' };
  }
}

export function getAllowedFormulaFunctions() {
  return Object.keys(FUNCTIONS);
}

export function getAllowedFormulaIdentifiers() {
  return Array.from(ALLOWED_IDENTIFIERS);
}
