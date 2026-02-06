// components/dashboard/DataTransform.jsx - NL "Create column" + manual ops
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, Plus, Minus, Divide, X as Multiply, Percent, Calculator, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { backendApi } from '@/api/meldraClient';
import { applyTransform } from '@/lib/transformUtils';

export default function DataTransform({ data, onDataUpdate }) {
  const [operation, setOperation] = useState('add');
  const [column1, setColumn1] = useState('');
  const [column2, setColumn2] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [transforming, setTransforming] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const [activeSheet, setActiveSheet] = useState(() => data?.workbook?.activeSheet || (data?.workbook?.sheetNames || [])[0] || '');
  const [opCategory, setOpCategory] = useState('mathematics');
  const [excelOp, setExcelOp] = useState('add');
  const [mathOp, setMathOp] = useState('add');
  const [lookupOp, setLookupOp] = useState('');
  const [conditionalOp, setConditionalOp] = useState('');

  const [xLookupValueCol, setXLookupValueCol] = useState('');
  const [xLookupSheet, setXLookupSheet] = useState('');
  const [xLookupKeyCol, setXLookupKeyCol] = useState('');
  const [xLookupReturnCol, setXLookupReturnCol] = useState('');
  const [xLookupNewCol, setXLookupNewCol] = useState('');

  const [joinSheet, setJoinSheet] = useState('');
  const [joinLeftKeyCol, setJoinLeftKeyCol] = useState('');
  const [joinRightKeyCol, setJoinRightKeyCol] = useState('');
  const [joinBringColsCsv, setJoinBringColsCsv] = useState('');

  const [sumifsSumCol, setSumifsSumCol] = useState('');
  const [sumifsCriteriaCol1, setSumifsCriteriaCol1] = useState('');
  const [sumifsCriteriaCol2, setSumifsCriteriaCol2] = useState('');
  const [sumifsNewCol, setSumifsNewCol] = useState('');

  const [countifsCriteriaCol1, setCountifsCriteriaCol1] = useState('');
  const [countifsCriteriaCol2, setCountifsCriteriaCol2] = useState('');
  const [countifsNewCol, setCountifsNewCol] = useState('');

  const [ifCol, setIfCol] = useState('');
  const [ifOp, setIfOp] = useState('equals');
  const [ifValue, setIfValue] = useState('');
  const [thenType, setThenType] = useState('value');
  const [thenValue, setThenValue] = useState('');
  const [thenCol, setThenCol] = useState('');
  const [elseType, setElseType] = useState('value');
  const [elseValue, setElseValue] = useState('');
  const [elseCol, setElseCol] = useState('');
  const [ifNewCol, setIfNewCol] = useState('');

  const operations = [
    { id: 'add', name: 'Add (+)', icon: Plus, example: 'A + B' },
    { id: 'subtract', name: 'Subtract (-)', icon: Minus, example: 'A - B' },
    { id: 'multiply', name: 'Multiply (×)', icon: Multiply, example: 'A × B' },
    { id: 'divide', name: 'Divide (÷)', icon: Divide, example: 'A ÷ B' },
    { id: 'percentage', name: 'Percentage (%)', icon: Percent, example: '(A / B) × 100' }
  ];

  const opMeta = {
    add: { label: 'Add', meaning: 'Add Column 1 and Column 2 to create a new column.' },
    subtract: { label: 'Subtract', meaning: 'Subtract Column 2 from Column 1 to create a new column.' },
    multiply: { label: 'Multiply', meaning: 'Multiply Column 1 and Column 2 to create a new column.' },
    divide: { label: 'Divide', meaning: 'Divide Column 1 by Column 2 to create a new column.' },
    percentage: { label: 'Percentage', meaning: 'Create a new column as (Column 1 / Column 2) × 100.' },
    sumifs: { label: 'SUMIFS', meaning: 'Create a new column with totals per group (by one or two criteria columns).' },
    countifs: { label: 'COUNTIFS', meaning: 'Create a new column with counts per group (by one or two criteria columns).' },
    xlookup: { label: 'XLOOKUP', meaning: 'Bring a value from another sheet based on matching keys.' },
    vlookup: { label: 'VLOOKUP', meaning: 'Lookup in another sheet (same selections as XLOOKUP; no formulas).' },
    hlookup: { label: 'HLOOKUP', meaning: 'Lookup across a sheet/table (same selections as XLOOKUP; no formulas).' },
    join: { label: 'Join Sheets', meaning: 'Bring multiple columns from another sheet by matching a key column.' },
    ifelse: { label: 'IF / THEN / ELSE', meaning: 'Create a new column based on a condition (no formulas).' },
  };

  const mathOps = ['add', 'subtract', 'multiply', 'divide', 'percentage', 'sumifs', 'countifs'];
  const lookupOps = ['vlookup', 'hlookup', 'xlookup', 'join'];
  const conditionalOps = ['ifelse'];

  const sheetNames = data?.workbook?.sheetNames || [];
  const workbookSheets = data?.workbook?.sheets || {};
  const hasWorkbook = sheetNames.length > 0 && Object.keys(workbookSheets).length > 0;

  const activeSheetName = hasWorkbook
    ? (activeSheet || data?.workbook?.activeSheet || sheetNames[0])
    : '';

  const activeSheetTable = hasWorkbook ? workbookSheets[activeSheetName] : null;
  const activeHeaders = hasWorkbook && activeSheetTable?.headers?.length ? activeSheetTable.headers : (data.headers || []);
  const activeRows = hasWorkbook && activeSheetTable?.rows?.length ? activeSheetTable.rows : (data.rows || []);

  const allColumns = Array.from(new Set(activeHeaders || [])).filter(Boolean);

  const lookupSheetName = xLookupSheet || (sheetNames.find((n) => n !== activeSheetName) || sheetNames[0] || '');
  const lookupSheetTable = hasWorkbook ? workbookSheets[lookupSheetName] : null;
  const lookupColumns = lookupSheetTable?.headers || [];

  const joinSheetName = joinSheet || (sheetNames.find((n) => n !== activeSheetName) || sheetNames[0] || '');
  const joinSheetTable = hasWorkbook ? workbookSheets[joinSheetName] : null;
  const joinRightColumns = joinSheetTable?.headers || [];

  const numericColumns = (activeHeaders || []).filter((header) => {
    return (activeRows || []).some((row) => {
      const val = row?.[header];
      return val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(val));
    });
  });

  const handleSheetChange = (sheet) => {
    setActiveSheet(sheet);
    const tbl = workbookSheets?.[sheet];
    if (!tbl) return;

    const next = {
      ...data,
      headers: tbl.headers,
      rows: tbl.rows,
      raw: tbl.raw,
      workbook: {
        ...(data.workbook || {}),
        activeSheet: sheet,
      },
    };
    onDataUpdate(next);
  };

  const handleApplyXLookup = () => {
    if (!hasWorkbook) {
      alert('XLOOKUP requires an Excel workbook with multiple sheets.');
      return;
    }
    if (!xLookupValueCol || !lookupSheetName || !xLookupKeyCol || !xLookupReturnCol || !xLookupNewCol) {
      alert('Please select lookup columns and enter a new column name');
      return;
    }
    if ((activeHeaders || []).includes(xLookupNewCol)) {
      alert('A column with this name already exists');
      return;
    }

    const base = activeRows || [];
    const lookupRows = lookupSheetTable?.rows || [];

    const index = new Map();
    for (const r of lookupRows) {
      const k = r?.[xLookupKeyCol];
      if (k === null || k === undefined || k === '') continue;
      const key = String(k).trim();
      if (!index.has(key)) index.set(key, r?.[xLookupReturnCol]);
    }

    const newRows = base.map((r) => {
      const v = r?.[xLookupValueCol];
      const key = v === null || v === undefined ? '' : String(v).trim();
      const found = index.has(key) ? index.get(key) : '';
      return { ...r, [xLookupNewCol]: found ?? '' };
    });

    const nextHeaders = [...(activeHeaders || []), xLookupNewCol];
    const nextWorkbook = {
      ...(data.workbook || {}),
      activeSheet: activeSheetName,
      sheets: {
        ...(data.workbook?.sheets || {}),
        [activeSheetName]: {
          ...(data.workbook?.sheets?.[activeSheetName] || {}),
          headers: nextHeaders,
          rows: newRows,
        },
      },
    };

    onDataUpdate({
      ...data,
      headers: nextHeaders,
      rows: newRows,
      workbook: nextWorkbook,
    });

    setXLookupValueCol('');
    setXLookupSheet('');
    setXLookupKeyCol('');
    setXLookupReturnCol('');
    setXLookupNewCol('');
  };

  const handleApplyJoin = () => {
    if (!hasWorkbook) {
      alert('Join requires an Excel workbook with multiple sheets.');
      return;
    }
    if (!joinLeftKeyCol || !joinSheetName || !joinRightKeyCol || !joinBringColsCsv.trim()) {
      alert('Please select join keys and columns to bring over');
      return;
    }

    const bringCols = joinBringColsCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (bringCols.length === 0) {
      alert('Please enter at least 1 column to bring over');
      return;
    }

    const missing = bringCols.filter((c) => !(joinRightColumns || []).includes(c));
    if (missing.length) {
      alert(`These columns were not found in "${joinSheetName}": ${missing.join(', ')}`);
      return;
    }

    const collisions = bringCols.filter((c) => (activeHeaders || []).includes(c));
    if (collisions.length) {
      alert(`These columns already exist in the active sheet: ${collisions.join(', ')}`);
      return;
    }

    const rightRows = joinSheetTable?.rows || [];
    const index = new Map();
    for (const r of rightRows) {
      const k = r?.[joinRightKeyCol];
      if (k === null || k === undefined || k === '') continue;
      const key = String(k).trim();
      if (!index.has(key)) index.set(key, r);
    }

    const base = activeRows || [];
    const newRows = base.map((r) => {
      const lk = r?.[joinLeftKeyCol];
      const key = lk === null || lk === undefined ? '' : String(lk).trim();
      const match = index.get(key);
      const additions = {};
      for (const c of bringCols) {
        additions[c] = match ? (match?.[c] ?? '') : '';
      }
      return { ...r, ...additions };
    });

    const nextHeaders = [...(activeHeaders || []), ...bringCols];
    const nextWorkbook = {
      ...(data.workbook || {}),
      activeSheet: activeSheetName,
      sheets: {
        ...(data.workbook?.sheets || {}),
        [activeSheetName]: {
          ...(data.workbook?.sheets?.[activeSheetName] || {}),
          headers: nextHeaders,
          rows: newRows,
        },
      },
    };

    onDataUpdate({
      ...data,
      headers: nextHeaders,
      rows: newRows,
      workbook: nextWorkbook,
    });

    setJoinSheet('');
    setJoinLeftKeyCol('');
    setJoinRightKeyCol('');
    setJoinBringColsCsv('');
  };

  const handleApplySumifs = () => {
    if (!hasWorkbook) {
      alert('SUMIFS requires an Excel workbook.');
      return;
    }
    if (!sumifsSumCol || !sumifsCriteriaCol1 || !sumifsNewCol) {
      alert('Please select a Sum column, at least one Criteria column, and enter a new column name');
      return;
    }
    if ((activeHeaders || []).includes(sumifsNewCol)) {
      alert('A column with this name already exists');
      return;
    }

    const rows = activeRows || [];
    const makeKey = (r) => {
      const v1 = r?.[sumifsCriteriaCol1];
      const k1 = v1 === null || v1 === undefined ? '' : String(v1).trim();
      if (!sumifsCriteriaCol2) return k1;
      const v2 = r?.[sumifsCriteriaCol2];
      const k2 = v2 === null || v2 === undefined ? '' : String(v2).trim();
      return `${k1}||${k2}`;
    };

    const sums = new Map();
    for (const r of rows) {
      const key = makeKey(r);
      const raw = r?.[sumifsSumCol];
      const num = raw === null || raw === undefined || raw === '' ? 0 : Number(raw);
      const add = Number.isFinite(num) ? num : 0;
      sums.set(key, (sums.get(key) || 0) + add);
    }

    const newRows = rows.map((r) => {
      const key = makeKey(r);
      const total = sums.get(key) || 0;
      return { ...r, [sumifsNewCol]: total };
    });

    const nextHeaders = [...(activeHeaders || []), sumifsNewCol];
    onDataUpdate({
      ...data,
      headers: nextHeaders,
      rows: newRows,
      workbook: {
        ...(data.workbook || {}),
        activeSheet: activeSheetName,
        sheets: {
          ...(data.workbook?.sheets || {}),
          [activeSheetName]: {
            ...(data.workbook?.sheets?.[activeSheetName] || {}),
            headers: nextHeaders,
            rows: newRows,
          },
        },
      },
    });

    setSumifsSumCol('');
    setSumifsCriteriaCol1('');
    setSumifsCriteriaCol2('');
    setSumifsNewCol('');
  };

  const handleApplyCountifs = () => {
    if (!hasWorkbook) {
      alert('COUNTIFS requires an Excel workbook.');
      return;
    }
    if (!countifsCriteriaCol1 || !countifsNewCol) {
      alert('Please select at least one Criteria column and enter a new column name');
      return;
    }
    if ((activeHeaders || []).includes(countifsNewCol)) {
      alert('A column with this name already exists');
      return;
    }

    const rows = activeRows || [];
    const makeKey = (r) => {
      const v1 = r?.[countifsCriteriaCol1];
      const k1 = v1 === null || v1 === undefined ? '' : String(v1).trim();
      if (!countifsCriteriaCol2) return k1;
      const v2 = r?.[countifsCriteriaCol2];
      const k2 = v2 === null || v2 === undefined ? '' : String(v2).trim();
      return `${k1}||${k2}`;
    };

    const counts = new Map();
    for (const r of rows) {
      const key = makeKey(r);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const newRows = rows.map((r) => {
      const key = makeKey(r);
      const total = counts.get(key) || 0;
      return { ...r, [countifsNewCol]: total };
    });

    const nextHeaders = [...(activeHeaders || []), countifsNewCol];
    onDataUpdate({
      ...data,
      headers: nextHeaders,
      rows: newRows,
      workbook: {
        ...(data.workbook || {}),
        activeSheet: activeSheetName,
        sheets: {
          ...(data.workbook?.sheets || {}),
          [activeSheetName]: {
            ...(data.workbook?.sheets?.[activeSheetName] || {}),
            headers: nextHeaders,
            rows: newRows,
          },
        },
      },
    });

    setCountifsCriteriaCol1('');
    setCountifsCriteriaCol2('');
    setCountifsNewCol('');
  };

  const handleApplyIfElse = () => {
    if (!ifCol || !ifNewCol) {
      alert('Please select an IF column and enter a new column name');
      return;
    }
    if ((activeHeaders || []).includes(ifNewCol)) {
      alert('A column with this name already exists');
      return;
    }

    const compare = (cell) => {
      const aRaw = cell === null || cell === undefined ? '' : String(cell);
      const bRaw = ifValue === null || ifValue === undefined ? '' : String(ifValue);
      const aNum = Number(aRaw);
      const bNum = Number(bRaw);
      const aIsNum = aRaw !== '' && Number.isFinite(aNum);
      const bIsNum = bRaw !== '' && Number.isFinite(bNum);
      const a = aIsNum && bIsNum ? aNum : aRaw;
      const b = aIsNum && bIsNum ? bNum : bRaw;

      switch (ifOp) {
        case 'equals':
          return String(a).trim() === String(b).trim();
        case 'not_equals':
          return String(a).trim() !== String(b).trim();
        case 'greater':
          return Number(a) > Number(b);
        case 'greater_equal':
          return Number(a) >= Number(b);
        case 'less':
          return Number(a) < Number(b);
        case 'less_equal':
          return Number(a) <= Number(b);
        case 'contains':
          return String(aRaw).toLowerCase().includes(String(bRaw).toLowerCase());
        case 'is_blank':
          return aRaw === '';
        case 'is_not_blank':
          return aRaw !== '';
        default:
          return false;
      }
    };

    const rows = activeRows || [];
    const newRows = rows.map((r) => {
      const ok = compare(r?.[ifCol]);
      const thenOut = thenType === 'column' ? (r?.[thenCol] ?? '') : (thenValue ?? '');
      const elseOut = elseType === 'column' ? (r?.[elseCol] ?? '') : (elseValue ?? '');
      return { ...r, [ifNewCol]: ok ? thenOut : elseOut };
    });

    const nextHeaders = [...(activeHeaders || []), ifNewCol];
    if (hasWorkbook && activeSheetName) {
      onDataUpdate({
        ...data,
        headers: nextHeaders,
        rows: newRows,
        workbook: {
          ...(data.workbook || {}),
          activeSheet: activeSheetName,
          sheets: {
            ...(data.workbook?.sheets || {}),
            [activeSheetName]: {
              ...(data.workbook?.sheets?.[activeSheetName] || {}),
              headers: nextHeaders,
              rows: newRows,
            },
          },
        },
      });
    } else {
      onDataUpdate({ headers: nextHeaders, rows: newRows });
    }

    setIfCol('');
    setIfOp('equals');
    setIfValue('');
    setThenType('value');
    setThenValue('');
    setThenCol('');
    setElseType('value');
    setElseValue('');
    setElseCol('');
    setIfNewCol('');
    setExcelOp('ifelse');
  };

  const handleAiTransform = async () => {
    if (!aiInstruction.trim()) return;
    setAiError('');
    setAiLoading(true);
    try {
      const columns = (activeHeaders || []).map((h) => ({ name: h }));
      const r = await backendApi.llm.transform(aiInstruction, columns, (activeRows || []).slice(0, 5));
      const name = (r.new_column_name || 'new_column').replace(/\s+/g, '_');
      if (!(activeHeaders || []).includes(r.col_a) || !(activeHeaders || []).includes(r.col_b)) {
        setAiError('AI chose columns that don\'t exist. Try: "Profit as Revenue minus Cost"');
        return;
      }
      if ((activeHeaders || []).includes(name)) {
        setAiError('Column "' + name + '" already exists.');
        return;
      }
      const newRows = applyTransform(activeRows || [], r.col_a, r.col_b, r.op || 'add', name, r.separator);
      const nextHeaders = [...(activeHeaders || []), name];
      if (hasWorkbook && activeSheetName) {
        onDataUpdate({
          ...data,
          headers: nextHeaders,
          rows: newRows,
          workbook: {
            ...(data.workbook || {}),
            activeSheet: activeSheetName,
            sheets: {
              ...(data.workbook?.sheets || {}),
              [activeSheetName]: {
                ...(data.workbook?.sheets?.[activeSheetName] || {}),
                headers: nextHeaders,
                rows: newRows,
              },
            },
          },
        }, {
          title: 'Created column (AI)',
          detail: name,
          badge: 'Transform',
        });
      } else {
        onDataUpdate({ headers: nextHeaders, rows: newRows }, {
          title: 'Created column (AI)',
          detail: name,
          badge: 'Transform',
        });
      }
      setAiInstruction('');
    } catch (e) {
      setAiError(e.message || 'AI transform failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleTransform = () => {
    if (!column1 || !column2 || !newColumnName) {
      alert('Please select both columns and enter a name for the new column');
      return;
    }
    if ((activeHeaders || []).includes(newColumnName)) {
      alert('A column with this name already exists');
      return;
    }
    setTransforming(true);
    setTimeout(() => {
      const newRows = applyTransform(activeRows || [], column1, column2, operation, newColumnName);
      const nextHeaders = [...(activeHeaders || []), newColumnName];
      if (hasWorkbook && activeSheetName) {
        onDataUpdate({
          ...data,
          headers: nextHeaders,
          rows: newRows,
          workbook: {
            ...(data.workbook || {}),
            activeSheet: activeSheetName,
            sheets: {
              ...(data.workbook?.sheets || {}),
              [activeSheetName]: {
                ...(data.workbook?.sheets?.[activeSheetName] || {}),
                headers: nextHeaders,
                rows: newRows,
              },
            },
          },
        }, {
          title: 'Created column',
          detail: newColumnName,
          badge: 'Transform',
        });
      } else {
        onDataUpdate({ headers: nextHeaders, rows: newRows }, {
          title: 'Created column',
          detail: newColumnName,
          badge: 'Transform',
        });
      }
      setColumn1(''); setColumn2(''); setNewColumnName('');
      setTransforming(false);
    }, 500);
  };

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-2xl blur-xl" />

      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-blue-200 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-400" />
            Data Transform
          </h2>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            Create Columns
          </Badge>
        </div>

        <div className="space-y-4">

          {/* Sheet Selection (Excel Workbooks) */}
          {hasWorkbook && sheetNames.length > 1 && (
            <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
              <label className="text-sm font-semibold text-slate-200 mb-2 block">Active Sheet</label>
              <Select value={activeSheetName} onValueChange={handleSheetChange}>
                <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                  <SelectValue placeholder="Select a sheet" className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {sheetNames.map((s) => (
                    <SelectItem key={s} value={s} className="text-white hover:bg-slate-700">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Operation */}
          <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
            <label className="text-sm font-semibold text-slate-200 mb-2 block">Operation</label>

            {(!hasWorkbook || sheetNames.length < 2) && (
              <div className="mb-3 p-3 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs">
                Lookups (VLOOKUP/HLOOKUP/XLOOKUP/Join) require an Excel workbook with 2+ sheets.
              </div>
            )}

            {(activeRows?.length || 0) > 20000 && (
              <div className="mb-3 p-3 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs">
                This sheet is large ({activeRows.length.toLocaleString()} rows). 
                Some operations may be slow in the browser. 
                If you see delays, reduce rows or split the sheet.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Mathematics</label>
                <Select value={mathOp} onValueChange={(v) => {
                  setMathOp(v);
                  setLookupOp('');
                  setConditionalOp('');
                  setOpCategory('mathematics');
                  setExcelOp(v);
                  setOperation(v);
                }}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                    <SelectValue placeholder="Select math" className="text-white" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {mathOps.map((k) => (
                      <SelectItem key={k} value={k} className="text-white hover:bg-slate-700">{opMeta[k]?.label || k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Lookups</label>
                <Select value={lookupOp} onValueChange={(v) => {
                  setLookupOp(v);
                  setConditionalOp('');
                  setOpCategory('lookups');
                  setExcelOp(v);
                }}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                    <SelectValue placeholder={hasWorkbook && sheetNames.length > 1 ? 'Select lookup' : 'Upload Excel with 2+ sheets'} className="text-white" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {(hasWorkbook && sheetNames.length > 1 ? lookupOps : []).map((k) => (
                      <SelectItem key={k} value={k} className="text-white hover:bg-slate-700">{opMeta[k]?.label || k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Conditional</label>
                <Select value={conditionalOp} onValueChange={(v) => {
                  setConditionalOp(v);
                  setLookupOp('');
                  setOpCategory('conditional');
                  setExcelOp(v);
                }}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                    <SelectValue placeholder="Select conditional" className="text-white" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {conditionalOps.map((k) => (
                      <SelectItem key={k} value={k} className="text-white hover:bg-slate-700">{opMeta[k]?.label || k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-2 text-xs text-slate-400">{opMeta[excelOp]?.meaning || ''}</div>

            {(excelOp === 'xlookup' || excelOp === 'vlookup' || excelOp === 'hlookup') && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Lookup Value Column (in active sheet)</label>
                  <Select value={xLookupValueCol} onValueChange={setXLookupValueCol}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                      <SelectValue placeholder="Select column" className="text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {allColumns.map((c) => (
                        <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Lookup Sheet</label>
                  <Select value={lookupSheetName} onValueChange={setXLookupSheet}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                      <SelectValue placeholder="Select sheet" className="text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {sheetNames.filter((s) => s !== activeSheetName).map((s) => (
                        <SelectItem key={s} value={s} className="text-white hover:bg-slate-700">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Lookup Key Column (in lookup sheet)</label>
                  <Select value={xLookupKeyCol} onValueChange={setXLookupKeyCol}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                      <SelectValue placeholder="Select key" className="text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {lookupColumns.map((c) => (
                        <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Return Column (in lookup sheet)</label>
                  <Select value={xLookupReturnCol} onValueChange={setXLookupReturnCol}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                      <SelectValue placeholder="Select return" className="text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {lookupColumns.map((c) => (
                        <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">New Column Name</label>
                  <Input
                    value={xLookupNewCol}
                    onChange={(e) => setXLookupNewCol(e.target.value)}
                    placeholder="e.g. CustomerName"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>

                <Button
                  onClick={handleApplyXLookup}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold"
                  disabled={!xLookupValueCol || !lookupSheetName || !xLookupKeyCol || !xLookupReturnCol || !xLookupNewCol}
                >
                  Apply Lookup
                </Button>
              </div>
            )}

            {excelOp === 'join' && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Active Sheet Key Column</label>
                  <Select value={joinLeftKeyCol} onValueChange={setJoinLeftKeyCol}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                      <SelectValue placeholder="Select key" className="text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {allColumns.map((c) => (
                        <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Join Sheet</label>
                  <Select value={joinSheetName} onValueChange={setJoinSheet}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                      <SelectValue placeholder="Select sheet" className="text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {sheetNames.filter((s) => s !== activeSheetName).map((s) => (
                        <SelectItem key={s} value={s} className="text-white hover:bg-slate-700">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Join Sheet Key Column</label>
                  <Select value={joinRightKeyCol} onValueChange={setJoinRightKeyCol}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                      <SelectValue placeholder="Select key" className="text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {joinRightColumns.map((c) => (
                        <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Columns to Bring Over (comma-separated)</label>
                  <Input
                    value={joinBringColsCsv}
                    onChange={(e) => setJoinBringColsCsv(e.target.value)}
                    placeholder="e.g. CustomerName, Segment, Region"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>

                <Button
                  onClick={handleApplyJoin}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold"
                  disabled={!joinLeftKeyCol || !joinSheetName || !joinRightKeyCol || !joinBringColsCsv.trim()}
                >
                  Apply Join
                </Button>
              </div>
            )}

            {excelOp === 'sumifs' && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Sum Column (numeric)</label>
                  <Select value={sumifsSumCol} onValueChange={setSumifsSumCol}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                      <SelectValue placeholder="Select sum column" className="text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {allColumns.map((c) => (
                        <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Criteria Column 1</label>
                    <Select value={sumifsCriteriaCol1} onValueChange={setSumifsCriteriaCol1}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                        <SelectValue placeholder="Select criteria" className="text-white" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {allColumns.map((c) => (
                          <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Criteria Column 2 (optional)</label>
                    <Select value={sumifsCriteriaCol2} onValueChange={setSumifsCriteriaCol2}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                        <SelectValue placeholder="(optional)" className="text-white" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {allColumns.map((c) => (
                          <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">New Column Name</label>
                  <Input
                    value={sumifsNewCol}
                    onChange={(e) => setSumifsNewCol(e.target.value)}
                    placeholder="e.g. TotalSalesByCustomer"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>

                <Button
                  onClick={handleApplySumifs}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold"
                  disabled={!sumifsSumCol || !sumifsCriteriaCol1 || !sumifsNewCol}
                >
                  Apply SUMIFS
                </Button>
              </div>
            )}

            {excelOp === 'countifs' && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Criteria Column 1</label>
                    <Select value={countifsCriteriaCol1} onValueChange={setCountifsCriteriaCol1}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                        <SelectValue placeholder="Select criteria" className="text-white" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {allColumns.map((c) => (
                          <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Criteria Column 2 (optional)</label>
                    <Select value={countifsCriteriaCol2} onValueChange={setCountifsCriteriaCol2}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                        <SelectValue placeholder="(optional)" className="text-white" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {allColumns.map((c) => (
                          <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">New Column Name</label>
                  <Input
                    value={countifsNewCol}
                    onChange={(e) => setCountifsNewCol(e.target.value)}
                    placeholder="e.g. RowsInGroup"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>

                <Button
                  onClick={handleApplyCountifs}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold"
                  disabled={!countifsCriteriaCol1 || !countifsNewCol}
                >
                  Apply COUNTIFS
                </Button>
              </div>
            )}

            {excelOp === 'ifelse' && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">IF column</label>
                  <Select value={ifCol} onValueChange={setIfCol}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                      <SelectValue placeholder="Select column" className="text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {allColumns.map((c) => (
                        <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Condition</label>
                    <Select value={ifOp} onValueChange={setIfOp}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                        <SelectValue placeholder="Select condition" className="text-white" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="equals" className="text-white hover:bg-slate-700">Equals</SelectItem>
                        <SelectItem value="not_equals" className="text-white hover:bg-slate-700">Not equals</SelectItem>
                        <SelectItem value="greater" className="text-white hover:bg-slate-700">Greater than</SelectItem>
                        <SelectItem value="greater_equal" className="text-white hover:bg-slate-700">Greater or equal</SelectItem>
                        <SelectItem value="less" className="text-white hover:bg-slate-700">Less than</SelectItem>
                        <SelectItem value="less_equal" className="text-white hover:bg-slate-700">Less or equal</SelectItem>
                        <SelectItem value="contains" className="text-white hover:bg-slate-700">Contains</SelectItem>
                        <SelectItem value="is_blank" className="text-white hover:bg-slate-700">Is blank</SelectItem>
                        <SelectItem value="is_not_blank" className="text-white hover:bg-slate-700">Is not blank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Value</label>
                    <Input
                      value={ifValue}
                      onChange={(e) => setIfValue(e.target.value)}
                      placeholder="e.g. Approved"
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                      disabled={ifOp === 'is_blank' || ifOp === 'is_not_blank'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">THEN</label>
                    <Select value={thenType} onValueChange={setThenType}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                        <SelectValue placeholder="Choose" className="text-white" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="value" className="text-white hover:bg-slate-700">Use a fixed value</SelectItem>
                        <SelectItem value="column" className="text-white hover:bg-slate-700">Use a column value</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {thenType === 'value' ? (
                      <>
                        <label className="text-xs font-semibold text-slate-300 mb-1 block">THEN value</label>
                        <Input
                          value={thenValue}
                          onChange={(e) => setThenValue(e.target.value)}
                          placeholder="e.g. Yes"
                          className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                        />
                      </>
                    ) : (
                      <>
                        <label className="text-xs font-semibold text-slate-300 mb-1 block">THEN column</label>
                        <Select value={thenCol} onValueChange={setThenCol}>
                          <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                            <SelectValue placeholder="Select column" className="text-white" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {allColumns.map((c) => (
                              <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">ELSE</label>
                    <Select value={elseType} onValueChange={setElseType}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                        <SelectValue placeholder="Choose" className="text-white" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="value" className="text-white hover:bg-slate-700">Use a fixed value</SelectItem>
                        <SelectItem value="column" className="text-white hover:bg-slate-700">Use a column value</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {elseType === 'value' ? (
                      <>
                        <label className="text-xs font-semibold text-slate-300 mb-1 block">ELSE value</label>
                        <Input
                          value={elseValue}
                          onChange={(e) => setElseValue(e.target.value)}
                          placeholder="e.g. No"
                          className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                        />
                      </>
                    ) : (
                      <>
                        <label className="text-xs font-semibold text-slate-300 mb-1 block">ELSE column</label>
                        <Select value={elseCol} onValueChange={setElseCol}>
                          <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                            <SelectValue placeholder="Select column" className="text-white" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {allColumns.map((c) => (
                              <SelectItem key={c} value={c} className="text-white hover:bg-slate-700">{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">New Column Name</label>
                  <Input
                    value={ifNewCol}
                    onChange={(e) => setIfNewCol(e.target.value)}
                    placeholder="e.g. IsApproved"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>

                <Button
                  onClick={handleApplyIfElse}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold"
                  disabled={!ifCol || !ifNewCol || (thenType === 'column' && !thenCol) || (elseType === 'column' && !elseCol)}
                >
                  Apply IF / THEN / ELSE
                </Button>
              </div>
            )}
          </div>

          {/* Create with AI */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <label className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Create with AI
            </label>

            <p className="text-xs text-slate-400 mb-2">e.g. &quot;Profit as Revenue minus Cost&quot;, &quot;FullName as First plus Last&quot;</p>
            <div className="flex gap-2">
              <Input
                placeholder="Describe the new column..."
                value={aiInstruction}
                onChange={(e) => { setAiInstruction(e.target.value); setAiError(''); }}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 flex-1"
                disabled={aiLoading}
              />
              <Button
                onClick={handleAiTransform}
                disabled={aiLoading || !aiInstruction.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              >
                {aiLoading ? <span className="animate-spin">⏳</span> : <Sparkles className="w-4 h-4 mr-1" />}
                Generate
              </Button>
            </div>
            {aiError && <p className="text-red-400 text-sm mt-1">{aiError}</p>}
          </div>

          {/* Mathematics Inputs */}
          {opCategory === 'mathematics' && !['sumifs', 'countifs'].includes(excelOp) && (
            <div>
              <div>
                <label className="text-sm font-semibold text-slate-200 mb-2 block">
                  Column 1
                </label>
                <Select value={column1} onValueChange={setColumn1}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                    <SelectValue placeholder="Select first column" className="text-white" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {numericColumns.map(col => (
                      <SelectItem key={col} value={col} className="text-white hover:bg-slate-700">
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-200 mb-2 block">
                  Column 2
                </label>
                <Select value={column2} onValueChange={setColumn2}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                    <SelectValue placeholder="Select second column" className="text-white" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {numericColumns.map(col => (
                      <SelectItem key={col} value={col} className="text-white hover:bg-slate-700">
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-200 mb-2 block">
                  New Column Name
                </label>
                <Input
                  placeholder="Enter name for new column"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              <Button
                onClick={handleTransform}
                disabled={transforming || !column1 || !column2 || !newColumnName}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold"
              >
                {transforming ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Apply Transformation
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Preview */}
          {column1 && column2 && operation && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300 font-semibold mb-1">Preview:</p>
              <p className="text-slate-200">
                <span className="text-blue-300">{newColumnName || 'NewColumn'}</span> = 
                <span className="text-emerald-300"> {column1}</span> 
                <span className="text-slate-400"> {operations.find(o => o.id === operation)?.name.split(' ')[0]}</span> 
                <span className="text-emerald-300"> {column2}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}