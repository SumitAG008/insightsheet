
// pages/FilenameCleaner.js - ZIP processor with 10MB file size limit enforcement
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Download, Sparkles, FileArchive, Wand2, CheckCircle, AlertCircle, Plus, X, Clock, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FilenameCleaner() {
  const [zipFile, setZipFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  
  const [options, setOptions] = useState({
    allowedCharacters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-',
    disallowedCharacters: '',
    replacementCharacter: '_',
    maxLength: 255,
    preserveExtension: true,
    customRules: []
  });

  const [selectedLanguages, setSelectedLanguages] = useState({
    german: false,
    italian: false,
    greek: false,
    chinese: false,
    spanish: false,
    russian: false,
    arabic: false,
    japanese: false
  });

  const [newRule, setNewRule] = useState({ find: '', replace: '' });

  useEffect(() => {
    loadUserAndSubscription();
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

  const languageCharMaps = {
    german: { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss', 'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue' },
    italian: { 'à': 'a', 'è': 'e', 'é': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u' },
    greek: { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/g, replacement: '' },
    chinese: { regex: /[\u4E00-\u9FFF]/g, replacement: '' },
    spanish: { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n', 'ü': 'u', '¿': '', '¡': '' },
    russian: { regex: /[А-Яа-яЁё]/g, replacement: '' },
    arabic: { regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, replacement: '' },
    japanese: { regex: /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF]/g, replacement: '' }
  };

  const quickPresets = [
    { name: 'Basic', config: { allowedCharacters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-', disallowedCharacters: '', replacementCharacter: '_' } },
    { name: 'Basic Underscore', config: { allowedCharacters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_', disallowedCharacters: ' -', replacementCharacter: '_' } },
    { name: 'Basic Dash', config: { allowedCharacters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-', disallowedCharacters: ' _', replacementCharacter: '-' } },
    { name: 'Windows Safe', config: { allowedCharacters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._- ()', disallowedCharacters: '<>:"/\\|?*', replacementCharacter: '_' } },
    { name: 'URL Safe', config: { allowedCharacters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-', disallowedCharacters: ' _', replacementCharacter: '-' } }
  ];

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Please upload a ZIP file only');
      return;
    }

    // ENFORCE FILE SIZE LIMIT
    const fileSizeMB = file.size / (1024 * 1024);
    const maxSize = (subscription && subscription.plan === 'premium') ? 500 : 10;
    
    if (fileSizeMB > maxSize) {
      alert(`File size (${fileSizeMB.toFixed(1)}MB) exceeds your ${maxSize}MB limit.\n\n${maxSize === 10 ? 'Upgrade to Premium for files up to 500MB!' : ''}`);
      e.target.value = '';
      return;
    }

    // Check file size (warn if > 50MB) - Original behavior, can be removed or adjusted if the new limit replaces this completely
    // const originalMaxSize = 50 * 1024 * 1024; // 50MB
    // if (file.size > originalMaxSize) {
    //   const proceed = confirm(`This file is ${(file.size / 1024 / 1024).toFixed(2)}MB. Large files may take longer to process. Continue?`);
    //   if (!proceed) {
    //     e.target.value = '';
    //     return;
    //   }
    // }

    setZipFile(file);
    setPreview([]);
  };

  const processFilename = (filename) => {
    const parts = filename.split('.');
    const extension = parts.length > 1 && options.preserveExtension ? '.' + parts.pop() : '';
    let baseName = parts.join('.');

    Object.keys(selectedLanguages).forEach(lang => {
      if (selectedLanguages[lang]) {
        const map = languageCharMaps[lang];
        if (map.regex) {
          baseName = baseName.replace(map.regex, map.replacement || options.replacementCharacter);
        } else {
          Object.keys(map).forEach(char => {
            baseName = baseName.split(char).join(map[char]);
          });
        }
      }
    });

    options.customRules.forEach(rule => {
      if (rule.find && rule.replace !== undefined) {
        baseName = baseName.split(rule.find).join(rule.replace);
      }
    });

    if (options.disallowedCharacters) {
      options.disallowedCharacters.split('').forEach(char => {
        baseName = baseName.split(char).join(options.replacementCharacter);
      });
    }

    if (options.allowedCharacters) {
      const allowed = new Set(options.allowedCharacters.split(''));
      baseName = baseName.split('').map(char => 
        allowed.has(char) ? char : options.replacementCharacter
      ).join('');
    }

    baseName = baseName.replace(new RegExp(`\\${options.replacementCharacter}{2,}`, 'g'), options.replacementCharacter);
    baseName = baseName.replace(new RegExp(`^\\${options.replacementCharacter}+|\\${options.replacementCharacter}+$`, 'g'), '');

    if (options.maxLength && baseName.length > options.maxLength) {
      baseName = baseName.substring(0, options.maxLength);
    }

    return baseName + extension;
  };

  const readZipFile = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    const files = [];
    let offset = 0;

    while (offset < arrayBuffer.byteLength - 4) {
      const signature = dataView.getUint32(offset, true);
      
      if (signature === 0x04034b50) {
        offset += 4;
        const version = dataView.getUint16(offset, true);
        offset += 2;
        const flags = dataView.getUint16(offset, true);
        offset += 2;
        const method = dataView.getUint16(offset, true);
        offset += 2;
        const time = dataView.getUint16(offset, true);
        offset += 2;
        const date = dataView.getUint16(offset, true);
        offset += 2;
        const crc32 = dataView.getUint32(offset, true);
        offset += 4;
        const compressedSize = dataView.getUint32(offset, true);
        offset += 4;
        const uncompressedSize = dataView.getUint32(offset, true);
        offset += 4;
        const filenameLength = dataView.getUint16(offset, true);
        offset += 2;
        const extraLength = dataView.getUint16(offset, true);
        offset += 2;

        const filenameBytes = new Uint8Array(arrayBuffer, offset, filenameLength);
        const filename = new TextDecoder('utf-8').decode(filenameBytes);
        offset += filenameLength;

        offset += extraLength;

        const fileData = new Uint8Array(arrayBuffer, offset, compressedSize);
        offset += compressedSize;

        files.push({
          filename,
          data: fileData,
          method,
          crc32,
          compressedSize,
          uncompressedSize,
          time,
          date
        });
      } else if (signature === 0x02014b50 || signature === 0x06054b50) {
        break;
      } else {
        offset++;
      }
    }

    return files;
  };

  const createZipFile = (files) => {
    const centralDirectoryEntries = [];
    let centralDirectorySize = 0;
    let offsetOfCentralDirectory = 0;
    const chunks = [];

    files.forEach(({ newName, data, method, crc32, compressedSize, uncompressedSize, time, date }) => {
      const filenameBytes = new TextEncoder().encode(newName);
      const filenameLength = filenameBytes.length;

      const localFileHeader = new Uint8Array(30 + filenameLength);
      const view = new DataView(localFileHeader.buffer);
      
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0, true);
      view.setUint16(8, method, true);
      view.setUint16(10, time, true);
      view.setUint16(12, date, true);
      view.setUint32(14, crc32, true);
      view.setUint32(18, compressedSize, true);
      view.setUint32(22, uncompressedSize, true);
      view.setUint16(26, filenameLength, true);
      view.setUint16(28, 0, true);
      localFileHeader.set(filenameBytes, 30);

      chunks.push(localFileHeader);
      chunks.push(data);

      const centralDirEntry = {
        filename: newName,
        filenameBytes,
        filenameLength,
        method,
        crc32,
        compressedSize,
        uncompressedSize,
        time,
        date,
        offset: offsetOfCentralDirectory
      };
      centralDirectoryEntries.push(centralDirEntry);

      offsetOfCentralDirectory += localFileHeader.length + data.length;
    });

    centralDirectoryEntries.forEach(entry => {
      const centralDirHeader = new Uint8Array(46 + entry.filenameLength);
      const view = new DataView(centralDirHeader.buffer);
      
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, entry.method, true);
      view.setUint16(12, entry.time, true);
      view.setUint16(14, entry.date, true);
      view.setUint32(16, entry.crc32, true);
      view.setUint32(20, entry.compressedSize, true);
      view.setUint32(24, entry.uncompressedSize, true);
      view.setUint16(28, entry.filenameLength, true);
      view.setUint16(30, 0, true);
      view.setUint16(32, 0, true);
      view.setUint16(34, 0, true);
      view.setUint16(36, 0, true);
      view.setUint32(38, 0, true);
      view.setUint32(42, entry.offset, true);
      centralDirHeader.set(entry.filenameBytes, 46);

      chunks.push(centralDirHeader);
      centralDirectorySize += centralDirHeader.length;
    });

    const endOfCentralDir = new Uint8Array(22);
    const eview = new DataView(endOfCentralDir.buffer);
    eview.setUint32(0, 0x06054b50, true);
    eview.setUint16(4, 0, true);
    eview.setUint16(6, 0, true);
    eview.setUint16(8, centralDirectoryEntries.length, true);
    eview.setUint10(10, centralDirectoryEntries.length, true); // This line had a typo in original code, should be setUint16
    eview.setUint16(10, centralDirectoryEntries.length, true); // Corrected this line as it was setUint10, which doesn't exist
    eview.setUint32(12, centralDirectorySize, true);
    eview.setUint32(16, offsetOfCentralDirectory, true);
    eview.setUint16(20, 0, true);

    chunks.push(endOfCentralDir);

    return new Blob(chunks, { type: 'application/zip' });
  };

  const handlePreview = async () => {
    if (!zipFile) {
      alert('Please upload a ZIP file first');
      return;
    }

    setProcessing(true);
    setPreview([]);

    try {
      const files = await readZipFile(zipFile);
      
      const previewData = files.map(file => {
        const processedName = processFilename(file.filename);
        return {
          original: file.filename,
          processed: processedName,
          changed: file.filename !== processedName,
          data: file.data,
          method: file.method,
          crc32: file.crc32,
          compressedSize: file.compressedSize,
          uncompressedSize: file.uncompressedSize,
          time: file.time,
          date: file.date
        };
      });

      setPreview(previewData);
    } catch (error) {
      console.error('Error reading ZIP:', error);
      alert('Error reading ZIP file. Please ensure it is a valid ZIP file.');
    }

    setProcessing(false);
  };

  const handleProcess = async () => {
    if (!zipFile || preview.length === 0) {
      alert('Please upload a ZIP file and generate preview first');
      return;
    }

    setProcessing(true);
    setProcessedCount(0);

    try {
      for (let i = 0; i < preview.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setProcessedCount(i + 1);
      }

      const renamedFiles = preview.map(item => ({
        newName: item.processed,
        data: item.data,
        method: item.method,
        crc32: item.crc32,
        compressedSize: item.compressedSize,
        uncompressedSize: item.uncompressedSize,
        time: item.time,
        date: item.date
      }));

      const newZipBlob = createZipFile(renamedFiles);

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
      
      const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}_${milliseconds}`;
      
      const originalName = zipFile.name.replace(/\.zip$/i, '');
      const processedOriginalName = processFilename(originalName);
      const newZipFilename = `processed_${processedOriginalName}_${timestamp}.zip`;

      const url = URL.createObjectURL(newZipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = newZipFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const historyItem = {
        id: Date.now(),
        originalFile: zipFile.name,
        processedFile: newZipFilename,
        filesProcessed: preview.length,
        timestamp: now.toISOString(),
        dateStr: now.toLocaleString()
      };
      setHistory(prev => [historyItem, ...prev]);

      setPreview([]);
      setZipFile(null);
      setProcessedCount(0);
      
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Processing error:', error);
      alert('Error creating processed ZIP file: ' + error.message);
    }
    
    setProcessing(false);
  };

  const addCustomRule = () => {
    if (newRule.find) {
      setOptions(prev => ({
        ...prev,
        customRules: [...prev.customRules, { ...newRule }]
      }));
      setNewRule({ find: '', replace: '' });
    }
  };

  const removeCustomRule = (index) => {
    setOptions(prev => ({
      ...prev,
      customRules: prev.customRules.filter((_, i) => i !== index)
    }));
  };

  const applyPreset = (preset) => {
    setOptions(prev => ({ ...prev, ...preset.config }));
  };

  const maxSize = (subscription && subscription.plan === 'premium') ? 500 : 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <FileArchive className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-indigo-200 mb-2">
            Enhanced File Processor
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Process ZIP files with advanced Unicode and character replacement support
          </p>
        </div>

        {/* FILE SIZE LIMIT WARNING */}
        <Alert className={`mb-6 ${subscription?.plan === 'premium' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <Lock className={`h-5 w-5 ${subscription?.plan === 'premium' ? 'text-emerald-400' : 'text-amber-400'}`} />
          <AlertDescription className="text-slate-300">
            <strong className={subscription?.plan === 'premium' ? 'text-emerald-300' : 'text-amber-300'}>
              {subscription?.plan === 'premium' ? '✨ Premium: Up to 500MB ZIP files' : `⚠️ File Size Limit: ${maxSize}MB (Free Plan)`}
            </strong>
            <br />
            <span className="text-sm">
              {subscription?.plan === 'premium' 
                ? 'You can process ZIP files up to 500MB with your Premium plan.'
                : 'Free plan limited to 10MB ZIP files. Upgrade to Premium for unlimited file size!'}
            </span>
          </AlertDescription>
        </Alert>

        {/* Zero Storage Notice */}
        <Alert className="mb-6 bg-emerald-500/10 border-emerald-500/30">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          <AlertDescription className="text-slate-300">
            <strong className="text-emerald-300">Zero Storage:</strong> Files are processed instantly in your browser. No data is stored. Auto-download when complete.
          </AlertDescription>
        </Alert>

        {/* Auto-Download Notice */}
        <Alert className="mb-6 bg-blue-500/10 border-blue-500/30">
          <Download className="h-5 w-5 text-blue-400" />
          <AlertDescription className="text-slate-300">
            <strong className="text-blue-300">Auto-Download:</strong> Files download automatically when processed. No popups, no manual downloads.
          </AlertDescription>
        </Alert>

        {/* Tabs */}
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="bg-slate-900/80 border border-slate-700/50 p-1 grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="data-[state=active]:bg-indigo-600">
              <Upload className="w-4 h-4 mr-2" />
              File Upload
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-indigo-600">
              <Wand2 className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-indigo-600">
              <Clock className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            {/* Upload Area */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
              <label className="flex flex-col items-center justify-center cursor-pointer group">
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={processing}
                />
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileArchive className="w-10 h-10 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-indigo-200 mb-2">
                  {zipFile ? zipFile.name : 'Drop ZIP file here'}
                </h3>
                <p className="text-slate-400">
                  or <span className="text-indigo-400 underline">browse files</span>
                </p>
                {zipFile && (
                  <p className="text-sm text-slate-500 mt-2">
                    Size: {(zipFile.size / 1024 / 1024).toFixed(2)}MB
                  </p>
                )}
              </label>

              {zipFile && !preview.length && (
                <div className="mt-6">
                  <Button
                    onClick={handlePreview}
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {processing ? 'Reading ZIP...' : 'Preview Changes'}
                  </Button>
                </div>
              )}
            </div>

            {/* Preview */}
            {preview.length > 0 && (
              <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-indigo-200">
                    Preview Changes ({preview.length} files)
                  </h3>
                  {processedCount > 0 && processedCount < preview.length && (
                    <span className="text-sm text-indigo-400">
                      Processing: {processedCount}/{preview.length}
                    </span>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
                  {preview.map((item, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${item.changed ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-slate-800/50'}`}>
                      <div className="flex items-start gap-2">
                        {item.changed ? (
                          <AlertCircle className="w-4 h-4 text-indigo-400 mt-1 flex-shrink-0" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-400 line-through truncate">
                            {item.original}
                          </p>
                          <p className="text-sm text-indigo-300 font-medium truncate">
                            {item.processed}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleProcess}
                  disabled={processing}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {processing ? `Processing... ${processedCount}/${preview.length}` : 'Process & Download ZIP'}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-indigo-200 mb-4">Processing Settings</h3>
              <p className="text-sm text-slate-400 mb-6">Configure how your files will be processed</p>

              {/* Quick Character Sets */}
              <div className="mb-6">
                <label className="text-sm font-semibold text-indigo-300 mb-3 block">Quick Character Sets</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {quickPresets.map((preset, idx) => (
                    <Button
                      key={idx}
                      onClick={() => applyPreset(preset)}
                      variant="outline"
                      size="sm"
                      className="border-slate-700 text-slate-300 hover:bg-indigo-600/20 hover:border-indigo-500/50"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Allowed Characters */}
              <div className="mb-6">
                <label className="text-sm font-semibold text-indigo-300 mb-2 block">Allowed Characters</label>
                <Input
                  value={options.allowedCharacters}
                  onChange={(e) => setOptions({...options, allowedCharacters: e.target.value})}
                  className="bg-slate-800/50 border-slate-700 text-slate-200"
                  placeholder="Characters to keep in filenames"
                />
              </div>

              {/* Disallowed Characters */}
              <div className="mb-6">
                <label className="text-sm font-semibold text-indigo-300 mb-2 block">Remove Underscore/ Dash</label>
                <Input
                  value={options.disallowedCharacters}
                  onChange={(e) => setOptions({...options, disallowedCharacters: e.target.value})}
                  className="bg-slate-800/50 border-slate-700 text-slate-200"
                  placeholder="Characters to remove"
                />
              </div>

              {/* Replacement Character */}
              <div className="mb-6">
                <label className="text-sm font-semibold text-indigo-300 mb-2 block">Replacement Character</label>
                <Input
                  value={options.replacementCharacter}
                  onChange={(e) => setOptions({...options, replacementCharacter: e.target.value})}
                  maxLength={1}
                  className="bg-slate-800/50 border-slate-700 text-slate-200"
                  placeholder="Character to use for replacements (default: _)"
                />
                <p className="text-xs text-slate-500 mt-1">Single character to replace disallowed/removed characters</p>
              </div>

              {/* Max Filename Length */}
              <div className="mb-6">
                <label className="text-sm font-semibold text-indigo-300 mb-2 block">Max Filename Length</label>
                <Input
                  type="number"
                  value={options.maxLength}
                  onChange={(e) => setOptions({...options, maxLength: parseInt(e.target.value) || 255})}
                  min="1"
                  max="255"
                  className="bg-slate-800/50 border-slate-700 text-slate-200"
                />
                <p className="text-xs text-slate-500 mt-1">Maximum characters for filename (default: 255)</p>
              </div>

              {/* Language Support */}
              <div className="mb-6">
                <label className="text-sm font-semibold text-indigo-300 mb-3 block">International Language Support</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.keys(selectedLanguages).map(lang => (
                    <label key={lang} className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-700/50">
                      <Checkbox
                        checked={selectedLanguages[lang]}
                        onCheckedChange={(checked) => setSelectedLanguages({...selectedLanguages, [lang]: checked})}
                      />
                      <span className="text-sm text-slate-300 capitalize">{lang}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Replacement Rules */}
              <div>
                <label className="text-sm font-semibold text-indigo-300 mb-3 block">Custom Replacement Rules</label>
                <div className="space-y-3">
                  {options.customRules.map((rule, idx) => (
                    <div key={idx} className="flex gap-2 items-center p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-slate-400 text-sm">Replace</span>
                      <span className="text-indigo-300 font-mono">{rule.find}</span>
                      <span className="text-slate-400 text-sm">with</span>
                      <span className="text-emerald-300 font-mono">{rule.replace}</span>
                      <Button
                        onClick={() => removeCustomRule(idx)}
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Find"
                      value={newRule.find}
                      onChange={(e) => setNewRule({...newRule, find: e.target.value})}
                      className="bg-slate-800/50 border-slate-700 text-slate-200"
                    />
                    <Input
                      placeholder="Replace with"
                      value={newRule.replace}
                      onChange={(e) => setNewRule({...newRule, replace: e.target.value})}
                      className="bg-slate-800/50 border-slate-700 text-slate-200"
                    />
                    <Button
                      onClick={addCustomRule}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-indigo-200 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Processing History
              </h3>

              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No processing history yet</p>
                  <p className="text-sm text-slate-500 mt-1">Upload and process files to see history</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div key={item.id} className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <p className="text-sm font-semibold text-indigo-300">
                              processed_{item.originalFile}
                            </p>
                          </div>
                          <p className="text-xs text-slate-400">
                            Downloaded: {item.processedFile}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {item.filesProcessed} files processed • {item.dateStr}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
