// components/upload/FileUploadZone.jsx - Excel + CSV upload with browser-native parsing
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { meldraAi } from '@/api/meldraClient';

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
      const currentUser = await meldraAi.auth.me();
      setUser(currentUser);
      
      const subs = await meldraAi.entities.Subscription.filter({ user_email: currentUser.email });
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
          
          // Convert to JSON (header: 1 = array of arrays; works with .xls and .xlsx)
          const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }
          
          // Auto-detect header row: many files have title/empty rows, then headers (e.g. row 4–5), then data.
          // Use the first row with at least 2 non-empty cells in the first 20 rows.
          let headerRow = 0;
          for (let r = 0; r < Math.min(20, jsonData.length); r++) {
            const row = jsonData[r] || [];
            const nonEmpty = row.filter(c => c != null && c !== '' && String(c).trim() !== '').length;
            if (nonEmpty >= 2) {
              headerRow = r;
              break;
            }
          }
          
          const headerRowRaw = jsonData[headerRow] || [];
          const dataRows = jsonData.slice(headerRow + 1);
          const maxDataCols = dataRows.length
            ? Math.max(...dataRows.map(r => (r || []).length))
            : 0;
          const numCols = Math.max(headerRowRaw.length, maxDataCols, 1);
          
          // Build headers: use "Column_N" for empty (merged cells or blank headers)
          const headers = [];
          const seen = new Set();
          for (let i = 0; i < numCols; i++) {
            const h = headerRowRaw[i];
            const val = (h != null && h !== '') ? String(h).trim() : '';
            let name = val || `Column_${i + 1}`;
            if (seen.has(name)) {
              let n = 1;
              while (seen.has(`${name}_${n}`)) n++;
              name = `${name}_${n}`;
            }
            seen.add(name);
            headers.push(name);
          }
          
          const rows = dataRows
            .filter(row => (row || []).some(cell => cell !== '' && cell !== null && cell !== undefined))
            .map(row => {
              const obj = {};
              headers.forEach((header, idx) => {
                const value = row && row[idx];
                if (value !== null && value !== undefined && value !== '') {
                  if (typeof value === 'number') {
                    obj[header] = value;
                  } else if (typeof value === 'string' && !isNaN(parseFloat(value)) && value.trim() !== '') {
                    const n = parseFloat(value);
                    obj[header] = Number.isInteger(n) ? n : Math.round(n * 100) / 100;
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
      {/* File size limit notice - royal blue for premium, strong contrast */}
      <Alert className={`mb-6 ${subscription?.plan === 'premium' ? 'bg-[#4169E1]/10 border-[#4169E1]/40' : 'bg-amber-500/10 border-amber-500/30'}`}>
        <Info className={`h-4 w-4 ${subscription?.plan === 'premium' ? 'text-[#4169E1]' : 'text-amber-600 dark:text-amber-400'}`} />
        <AlertDescription className={subscription?.plan === 'premium' ? 'text-slate-900 dark:text-slate-200' : 'text-slate-700 dark:text-slate-300'}>
          <strong className={`font-bold text-base ${subscription?.plan === 'premium' ? 'text-slate-900 dark:text-slate-100' : 'text-amber-700 dark:text-amber-300'}`}>
            {subscription?.plan === 'premium' ? '✨ Premium: Unlimited file size!' : `⚠️ File Size Limit: ${maxSize}MB`}
          </strong>
          <br />
          <span className={`text-base font-semibold ${subscription?.plan === 'premium' ? 'text-slate-800 dark:text-slate-300' : ''}`}>
            {subscription?.plan === 'premium' 
              ? 'You can upload files up to 500MB with your Premium plan.'
              : 'Free plan limited to 10MB. Upgrade to Premium for unlimited size!'}
          </span>
        </AlertDescription>
      </Alert>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative group transition-all duration-300 ${isDragging ? 'scale-102' : ''}`}
      >
        <div className={`absolute inset-0 bg-gradient-to-r from-[#4169E1]/30 to-[#4169E1]/30 rounded-3xl blur-2xl transition-all duration-300 ${
          isDragging ? 'opacity-100 scale-105' : 'opacity-0 group-hover:opacity-70'
        }`} />
        
        <div className={`relative bg-slate-900/80 backdrop-blur-xl border-2 border-dashed rounded-3xl p-16 transition-all duration-300 ${
          isDragging 
            ? 'border-[#4169E1] bg-[#4169E1]/5' 
            : 'border-slate-700 hover:border-[#4169E1]/50 hover:bg-slate-800/80'
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
                  <Loader2 className="w-20 h-20 text-[#4169E1] animate-spin mb-6" />
                  <div className="absolute inset-0 bg-[#4169E1]/20 rounded-full blur-xl animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-[#4169E1] mb-2">
                  {processingStatus || 'Processing Your File...'}
                </h3>
                <p className="text-slate-200 font-medium text-base">Analyzing data structure and preparing workspace</p>
              </>
            ) : uploadedFileName ? (
              <>
                <div className="relative mb-6">
                  <CheckCircle className="w-20 h-20 text-emerald-500" />
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-emerald-300 mb-2">File Uploaded Successfully!</h3>
                <p className="text-slate-200 font-medium">{uploadedFileName}</p>
              </>
            ) : (
              <>
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-[#4169E1]/20 rounded-full blur-2xl" />
                  <FileSpreadsheet className="relative w-24 h-24 text-[#4169E1] mb-2" />
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-4">
                  Drop your file here
                </h3>
                
                <p className="text-slate-200 font-semibold text-lg mb-8 max-w-md">
                  or <span className="text-[#4169E1] font-bold underline cursor-pointer">browse files</span>
                </p>
                
                <div className="flex flex-wrap justify-center gap-3 text-base mb-6">
                  <span className="px-6 py-3 bg-[#4169E1] border border-[#4169E1] rounded-lg text-white font-bold">
                    .CSV • .XLSX • .XLS
                  </span>
                </div>
                
                <p className="text-slate-300 font-medium text-sm mb-2">
                  100% browser-based • No server upload • Instant processing
                </p>
                <p className="text-slate-200 font-semibold text-base">
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