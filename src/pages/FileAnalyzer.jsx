import { useState, useRef, useEffect } from 'react';
import { backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function FileAnalyzer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        toast.error('Please upload an Excel or CSV file');
        return;
      }
      setFile(selectedFile);
      setAnalysis(null);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setFile(droppedFile);
      setAnalysis(null);
      setError(null);
    } else {
      toast.error('Please drop an Excel or CSV file');
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await backendApi.files.analyzeFile(file);
      setAnalysis(result);
      toast.success('File analyzed successfully!');
    } catch (err) {
      setError(err.message);
      toast.error(err.message || 'Failed to analyze file');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Check backend connection
  const [backendConnected, setBackendConnected] = useState(true);
  const [backendError, setBackendError] = useState(null);

  useEffect(() => {
    // Check if backend is reachable
    const checkBackend = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8001' : '');
        if (!API_URL) {
          throw new Error('API URL not configured');
        }
        const response = await fetch(`${API_URL}/api/health`, { method: 'GET' });
        if (!response.ok) throw new Error('Backend not responding');
        setBackendConnected(true);
        setBackendError(null);
      } catch (err) {
        setBackendConnected(false);
        setBackendError('Backend server is not connected. Please ensure the backend is deployed and running.');
      }
    };
    checkBackend();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">File Analyzer</h1>
        <p className="text-muted-foreground">
          Upload an Excel or CSV file to get AI-powered insights about its structure, 
          data quality, and suggested operations. Understand your data instantly!
        </p>
      </div>

      {!backendConnected && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Backend Connection Required:</strong> {backendError || 'The backend server is not reachable. This feature requires a connected backend. Please check your backend deployment or contact support.'}
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Your File
          </CardTitle>
          <CardDescription>
            Supports .xlsx, .xls, and .csv files of any size
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="space-y-2">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                <p className="font-semibold">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setAnalysis(null);
                  }}
                >
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="font-semibold">Drop your file here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
            )}
          </div>

          {file && (
            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full mt-4"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing File...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analyze File
                </>
              )}
            </Button>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <div className="space-y-6">
          {/* Overall Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-muted-foreground">File Type</p>
                  <p className="text-2xl font-bold">{analysis.file_type}</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-muted-foreground">Sheets</p>
                  <p className="text-2xl font-bold">{analysis.sheet_count}</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                  <p className="text-2xl font-bold">
                    {analysis.overall_summary?.total_rows?.toLocaleString() || 'N/A'}
                  </p>
                </div>
                {analysis.overall_summary?.overall_data_quality_score != null && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                    <p className="text-sm text-muted-foreground">Data Quality Score (ML)</p>
                    <p className="text-2xl font-bold">{analysis.overall_summary.overall_data_quality_score}/100</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Summary */}
          {analysis.sheets?.[0]?.ai_summary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Data Type</h3>
                  <p className="text-muted-foreground">
                    {analysis.sheets[0].ai_summary.data_type}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <p className="text-muted-foreground">
                    {analysis.sheets[0].ai_summary.summary}
                  </p>
                </div>
                {analysis.sheets[0].ai_summary.key_insights && (
                  <div>
                    <h3 className="font-semibold mb-2">Key Insights</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {analysis.sheets[0].ai_summary.key_insights.map((insight, idx) => (
                        <li key={idx}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sheet Details */}
          {analysis.sheets?.map((sheet, sheetIdx) => (
            <Card key={sheetIdx}>
              <CardHeader>
                <CardTitle>{sheet.name || `Sheet ${sheetIdx + 1}`}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>{sheet.row_count} rows × {sheet.column_count} columns</span>
                  {sheet.data_quality_score != null && (
                    <span className="text-amber-600 dark:text-amber-400">Data quality: {sheet.data_quality_score}/100</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Outliers (ML - IQR) */}
                {sheet.outliers?.by_column?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Outliers (IQR)</h3>
                    <div className="space-y-2">
                      {sheet.outliers.by_column.map((o, i) => (
                        <div key={i} className="p-2 rounded bg-amber-50 dark:bg-amber-950/50 text-sm">
                          <span className="font-medium">{o.column}</span>: {o.count} outlier(s)
                          {o.sample_values?.length > 0 && (
                            <span className="text-muted-foreground"> — sample: {o.sample_values.slice(0, 3).join(', ')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Data Quality */}
                {sheet.quality_issues && sheet.quality_issues.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Data Quality Issues
                    </h3>
                    <div className="space-y-2">
                      {sheet.quality_issues.map((issue, idx) => (
                        <Alert key={idx} variant={issue.severity === 'high' ? 'destructive' : 'default'}>
                          <AlertDescription>{issue.message}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                {/* Column Analysis */}
                {sheet.columns && sheet.columns.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Columns</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {sheet.columns.slice(0, 10).map((col, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <p className="font-medium">{col.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Type: {col.type} • {col.null_percentage?.toFixed(1)}% missing
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Recommendations
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {analysis.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6 bg-blue-50 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Privacy First</h3>
              <p className="text-sm text-muted-foreground">
                Your file is analyzed in real-time and never stored on our servers. 
                All processing happens instantly and your data remains completely private.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
