import React, { useMemo, useState } from 'react';
import { Shield, Upload, RefreshCw, Lock, KeyRound, Table as TableIcon } from 'lucide-react';
import FileUploadZone from '@/components/upload/FileUploadZone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { decryptJsonFromLocalStorage, encryptJsonToLocalStorage, clearEncryptedLocalStorage } from '@/lib/secureLocalStore';

const STORAGE_KEYS = {
  mappingProfile: (userEmail) => `finance:mapping:${userEmail || 'anon'}`,
  categorizationRules: (userEmail) => `finance:rules:${userEmail || 'anon'}`,
  coaMapping: (userEmail) => `finance:coa:${userEmail || 'anon'}`,
  connections: (userEmail) => `finance:connections_enc:${userEmail || 'anon'}`,
};

const CANON_FIELDS = [
  { key: 'date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'description', label: 'Description / Memo' },
  { key: 'vendor', label: 'Vendor / Counterparty' },
  { key: 'currency', label: 'Currency (optional)' },
];

function toMonthKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return 'Unknown';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function tryParseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    // Excel serial date heuristic (SheetJS may already convert but just in case)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const dt = new Date(excelEpoch.getTime() + v * 86400000);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  const s = String(v).trim();
  if (!s) return null;
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) return dt;
  // dd/mm/yyyy heuristic
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yy = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
    const dt2 = new Date(yy, mm - 1, dd);
    if (!Number.isNaN(dt2.getTime())) return dt2;
  }
  return null;
}

function normalizeNumber(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s
    .replace(/\s+/g, '')
    .replace(/,/g, '')
    .replace(/\(([^)]+)\)/g, '-$1');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function guessMapping(headers, sampleRows) {
  const lower = (s) => String(s || '').toLowerCase();

  const headerScores = (predicates) => {
    const scores = {};
    for (const h of headers) {
      const hl = lower(h);
      let sc = 0;
      for (const p of predicates) {
        if (p.test(hl)) sc += 1;
      }
      scores[h] = sc;
    }
    return scores;
  };

  const pickBest = (scores) => {
    let best = null;
    let bestScore = -1;
    for (const h of headers) {
      const sc = scores[h] || 0;
      if (sc > bestScore) {
        bestScore = sc;
        best = h;
      }
    }
    return bestScore > 0 ? best : null;
  };

  const dateHeader = pickBest(headerScores([/date/, /fecha/, /datum/, /data/, /transaction\s*date/, /posting\s*date/, /value\s*date/, /txn/ ]));
  const amountHeader = pickBest(headerScores([/amount/, /amt/, /importe/, /montant/, /valor/, /value/, /debit/, /credit/, /net/ ]));
  const descHeader = pickBest(headerScores([/description/, /desc/, /memo/, /narration/, /detalle/, /concept/, /details/ ]));
  const vendorHeader = pickBest(headerScores([/vendor/, /payee/, /merchant/, /beneficiary/, /counterparty/, /proveedor/, /fournisseur/, /cliente/, /customer/ ]));
  const currencyHeader = pickBest(headerScores([/currency/, /curr/, /moneda/, /devise/, /ccy/ ]));

  const mapping = {
    date: dateHeader,
    amount: amountHeader,
    description: descHeader,
    vendor: vendorHeader,
    currency: currencyHeader,
  };

  // Type heuristics fallback
  if (!mapping.date) {
    const candidate = headers.find((h) => sampleRows.some((r) => tryParseDate(r[h])));
    mapping.date = candidate || null;
  }
  if (!mapping.amount) {
    const candidate = headers.find((h) => {
      const nums = sampleRows.map((r) => normalizeNumber(r[h])).filter((n) => typeof n === 'number');
      return nums.length >= Math.max(2, Math.floor(sampleRows.length * 0.3));
    });
    mapping.amount = candidate || null;
  }

  return mapping;
}

