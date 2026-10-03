// components/upload/FileUploadZone.jsx - Excel + CSV upload with browser-native parsing
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { meldraAi } from '@/api/meldraClient';
import { useI18n } from '@/lib/i18n';
import { maxUploadMb, uploadLimitLabel } from '@/lib/uploadLimits';

export default function FileUploadZone({ onFileUpload, isProcessing, acceptedFormats }) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [planLoaded, setPlanLoaded] = useState(false);

  const formats = Array.isArray(acceptedFormats) && acceptedFormats.length
    ? acceptedFormats
    : ['.csv', '.xlsx', '.xls'];

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
    setPlanLoaded(false);
    try {
      const currentUser = await meldraAi.auth.me();
      setUser(currentUser);
      
      const subs = await meldraAi.entities.Subscription.filter({ user_email: currentUser.email });
      if (subs.length > 0) {
        setSubscription(subs[0]);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setSubscription(null);
      setUser(null);
    } finally {
      setPlanLoaded(true);
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

  const parseCSVFile = async (file) => {
    const fileSizeMB = file.size / (1024 * 1024);

    // For smaller CSVs, keep the existing simple parser (fast enough, fewer deps)
    if (fileSizeMB <= 5) {
      const text = await file.text();
      return parseCSV(text);
    }

    // For large CSVs, use streaming-style parsing to avoid splitting the whole file into memory.
    const Papa = (await import('papaparse')).default;

    return new Promise((resolve, reject) => {
      let headers = null;
      const rows = [];

      Papa.parse(file, {
        skipEmptyLines: true,
        dynamicTyping: true,
        worker: true,
        step: (results) => {
          const row = results?.data;
          if (!row || !row.length) return;

          if (!headers) {
            headers = row.map((h, idx) => {
              const name = (h != null && String(h).trim() !== '') ? String(h).trim() : `Column_${idx + 1}`;
              return name;
            });
            return;
          }

          const obj = {};
          for (let i = 0; i < headers.length; i++) {
            obj[headers[i]] = row[i] ?? '';
          }
          rows.push(obj);
        },
        complete: () => {
          if (!headers || rows.length === 0) {
            reject(new Error(t('upload_no_data_found', { formats: formats.join(', ')})));
            return;
          }
          resolve({ headers, rows, raw: null });
        },
        error: (err) => reject(new Error(t('upload_csv_parse_error', { error: err?.message || 'Failed to parse CSV'}))),
      });
    });
  };

  const parseExcel = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          if (!window.XLSX) {
            reject(new Error(t('upload_excel_library_not_loaded')));
            return;
          }

          const data = new Uint8Array(e.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });

          const parseSheet = (worksheet) => {
            const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (!jsonData || jsonData.length === 0) {
              return { headers: [], rows: [], raw: jsonData || [] };
            }

            const toCellStr = (v) => {
              if (v === null || v === undefined) return '';
              const s = String(v).trim();
              return s;
            };

            const looksLikePeriodHeader = (s) => {
              const t = String(s || '').trim();
              if (!t) return false;
              if (/^\d{4}[-/]\d{1,2}$/.test(t)) return true;
              if (/^(q[1-4])\s*\d{4}$/i.test(t)) return true;
              if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(t)) return true;
              const m = t.match(/^\s*([A-Za-z]{3,9})[\s-]*(\d{2,4})\s*$/);
              if (m) {
                const monStr = m[1].slice(0, 3).toLowerCase();
                return ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].includes(monStr);
              }
              if (/\b(12\s*-?month)\b/i.test(t)) return true;
              return false;
            };

            const looksLikeHeaderKeyword = (s) => {
              const t = String(s || '').trim().toLowerCase();
              if (!t) return false;
              return (
                t === 'salesperson' ||
                t === 'customer' ||
                t === 'product' ||
                t === 'region' ||
                t === 'date' ||
                t === 'order no' ||
                t === 'order' ||
                t === 'total' ||
                t === 'total sales' ||
                t === 'item price' ||
                t === 'no. items' ||
                t === 'no items'
              );
            };

            const isNumberLike = (v) => {
              if (typeof v === 'number') return Number.isFinite(v);
              if (typeof v !== 'string') return false;
              const s = v.trim();
              if (!s) return false;
              const n = Number(s.replace(/,/g, ''));
              return Number.isFinite(n);
            };

            const maxHeaderScan = Math.min(40, jsonData.length);
            let headerRow = 0;
            let bestScore = -Infinity;

            for (let r = 0; r < maxHeaderScan; r++) {
              const row = jsonData[r] || [];
              const cells = row.map(toCellStr);
              const nonEmptyCells = cells.filter((c) => c !== '');
              if (nonEmptyCells.length < 2) continue;

              const uniq = new Set(nonEmptyCells.map((c) => c.toLowerCase()));
              const uniqRatio = uniq.size / Math.max(1, nonEmptyCells.length);

              let periodHits = 0;
              let keywordHits = 0;
              for (const c of nonEmptyCells) {
                if (looksLikePeriodHeader(c)) periodHits++;
                if (looksLikeHeaderKeyword(c)) keywordHits++;
              }

              // Look ahead: real header rows are usually followed by numeric-heavy rows.
              const lookaheadN = Math.min(8, jsonData.length - (r + 1));
              let numericHits = 0;
              let filledHits = 0;
              if (lookaheadN > 0) {
                for (let rr = r + 1; rr < r + 1 + lookaheadN; rr++) {
                  const prow = jsonData[rr] || [];
                  for (let c = 0; c < Math.max(row.length, prow.length); c++) {
                    const hv = cells[c] || '';
                    if (!hv) continue;
                    const pv = prow[c];
                    if (pv === null || pv === undefined || pv === '') continue;
                    filledHits++;
                    if (isNumberLike(pv)) numericHits++;
                  }
                }
              }

              const numericRatio = filledHits > 0 ? numericHits / filledHits : 0;

              const score =
                nonEmptyCells.length * 0.5 +
                uniqRatio * 4 +
                periodHits * 3 +
                keywordHits * 2 +
                numericRatio * 6;

              if (score > bestScore) {
                bestScore = score;
                headerRow = r;
              }
            }

            const headerRowRaw = jsonData[headerRow] || [];
            const dataRows = jsonData.slice(headerRow + 1);
            const maxDataCols = dataRows.length
              ? Math.max(...dataRows.map(r => (r || []).length))
              : 0;
            const numCols = Math.max(headerRowRaw.length, maxDataCols, 1);

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

            return { headers, rows, raw: jsonData };
          };

          const sheetNames = workbook.SheetNames || [];
          const sheets = {};
          sheetNames.forEach((name) => {
            const ws = workbook.Sheets[name];
            if (!ws) return;
            sheets[name] = parseSheet(ws);
          });

          const firstSheetName = sheetNames[0];
          const first = sheets[firstSheetName];
          if (!first || !first.rows || first.rows.length === 0) {
            reject(new Error(t('upload_excel_file_empty')));
            return;
          }

          resolve({
            headers: first.headers,
            rows: first.rows,
            raw: first.raw,
            workbook: {
              sheetNames,
              sheets,
              activeSheet: firstSheetName,
            },
          });
        } catch (err) {
          reject(new Error(t('upload_failed_to_parse_excel', { message: err.message })));
        }
      };
      
      reader.onerror = () => reject(new Error(t('common_failed_to_read_file')));
      reader.readAsArrayBuffer(file);
    });
  };

  const processFile = useCallback(async (file) => {
    setUploadedFileName(file.name);
    setProcessingStatus(t('upload_status_checking_file_size'));
    
    try {
      if (!planLoaded) {
        setProcessingStatus(t('upload_status_loading_plan'));
        await loadUserAndSubscription();
        setProcessingStatus(t('upload_status_checking_file_size'));
      }

      // Check file size limit
      const fileSizeMB = file.size / (1024 * 1024);
      const maxSize = maxUploadMb(subscription);
      
      if (fileSizeMB > maxSize) {
        throw new Error(t('upload_err_file_size_exceeds_limit', {
          fileSizeMB: fileSizeMB.toFixed(1),
          maxSize,
          upgradeHint: maxSize === 10 ? t('upload_err_upgrade_hint_premium_unlimited') : '',
        }));
      }
      
      const ext = file.name.split('.').pop().toLowerCase();
      
      setProcessingStatus(t('upload_status_reading_file'));
      
      let data;
      if (ext === 'csv') {
        setProcessingStatus(t('upload_status_parsing_csv'));
        data = await parseCSVFile(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
        setProcessingStatus(t('upload_status_parsing_excel'));
        data = await parseExcel(file);
      } else {
        // Non-tabular formats are handled by server-side ingestion in the calling page.
        setProcessingStatus('');
        onFileUpload(file, null);
        return;
      }
      
      if (data && data.rows.length > 0) {
        setProcessingStatus('');
        onFileUpload(file, data);
      } else {
        throw new Error(t('upload_err_no_data_found'));
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert(t('upload_err_alert', { message: error.message }));
      setUploadedFileName('');
      setProcessingStatus('');
    }
  }, [onFileUpload, subscription, planLoaded]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      const allowed = formats.map((f) => String(f || '').replace('.', '').toLowerCase());
      if (allowed.includes(ext)) {
        processFile(file);
      } else {
        alert(t('upload_err_supported_files_only', { formats: formats.join(', ') }));
      }
    }
  }, [processFile, formats]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      const allowed = formats.map((f) => String(f || '').replace('.', '').toLowerCase());
      if (allowed.includes(ext)) {
        processFile(file);
      } else {
        alert(t('upload_err_supported_files_only', { formats: formats.join(', ') }));
        e.target.value = '';
      }
    }
  }, [processFile, formats]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const maxSizeLimit = maxUploadMb(subscription);
  const maxSize = Number.isFinite(maxSizeLimit) ? maxSizeLimit : '∞'; // for display
  // Yearly and quarterly plans are premium too (premium_yearly, premium_quarterly).
  const isPremium = String(subscription?.plan || '').toLowerCase().startsWith('premium');

  return (
    <div>
      {/* File size limit notice - royal blue for premium, strong contrast */}
      {!planLoaded ? (
        <Alert className="mb-6 bg-slate-100 border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <Info className="h-4 w-4 text-slate-500" />
          <AlertDescription className="text-slate-700 dark:text-slate-300">
            <strong className="font-bold text-base">{t('upload_checking_plan')}</strong>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className={`mb-6 ${isPremium ? 'bg-[#4169E1]/10 border-[#4169E1]/40' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <Info className={`h-4 w-4 ${isPremium ? 'text-[#4169E1]' : 'text-amber-600 dark:text-amber-400'}`} />
          <AlertDescription className={isPremium ? 'text-slate-900 dark:text-slate-200' : 'text-slate-700 dark:text-slate-300'}>
            <strong className={`font-bold text-base ${isPremium ? 'text-slate-900 dark:text-slate-100' : 'text-amber-700 dark:text-amber-300'}`}>
              {isPremium ? t('upload_plan_premium_unlimited_title') : t('upload_plan_file_size_limit_title', { maxSize })}
            </strong>
            <br />
            <span className={`text-base font-semibold ${isPremium ? 'text-slate-800 dark:text-slate-300' : ''}`}>
              {isPremium 
                ? t('upload_plan_premium_desc', { maxSize })
                : t('upload_plan_free_desc', { maxSize })}
            </span>
          </AlertDescription>
        </Alert>
      )}

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
            accept={formats.join(',')}
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing || !!processingStatus || !planLoaded}
          />
          
          <div className="flex flex-col items-center justify-center text-center">
            {isProcessing || processingStatus ? (
              <>
                <div className="relative">
                  <Loader2 className="w-20 h-20 text-[#4169E1] animate-spin mb-6" />
                  <div className="absolute inset-0 bg-[#4169E1]/20 rounded-full blur-xl animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-[#4169E1] mb-2">
                  {processingStatus || t('upload_processing_your_file')}
                </h3>
                <p className="text-slate-200 font-medium text-base">{t('upload_processing_subtitle')}</p>
              </>
            ) : uploadedFileName ? (
              <>
                <div className="relative mb-6">
                  <CheckCircle className="w-20 h-20 text-emerald-500" />
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-emerald-300 mb-2">{t('upload_file_uploaded_successfully')}</h3>
                <p className="text-slate-200 font-medium">{uploadedFileName}</p>
              </>
            ) : (
              <>
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-[#4169E1]/20 rounded-full blur-2xl" />
                  <FileSpreadsheet className="relative w-24 h-24 text-[#4169E1] mb-2" />
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-4">
                  {t('common_drop_file_here')}
                </h3>
                
                <p className="text-slate-200 font-semibold text-lg mb-8 max-w-md">
                  {t('upload_or')} <span className="text-[#4169E1] font-bold underline cursor-pointer">{t('upload_browse_files')}</span>
                </p>
                
                <div className="flex flex-wrap justify-center gap-3 text-base mb-6">
                  <span className="px-6 py-3 bg-[#4169E1] border border-[#4169E1] rounded-lg text-white font-bold">
                    {formats.map((f) => String(f || '').toUpperCase()).join(' • ')}
                  </span>
                </div>
                
                <p className="text-slate-300 font-medium text-sm mb-2">
                  {t('upload_browser_based_note')}
                </p>
                {planLoaded ? (
                  <p className="text-slate-200 font-semibold text-base">
                    {t('upload_max_size_line', {
                      maxSize,
                      suffix: !isPremium ? ` ${t('upload_free_plan_suffix')}` : '',
                    })}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}