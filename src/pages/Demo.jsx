// Demo.jsx - Interactive demo and tutorial page
import React, { useState } from 'react';
import { Play, Upload, FileSpreadsheet, GitCompare, Calculator, Calendar, BookOpen, Sparkles, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Demo() {
  const navigate = useNavigate();
  const [activeDemo, setActiveDemo] = useState('upload');

  const demos = [
    {
      id: 'upload',
      icon: Upload,
      title: 'File Upload & Analysis',
      description: 'Upload Excel or CSV files and get instant insights',
      color: 'purple',
      steps: [
        'Drag & drop your Excel/CSV file',
        'Automatic data parsing and validation',
        'Instant preview and column detection',
        'Redirect to Dashboard for analysis'
      ],
      cta: 'Try Upload',
      route: 'Upload'
    },
    {
      id: 'sheets',
      icon: FileSpreadsheet,
      title: 'Multi-Sheet Management',
      description: 'Work with Excel workbooks containing multiple sheets',
      color: 'blue',
      steps: [
        'Import Excel file with multiple tabs',
        'Navigate between sheets using tabs',
        'Link related sheets together',
        'Tag and organize sheets',
        'Export all sheets as Excel'
      ],
      cta: 'Try Sheet Manager',
      route: 'SheetManager'
    },
    {
      id: 'reconcile',
      icon: GitCompare,
      title: 'Data Reconciliation',
      description: 'Match and compare two datasets using XLOOKUP/VLOOKUP logic',
      color: 'emerald',
      steps: [
        'Upload your main dataset',
        'Upload target dataset for comparison',
        'Select matching key columns',
        'Choose columns to compare',
        'Run reconciliation',
        'See matched, mismatched, and missing records',
        'Export reconciliation report'
      ],
      cta: 'Try Reconciliation',
      route: 'Reconciliation'
    },
    {
      id: 'accounting',
      icon: Calculator,
      title: 'Accounting Toolkit',
      description: 'Full accounting suite with journal entries and financial statements',
      color: 'amber',
      steps: [
        'Add journal entries (debits/credits)',
        'Auto-calculated trial balance',
        'Generate income statement',
        'Calculate financial ratios',
        'Export to CSV for accounting software'
      ],
      cta: 'Try Accounting',
      route: 'AccountingToolkit'
    },
    {
      id: 'projects',
      icon: Calendar,
      title: 'Project Tracking',
      description: 'PMP-certified project management with Gantt charts',
      color: 'pink',
      steps: [
        'Add project tasks with budgets',
        'Set start dates and durations',
        'Track progress percentage',
        'View Gantt chart timeline',
        'Monitor budget vs actual costs',
        'Calculate Earned Value metrics (CPI, SPI, EAC)'
      ],
      cta: 'Try Project Tracker',
      route: 'ProjectTracker'
    }
  ];

  const currentDemo = demos.find(d => d.id === activeDemo);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Play className="w-12 h-12 text-slate-800" />
            <h1 className="text-5xl font-bold text-slate-800">Interactive Demo</h1>
          </div>
          <p className="text-slate-700 text-lg max-w-2xl mx-auto">
            Explore InsightSheet-lite features with interactive demos and tutorials.
            See how easy it is to analyze data, manage spreadsheets, and track projects.
          </p>
        </div>

        {/* Quick Start Guide */}
        <Alert className="mb-8 bg-slate-100 border-slate-300">
          <Sparkles className="w-5 h-5 text-slate-800" />
          <AlertDescription className="text-slate-800">
            <strong>Quick Start:</strong> Select a demo below to see step-by-step instructions.
            Click "Try Now" to jump directly to that feature!
          </AlertDescription>
        </Alert>

        {/* Demo Tabs */}
        <Tabs value={activeDemo} onValueChange={setActiveDemo} className="space-y-6">
          <TabsList className="bg-white border border-slate-300 p-1 grid grid-cols-5 gap-2">
            {demos.map((demo) => {
              const Icon = demo.icon;
              return (
                <TabsTrigger
                  key={demo.id}
                  value={demo.id}
                  className={`data-[state=active]:bg-${demo.color}-600`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span className="hidden md:inline">{demo.title.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Demo Content */}
          {currentDemo && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: Instructions */}
              <Card className="bg-slate-900/50 border-slate-300">
                <CardHeader>
                  <CardTitle className="text-slate-800 text-2xl flex items-center gap-3">
                    <currentDemo.icon className={`w-8 h-8 text-${currentDemo.color}-400`} />
                    {currentDemo.title}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-lg">
                    {currentDemo.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                      How It Works:
                    </h3>
                    <div className="space-y-3">
                      {currentDemo.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 bg-gradient-to-br from-${currentDemo.color}-600 to-${currentDemo.color}-700 rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                            {idx + 1}
                          </div>
                          <p className="text-slate-300 pt-1">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate(createPageUrl(currentDemo.route))}
                    className={`w-full bg-gradient-to-r from-${currentDemo.color}-600 to-${currentDemo.color}-700 hover:from-${currentDemo.color}-700 hover:to-${currentDemo.color}-800 text-white py-6 text-lg`}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {currentDemo.cta}
                  </Button>
                </CardContent>
              </Card>

              {/* Right: Preview/Demo */}
              <Card className="bg-slate-900/50 border-slate-300">
                <CardHeader>
                  <CardTitle className="text-slate-800">Live Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-800/50 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <currentDemo.icon className={`w-24 h-24 text-${currentDemo.color}-400 mx-auto mb-6`} />
                      <h3 className="text-2xl font-bold text-slate-800 mb-3">
                        Interactive Preview
                      </h3>
                      <p className="text-slate-400 mb-6">
                        Click "{currentDemo.cta}" to try this feature with real data
                      </p>
                      <div className={`inline-block bg-${currentDemo.color}-900/20 border border-${currentDemo.color}-500/30 rounded-lg px-6 py-3`}>
                        <p className={`text-sm text-${currentDemo.color}-300`}>
                          <CheckCircle className="w-4 h-4 inline mr-2" />
                          100% Privacy - All processing in your browser
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </Tabs>

        {/* Feature Grid */}
        <div className="mt-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">
            All Features at a Glance
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {demos.map((demo) => {
              const Icon = demo.icon;
              return (
                <Card
                  key={demo.id}
                  className="bg-slate-900/50 border-slate-300 hover:border-slate-300/50 transition-all cursor-pointer"
                  onClick={() => setActiveDemo(demo.id)}
                >
                  <CardContent className="pt-6">
                    <Icon className={`w-12 h-12 text-${demo.color}-400 mb-4`} />
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                      {demo.title}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      {demo.description}
                    </p>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(createPageUrl(demo.route));
                      }}
                      variant="outline"
                      className="w-full border-slate-300 text-slate-800 hover:bg-slate-800/50"
                    >
                      Try Now
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            {/* User Guide Card */}
            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border-slate-300/30">
              <CardContent className="pt-6">
                <BookOpen className="w-12 h-12 text-slate-800 mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  Complete Guide
                </h3>
                <p className="text-sm text-slate-800 mb-4">
                  Comprehensive documentation with step-by-step workflows
                </p>
                <Button
                  onClick={() => navigate(createPageUrl('UserGuide'))}
                  className="w-full bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-800 hover:to-slate-700"
                >
                  Read Guide
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom CTA */}
        <Card className="mt-12 bg-gradient-to-r from-slate-800/20 to-slate-700/20 border-slate-300/30">
          <CardContent className="pt-8 pb-8 text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-3">
              Ready to Get Started?
            </h2>
            <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
              Upload your first file and experience the power of InsightSheet-lite.
              All features are free to try with no signup required!
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => navigate(createPageUrl('Upload'))}
                className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-800 hover:to-slate-700 px-8 py-6 text-lg"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload File Now
              </Button>
              <Button
                onClick={() => navigate(createPageUrl('UserGuide'))}
                variant="outline"
                className="border-slate-300 text-slate-800 hover:bg-slate-800/50 px-8 py-6 text-lg"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                View Documentation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
