// UserGuide.jsx - Comprehensive user documentation
import React from 'react';
import { BookOpen, Upload, LayoutDashboard, FileSpreadsheet, GitCompare, Calculator, Calendar, Shield, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function UserGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <BookOpen className="w-20 h-20 text-blue-600 mx-auto mb-4" />
          <h1 className="text-5xl font-bold text-blue-900 mb-3">User Guide</h1>
          <p className="text-blue-700 text-lg">
            Everything you need to know about InsightSheet-lite
          </p>
        </div>

        {/* Privacy Notice */}
        <Alert className="mb-8 bg-green-100 border-green-300">
          <Shield className="w-5 h-5 text-emerald-600" />
          <AlertDescription className="text-emerald-900">
            <strong>100% Privacy Guaranteed:</strong> All data processing happens in your browser.
            Nothing is uploaded to servers. Close your tab to permanently delete all data.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="basics" className="space-y-6">
          <TabsList className="bg-white border border-blue-200 p-1 grid grid-cols-4 gap-2">
            <TabsTrigger value="basics" className="data-[state=active]:bg-blue-600">
              Basics
            </TabsTrigger>
            <TabsTrigger value="features" className="data-[state=active]:bg-blue-600">
              Features
            </TabsTrigger>
            <TabsTrigger value="workflows" className="data-[state=active]:bg-emerald-600">
              Workflows
            </TabsTrigger>
            <TabsTrigger value="tips" className="data-[state=active]:bg-indigo-600">
              Tips & Tricks
            </TabsTrigger>
          </TabsList>

          {/* Basics Tab */}
          <TabsContent value="basics" className="space-y-6">
            <Card className="bg-white border border-blue-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-blue-900 text-2xl">Getting Started</CardTitle>
                <CardDescription className="text-blue-700 text-lg">
                  Learn the basics in 5 minutes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-purple-300 mb-2">Upload Your File</h3>
                    <p className="text-slate-400 mb-3">
                      Go to the <strong>Upload</strong> page and drag & drop your Excel (.xlsx, .xls) or CSV file.
                      Files up to 5MB process instantly. No signup required.
                    </p>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-sm text-emerald-400">✓ Supported: .xlsx, .xls, .csv</p>
                      <p className="text-sm text-blue-400">✓ File size: Up to 5MB (free) | 50MB (Pro)</p>
                      <p className="text-sm text-purple-400">✓ Privacy: Processed locally in your browser</p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-blue-300 mb-2">Automatic Processing</h3>
                    <p className="text-slate-400 mb-3">
                      Your file is parsed instantly. Headers are detected automatically. You're redirected
                      to the Dashboard where all tools are available.
                    </p>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-sm text-slate-300">✓ Headers detected from first row</p>
                      <p className="text-sm text-slate-300">✓ Data types inferred automatically</p>
                      <p className="text-sm text-slate-300">✓ Preview generated for validation</p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-emerald-300 mb-2">Use the Dashboard</h3>
                    <p className="text-slate-400 mb-3">
                      Access powerful tools: data cleaning, AI insights, formulas, charts, and transformations.
                      All features work offline in your browser.
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-sm text-purple-300 font-semibold mb-1">Analysis & Cleaning</p>
                        <p className="text-xs text-slate-400">Remove duplicates, handle missing values, format data</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-sm text-blue-300 font-semibold mb-1">Transform Data</p>
                        <p className="text-xs text-slate-400">Sort, filter, create calculated columns</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-sm text-pink-300 font-semibold mb-1">AI Tools</p>
                        <p className="text-xs text-slate-400">Natural language queries and insights</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-sm text-emerald-300 font-semibold mb-1">Charts & Viz</p>
                        <p className="text-xs text-slate-400">Auto-generated visualizations</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-600 to-rose-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-pink-300 mb-2">Export Your Results</h3>
                    <p className="text-slate-400 mb-3">
                      Export cleaned data as Excel or CSV. All changes are preserved. Download includes
                      your transformations and calculated columns.
                    </p>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-sm text-emerald-400">✓ Export to Excel (.xlsx)</p>
                      <p className="text-sm text-blue-400">✓ Export to CSV</p>
                      <p className="text-sm text-purple-400">✓ Original formatting preserved</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload Page */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Page
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-purple-300">Key Features:</h4>
                    <ul className="space-y-1 text-sm text-slate-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Drag & drop file upload
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        AI Formula Assistant (describe what you want)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Instant file validation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Automatic redirect to Dashboard
                      </li>
                    </ul>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-300">
                      <strong className="text-purple-400">Pro tip:</strong> Use AI Formula Assistant to describe
                      operations before uploading. Formulas will be ready to apply on the Dashboard!
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Dashboard */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5" />
                    Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-purple-300">Key Features:</h4>
                    <ul className="space-y-1 text-sm text-slate-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Data grid with search & filter
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Data cleaning tools (duplicates, nulls, formatting)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        AI insights and analysis
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Smart formulas (50+ Excel functions)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Charts and visualizations
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Sheet Manager */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    Sheet Manager
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-purple-300">Key Features:</h4>
                    <ul className="space-y-1 text-sm text-slate-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Import multi-sheet Excel workbooks
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Tab navigation (like Excel)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Link related sheets together
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Tag sheets for organization
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Export all sheets as single Excel file
                      </li>
                    </ul>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-300">
                      <strong className="text-purple-400">Use case:</strong> Manage quarterly reports (Q1, Q2, Q3, Q4)
                      in one workbook with linked consolidation sheet.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Reconciliation */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <GitCompare className="w-5 h-5" />
                    Reconciliation Tool
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-purple-300">Key Features:</h4>
                    <ul className="space-y-1 text-sm text-slate-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        XLOOKUP/VLOOKUP automation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Match two datasets automatically
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Detect matched, mismatched, missing records
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Visual variance highlighting
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Export reconciliation report
                      </li>
                    </ul>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-300">
                      <strong className="text-purple-400">Perfect for:</strong> Bank reconciliation, inventory
                      matching, invoice verification, data quality checks.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Accounting Toolkit */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Accounting Toolkit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-purple-300">Key Features:</h4>
                    <ul className="space-y-1 text-sm text-slate-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Journal entries (debits/credits)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Auto-calculated trial balance
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Income statement generation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Financial ratios (profit margin, ROE, etc.)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Export to CSV for accounting software
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Project Tracker */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Project Tracker
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-purple-300">Key Features:</h4>
                    <ul className="space-y-1 text-sm text-slate-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Gantt chart timeline visualization
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Task management with progress tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Working days calculation (WORKDAY)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Budget vs Actual cost tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Earned Value Management (CPI, SPI, EAC, VAC)
                      </li>
                    </ul>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-300">
                      <strong className="text-purple-400">PMP Certified:</strong> Includes all PMBOK Earned
                      Value formulas for professional project management.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-purple-200 text-2xl">Common Workflows</CardTitle>
                <CardDescription className="text-slate-400 text-lg">
                  Step-by-step guides for common tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Workflow 1 */}
                <div className="border-l-4 border-purple-500 pl-6">
                  <h3 className="text-xl font-bold text-purple-300 mb-4">1. Analyze & Clean Excel Data</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge className="bg-purple-600 shrink-0">Step 1</Badge>
                      <p className="text-slate-400">Go to <strong className="text-purple-300">Upload</strong> page → Upload your Excel/CSV file</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-purple-600 shrink-0">Step 2</Badge>
                      <p className="text-slate-400">Dashboard loads automatically → Click <strong className="text-blue-300">"Analysis & Cleaning"</strong> tab</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-purple-600 shrink-0">Step 3</Badge>
                      <p className="text-slate-400">Use cleaning tools: Remove duplicates, Handle nulls, Fix formatting</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-purple-600 shrink-0">Step 4</Badge>
                      <p className="text-slate-400">Review AI insights → Check charts for data patterns</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-purple-600 shrink-0">Step 5</Badge>
                      <p className="text-slate-400">Click <strong className="text-emerald-300">"Export"</strong> → Choose Excel or CSV → Done!</p>
                    </div>
                  </div>
                </div>

                {/* Workflow 2 */}
                <div className="border-l-4 border-blue-500 pl-6">
                  <h3 className="text-xl font-bold text-blue-300 mb-4">2. Work with Multi-Sheet Excel Files</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge className="bg-blue-600 shrink-0">Step 1</Badge>
                      <p className="text-slate-400">Click <strong className="text-blue-300">"Sheets"</strong> in top menu</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-blue-600 shrink-0">Step 2</Badge>
                      <p className="text-slate-400">Click "Import Excel" → Select your .xlsx file with multiple sheets</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-blue-600 shrink-0">Step 3</Badge>
                      <p className="text-slate-400">All sheets appear as tabs → Click tabs to switch between sheets</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-blue-600 shrink-0">Step 4</Badge>
                      <p className="text-slate-400">Add tags to organize (e.g., "Q1", "Revenue", "Draft")</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-blue-600 shrink-0">Step 5</Badge>
                      <p className="text-slate-400">Link related sheets → Click "Export All" to download complete workbook</p>
                    </div>
                  </div>
                </div>

                {/* Workflow 3 */}
                <div className="border-l-4 border-emerald-500 pl-6">
                  <h3 className="text-xl font-bold text-emerald-300 mb-4">3. Reconcile Two Datasets (XLOOKUP/VLOOKUP)</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge className="bg-emerald-600 shrink-0">Step 1</Badge>
                      <p className="text-slate-400">Upload your main dataset from <strong className="text-purple-300">Upload</strong> page</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-emerald-600 shrink-0">Step 2</Badge>
                      <p className="text-slate-400">Export your second sheet from Excel as CSV</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-emerald-600 shrink-0">Step 3</Badge>
                      <p className="text-slate-400">Click <strong className="text-emerald-300">"Reconcile"</strong> in top menu → Upload second CSV as target</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-emerald-600 shrink-0">Step 4</Badge>
                      <p className="text-slate-400">Select matching columns (e.g., "State" matches "STATE")</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-emerald-600 shrink-0">Step 5</Badge>
                      <p className="text-slate-400">Choose columns to compare → Click "Run Reconciliation"</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-emerald-600 shrink-0">Step 6</Badge>
                      <p className="text-slate-400">See results: ✓ Matched, ⚠ Mismatched, ✗ Missing, + Extra</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-emerald-600 shrink-0">Step 7</Badge>
                      <p className="text-slate-400">Export reconciliation report as CSV</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tips & Tricks Tab */}
          <TabsContent value="tips" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Pro Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                    <h4 className="font-semibold text-purple-300 mb-1">AI Formula Assistant</h4>
                    <p className="text-sm text-slate-400">
                      Describe what you want before uploading your file. The AI will generate formulas
                      that are ready to apply on the Dashboard.
                    </p>
                  </div>
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                    <h4 className="font-semibold text-blue-300 mb-1">Privacy Mode</h4>
                    <p className="text-sm text-slate-400">
                      Close your tab to delete all data permanently. Nothing is stored on servers.
                      Open new tab = fresh start.
                    </p>
                  </div>
                  <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3">
                    <h4 className="font-semibold text-emerald-300 mb-1">Link Sheets for Quick Access</h4>
                    <p className="text-sm text-slate-400">
                      In Sheet Manager, link related sheets together. One click to jump from NAMES
                      sheet to STATES sheet.
                    </p>
                  </div>
                  <div className="bg-pink-900/20 border border-pink-500/30 rounded-lg p-3">
                    <h4 className="font-semibold text-pink-300 mb-1">Upgrade for Larger Files</h4>
                    <p className="text-sm text-slate-400">
                      Free: 5MB | Pro: 50MB. Need enterprise features? Contact us for custom limits.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Common Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Q: Where is my data stored?</h4>
                    <p className="text-sm text-slate-400">
                      A: Only in your browser's memory. Nothing goes to servers. Close tab = data gone.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Q: Can I use this offline?</h4>
                    <p className="text-sm text-slate-400">
                      A: Yes! After loading the page once, most features work offline (except AI).
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Q: How do I save my work?</h4>
                    <p className="text-sm text-slate-400">
                      A: Export your data as Excel or CSV. Use Sheet Manager to save snapshots locally.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Q: Can AI see my data?</h4>
                    <p className="text-sm text-slate-400">
                      A: AI processes data locally when possible. For specific questions, only the
                      relevant data is sent (never full dataset).
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Q: What Excel functions are supported?</h4>
                    <p className="text-sm text-slate-400">
                      A: 50+ functions including VLOOKUP, XLOOKUP, SUMIF, NPV, IRR, WORKDAY, and more.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feature Summary */}
            <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-200 text-2xl">What InsightSheet-lite Can Do</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-bold text-purple-300">Data Management</h4>
                    <ul className="space-y-1 text-sm text-slate-300">
                      <li>✓ Excel & CSV support</li>
                      <li>✓ Multi-sheet workbooks</li>
                      <li>✓ Data cleaning</li>
                      <li>✓ Transformations</li>
                      <li>✓ 50+ Excel functions</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-blue-300">Advanced Tools</h4>
                    <ul className="space-y-1 text-sm text-slate-300">
                      <li>✓ Data reconciliation</li>
                      <li>✓ XLOOKUP/VLOOKUP</li>
                      <li>✓ Accounting suite</li>
                      <li>✓ Project tracking</li>
                      <li>✓ Gantt charts & EVM</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-emerald-300">AI Features</h4>
                    <ul className="space-y-1 text-sm text-slate-300">
                      <li>✓ Formula assistant</li>
                      <li>✓ Natural language queries</li>
                      <li>✓ Automatic insights</li>
                      <li>✓ Data analysis</li>
                      <li>✓ Chart suggestions</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
