// Reconciliation.jsx - Data reconciliation tool for matching datasets (XLOOKUP/VLOOKUP logic)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { GitCompare, Upload, CheckCircle, AlertCircle, XCircle, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function Reconciliation() {
  const navigate = useNavigate();
  const [sourceData, setSourceData] = useState(null);
  const [targetData, setTargetData] = useState(null);
  const [sourceKey, setSourceKey] = useState('');
  const [targetKey, setTargetKey] = useState('');
  const [compareColumns, setCompareColumns] = useState([]);
  const [results, setResults] = useState(null);
  const [isReconciling, setIsReconciling] = useState(false);

  useEffect(() => {
    // Load source data from session storage
    const storedData = sessionStorage.getItem('insightsheet_data');
    if (storedData) {
      setSourceData(JSON.parse(storedData));
    }
  }, []);

  const handleTargetUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          alert('File must have at least a header row and one data row');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          return row;
        });

        setTargetData({
          headers: headers,
          rows: rows
        });

        alert('Target data loaded successfully!');
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file. Please ensure it\'s properly formatted.');
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else if (file.name.match(/\.(xlsx|xls)$/)) {
      // Handle Excel files
      if (!window.XLSX) {
        alert('Excel library not loaded. Please use CSV format instead.');
        return;
      }

      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = window.XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          if (jsonData.length < 2) {
            alert('File must have at least a header row and one data row');
            return;
          }

          const headers = jsonData[0];
          const rows = jsonData.slice(1).map(row => {
            const rowObj = {};
            headers.forEach((header, idx) => {
              rowObj[header] = row[idx];
            });
            return rowObj;
          });

          setTargetData({
            headers: headers,
            rows: rows
          });

          alert('Target data loaded successfully!');
        } catch (error) {
          console.error('Error parsing Excel:', error);
          alert('Error parsing Excel file.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Please upload a CSV or Excel file');
    }
  };

  // XLOOKUP function implementation
  const xlookup = (lookupValue, lookupArray, returnArray, ifNotFound = null) => {
    const index = lookupArray.findIndex(val =>
      String(val).toLowerCase() === String(lookupValue).toLowerCase()
    );
    return index !== -1 ? returnArray[index] : ifNotFound;
  };

  const handleReconcile = () => {
    if (!sourceData || !targetData) {
      alert('Please load both source and target data');
      return;
    }

    if (!sourceKey || !targetKey) {
      alert('Please select key columns for matching');
      return;
    }

    setIsReconciling(true);

    try {
      // Create lookup arrays for target data
      const targetKeyArray = targetData.rows.map(row => row[targetKey]);

      // Prepare results
      const matched = [];
      const mismatched = [];
      const missing = [];
      const sourceKeys = new Set();

      // Process each source row
      sourceData.rows.forEach((sourceRow, idx) => {
        const lookupValue = sourceRow[sourceKey];
        sourceKeys.add(String(lookupValue).toLowerCase());

        // Find matching target row using XLOOKUP logic
        const targetRowData = xlookup(
          lookupValue,
          targetKeyArray,
          targetData.rows,
          null
        );

        if (targetRowData === null) {
          // No match found
          missing.push({
            rowIndex: idx,
            keyValue: lookupValue,
            sourceRow: sourceRow,
            type: 'missing'
          });
        } else {
          // Match found - check if values match
          let hasDiscrepancy = false;
          const discrepancies = [];

          compareColumns.forEach(col => {
            const sourceValue = String(sourceRow[col] || '');
            const targetValue = String(targetRowData[col] || '');

            if (sourceValue !== targetValue) {
              hasDiscrepancy = true;
              discrepancies.push({
                column: col,
                sourceValue: sourceValue,
                targetValue: targetValue
              });
            }
          });

          if (hasDiscrepancy) {
            mismatched.push({
              rowIndex: idx,
              keyValue: lookupValue,
              sourceRow: sourceRow,
              targetRow: targetRowData,
              discrepancies: discrepancies,
              type: 'mismatched'
            });
          } else {
            matched.push({
              rowIndex: idx,
              keyValue: lookupValue,
              sourceRow: sourceRow,
              targetRow: targetRowData,
              type: 'matched'
            });
          }
        }
      });

      // Find extra records in target that don't exist in source
      const extra = targetData.rows
        .filter(row => !sourceKeys.has(String(row[targetKey]).toLowerCase()))
        .map((row, idx) => ({
          rowIndex: idx,
          keyValue: row[targetKey],
          targetRow: row,
          type: 'extra'
        }));

      setResults({
        matched,
        mismatched,
        missing,
        extra,
        summary: {
          totalSource: sourceData.rows.length,
          totalTarget: targetData.rows.length,
          matchedCount: matched.length,
          mismatchedCount: mismatched.length,
          missingCount: missing.length,
          extraCount: extra.length
        }
      });
    } catch (error) {
      console.error('Error during reconciliation:', error);
      alert('Error during reconciliation. Please check your data and try again.');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleExportResults = () => {
    if (!results) return;

    const lines = [];
    lines.push('Status,Key Value,Column,Source Value,Target Value,Notes');

    results.matched.forEach(item => {
      lines.push(`Matched,"${item.keyValue}",,,,"All values match"`);
    });

    results.mismatched.forEach(item => {
      item.discrepancies.forEach(disc => {
        lines.push(`Mismatched,"${item.keyValue}","${disc.column}","${disc.sourceValue}","${disc.targetValue}","Values differ"`);
      });
    });

    results.missing.forEach(item => {
      lines.push(`Missing,"${item.keyValue}",,,,"Not found in target"`);
    });

    results.extra.forEach(item => {
      lines.push(`Extra,"${item.keyValue}",,,,"Not found in source"`);
    });

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reconciliation_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const toggleCompareColumn = (col) => {
    if (compareColumns.includes(col)) {
      setCompareColumns(compareColumns.filter(c => c !== col));
    } else {
      setCompareColumns([...compareColumns, col]);
    }
  };

  if (!sourceData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center max-w-2xl mx-auto">
            <GitCompare className="w-24 h-24 text-purple-400 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-purple-200 mb-4">Data Reconciliation</h1>
            <p className="text-slate-400 mb-8">
              No source data loaded. Please upload data from the Upload page first.
            </p>
            <Button
              onClick={() => navigate(createPageUrl('Upload'))}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Go to Upload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-purple-200 mb-2">Data Reconciliation</h1>
          <p className="text-slate-400">
            Match and compare two datasets using XLOOKUP/VLOOKUP logic
          </p>
        </div>

        {/* Instructions */}
        <Alert className="mb-6 bg-blue-900/20 border-blue-500/30">
          <AlertCircle className="w-4 h-4 text-blue-400" />
          <AlertDescription className="text-blue-200">
            Upload your target dataset, select matching key columns, choose columns to compare, and run reconciliation.
            The tool will find matched, mismatched, missing, and extra records.
          </AlertDescription>
        </Alert>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Source Data */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-purple-200">Source Data (Main)</CardTitle>
              <CardDescription className="text-slate-400">
                Loaded from session: {sourceData.rows.length} rows × {sourceData.headers.length} columns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Select Key Column (Source)
                </label>
                <select
                  value={sourceKey}
                  onChange={(e) => setSourceKey(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-300"
                >
                  <option value="">-- Select Column --</option>
                  {sourceData.headers.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Columns to Compare
                </label>
                <div className="flex flex-wrap gap-2">
                  {sourceData.headers.map(header => (
                    <Badge
                      key={header}
                      variant={compareColumns.includes(header) ? "default" : "outline"}
                      className={`cursor-pointer ${
                        compareColumns.includes(header)
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'border-slate-600 hover:border-purple-500'
                      }`}
                      onClick={() => toggleCompareColumn(header)}
                    >
                      {header}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Target Data */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-purple-200">Target Data (Comparison)</CardTitle>
              <CardDescription className="text-slate-400">
                {targetData
                  ? `${targetData.rows.length} rows × ${targetData.headers.length} columns`
                  : 'No target data loaded'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!targetData ? (
                <label className="block">
                  <div className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-lg p-8 text-center transition-colors">
                    <Upload className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400 mb-2">Upload Target CSV/Excel</p>
                    <p className="text-xs text-slate-500">Click to browse files</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleTargetUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">
                      Select Key Column (Target)
                    </label>
                    <select
                      value={targetKey}
                      onChange={(e) => setTargetKey(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-300"
                    >
                      <option value="">-- Select Column --</option>
                      {targetData.headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  <label>
                    <Button variant="outline" className="w-full border-purple-600 text-purple-300 hover:bg-purple-900/50">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Different File
                    </Button>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleTargetUpload}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reconcile Button */}
        <div className="flex justify-center mb-8">
          <Button
            onClick={handleReconcile}
            disabled={!sourceData || !targetData || !sourceKey || !targetKey || isReconciling}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-6 text-lg"
          >
            {isReconciling ? 'Reconciling...' : 'Run Reconciliation'}
          </Button>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-purple-200">Reconciliation Summary</CardTitle>
                  <Button
                    onClick={handleExportResults}
                    variant="outline"
                    className="border-purple-600 text-purple-300 hover:bg-purple-900/50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Results
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm text-emerald-300">Matched</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-200">{results.summary.matchedCount}</p>
                  </div>

                  <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                      <span className="text-sm text-amber-300">Mismatched</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-200">{results.summary.mismatchedCount}</p>
                  </div>

                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span className="text-sm text-red-300">Missing</span>
                    </div>
                    <p className="text-2xl font-bold text-red-200">{results.summary.missingCount}</p>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-blue-300">Extra</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-200">{results.summary.extraCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Results */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Matched */}
              {results.matched.length > 0 && (
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-emerald-200 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Matched ({results.matched.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {results.matched.slice(0, 10).map((item, idx) => (
                        <div key={idx} className="bg-emerald-900/10 border border-emerald-500/20 rounded p-3">
                          <p className="text-sm text-emerald-300">✓ {item.keyValue}</p>
                        </div>
                      ))}
                      {results.matched.length > 10 && (
                        <p className="text-sm text-slate-500 text-center">
                          + {results.matched.length - 10} more matches
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mismatched */}
              {results.mismatched.length > 0 && (
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-amber-200 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Mismatched ({results.mismatched.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {results.mismatched.slice(0, 10).map((item, idx) => (
                        <div key={idx} className="bg-amber-900/10 border border-amber-500/20 rounded p-3">
                          <p className="text-sm text-amber-300 font-medium mb-2">⚠ {item.keyValue}</p>
                          {item.discrepancies.map((disc, discIdx) => (
                            <div key={discIdx} className="text-xs text-slate-400 ml-4">
                              <span className="text-amber-400">{disc.column}:</span>{' '}
                              <span className="line-through">{disc.sourceValue}</span> → {disc.targetValue}
                            </div>
                          ))}
                        </div>
                      ))}
                      {results.mismatched.length > 10 && (
                        <p className="text-sm text-slate-500 text-center">
                          + {results.mismatched.length - 10} more mismatches
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Missing */}
              {results.missing.length > 0 && (
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-red-200 flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      Missing in Target ({results.missing.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {results.missing.slice(0, 10).map((item, idx) => (
                        <div key={idx} className="bg-red-900/10 border border-red-500/20 rounded p-3">
                          <p className="text-sm text-red-300">✗ {item.keyValue}</p>
                        </div>
                      ))}
                      {results.missing.length > 10 && (
                        <p className="text-sm text-slate-500 text-center">
                          + {results.missing.length - 10} more missing
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Extra */}
              {results.extra.length > 0 && (
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-blue-200 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Extra in Target ({results.extra.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {results.extra.slice(0, 10).map((item, idx) => (
                        <div key={idx} className="bg-blue-900/10 border border-blue-500/20 rounded p-3">
                          <p className="text-sm text-blue-300">+ {item.keyValue}</p>
                        </div>
                      ))}
                      {results.extra.length > 10 && (
                        <p className="text-sm text-slate-500 text-center">
                          + {results.extra.length - 10} more extra records
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
