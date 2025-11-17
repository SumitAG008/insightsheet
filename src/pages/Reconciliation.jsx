// pages/Reconciliation.jsx - Data reconciliation and comparison tool
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileCheck, Upload, Download, AlertCircle, CheckCircle,
  XCircle, Filter, Search, FileSpreadsheet
} from 'lucide-react';

export default function Reconciliation() {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [data1, setData1] = useState(null);
  const [data2, setData2] = useState(null);
  const [reconciling, setReconciling] = useState(false);
  const [results, setResults] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      return obj;
    });
    return { headers, rows };
  };

  const handleFileUpload = async (e, fileNumber) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
      alert('Please upload a CSV or TXT file');
      return;
    }

    if (fileNumber === 1) {
      setFile1(file);
    } else {
      setFile2(file);
    }

    const text = await file.text();
    const parsedData = parseCSV(text);

    if (fileNumber === 1) {
      setData1(parsedData);
    } else {
      setData2(parsedData);
    }
  };

  const handleReconcile = () => {
    if (!data1 || !data2) {
      alert('Please upload both files');
      return;
    }

    setReconciling(true);

    // Simple reconciliation logic - comparing by first column
    const key1 = data1.headers[0];
    const key2 = data2.headers[0];

    const map1 = new Map();
    data1.rows.forEach(row => {
      map1.set(row[key1], row);
    });

    const map2 = new Map();
    data2.rows.forEach(row => {
      map2.set(row[key2], row);
    });

    const matched = [];
    const missingInFile2 = [];
    const missingInFile1 = [];
    const different = [];

    // Check matches and differences
    map1.forEach((row1, key) => {
      if (map2.has(key)) {
        const row2 = map2.get(key);
        let isDifferent = false;

        // Compare all columns
        data1.headers.forEach(header => {
          if (row1[header] !== row2[header]) {
            isDifferent = true;
          }
        });

        if (isDifferent) {
          different.push({
            key,
            file1: row1,
            file2: row2,
            type: 'different'
          });
        } else {
          matched.push({
            key,
            data: row1,
            type: 'matched'
          });
        }
      } else {
        missingInFile2.push({
          key,
          data: row1,
          type: 'missing_in_file2'
        });
      }
    });

    // Check for records in file2 but not in file1
    map2.forEach((row2, key) => {
      if (!map1.has(key)) {
        missingInFile1.push({
          key,
          data: row2,
          type: 'missing_in_file1'
        });
      }
    });

    setResults({
      matched,
      missingInFile2,
      missingInFile1,
      different,
      totalFile1: data1.rows.length,
      totalFile2: data2.rows.length
    });

    setReconciling(false);
  };

  const exportResults = () => {
    if (!results) return;

    let csvContent = 'Status,Key,Details\n';

    results.matched.forEach(item => {
      csvContent += `Matched,${item.key},${JSON.stringify(item.data)}\n`;
    });

    results.missingInFile2.forEach(item => {
      csvContent += `Missing in File 2,${item.key},${JSON.stringify(item.data)}\n`;
    });

    results.missingInFile1.forEach(item => {
      csvContent += `Missing in File 1,${item.key},${JSON.stringify(item.data)}\n`;
    });

    results.different.forEach(item => {
      csvContent += `Different,${item.key},"File1: ${JSON.stringify(item.file1)} | File2: ${JSON.stringify(item.file2)}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `reconciliation_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setFile1(null);
    setFile2(null);
    setData1(null);
    setData2(null);
    setResults(null);
    setSearchTerm('');
    setFilterType('all');

    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => input.value = '');
  };

  const getFilteredResults = () => {
    if (!results) return null;

    let allItems = [];

    if (filterType === 'all' || filterType === 'matched') {
      allItems = [...allItems, ...results.matched];
    }
    if (filterType === 'all' || filterType === 'missing') {
      allItems = [...allItems, ...results.missingInFile2, ...results.missingInFile1];
    }
    if (filterType === 'all' || filterType === 'different') {
      allItems = [...allItems, ...results.different];
    }

    if (searchTerm) {
      allItems = allItems.filter(item =>
        item.key.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return allItems;
  };

  const filteredItems = getFilteredResults();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FileCheck className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-black mb-3">
            Data Reconciliation
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Compare and reconcile two datasets to identify matches, differences, and discrepancies
          </p>
        </div>

        {/* Upload Section */}
        {!results && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* File 1 Upload */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-500" />
                File 1 (Primary)
              </h2>
              <label className="flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-teal-500 transition-colors">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => handleFileUpload(e, 1)}
                  className="hidden"
                  disabled={reconciling}
                />
                <Upload className="w-12 h-12 text-slate-400 mb-3" />
                {file1 ? (
                  <>
                    <p className="text-slate-800 font-semibold">{file1.name}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {data1?.rows.length} records loaded
                    </p>
                    <Badge className="mt-2 bg-green-500/20 text-green-700 border-green-500/30">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ready
                    </Badge>
                  </>
                ) : (
                  <>
                    <p className="text-slate-600 mb-1">Click to upload CSV/TXT file</p>
                    <p className="text-xs text-slate-500">Primary dataset for comparison</p>
                  </>
                )}
              </label>
            </div>

            {/* File 2 Upload */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan-500" />
                File 2 (Comparison)
              </h2>
              <label className="flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-cyan-500 transition-colors">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => handleFileUpload(e, 2)}
                  className="hidden"
                  disabled={reconciling}
                />
                <Upload className="w-12 h-12 text-slate-400 mb-3" />
                {file2 ? (
                  <>
                    <p className="text-slate-800 font-semibold">{file2.name}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {data2?.rows.length} records loaded
                    </p>
                    <Badge className="mt-2 bg-green-500/20 text-green-700 border-green-500/30">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ready
                    </Badge>
                  </>
                ) : (
                  <>
                    <p className="text-slate-600 mb-1">Click to upload CSV/TXT file</p>
                    <p className="text-xs text-slate-500">Dataset to compare against</p>
                  </>
                )}
              </label>
            </div>
          </div>
        )}

        {/* Reconcile Button */}
        {data1 && data2 && !results && (
          <div className="text-center mb-8">
            <Button
              onClick={handleReconcile}
              disabled={reconciling}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg px-8 py-6 text-lg"
            >
              {reconciling ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                  Reconciling...
                </>
              ) : (
                <>
                  <FileCheck className="w-5 h-5 mr-3" />
                  Start Reconciliation
                </>
              )}
            </Button>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-600">File 1</p>
                    <p className="text-2xl font-bold text-slate-800">{results.totalFile1}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-600">File 2</p>
                    <p className="text-2xl font-bold text-slate-800">{results.totalFile2}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-slate-600">Matched</p>
                    <p className="text-2xl font-bold text-green-600">{results.matched.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-slate-600">Different</p>
                    <p className="text-2xl font-bold text-orange-600">{results.different.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm text-slate-600">Missing</p>
                    <p className="text-2xl font-bold text-red-600">
                      {results.missingInFile1.length + results.missingInFile2.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={exportResults}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Start New Reconciliation
              </Button>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by key..."
                    className="pl-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setFilterType('all')}
                    variant={filterType === 'all' ? 'default' : 'outline'}
                    className={filterType === 'all' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                  >
                    All
                  </Button>
                  <Button
                    onClick={() => setFilterType('matched')}
                    variant={filterType === 'matched' ? 'default' : 'outline'}
                    className={filterType === 'matched' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    Matched
                  </Button>
                  <Button
                    onClick={() => setFilterType('different')}
                    variant={filterType === 'different' ? 'default' : 'outline'}
                    className={filterType === 'different' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                  >
                    Different
                  </Button>
                  <Button
                    onClick={() => setFilterType('missing')}
                    variant={filterType === 'missing' ? 'default' : 'outline'}
                    className={filterType === 'missing' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    Missing
                  </Button>
                </div>
              </div>
            </div>

            {/* Results List */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                Reconciliation Details ({filteredItems?.length || 0} items)
              </h3>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredItems && filteredItems.length > 0 ? (
                  filteredItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-l-4 ${
                        item.type === 'matched'
                          ? 'bg-green-50 border-green-500'
                          : item.type === 'different'
                          ? 'bg-orange-50 border-orange-500'
                          : 'bg-red-50 border-red-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {item.type === 'matched' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : item.type === 'different' ? (
                              <AlertCircle className="w-4 h-4 text-orange-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="font-semibold text-slate-800">
                              Key: {item.key}
                            </span>
                          </div>

                          {item.type === 'matched' && (
                            <p className="text-sm text-slate-600">
                              {JSON.stringify(item.data)}
                            </p>
                          )}

                          {item.type === 'different' && (
                            <div className="text-sm space-y-1">
                              <p className="text-slate-600">
                                <strong>File 1:</strong> {JSON.stringify(item.file1)}
                              </p>
                              <p className="text-slate-600">
                                <strong>File 2:</strong> {JSON.stringify(item.file2)}
                              </p>
                            </div>
                          )}

                          {(item.type === 'missing_in_file1' || item.type === 'missing_in_file2') && (
                            <p className="text-sm text-slate-600">
                              {JSON.stringify(item.data)}
                            </p>
                          )}
                        </div>

                        <Badge
                          className={
                            item.type === 'matched'
                              ? 'bg-green-500/20 text-green-700 border-green-500/30'
                              : item.type === 'different'
                              ? 'bg-orange-500/20 text-orange-700 border-orange-500/30'
                              : 'bg-red-500/20 text-red-700 border-red-500/30'
                          }
                        >
                          {item.type === 'matched'
                            ? 'Matched'
                            : item.type === 'different'
                            ? 'Different'
                            : item.type === 'missing_in_file1'
                            ? 'Missing in File 1'
                            : 'Missing in File 2'}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No items match the current filter</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-teal-50 rounded-xl p-6 border border-teal-200">
          <h3 className="text-lg font-bold text-slate-800 mb-3">
            🔍 Reconciliation Guide
          </h3>
          <div className="text-sm text-slate-700 space-y-2">
            <p>• Upload two CSV or TXT files to compare</p>
            <p>• The tool compares records based on the first column (key)</p>
            <p>• <strong>Matched:</strong> Records exist in both files with identical data</p>
            <p>• <strong>Different:</strong> Records exist in both files but have different values</p>
            <p>• <strong>Missing:</strong> Records exist in one file but not the other</p>
            <p>• Export results as CSV for further analysis</p>
            <p>• All processing happens locally in your browser - no data is uploaded</p>
          </div>
        </div>
      </div>
    </div>
  );
}
