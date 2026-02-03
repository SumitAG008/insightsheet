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
  const [excelOp, setExcelOp] = useState('');
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

  const numericColumns = data.headers.filter(header => {
    return data.rows.some(row => {
      const val = row[header];
      return val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(val));
    });
  });

  const operations = [
    { id: 'add', name: 'Add (+)', icon: Plus, example: 'A + B' },
    { id: 'subtract', name: 'Subtract (-)', icon: Minus, example: 'A - B' },
    { id: 'multiply', name: 'Multiply (×)', icon: Multiply, example: 'A × B' },
    { id: 'divide', name: 'Divide (÷)', icon: Divide, example: 'A ÷ B' },
    { id: 'percentage', name: 'Percentage (%)', icon: Percent, example: '(A / B) × 100' }
  ];

  const sheetNames = data?.workbook?.sheetNames || [];
  const workbookSheets = data?.workbook?.sheets || {};
  const hasWorkbook = sheetNames.length > 0 && Object.keys(workbookSheets).length > 0;

  const activeSheetName = hasWorkbook
    ? (activeSheet || data?.workbook?.activeSheet || sheetNames[0])
    : '';

  const activeSheetTable = hasWorkbook ? workbookSheets[activeSheetName] : null;
  const activeHeaders = hasWorkbook && activeSheetTable?.headers?.length ? activeSheetTable.headers : (data.headers || []);
  const activeRows = hasWorkbook && activeSheetTable?.rows?.length ? activeSheetTable.rows : (data.rows || []);

  const allColumns = activeHeaders;

  const lookupSheetName = xLookupSheet || (sheetNames.find((n) => n !== activeSheetName) || sheetNames[0] || '');
  const lookupSheetTable = hasWorkbook ? workbookSheets[lookupSheetName] : null;
  const lookupColumns = lookupSheetTable?.headers || [];

  const joinSheetName = joinSheet || (sheetNames.find((n) => n !== activeSheetName) || sheetNames[0] || '');
  const joinSheetTable = hasWorkbook ? workbookSheets[joinSheetName] : null;
  const joinRightColumns = joinSheetTable?.headers || [];

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

    setExcelOp('');
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

    setExcelOp('');
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

    setExcelOp('');
    setSumifsSumCol('');
    setSumifsCriteriaCol1('');
    setSumifsCriteriaCol2('');
    setSumifsNewCol('');
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
        });
      } else {
        onDataUpdate({ headers: nextHeaders, rows: newRows });
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
        });
      } else {
        onDataUpdate({ headers: nextHeaders, rows: newRows });
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
                    <SelectItem key={s} value={s} className="text-white hover:bg-slate-700">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Excel Operations */}
          {hasWorkbook && sheetNames.length > 1 && (
            <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
              <label className="text-sm font-semibold text-slate-200 mb-2 block">Excel Operations</label>
              <Select value={excelOp} onValueChange={setExcelOp}>
                <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                  <SelectValue placeholder="Select an Excel operation" className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="xlookup" className="text-white hover:bg-slate-700">XLOOKUP (from another sheet)</SelectItem>
                  <SelectItem value="join" className="text-white hover:bg-slate-700">Join Sheets (bring columns)</SelectItem>
                  <SelectItem value="sumifs" className="text-white hover:bg-slate-700">SUMIFS (group totals)</SelectItem>
                </SelectContent>
              </Select>

              {excelOp === 'xlookup' && (
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
                    Apply XLOOKUP
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
            </div>
          )}

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

          {/* Operation Selection */}
          <div>
            <label className="text-sm font-semibold text-slate-200 mb-3 block">
              Operation
            </label>
            <div className="grid grid-cols-2 gap-2">
              {operations.map((op) => (
                <Button
                  key={op.id}
                  onClick={() => setOperation(op.id)}
                  variant="outline"
                  className={`justify-start h-auto py-3 ${
                    operation === op.id
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <op.icon className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">{op.name}</div>
                    <div className="text-xs opacity-75">{op.example}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Column 1 Selection */}
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

          {/* Column 2 Selection */}
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

          {/* New Column Name */}
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

          {/* Apply Button */}
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
  );
}