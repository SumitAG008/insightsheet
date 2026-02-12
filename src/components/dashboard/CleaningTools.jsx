// components/dashboard/CleaningTools.jsx - ML-aware cleaning (outliers, fill missing)
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, Trash, Type, CheckCircle, TrendingDown, PaintBucket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dedupe, trim, inferTypes, removeOutliers, fillMissing } from '@/lib/dataCleaning';
import { useI18n } from '@/lib/i18n';

const FILL_STRATEGIES = [
  { id: 'mean', labelKey: 'cleaning_fill_strategy_mean' },
  { id: 'median', labelKey: 'cleaning_fill_strategy_median' },
  { id: 'mode', labelKey: 'cleaning_fill_strategy_mode' },
  { id: 'forward', labelKey: 'cleaning_fill_strategy_forward' },
  { id: 'backward', labelKey: 'cleaning_fill_strategy_backward' },
];

export default function CleaningTools({ data, onDataUpdate, onCleanedCount }) {
  const { t } = useI18n();
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
    onDataUpdate({ ...data, rows }, {
      title: t('cleaning_activity_removed_duplicates_title'),
      detail: t('cleaning_activity_removed_duplicates_detail', { removed }),
      badge: 'Cleaning',
    });
    if (onCleanedCount) onCleanedCount(removed);
    setLastAction(t('cleaning_last_removed_duplicate_rows', { removed }));
  }, 600);

  const trimWhitespace = () => run(() => {
    onDataUpdate({ ...data, rows: trim(data.rows) }, {
      title: t('cleaning_activity_trimmed_whitespace_title'),
      detail: t('cleaning_activity_trimmed_whitespace_detail'),
      badge: 'Cleaning',
    });
    setLastAction(t('cleaning_last_trimmed_whitespace_all_cells'));
  }, 400);

  const doInferTypes = () => run(() => {
    onDataUpdate({ ...data, rows: inferTypes(data.rows) }, {
      title: t('cleaning_activity_inferred_types_title'),
      detail: t('cleaning_activity_inferred_types_detail'),
      badge: 'Cleaning',
    });
    setLastAction(t('cleaning_last_converted_types_automatically'));
  }, 500);

  const cleanAll = () => run(() => {
    const { rows, removed } = dedupe(trim(data.rows));
    const typed = inferTypes(rows);
    onDataUpdate({ ...data, rows: typed }, {
      title: t('cleaning_activity_cleaned_all_title'),
      detail: t('cleaning_activity_cleaned_all_detail', { removed }),
      badge: 'Cleaning',
    });
    if (onCleanedCount) onCleanedCount(removed);
    setLastAction(t('cleaning_last_complete_cleanup', { removed }));
  }, 800);

  const doRemoveOutliers = () => {
    if (!outlierCol) { setLastAction(t('cleaning_select_numeric_column_first')); return; }
    run(() => {
      const { rows, removed } = removeOutliers(data.rows, outlierCol, { threshold: 1.5 });
      onDataUpdate({ ...data, rows }, {
        title: t('cleaning_activity_removed_outliers_title'),
        detail: t('cleaning_activity_removed_outliers_detail', { removed, column: outlierCol }),
        badge: 'Cleaning',
      });
      if (onCleanedCount) onCleanedCount(removed);
      setLastAction(removed > 0
        ? t('cleaning_last_removed_outliers', { removed, column: outlierCol })
        : t('cleaning_last_no_outliers', { column: outlierCol })
      );
    }, 500);
  };

  const doFillMissing = () => {
    if (!fillCol) { setLastAction(t('cleaning_select_column_first')); return; }
    run(() => {
      const rows = fillMissing(data.rows, fillCol, fillStrategy);
      onDataUpdate({ ...data, rows }, {
        title: t('cleaning_activity_filled_missing_title'),
        detail: t('cleaning_activity_filled_missing_detail', { column: fillCol, strategy: fillStrategy }),
        badge: 'Cleaning',
      });
      setLastAction(t('cleaning_last_filled_missing', { column: fillCol, strategy: fillStrategy }));
    }, 500);
  };

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-orange-600/10 rounded-2xl blur-xl" />

      <div className="relative bg-blue-900/80 backdrop-blur-xl border border-blue-700/40 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-amber-400" />
            {t('cleaning_tools_title')}
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
            {t('cleaning_remove_dupes')}
          </Button>

          <Button
            onClick={trimWhitespace}
            disabled={cleaning}
            className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
          >
            <Type className="w-4 h-4 mr-2" />
            {t('cleaning_trim_space')}
          </Button>

          <Button
            onClick={doInferTypes}
            disabled={cleaning}
            className="bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold"
          >
            <Type className="w-4 h-4 mr-2" />
            {t('cleaning_fix_types')}
          </Button>

          <Button
            onClick={cleanAll}
            disabled={cleaning}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            {t('cleaning_clean_all')}
          </Button>
        </div>

        {/* ML: Outliers + Fill missing */}
        <div className="mt-4 pt-4 border-t border-blue-700/40">
          <p className="text-sm font-semibold text-amber-300/90 mb-2">{t('cleaning_ml_powered')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={outlierCol} onValueChange={setOutlierCol}>
              <SelectTrigger className="w-40 h-9 bg-blue-950/60 border-blue-500/40 text-white text-sm">
                <SelectValue placeholder={t('cleaning_column_outliers')} />
              </SelectTrigger>

              <SelectContent className="bg-blue-900 border-blue-700/50">
                {numericColumns.map((c) => (
                  <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={doRemoveOutliers}
              disabled={cleaning || !outlierCol}
              size="sm"
              className="bg-blue-950/60 hover:bg-blue-900 text-white"
            >
              <TrendingDown className="w-4 h-4 mr-1" />
              {t('cleaning_remove_outliers')}
            </Button>

            <Select value={fillCol} onValueChange={setFillCol} className="ml-2">
              <SelectTrigger className="w-40 h-9 bg-blue-950/60 border-blue-500/40 text-white text-sm">
                <SelectValue placeholder={t('cleaning_column_fill')} />
              </SelectTrigger>

              <SelectContent className="bg-blue-900 border-blue-700/50">
                {(data.headers || []).map((c) => (
                  <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={fillStrategy} onValueChange={setFillStrategy}>
              <SelectTrigger className="w-36 h-9 bg-blue-950/60 border-blue-500/40 text-white text-sm">
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="bg-blue-900 border-blue-700/50">
                {FILL_STRATEGIES.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-white">{t(s.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={doFillMissing}
              disabled={cleaning || !fillCol}
              size="sm"
              className="bg-blue-950/60 hover:bg-blue-900 text-white"
            >
              <PaintBucket className="w-4 h-4 mr-1" />
              {t('cleaning_fill_missing')}
            </Button>
          </div>
        </div>

        {cleaning && (
          <div className="mt-4 flex items-center justify-center gap-2 text-purple-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400" />
            <span className="text-sm">{t('common_processing')}</span>
          </div>
        )}
      </div>
    </div>
  );
}