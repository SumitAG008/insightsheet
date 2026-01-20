// components/dashboard/CleaningTools.jsx - ML-aware cleaning (outliers, fill missing)
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, Trash, Type, CheckCircle, TrendingDown, Fill } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dedupe, trim, inferTypes, removeOutliers, fillMissing } from '@/lib/dataCleaning';

const FILL_STRATEGIES = [
  { id: 'mean', label: 'Mean' },
  { id: 'median', label: 'Median' },
  { id: 'mode', label: 'Mode' },
  { id: 'forward', label: 'Forward fill' },
  { id: 'backward', label: 'Backward fill' },
];

export default function CleaningTools({ data, onDataUpdate, onCleanedCount }) {
  const [cleaning, setCleaning] = useState(false);
  const [lastAction, setLastAction] = useState('');
  const [outlierCol, setOutlierCol] = useState('');
  const [fillCol, setFillCol] = useState('');
  const [fillStrategy, setFillStrategy] = useState('median');

  const numericColumns = useMemo(() => {
    return (data.headers || []).filter((h) =>
      (data.rows || []).some((r) => {
        const v = r[h];
        return v != null && v !== '' && !isNaN(parseFloat(v));
      })
    );
  }, [data.headers, data.rows]);

  const run = (fn, delay = 600) => {
    setCleaning(true);
    setLastAction('');
    setTimeout(() => {
      fn();
      setCleaning(false);
    }, delay);
  };

  const removeDuplicates = () => run(() => {
    const { rows, removed } = dedupe(data.rows);
    onDataUpdate({ ...data, rows });
    if (onCleanedCount) onCleanedCount(removed);
    setLastAction(`Removed ${removed} duplicate rows`);
  }, 600);

  const trimWhitespace = () => run(() => {
    onDataUpdate({ ...data, rows: trim(data.rows) });
    setLastAction('Trimmed whitespace from all cells');
  }, 400);

  const doInferTypes = () => run(() => {
    onDataUpdate({ ...data, rows: inferTypes(data.rows) });
    setLastAction('Converted data types automatically');
  }, 500);

  const cleanAll = () => run(() => {
    const { rows, removed } = dedupe(trim(data.rows));
    const typed = inferTypes(rows);
    onDataUpdate({ ...data, rows: typed });
    if (onCleanedCount) onCleanedCount(removed);
    setLastAction(`Complete cleanup: ${removed} duplicates removed, types inferred, whitespace trimmed`);
  }, 800);

  const doRemoveOutliers = () => {
    if (!outlierCol) { setLastAction('Select a numeric column first'); return; }
    run(() => {
      const { rows, removed } = removeOutliers(data.rows, outlierCol, { threshold: 1.5 });
      onDataUpdate({ ...data, rows });
      if (onCleanedCount) onCleanedCount(removed);
      setLastAction(removed > 0 ? `Removed ${removed} outliers from ${outlierCol}` : `No outliers in ${outlierCol}`);
    }, 500);
  };

  const doFillMissing = () => {
    if (!fillCol) { setLastAction('Select a column first'); return; }
    run(() => {
      const rows = fillMissing(data.rows, fillCol, fillStrategy);
      onDataUpdate({ ...data, rows });
      setLastAction(`Filled missing in ${fillCol} with ${fillStrategy}`);
    }, 500);
  };

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-orange-600/10 rounded-2xl blur-xl" />
      
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-amber-400" />
            Smart Cleaning Tools
          </h2>
          
          {lastAction && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              {lastAction}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            onClick={removeDuplicates}
            disabled={cleaning}
            className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold"
          >
            <Trash className="w-4 h-4 mr-2" />
            Remove Dupes
          </Button>
          <Button
            onClick={trimWhitespace}
            disabled={cleaning}
            className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
          >
            <Type className="w-4 h-4 mr-2" />
            Trim Space
          </Button>
          <Button
            onClick={doInferTypes}
            disabled={cleaning}
            className="bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold"
          >
            <Type className="w-4 h-4 mr-2" />
            Fix Types
          </Button>
          <Button
            onClick={cleanAll}
            disabled={cleaning}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Clean All
          </Button>
        </div>

        {/* ML: Outliers + Fill missing */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <p className="text-sm font-semibold text-amber-300/90 mb-2">ML-powered</p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={outlierCol} onValueChange={setOutlierCol}>
              <SelectTrigger className="w-40 h-9 bg-slate-800/50 border-slate-600 text-white text-sm">
                <SelectValue placeholder="Column (outliers)" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {numericColumns.map((c) => (
                  <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={doRemoveOutliers}
              disabled={cleaning || !outlierCol}
              size="sm"
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              <TrendingDown className="w-4 h-4 mr-1" />
              Remove outliers
            </Button>
            <Select value={fillCol} onValueChange={setFillCol} className="ml-2">
              <SelectTrigger className="w-40 h-9 bg-slate-800/50 border-slate-600 text-white text-sm">
                <SelectValue placeholder="Column (fill)" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {(data.headers || []).map((c) => (
                  <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fillStrategy} onValueChange={setFillStrategy}>
              <SelectTrigger className="w-36 h-9 bg-slate-800/50 border-slate-600 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {FILL_STRATEGIES.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-white">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={doFillMissing}
              disabled={cleaning || !fillCol}
              size="sm"
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              <Fill className="w-4 h-4 mr-1" />
              Fill missing
            </Button>
          </div>
        </div>

        {cleaning && (
          <div className="mt-4 flex items-center justify-center gap-2 text-purple-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400" />
            <span className="text-sm">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}