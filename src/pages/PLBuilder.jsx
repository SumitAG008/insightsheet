import { useState, useEffect } from 'react';
import { backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, Sparkles, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function PLBuilder() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [context, setContext] = useState({
    company_name: '',
    currency: 'USD',
    period_type: 'monthly',
  });

  const examplePrompts = [
    "Create monthly P&L for 2024 with revenue, cost of goods sold, and operating expenses",
    "Build quarterly profit and loss statement for Q1-Q4 2024 with sales, marketing, and R&D costs",
    "Generate annual P&L with department-wise breakdown and net profit calculation",
    "Create a simple monthly P&L with revenue and expenses for a small business",
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description for your P&L statement');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const blob = await backendApi.files.generatePL(prompt, context);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Profit_Loss_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('P&L statement generated and downloaded!');
      setPrompt('');
    } catch (err) {
      setError(err.message);
      toast.error(err.message || 'Failed to generate P&L statement');
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example) => {
    setPrompt(example);
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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">P&L Builder</h1>
        <p className="text-muted-foreground">
          Generate professional Profit & Loss statements from natural language. 
          Just describe what you need, and we'll create a fully formatted Excel file with formulas and charts.
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
            <Sparkles className="h-5 w-5" />
            Describe Your P&L Statement
          </CardTitle>
          <CardDescription>
            Use natural language to describe the profit and loss statement you want to create
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="prompt">What kind of P&L statement do you need?</Label>
            <Textarea
              id="prompt"
              placeholder="Example: Create monthly P&L for 2024 with revenue, expenses, and net profit..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="company">Company Name (Optional)</Label>
              <input
                id="company"
                type="text"
                value={context.company_name}
                onChange={(e) => setContext({ ...context, company_name: e.target.value })}
                placeholder="My Company"
                className="w-full mt-2 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={context.currency}
                onChange={(e) => setContext({ ...context, currency: e.target.value })}
                className="w-full mt-2 px-3 py-2 border rounded-md"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="period">Period Type</Label>
              <select
                id="period"
                value={context.period_type}
                onChange={(e) => setContext({ ...context, period_type: e.target.value })}
                className="w-full mt-2 px-3 py-2 border rounded-md"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating P&L Statement...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Generate P&L Statement
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example Prompts</CardTitle>
          <CardDescription>
            Click on any example to use it as a starting point
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {examplePrompts.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="w-full text-left p-3 border rounded-md hover:bg-accent transition-colors"
              >
                <p className="text-sm">{example}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-blue-50 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">What You'll Get</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Fully formatted Excel file with professional styling</li>
                <li>• Automatic formulas for calculations (SUM, subtraction, etc.)</li>
                <li>• Charts and visualizations</li>
                <li>• Ready-to-use structure with revenue and expense categories</li>
                <li>• No data stored - file downloads immediately</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