function computeMonthlyPL(transactions) {
  const out = new Map();
  for (const t of transactions) {
    const month = t.month || 'Unknown';
    const amt = typeof t.amount === 'number' ? t.amount : 0;
    const bucket = amt >= 0 ? 'Income' : 'Expense';
    const key = `${month}::${bucket}`;
    out.set(key, (out.get(key) || 0) + amt);
  }

  const rows = [];
  for (const [k, total] of out.entries()) {
    const [month, bucket] = k.split('::');
    rows.push({ month, bucket, total });
  }

  rows.sort((a, b) => (a.month > b.month ? 1 : -1) || (a.bucket > b.bucket ? 1 : -1));
  return rows;
}

const PL_LINES = [
  'Revenue',
  'COGS',
  'Opex',
  'Other Income',
  'Other Expense',
  'Unmapped',
];

function computeFullPL(transactions, coaMapping) {
  const map = new Map();
  for (const m of coaMapping || []) {
    const cat = (m?.category && String(m.category).trim()) ? String(m.category).trim() : '';
    const line = (m?.line && String(m.line).trim()) ? String(m.line).trim() : '';
    if (!cat || !line) continue;
    map.set(cat, line);
  }

  const byMonth = new Map();
  for (const t of transactions || []) {
    const month = t.month || 'Unknown';
    const cat = (t.category && String(t.category).trim()) ? String(t.category).trim() : 'Uncategorized';
    const line = map.get(cat) || 'Unmapped';
    const amt = typeof t.amount === 'number' ? t.amount : 0;

    const isExpenseLine = line === 'COGS' || line === 'Opex' || line === 'Other Expense';
    const normalized = isExpenseLine ? (amt < 0 ? -amt : amt) : amt;

    const key = `${month}::${line}`;
    byMonth.set(key, (byMonth.get(key) || 0) + normalized);
  }

  const months = Array.from(new Set((transactions || []).map((t) => t.month || 'Unknown'))).sort();
  const rows = months.map((month) => {
    const get = (line) => byMonth.get(`${month}::${line}`) || 0;
    const revenue = get('Revenue');
    const cogs = get('COGS');
    const opex = get('Opex');
    const otherIncome = get('Other Income');
    const otherExpense = get('Other Expense');
    const unmapped = get('Unmapped');
    const netProfit = revenue + otherIncome - cogs - opex - otherExpense - unmapped;
    return {
      month,
      revenue,
      cogs,
      opex,
      otherIncome,
      otherExpense,
      unmapped,
      netProfit,
    };
  });

  return rows;
}

function computeMonthlyByCategory(transactions) {
  const out = new Map();
  for (const t of transactions) {
    const month = t.month || 'Unknown';
    const cat = (t.category && String(t.category).trim()) ? String(t.category).trim() : 'Uncategorized';
    const amt = typeof t.amount === 'number' ? t.amount : 0;
    const key = `${month}::${cat}`;
    out.set(key, (out.get(key) || 0) + amt);
  }

  const rows = [];
  for (const [k, total] of out.entries()) {
    const [month, category] = k.split('::');
    rows.push({ month, category, total });
  }
  rows.sort((a, b) => (a.month > b.month ? 1 : -1) || (a.category > b.category ? 1 : -1));
  return rows;
}

