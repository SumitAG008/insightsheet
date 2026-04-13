import React, { useState } from 'react';
import { 
  ShieldCheck, Globe2, Network, KeyRound, Lock, Users, ServerCog, 
  Workflow, Database, ChevronRight, CheckCircle2, AlertTriangle, 
  ToggleLeft, ToggleRight, Fingerprint, Eye, Edit3, XCircle
} from 'lucide-react';

export default function EnterpriseTrustCenter() {
  const [activeSegment, setActiveSegment] = useState('geography');
  const [saved, setSaved] = useState(false);

  // Mock State for the Enterprise Configuration
  const [geoConfig, setGeoConfig] = useState('EU');
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [apiEncryption, setApiEncryption] = useState('AES-256-GCM');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const frameworks = {
    EU: ['CSRD (Corporate Sustainability Reporting)', 'EU Taxonomy', 'GRI'],
    NA: ['SEC Climate Disclosure', 'SASB', 'TCFD'],
    APAC: ['HKEX ESG', 'SGX Sustainability', 'GRI Global']
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-12">
      {/* Top App Bar / Hero */}
      <div className="bg-slate-900 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <ShieldCheck className="w-8 h-8 mr-3 text-emerald-400" />
                Enterprise Trust & Compliance Command Center
              </h1>
              <p className="mt-2 text-sm text-slate-300 max-w-2xl">
                Global orchestration for Geographic Legal Frameworks, Zero-Trust Security, Object-Level RBAC, and Automated Third-Party Data Ingestion Pipelines.
              </p>
            </div>
            <button 
              onClick={handleSave}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg shadow-lg font-medium tracking-wide transition-all border border-emerald-400"
            >
              Commit Global Policy
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24">
        {saved && (
          <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg shadow-sm flex items-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mr-3" />
            <span className="text-emerald-800 font-medium text-sm">Enterprise policies successfully distributed across all regional AWS instances and Edge nodes.</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Vertical Navigation */}
          <aside className="md:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <nav className="flex flex-col p-2 space-y-1">
                {[
                  { id: 'geography', icon: Globe2, label: 'Geo-Routing & Frameworks', desc: 'Jurisdictional compliance' },
                  { id: 'security', icon: Lock, label: 'Zero-Trust Security', desc: 'MFA, Encryption, IPs' },
                  { id: 'rbac', icon: Users, label: 'Advanced RBAC Model', desc: 'Field-level access control' },
                  { id: 'integration', icon: Network, label: '3rd-Party API Ingestion', desc: 'SAP, Workday, Snowflake' },
                  { id: 'workflow', icon: Workflow, label: 'Approval Workflows', desc: 'Multi-stage audit locking' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSegment(item.id)}
                    className={`flex items-start p-3 rounded-lg transition-colors text-left ${activeSegment === item.id ? 'bg-slate-50 border border-slate-200' : 'hover:bg-slate-50 border border-transparent'}`}
                  >
                    <item.icon className={`w-5 h-5 mt-0.5 ${activeSegment === item.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div className="ml-3">
                      <p className={`text-sm font-semibold ${activeSegment === item.id ? 'text-slate-900' : 'text-slate-600'}`}>{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px]">
              
              {/* 1. GEOGRAPHY & FRAMEWORKS */}
              {activeSegment === 'geography' && (
                <div className="p-8">
                  <div className="border-b border-slate-200 pb-5 mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Jurisdictional Framework Routing</h2>
                    <p className="text-sm text-slate-500 mt-1">Automatically enforce mandatory reporting parameters, dynamic UI forms, and required metric data types based on the entity's physical region.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {['EU', 'NA', 'APAC'].map(region => (
                      <div 
                        key={region}
                        onClick={() => setGeoConfig(region)}
                        className={`cursor-pointer rounded-xl p-5 border-2 transition-all ${geoConfig === region ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <Globe2 className={`w-8 h-8 mb-3 ${geoConfig === region ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <h3 className="font-bold text-slate-900">{region} Operations</h3>
                        <p className="text-xs text-slate-500 mt-1">Active Mandates: {frameworks[region].join(', ')}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Required Parameter Bindings for {geoConfig}</h4>
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="px-4 py-2 rounded-tl-lg">Framework</th>
                          <th className="px-4 py-2">Data Point Required</th>
                          <th className="px-4 py-2">AI Extraction Priority</th>
                          <th className="px-4 py-2 rounded-tr-lg">Format</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {frameworks[geoConfig].map((fw, i) => (
                          <tr key={i} className="text-slate-700">
                            <td className="px-4 py-3 font-medium">{fw}</td>
                            <td className="px-4 py-3">Scope {i+1} Emissions</td>
                            <td className="px-4 py-3"><span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">Mandatory</span></td>
                            <td className="px-4 py-3 font-mono text-xs">tCO2e (Float)</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. ZERO-TRUST SECURITY */}
              {activeSegment === 'security' && (
                <div className="p-8">
                  <div className="border-b border-slate-200 pb-5 mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Zero-Trust & Data Security Limits</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure MFA, encryption protocols, and anti-breach telemetry monitoring.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-5 border border-slate-200 rounded-lg bg-white shadow-sm">
                      <div className="flex items-center">
                        <Fingerprint className="w-8 h-8 text-indigo-600 mr-4" />
                        <div>
                          <h4 className="font-bold text-slate-900">Enforce Multi-Factor Authentication (2FA)</h4>
                          <p className="text-sm text-slate-500">Require TOTP or Hardware Keys (YubiKey) for all auditor logins.</p>
                        </div>
                      </div>
                      <button onClick={() => setMfaEnabled(!mfaEnabled)}>
                        {mfaEnabled ? <ToggleRight className="w-10 h-10 text-emerald-500" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-5 border border-slate-200 rounded-lg bg-white shadow-sm">
                      <div className="flex items-center">
                        <KeyRound className="w-8 h-8 text-indigo-600 mr-4" />
                        <div>
                          <h4 className="font-bold text-slate-900">API Payload Encryption Standard</h4>
                          <p className="text-sm text-slate-500">Define the encryption at rest and in transit for third-party injects.</p>
                        </div>
                      </div>
                      <select 
                        value={apiEncryption}
                        onChange={(e) => setApiEncryption(e.target.value)}
                        className="border border-slate-300 bg-slate-50 text-sm rounded-lg px-3 py-2 font-medium"
                      >
                        <option>AES-256-GCM</option>
                        <option>ChaCha20-Poly1305</option>
                      </select>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                      <h4 className="font-bold text-red-900 flex items-center mb-2">
                        <AlertTriangle className="w-5 h-5 mr-2" /> Anti-Breach Protocol
                      </h4>
                      <p className="text-sm text-red-700 mb-4">If anomalous download activity is detected from untrusted IPs, immediately revoke API tokens and lock out active sessions.</p>
                      <button className="bg-red-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-red-700">Test Quarantine Procedure</button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. RBAC */}
              {activeSegment === 'rbac' && (
                <div className="p-8">
                  <div className="border-b border-slate-200 pb-5 mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Granular Role-Based Access Control (RBAC)</h2>
                    <p className="text-sm text-slate-500 mt-1">Control exact UI visibility and write access down to the specific database field or API object level.</p>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-lg hidden md:block">
                    <table className="w-full text-sm text-center">
                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-3">Resource / Object</th>
                          <th className="px-4 py-3 border-l border-slate-200">Data Collector</th>
                          <th className="px-4 py-3 border-l border-slate-200">Compliance Auditor</th>
                          <th className="px-4 py-3 border-l border-slate-200">External Regulator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {[
                          { resource: 'Raw Emissions API Feed', r1: 'Read/Write', r2: 'Read Only', r3: 'Hidden' },
                          { resource: 'Supplier Financial Risk Scores', r1: 'Hidden', r2: 'Read/Write', r3: 'Read Only' },
                          { resource: 'AI Extraction Rules', r1: 'Hidden', r2: 'Hidden', r3: 'Read Only' },
                          { resource: 'Final ESG PDF Report Creation', r1: 'Read Only', r2: 'Full Access', r3: 'Read Only' },
                        ].map((row, idx) => (
                           <tr key={idx} className="hover:bg-slate-50">
                             <td className="text-left px-4 py-3 font-medium text-slate-800">{row.resource}</td>
                             <td className="px-4 py-3 border-l border-slate-200 text-xs font-mono">{row.r1}</td>
                             <td className="px-4 py-3 border-l border-slate-200 text-xs font-mono">{row.r2}</td>
                             <td className="px-4 py-3 border-l border-slate-200 text-xs font-mono">{row.r3}</td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. API INGESTION */}
              {activeSegment === 'integration' && (
                <div className="p-8">
                  <div className="border-b border-slate-200 pb-5 mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Third-Party Data Ingestion Nodes</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure automated data pipelines from external ERP systems into the Insightlite ESG Data Lake.</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { sys: 'SAP S/4HANA', status: 'Connected', sync: 'Syncs every 15m' },
                      { sys: 'Workday HR (Diversity Metrics)', status: 'Pending Token', sync: 'Requires OAuth2' },
                      { sys: 'Snowflake Corporate Data Lake', status: 'Connected', sync: 'Syncs Daily at 00:00 UTC' }
                    ].map((api, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center">
                          <ServerCog className="w-8 h-8 text-indigo-500 mr-4" />
                          <div>
                            <h4 className="font-bold text-slate-900">{api.sys}</h4>
                            <p className="text-xs text-slate-500">{api.sync}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${api.status === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {api.status}
                          </span>
                          <button className="text-slate-400 hover:text-indigo-600"><Edit3 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button className="mt-6  text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center">
                    + Register New Webhook / API Token
                  </button>
                </div>
              )}

              {/* 5. WORKFLOW */}
              {activeSegment === 'workflow' && (
                <div className="p-8">
                  <div className="border-b border-slate-200 pb-5 mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Mandatory Approval Workflows (Maker/Checker)</h2>
                    <p className="text-sm text-slate-500 mt-1">Define the exact logic chain required before ESG data is codified into a final compliance report.</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-8 relative">
                       {/* Line connector */}
                       <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-300 -z-10"></div>
                       
                       <div className="bg-white border-2 border-indigo-600 rounded-full w-12 h-12 flex items-center justify-center font-bold text-indigo-600 shadow-sm">1</div>
                       <div className="bg-white border-2 border-slate-300 rounded-full w-12 h-12 flex items-center justify-center font-bold text-slate-400">2</div>
                       <div className="bg-white border-2 border-slate-300 rounded-full w-12 h-12 flex items-center justify-center font-bold text-slate-400">3</div>
                       <div className="bg-green-50 border-2 border-green-500 rounded-full w-12 h-12 flex items-center justify-center font-bold text-green-600 shadow-sm"><CheckCircle2 className="w-6 h-6" /></div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-center">
                       <div>
                         <h5 className="font-bold text-slate-900 text-sm">Data Collation</h5>
                         <p className="text-xs text-slate-500 mt-1">API Ingests raw data</p>
                       </div>
                       <div>
                         <h5 className="font-bold text-slate-900 text-sm">AI Verification</h5>
                         <p className="text-xs text-slate-500 mt-1">LLM checks against CSRD</p>
                       </div>
                       <div>
                         <h5 className="font-bold text-slate-900 text-sm">Human Review</h5>
                         <p className="text-xs text-slate-500 mt-1">Lead Auditor signs off</p>
                       </div>
                       <div>
                         <h5 className="font-bold text-slate-900 text-sm">Blockchain Lock</h5>
                         <p className="text-xs text-slate-500 mt-1">Immutable ledger entry</p>
                       </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
