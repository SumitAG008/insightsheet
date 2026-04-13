import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Download, CloudUp, Filter, Share2, TrendingDown, Target, AlertTriangle, ShieldCheck 
} from 'lucide-react';

const emissionsData = [
  { month: 'Jan', scope1: 4000, scope2: 2400, scope3: 2400 },
  { month: 'Feb', scope1: 3000, scope2: 1398, scope3: 2210 },
  { month: 'Mar', scope1: 2000, scope2: 9800, scope3: 2290 },
  { month: 'Apr', scope1: 2780, scope2: 3908, scope3: 2000 },
  { month: 'May', scope1: 1890, scope2: 4800, scope3: 2181 },
  { month: 'Jun', scope1: 2390, scope2: 3800, scope3: 2500 },
];

const supplierRiskData = [
  { region: 'North America', compliance: 95, risk: 5 },
  { region: 'Europe', compliance: 98, risk: 2 },
  { region: 'APAC', compliance: 82, risk: 18 },
  { region: 'LATAM', compliance: 75, risk: 25 },
];

export default function EnterpriseDemoDashboard() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = () => {
    setIsExporting(true);
    setTimeout(() => {
      alert("Successfully generated PDF report. Downloading to local machine...");
      setIsExporting(false);
    }, 1500);
  };

  const handleSyncToS3 = () => {
    setIsExporting(true);
    setTimeout(() => {
      alert("Successfully pushed dynamic dashboard report to secure AWS S3 bucket.");
      setIsExporting(false);
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
      {/* Header Actions */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-extrabold leading-7 text-gray-900 sm:truncate flex items-center">
            Global ESG Executive Summary
          </h2>
          <p className="mt-2 text-sm text-gray-500 max-w-3xl">
            Live AI-generated tracking for Scope 1-3 Emissions and Global Supplier Compliance. Powered by Insightlite Deep Learning.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2 text-gray-500" />
            Download PDF
          </button>
          <button 
            onClick={handleSyncToS3}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <CloudUp className="h-4 w-4 mr-2" />
            Sync to Corporate S3
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <TrendingDown className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Emissions (YTD)</dt>
                  <dd className="text-2xl font-bold text-gray-900">42,500 tCO2e</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 text-sm text-green-600 flex items-center">
             <span className="font-medium">-4.2%</span> <span className="text-gray-500 ml-2">from last quarter</span>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <Target className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Net-Zero Target Gap</dt>
                  <dd className="text-2xl font-bold text-gray-900">12%</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 text-sm text-indigo-600 flex items-center">
             <span className="font-medium">On Track</span> <span className="text-gray-500 ml-2">for 2030 goal</span>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">High-Risk Suppliers</dt>
                  <dd className="text-2xl font-bold text-gray-900">14</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 text-sm text-red-600 flex items-center">
             <span className="font-medium">+2</span> <span className="text-gray-500 ml-2">new alerts in APAC</span>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-teal-100 rounded-md p-3">
                <ShieldCheck className="h-6 w-6 text-teal-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">AI Audit Confidence</dt>
                  <dd className="text-2xl font-bold text-gray-900">98.4%</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 text-sm text-teal-600 flex items-center">
             <span className="font-medium">Verified</span> <span className="text-gray-500 ml-2">by Enterprise LLM</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Carbon Trajectory (Scope 1-3)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emissionsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="scope3" stackId="1" stroke="#818cf8" fill="#818cf8" />
                <Area type="monotone" dataKey="scope2" stackId="1" stroke="#34d399" fill="#34d399" />
                <Area type="monotone" dataKey="scope1" stackId="1" stroke="#fbbf24" fill="#fbbf24" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Global Supplier Compliance Status</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierRiskData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="region" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="compliance" stackId="a" fill="#10b981" name="Compliant (%)" />
                <Bar dataKey="risk" stackId="a" fill="#ef4444" name="Risk/Non-Compliant (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