export default function FinanceDashboard() {
  const userEmail = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u?.email || '';
    } catch {
      return '';
    }
  }, []);

  const saveRules = (nextRules) => {
    try {
      localStorage.setItem(STORAGE_KEYS.categorizationRules(userEmail), JSON.stringify(nextRules || []));
    } catch {
      // ignore
    }
  };

  const normalizeText = (v) => String(v || '').toLowerCase();

  const applyRulesToTransactions = (tx, activeRules) => {
    const rs = (activeRules || []).filter((r) => r && r.enabled !== false);
    if (!rs.length) return { next: tx, updated: 0 };

    let updated = 0;
    const next = tx.map((t) => {
      let changed = false;
      let category = t.category || '';
      let account = t.account || '';

      const vendor = normalizeText(t.vendor);
      const desc = normalizeText(t.description);

      for (const r of rs) {
        const q = normalizeText(r.query);
        if (!q) continue;
        const fieldVal = r.field === 'description' ? desc : vendor;
        if (!fieldVal.includes(q)) continue;

        if (r.category && !String(category).trim()) {
          category = r.category;
          changed = true;
        }
        if (r.account && !String(account).trim()) {
          account = r.account;
          changed = true;
        }
      }

      if (!changed) return t;
      updated += 1;
      return { ...t, category, account };
    });

    return { next, updated };
  };

  const [passphrase, setPassphrase] = useState('');
  const [connectionName, setConnectionName] = useState('');
  const [connectionUrl, setConnectionUrl] = useState('');
  const [connectionToken, setConnectionToken] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('');

  const [rawData, setRawData] = useState(null);
  const [mapping, setMapping] = useState({ date: null, amount: null, description: null, vendor: null, currency: null });
  const [mappingStatus, setMappingStatus] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('upload');

  const [rules, setRules] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.categorizationRules(userEmail));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [ruleField, setRuleField] = useState('vendor');
  const [ruleQuery, setRuleQuery] = useState('');
  const [ruleCategory, setRuleCategory] = useState('');
  const [ruleAccount, setRuleAccount] = useState('');
  const [rulesStatus, setRulesStatus] = useState('');

  const [coaMapping, setCoaMapping] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.coaMapping(userEmail));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [coaStatus, setCoaStatus] = useState('');

  const saveCoaMapping = (next) => {
    try {
      localStorage.setItem(STORAGE_KEYS.coaMapping(userEmail), JSON.stringify(next || []));
    } catch {
      // ignore
    }
  };

  const upsertCoaLine = (category, line) => {
    const cat = String(category || '').trim();
    const ln = String(line || '').trim();
    if (!cat) return;
    const next = [...coaMapping.filter((m) => String(m?.category || '').trim() !== cat), { category: cat, line: ln || 'Unmapped' }];
    setCoaMapping(next);
    saveCoaMapping(next);
  };

  const headers = rawData?.headers || [];
  const sampleRows = (rawData?.rows || []).slice(0, 30);

  const monthlyPL = useMemo(() => computeMonthlyPL(transactions), [transactions]);
  const monthlyByCategory = useMemo(() => computeMonthlyByCategory(transactions), [transactions]);
  const uncategorizedCount = useMemo(() => transactions.filter((t) => !(t.category && String(t.category).trim())).length, [transactions]);
  const fullPL = useMemo(() => computeFullPL(transactions, coaMapping), [transactions, coaMapping]);
  const workbookCategories = useMemo(() => {
    const set = new Set();
    for (const t of transactions) {
      const cat = (t.category && String(t.category).trim()) ? String(t.category).trim() : 'Uncategorized';
      set.add(cat);
    }
    return Array.from(set).sort();
  }, [transactions]);

  const loadSavedMapping = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.mappingProfile(userEmail));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const saveMapping = (m) => {
    try {
      localStorage.setItem(STORAGE_KEYS.mappingProfile(userEmail), JSON.stringify(m));
    } catch {
      // ignore
    }
  };

  const buildTransactions = (m) => {
    const rows = rawData?.rows || [];
    const tx = rows.map((r, idx) => {
      const dt = m.date ? tryParseDate(r[m.date]) : null;
      const amt = m.amount ? normalizeNumber(r[m.amount]) : null;
      const desc = m.description ? String(r[m.description] ?? '').trim() : '';
      const vendor = m.vendor ? String(r[m.vendor] ?? '').trim() : '';
      const ccy = m.currency ? String(r[m.currency] ?? '').trim() : '';
      return {
        id: idx + 1,
        date: dt,
        month: dt ? toMonthKey(dt) : 'Unknown',
        amount: typeof amt === 'number' ? amt : 0,
        description: desc,
        vendor,
        currency: ccy,
        category: '',
        account: '',
        notes: '',
        sourceRow: r,
      };
    });

    setTransactions(tx);
    return tx;
  };

  const handleFileUpload = (file, uploadedData) => {
    setRawData(uploadedData);
    const saved = loadSavedMapping();
    const guessed = guessMapping(uploadedData.headers || [], (uploadedData.rows || []).slice(0, 40));
    const next = {
      date: saved?.date || guessed.date,
      amount: saved?.amount || guessed.amount,
      description: saved?.description || guessed.description,
      vendor: saved?.vendor || guessed.vendor,
      currency: saved?.currency || guessed.currency,
    };
    setMapping(next);
    setMappingStatus('');
    setTransactions([]);
    setActiveTab('mapping');
  };

  const applyMapping = () => {
    if (!mapping.date || !mapping.amount) {
      setMappingStatus('Please map at least Date and Amount.');
      return;
    }
    saveMapping(mapping);
    const tx = buildTransactions(mapping);
    const applied = applyRulesToTransactions(tx, rules);
    if (applied.updated) setTransactions(applied.next);
    setMappingStatus('Mapping applied. Transactions loaded in-memory.');
    setActiveTab('workbook');
  };

  const setTxnField = (id, patch) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const saveConnection = async () => {
    setConnectionStatus('');
    try {
      const key = STORAGE_KEYS.connections(userEmail);
      const existing = (await decryptJsonFromLocalStorage(key, passphrase)) || { connections: [] };
      const next = {
        connections: [
          ...(existing.connections || []).filter((c) => c?.name !== connectionName),
          {
            name: connectionName,
            url: connectionUrl,
            token: connectionToken,
            savedAt: new Date().toISOString(),
          },
        ],
      };
      await encryptJsonToLocalStorage(key, next, passphrase);
      setConnectionToken('');
      setConnectionStatus('Saved encrypted connection settings locally.');
    } catch (e) {
      setConnectionStatus(e?.message || 'Failed to save connection');
    }
  };

  const clearConnections = () => {
    clearEncryptedLocalStorage(STORAGE_KEYS.connections(userEmail));
    setConnectionStatus('Cleared saved encrypted connections.');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <DollarIcon />
            Finance Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Zero data storage. Processing happens in your browser. Only connection settings and rules can be saved locally (encrypted).</p>
        </div>

        <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
          <Shield className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-slate-700 dark:text-slate-300">
            <strong className="text-blue-700 dark:text-blue-300">Privacy:</strong> uploaded data and computed outputs are not stored on the server. If you choose to save API settings, they are encrypted in your browser storage.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <TabsTrigger value="upload" className="font-semibold"><Upload className="w-4 h-4 mr-2" />Upload</TabsTrigger>
            <TabsTrigger value="mapping" className="font-semibold"><TableIcon className="w-4 h-4 mr-2" />Mapping</TabsTrigger>
            <TabsTrigger value="workbook" className="font-semibold"><TableIcon className="w-4 h-4 mr-2" />Workbook</TabsTrigger>
            <TabsTrigger value="rules" className="font-semibold"><RefreshCw className="w-4 h-4 mr-2" />Rules</TabsTrigger>
            <TabsTrigger value="coa" className="font-semibold"><TableIcon className="w-4 h-4 mr-2" />COA Mapping</TabsTrigger>
            <TabsTrigger value="pl" className="font-semibold"><RefreshCw className="w-4 h-4 mr-2" />Monthly P&L</TabsTrigger>
            <TabsTrigger value="connections" className="font-semibold"><Lock className="w-4 h-4 mr-2" />Connections</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" /> Upload Transactions
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Upload CSV/XLSX. We will infer your columns and let you confirm mapping.</p>
              <FileUploadZone
                onFileUpload={handleFileUpload}
                acceptedFormats={['.csv', '.xlsx', '.xls']}
              />
              {rawData?.rows?.length ? (
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Loaded</Badge>
                  <span className="text-sm text-slate-600 dark:text-slate-400">{rawData.rows.length} rows • {rawData.headers.length} columns</span>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="coa" className="space-y-4">
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">COA Mapping</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Map Categories to P&L statement lines (Revenue/COGS/Opex/etc.). This mapping is saved locally.</p>

              {!transactions.length ? (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription className="text-amber-700">Load transactions first (Upload → Mapping → Apply Mapping).</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCoaStatus('');
                        const next = workbookCategories.map((c) => {
                          const existing = coaMapping.find((m) => String(m?.category || '').trim() === c);
                          return existing || { category: c, line: c === 'Uncategorized' ? 'Unmapped' : 'Unmapped' };
                        });
                        setCoaMapping(next);
                        saveCoaMapping(next);
                        setCoaStatus('Initialized mapping from workbook categories.');
                      }}
                    >
                      Build From Workbook Categories
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCoaMapping([]);
                        saveCoaMapping([]);
                        setCoaStatus('Cleared COA mapping.');
                      }}
                      disabled={!coaMapping.length}
                    >
                      Clear Mapping
                    </Button>
                  </div>

                  {coaStatus ? (
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{coaStatus}</p>
                  ) : null}

                  <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 dark:bg-slate-800/80">
                          <TableHead className="font-semibold">Category</TableHead>
                          <TableHead className="font-semibold">P&L Line</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workbookCategories.map((cat) => {
                          const existing = coaMapping.find((m) => String(m?.category || '').trim() === cat);
                          const value = existing?.line || 'Unmapped';
                          return (
                            <TableRow key={cat}>
                              <TableCell className="font-medium">{cat}</TableCell>
                              <TableCell>
                                <Select value={value} onValueChange={(v) => upsertCoaLine(cat, v)}>
                                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                                    <SelectValue placeholder="Select line" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PL_LINES.map((l) => (
                                      <SelectItem key={l} value={l}>{l}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <Button variant="outline" onClick={() => setActiveTab('pl')}>View Full P&L</Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Rules</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Create rules to auto-fill Category/Account based on Vendor or Description.</p>

              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Field</label>
                  <Select value={ruleField} onValueChange={setRuleField}>
                    <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="description">Description</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contains</label>
                  <Input value={ruleQuery} onChange={(e) => setRuleQuery(e.target.value)} placeholder="e.g., amazon" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Set Category</label>
                  <Input value={ruleCategory} onChange={(e) => setRuleCategory(e.target.value)} placeholder="e.g., Office Supplies" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Set Account (optional)</label>
                  <Input value={ruleAccount} onChange={(e) => setRuleAccount(e.target.value)} placeholder="e.g., OPEX" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                </div>
              </div>

              <div className="mt-4 flex gap-3 flex-wrap">
                <Button
                  onClick={() => {
                    setRulesStatus('');
                    const q = String(ruleQuery || '').trim();
                    const cat = String(ruleCategory || '').trim();
                    const acc = String(ruleAccount || '').trim();
                    if (!q) {
                      setRulesStatus('Rule text is required.');
                      return;
                    }
                    if (!cat && !acc) {
                      setRulesStatus('Set Category and/or Account.');
                      return;
                    }
                    const next = [
                      ...rules,
                      {
                        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                        field: ruleField,
                        query: q,
                        category: cat || null,
                        account: acc || null,
                        enabled: true,
                      },
                    ];
                    setRules(next);
                    saveRules(next);
                    setRuleQuery('');
                    setRuleCategory('');
                    setRuleAccount('');
                    setRulesStatus('Saved.');
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Add Rule
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const applied = applyRulesToTransactions(transactions, rules);
                    setTransactions(applied.next);
                    setRulesStatus(`Applied rules to workbook. Updated ${applied.updated} rows.`);
                  }}
                  disabled={!transactions.length || !rules.length}
                >
                  Apply to Workbook
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setRules([]);
                    saveRules([]);
                    setRulesStatus('Cleared all rules.');
                  }}
                  disabled={!rules.length}
                >
                  Clear Rules
                </Button>
              </div>

              {rulesStatus ? (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{rulesStatus}</p>
              ) : null}

              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Saved Rules</p>
                {!rules.length ? (
                  <Alert className="bg-slate-50 border-slate-200">
                    <AlertDescription className="text-slate-700">No rules yet. Add a rule above.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 dark:bg-slate-800/80">
                          <TableHead className="font-semibold">Enabled</TableHead>
                          <TableHead className="font-semibold">Field</TableHead>
                          <TableHead className="font-semibold">Contains</TableHead>
                          <TableHead className="font-semibold">Category</TableHead>
                          <TableHead className="font-semibold">Account</TableHead>
                          <TableHead className="font-semibold">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rules.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={r.enabled !== false}
                                onChange={(e) => {
                                  const next = rules.map((x) => (x.id === r.id ? { ...x, enabled: e.target.checked } : x));
                                  setRules(next);
                                  saveRules(next);
                                }}
                              />
                            </TableCell>
                            <TableCell>{r.field === 'description' ? 'Description' : 'Vendor'}</TableCell>
                            <TableCell>{r.query}</TableCell>
                            <TableCell>{r.category || ''}</TableCell>
                            <TableCell>{r.account || ''}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const next = rules.filter((x) => x.id !== r.id);
                                  setRules(next);
                                  saveRules(next);
                                  setRulesStatus('Deleted rule.');
                                }}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="workbook" className="space-y-4">
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Workbook</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                This is your working spreadsheet. Review transactions, add Category/Account, and then open Monthly P&L.
              </p>

              {!transactions.length ? (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription className="text-amber-700">Upload and apply mapping first to load transactions.</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Loaded</Badge>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{transactions.length} transactions</span>
                    <Badge className={uncategorizedCount ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}>
                      Uncategorized: {uncategorizedCount}
                    </Badge>
                    <Button variant="outline" onClick={() => setActiveTab('rules')}>Rules</Button>
                    <Button variant="outline" onClick={() => setActiveTab('pl')}>Go to Monthly P&L</Button>
                  </div>

                  {uncategorizedCount ? (
                    <Alert className="mb-4 bg-amber-50 border-amber-200">
                      <AlertDescription className="text-amber-800">
                        Add Categories to reduce Uncategorized. Next step: we will add Rules + AI suggestions to categorize automatically.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 dark:bg-slate-800/80">
                          <TableHead className="font-semibold">Date</TableHead>
                          <TableHead className="font-semibold">Vendor</TableHead>
                          <TableHead className="font-semibold">Description</TableHead>
                          <TableHead className="font-semibold text-right">Amount</TableHead>
                          <TableHead className="font-semibold">Category</TableHead>
                          <TableHead className="font-semibold">Account</TableHead>
                          <TableHead className="font-semibold">Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.slice(0, 200).map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="whitespace-nowrap">
                              {t.date ? new Date(t.date).toLocaleDateString() : ''}
                            </TableCell>
                            <TableCell className="max-w-[180px] truncate">{t.vendor}</TableCell>
                            <TableCell className="max-w-[260px] truncate">{t.description}</TableCell>
                            <TableCell className="text-right font-mono">{Number(t.amount || 0).toFixed(2)}</TableCell>
                            <TableCell>
                              <Input
                                value={t.category || ''}
                                onChange={(e) => setTxnField(t.id, { category: e.target.value })}
                                placeholder="e.g., Travel"
                                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={t.account || ''}
                                onChange={(e) => setTxnField(t.id, { account: e.target.value })}
                                placeholder="e.g., OPEX"
                                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={t.notes || ''}
                                onChange={(e) => setTxnField(t.id, { notes: e.target.value })}
                                placeholder="Optional"
                                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {transactions.length > 200 ? (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Showing first 200 rows for now. Next iteration adds virtualization for large files.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="mapping" className="space-y-4">
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Column Mapping</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Confirm how your file maps to the canonical transactions schema. Only the mapping is saved (locally).</p>

              {!headers.length ? (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription className="text-amber-700">Upload a CSV/XLSX first.</AlertDescription>
                </Alert>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {CANON_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{f.label}</label>
                      <Select
                        value={mapping[f.key] || '__NONE__'}
                        onValueChange={(v) =>
                          setMapping((m) => ({ ...m, [f.key]: v === '__NONE__' ? null : v }))
                        }
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                          <SelectValue placeholder="Select a column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__NONE__">(Not mapped)</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <Button onClick={applyMapping} className="bg-blue-600 hover:bg-blue-700">Apply Mapping</Button>
                <Button variant="outline" onClick={() => { setTransactions([]); setMappingStatus(''); }}>Clear Output</Button>
              </div>

              {mappingStatus ? (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{mappingStatus}</p>
              ) : null}

              {sampleRows.length ? (
                <div className="mt-6">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preview (first rows)</p>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 dark:bg-slate-800/80">
                          {headers.slice(0, 6).map((h) => (
                            <TableHead key={h} className="font-semibold">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sampleRows.slice(0, 5).map((r, idx) => (
                          <TableRow key={idx}>
                            {headers.slice(0, 6).map((h) => (
                              <TableCell key={h}>{String(r[h] ?? '')}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="pl" className="space-y-4">
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Monthly P&L (MVP)</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Totals by month and category. Add Categories in Workbook to get a clean P&L.</p>

              {!transactions.length ? (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription className="text-amber-700">Apply mapping first to load transactions.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full P&L Statement</p>
                      <Button variant="outline" onClick={() => setActiveTab('coa')}>Edit COA Mapping</Button>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-100 dark:bg-slate-800/80">
                            <TableHead className="font-semibold">Month</TableHead>
                            <TableHead className="font-semibold text-right">Revenue</TableHead>
                            <TableHead className="font-semibold text-right">COGS</TableHead>
                            <TableHead className="font-semibold text-right">Opex</TableHead>
                            <TableHead className="font-semibold text-right">Other Income</TableHead>
                            <TableHead className="font-semibold text-right">Other Expense</TableHead>
                            <TableHead className="font-semibold text-right">Unmapped</TableHead>
                            <TableHead className="font-semibold text-right">Net Profit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fullPL.map((r) => (
                            <TableRow key={r.month}>
                              <TableCell>{r.month}</TableCell>
                              <TableCell className="text-right font-mono">{Number(r.revenue).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">{Number(r.cogs).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">{Number(r.opex).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">{Number(r.otherIncome).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">{Number(r.otherExpense).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">{Number(r.unmapped).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">{Number(r.netProfit).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Expenses are normalized to positive values when amounts are negative. Use COA Mapping to reduce Unmapped.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">By Category</p>
                      <Button variant="outline" onClick={() => setActiveTab('workbook')}>Edit in Workbook</Button>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-100 dark:bg-slate-800/80">
                            <TableHead className="font-semibold">Month</TableHead>
                            <TableHead className="font-semibold">Category</TableHead>
                            <TableHead className="font-semibold text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthlyByCategory.map((r, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{r.month}</TableCell>
                              <TableCell>{r.category}</TableCell>
                              <TableCell className="text-right font-mono">{Number(r.total).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Income vs Expense (sign-based)</p>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-100 dark:bg-slate-800/80">
                            <TableHead className="font-semibold">Month</TableHead>
                            <TableHead className="font-semibold">Bucket</TableHead>
                            <TableHead className="font-semibold text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthlyPL.map((r, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{r.month}</TableCell>
                              <TableCell>{r.bucket}</TableCell>
                              <TableCell className="text-right font-mono">{Number(r.total).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">API Connections (Encrypted local settings)</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Save API settings locally for convenience. No transaction data is stored. Some APIs require CORS/proxy support (roadmap).</p>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Passphrase</label>
                  <Input value={passphrase} onChange={(e) => setPassphrase(e.target.value)} type="password" placeholder="Enter passphrase to encrypt/decrypt" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Connection name</label>
                  <Input value={connectionName} onChange={(e) => setConnectionName(e.target.value)} placeholder="e.g., My ERP API" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Base URL</label>
                  <Input value={connectionUrl} onChange={(e) => setConnectionUrl(e.target.value)} placeholder="https://api.example.com" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Token</label>
                  <Input value={connectionToken} onChange={(e) => setConnectionToken(e.target.value)} type="password" placeholder="Bearer token / API key" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button onClick={saveConnection} className="bg-blue-600 hover:bg-blue-700" disabled={!passphrase || !connectionName || !connectionUrl || !connectionToken}>
                  <KeyRound className="w-4 h-4 mr-2" /> Save Encrypted
                </Button>
                <Button variant="outline" onClick={clearConnections}>
                  Clear Saved
                </Button>
              </div>

              {connectionStatus ? (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{connectionStatus}</p>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DollarIcon() {
  return <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white font-bold">$</span>;
}
