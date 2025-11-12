// SheetManager.jsx - Multi-sheet Excel workbook management
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileSpreadsheet, Plus, X, Link as LinkIcon, Tag, Clock, Download, Upload as UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SheetManager() {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(null);
  const [sheetData, setSheetData] = useState({});
  const [sheetTags, setSheetTags] = useState({});
  const [sheetLinks, setSheetLinks] = useState({});
  const [newTag, setNewTag] = useState('');
  const [selectedLinkSheet, setSelectedLinkSheet] = useState('');

  useEffect(() => {
    // Load data from sessionStorage
    const storedData = sessionStorage.getItem('insightsheet_data');
    const storedFilename = sessionStorage.getItem('insightsheet_filename');

    if (storedData) {
      const data = JSON.parse(storedData);
      const sheetName = storedFilename || 'Sheet1';
      setSheets([sheetName]);
      setSheetData({ [sheetName]: data });
      setActiveSheet(sheetName);
    }

    // Load saved sheet manager state
    const savedSheets = localStorage.getItem('sheetmanager_sheets');
    const savedData = localStorage.getItem('sheetmanager_data');
    const savedTags = localStorage.getItem('sheetmanager_tags');
    const savedLinks = localStorage.getItem('sheetmanager_links');

    if (savedSheets) setSheets(JSON.parse(savedSheets));
    if (savedData) setSheetData(JSON.parse(savedData));
    if (savedTags) setSheetTags(JSON.parse(savedTags));
    if (savedLinks) setSheetLinks(JSON.parse(savedLinks));
  }, []);

  const saveState = (newSheets, newData, newTags, newLinks) => {
    localStorage.setItem('sheetmanager_sheets', JSON.stringify(newSheets));
    localStorage.setItem('sheetmanager_data', JSON.stringify(newData));
    localStorage.setItem('sheetmanager_tags', JSON.stringify(newTags));
    localStorage.setItem('sheetmanager_links', JSON.stringify(newLinks));
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    // Check if XLSX library is loaded
    if (!window.XLSX) {
      alert('Excel library not loaded. Please refresh the page and try again.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });

        const newSheets = [];
        const newData = {};

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length > 0) {
            const headers = jsonData[0];
            const rows = jsonData.slice(1).map(row => {
              const rowObj = {};
              headers.forEach((header, idx) => {
                rowObj[header] = row[idx];
              });
              return rowObj;
            });

            newSheets.push(sheetName);
            newData[sheetName] = {
              headers: headers,
              rows: rows
            };
          }
        });

        setSheets(newSheets);
        setSheetData(newData);
        if (newSheets.length > 0) {
          setActiveSheet(newSheets[0]);
        }

        saveState(newSheets, newData, sheetTags, sheetLinks);

        alert(`Successfully imported ${newSheets.length} sheet(s)`);
      } catch (error) {
        console.error('Error importing Excel:', error);
        alert('Error importing Excel file. Please make sure it\'s a valid Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddSheet = () => {
    const newSheetName = prompt('Enter new sheet name:');
    if (!newSheetName) return;

    if (sheets.includes(newSheetName)) {
      alert('Sheet name already exists');
      return;
    }

    const newSheets = [...sheets, newSheetName];
    const newData = {
      ...sheetData,
      [newSheetName]: {
        headers: [],
        rows: []
      }
    };

    setSheets(newSheets);
    setSheetData(newData);
    setActiveSheet(newSheetName);
    saveState(newSheets, newData, sheetTags, sheetLinks);
  };

  const handleDeleteSheet = (sheetName) => {
    if (!confirm(`Delete sheet "${sheetName}"?`)) return;

    const newSheets = sheets.filter(s => s !== sheetName);
    const newData = { ...sheetData };
    delete newData[sheetName];

    const newTags = { ...sheetTags };
    delete newTags[sheetName];

    const newLinks = { ...sheetLinks };
    delete newLinks[sheetName];

    setSheets(newSheets);
    setSheetData(newData);
    setSheetTags(newTags);
    setSheetLinks(newLinks);

    if (activeSheet === sheetName) {
      setActiveSheet(newSheets[0] || null);
    }

    saveState(newSheets, newData, newTags, newLinks);
  };

  const handleAddTag = (sheetName) => {
    if (!newTag.trim()) return;

    const newTags = {
      ...sheetTags,
      [sheetName]: [...(sheetTags[sheetName] || []), newTag.trim()]
    };

    setSheetTags(newTags);
    setNewTag('');
    saveState(sheets, sheetData, newTags, sheetLinks);
  };

  const handleRemoveTag = (sheetName, tag) => {
    const newTags = {
      ...sheetTags,
      [sheetName]: sheetTags[sheetName].filter(t => t !== tag)
    };

    setSheetTags(newTags);
    saveState(sheets, sheetData, newTags, sheetLinks);
  };

  const handleLinkSheet = (fromSheet) => {
    if (!selectedLinkSheet) return;

    const newLinks = {
      ...sheetLinks,
      [fromSheet]: [...(sheetLinks[fromSheet] || []), selectedLinkSheet]
    };

    setSheetLinks(newLinks);
    setSelectedLinkSheet('');
    saveState(sheets, sheetData, sheetTags, newLinks);
  };

  const handleExportAll = () => {
    if (sheets.length === 0) {
      alert('No sheets to export');
      return;
    }

    if (!window.XLSX) {
      alert('Excel library not loaded');
      return;
    }

    const wb = window.XLSX.utils.book_new();

    sheets.forEach(sheetName => {
      const data = sheetData[sheetName];
      if (data && data.rows) {
        const ws_data = [data.headers];
        data.rows.forEach(row => {
          ws_data.push(data.headers.map(h => row[h] ?? ''));
        });

        const ws = window.XLSX.utils.aoa_to_sheet(ws_data);
        window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    window.XLSX.writeFile(wb, `insightsheet_${timestamp}.xlsx`);
  };

  if (sheets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center max-w-2xl mx-auto">
            <FileSpreadsheet className="w-24 h-24 text-purple-400 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-purple-200 mb-4">Smart Sheet Manager</h1>
            <p className="text-slate-400 mb-8">
              Import multi-sheet Excel workbooks, organize with tags, link related sheets, and manage versions.
            </p>

            <div className="space-y-4">
              <label className="block">
                <div className="cursor-pointer bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800 text-white px-8 py-4 rounded-lg transition-all shadow-lg shadow-slate-500/50 inline-flex items-center gap-3">
                  <UploadIcon className="w-5 h-5" />
                  <span className="font-semibold">Import Excel File</span>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportExcel}
                  className="hidden"
                />
              </label>

              <p className="text-sm text-blue-600">
                Or upload data from the{' '}
                <button
                  onClick={() => navigate(createPageUrl('Upload'))}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Upload page
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentData = sheetData[activeSheet];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-900 mb-2">Sheet Manager</h1>
            <p className="text-blue-700">{sheets.length} sheet(s) loaded</p>
          </div>

          <div className="flex gap-3">
            <label>
              <Button variant="outline" className="border-purple-600 text-purple-300 hover:bg-purple-900/50">
                <UploadIcon className="w-4 h-4 mr-2" />
                Import Excel
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>

            <Button
              onClick={handleExportAll}
              className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800"
            >
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>

            <Button
              onClick={handleAddSheet}
              className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Sheet
            </Button>
          </div>
        </div>

        {/* Sheet Tabs */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {sheets.map((sheetName) => (
              <div key={sheetName} className="relative group">
                <button
                  onClick={() => setActiveSheet(sheetName)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    activeSheet === sheetName
                      ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {sheetName}
                  {sheetTags[sheetName]?.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {sheetTags[sheetName].length}
                    </Badge>
                  )}
                </button>

                <button
                  onClick={() => handleDeleteSheet(sheetName)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {activeSheet && (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Data Grid */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200">Sheet Data: {activeSheet}</CardTitle>
                  <CardDescription className="text-slate-400">
                    {currentData?.rows?.length || 0} rows × {currentData?.headers?.length || 0} columns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentData && currentData.rows && currentData.rows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            {currentData.headers.map((header, idx) => (
                              <th key={idx} className="px-4 py-2 text-left text-purple-300 font-semibold">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {currentData.rows.slice(0, 10).map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b border-slate-800 hover:bg-slate-800/50">
                              {currentData.headers.map((header, colIdx) => (
                                <td key={colIdx} className="px-4 py-2 text-slate-300">
                                  {row[header]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {currentData.rows.length > 10 && (
                        <p className="text-center text-slate-500 text-sm mt-4">
                          Showing 10 of {currentData.rows.length} rows
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">No data in this sheet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Tags */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag(activeSheet)}
                      placeholder="Add tag..."
                      className="bg-slate-800 border-slate-700 text-slate-300"
                    />
                    <Button
                      onClick={() => handleAddTag(activeSheet)}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {sheetTags[activeSheet]?.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(activeSheet, tag)}
                          className="ml-1 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Linked Sheets */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <LinkIcon className="w-5 h-5" />
                    Linked Sheets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={selectedLinkSheet}
                      onChange={(e) => setSelectedLinkSheet(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-300 text-sm"
                    >
                      <option value="">Select sheet...</option>
                      {sheets
                        .filter(s => s !== activeSheet && !sheetLinks[activeSheet]?.includes(s))
                        .map(sheet => (
                          <option key={sheet} value={sheet}>{sheet}</option>
                        ))}
                    </select>
                    <Button
                      onClick={() => handleLinkSheet(activeSheet)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Link
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {sheetLinks[activeSheet]?.map((linkedSheet, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-800 rounded-lg p-2">
                        <button
                          onClick={() => setActiveSheet(linkedSheet)}
                          className="text-sm text-purple-400 hover:text-purple-300"
                        >
                          {linkedSheet}
                        </button>
                        <button
                          onClick={() => {
                            const newLinks = {
                              ...sheetLinks,
                              [activeSheet]: sheetLinks[activeSheet].filter(s => s !== linkedSheet)
                            };
                            setSheetLinks(newLinks);
                            saveState(sheets, sheetData, sheetTags, newLinks);
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Version History */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Version History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">
                    Version history coming soon...
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
