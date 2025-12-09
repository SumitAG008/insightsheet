// components/upload/FileUploadZone.jsx - Meldra Premium Upload Experience
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, Info, AlertCircle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { base44 } from '@/api/meldraClient';

export default function FileUploadZone({ onFileUpload, isProcessing }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    loadUserAndSubscription();

    // Load XLSX library
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const loadUserAndSubscription = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const subs = await base44.entities.Subscription.filter({ user_email: currentUser.email });
      if (subs.length > 0) {
        setSubscription(subs[0]);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return null;

    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = parseCSVLine(line);
        const obj = {};
        headers.forEach((header, idx) => {
          const value = values[idx] || '';
          if (value && !isNaN(value) && value.trim() !== '') {
            obj[header] = parseFloat(value);
          } else {
            obj[header] = value;
          }
        });
        return obj;
      });

    return { headers, rows, raw: lines };
  };

  const parseExcel = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          if (!window.XLSX) {
            reject(new Error('Excel library not loaded yet. Please try again in a moment.'));
            return;
          }

          const data = new Uint8Array(e.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });

          // Use first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to JSON
          const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }

          const headers = jsonData[0].filter(h => h && h.trim() !== '');
          const rows = jsonData.slice(1)
            .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
            .map(row => {
              const obj = {};
              headers.forEach((header, idx) => {
                const value = row[idx];
                if (value !== null && value !== undefined && value !== '') {
                  if (!isNaN(value) && typeof value !== 'string') {
                    obj[header] = parseFloat(value);
                  } else {
                    obj[header] = value;
                  }
                } else {
                  obj[header] = '';
                }
              });
              return obj;
            });

          resolve({ headers, rows, raw: jsonData });
        } catch (err) {
          reject(new Error('Failed to parse Excel file: ' + err.message));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const processFile = useCallback(async (file) => {
    setUploadedFileName(file.name);
    setProcessingStatus('Checking file size...');

    try {
      // Check file size limit
      const fileSizeMB = file.size / (1024 * 1024);
      const maxSize = (subscription && subscription.plan === 'premium') ? 500 : 10;

      if (fileSizeMB > maxSize) {
        throw new Error(`File size (${fileSizeMB.toFixed(1)}MB) exceeds your plan limit of ${maxSize}MB. ${maxSize === 10 ? 'Upgrade to Premium for unlimited file size!' : ''}`);
      }

      const ext = file.name.split('.').pop().toLowerCase();

      setProcessingStatus('Reading file...');

      let data;
      if (ext === 'csv') {
        const text = await file.text();
        setProcessingStatus('Parsing CSV...');
        data = parseCSV(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        setProcessingStatus('Parsing Excel...');
        data = await parseExcel(file);
      } else {
        throw new Error('Unsupported file format');
      }

      if (data && data.rows.length > 0) {
        setProcessingStatus('');
        onFileUpload(file, data);
      } else {
        throw new Error('No data found in file. Please check the file format.');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert(`Error: ${error.message}`);
      setUploadedFileName('');
      setProcessingStatus('');
    }
  }, [onFileUpload, subscription]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (['csv', 'xlsx', 'xls'].includes(ext)) {
        processFile(file);
      } else {
        alert('Please upload CSV or Excel files only (.csv, .xlsx, .xls)');
      }
    }
  }, [processFile]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (['csv', 'xlsx', 'xls'].includes(ext)) {
        processFile(file);
      } else {
        alert('Please upload CSV or Excel files only (.csv, .xlsx, .xls)');
        e.target.value = '';
      }
    }
  }, [processFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const maxSize = (subscription && subscription.plan === 'premium') ? 500 : 10;

  return (
    <div>
      {/* File size limit notice - Meldra styled */}
      <div className={`mb-6 p-4 rounded-2xl border ${subscription?.plan === 'premium'
        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
        : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50'
        }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${subscription?.plan === 'premium'
            ? 'bg-emerald-100 dark:bg-emerald-900/50'
            : 'bg-amber-100 dark:bg-amber-900/50'
            }`}>
            <Info className={`h-4 w-4 ${subscription?.plan === 'premium'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
              }`} />
          </div>
          <div>
            <p className={`font-semibold ${subscription?.plan === 'premium'
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-amber-700 dark:text-amber-300'
              }`}>
              {subscription?.plan === 'premium' ? 'Premium: Up to 500MB' : `File Size Limit: ${maxSize}MB`}
            </p>
            <p className={`text-sm mt-1 ${subscription?.plan === 'premium'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
              }`}>
              {subscription?.plan === 'premium'
                ? 'You have premium access with priority processing.'
                : 'Free plan limited to 10MB. Upgrade to Premium for larger files!'}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Zone - Meldra Premium Design */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative group transition-all duration-300 ${isDragging ? 'scale-[1.02]' : ''}`}
      >
        {/* Glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl transition-all duration-300 ${isDragging ? 'opacity-100 scale-105' : 'opacity-0 group-hover:opacity-60'
          }`} />

        {/* Main upload area */}
        <div className={`relative meldra-card border-2 border-dashed rounded-3xl p-12 md:p-16 transition-all duration-300 ${isDragging
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
          : 'border-purple-200 dark:border-purple-800/50 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/20'
          }`}>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing || !!processingStatus}
          />

          <div className="flex flex-col items-center justify-center text-center">
            {isProcessing || processingStatus ? (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
                  <Loader2 className="w-20 h-20 text-purple-500 animate-spin mb-6 relative" />
                </div>
                <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-2">
                  {processingStatus || 'Processing Your File...'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">Analyzing data structure and preparing workspace</p>
              </>
            ) : uploadedFileName ? (
              <>
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                  <CheckCircle className="w-20 h-20 text-emerald-500 relative" />
                </div>
                <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mb-2">File Uploaded Successfully!</h3>
                <p className="text-slate-600 dark:text-slate-400">{uploadedFileName}</p>
              </>
            ) : (
              <>
                {/* Upload icon with glow */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-2xl" />
                  <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <FileSpreadsheet className="w-12 h-12 text-white" />
                  </div>
                </div>

                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                  Drop your file here
                </h3>

                <p className="text-slate-600 dark:text-slate-400 text-lg mb-6">
                  or <span className="text-purple-600 dark:text-purple-400 font-semibold underline underline-offset-4 cursor-pointer hover:text-purple-700 dark:hover:text-purple-300">browse files</span>
                </p>

                {/* Supported formats badge */}
                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  <span className="px-5 py-2.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 border border-purple-200 dark:border-purple-700/50 rounded-xl text-purple-700 dark:text-purple-300 font-bold">
                    .CSV • .XLSX • .XLS
                  </span>
                </div>

                {/* Privacy note */}
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>100% browser-based • No server upload • Instant processing</span>
                </div>

                <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold">
                  Max {maxSize}MB {subscription?.plan !== 'premium' && '(Free Plan)'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
