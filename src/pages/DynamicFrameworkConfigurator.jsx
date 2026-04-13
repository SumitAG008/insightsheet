import React, { useState } from 'react';
import { 
  Settings, Save, BrainCircuit, ShieldAlert, Cpu, CheckCircle2, SlidersHorizontal, Database
} from 'lucide-react';

export default function DynamicFrameworkConfigurator() {
  const [activeTab, setActiveTab] = useState('framework');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Local state for the "Pro-Level" configurability options
  const [frameworkConfig, setFrameworkConfig] = useState({
    name: 'Merck Global Supply Chain ESG Standard',
    frameworkType: 'custom',
    vectorDbStatus: 'CONNECTED (pgvector)',
  });

  const [aiConfig, setAiConfig] = useState({
    temperature: 0.1,
    confidenceThreshold: 95,
    mcpProtocol: 'Strict Extraction',
    systemPrompt: 'You are an elite Lead ESG Auditor for Tier-1 Pharmaceutical companies. Never hallucinate facts. If evidence is missing, mark the metric as NON-COMPLIANT.'
  });

  const handleSave = () => {
    // In production, this would dispatch to an API endpoint
    // e.g., POST /api/esg/ai-configuration 
    setSuccessMsg('Enterprise configuration successfully saved across all AI agents.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate flex items-center">
            <BrainCircuit className="h-8 w-8 mr-3 text-indigo-600" />
            Enterprise AI Configuration
          </h2>
          <p className="mt-2 text-sm text-gray-500 max-w-3xl">
            Configure how the Model Context Protocol (MCP) and Deep Learning models interpret your proprietary ESG frameworks, set strict confidence thresholds for auditors, and manage the Vector Database indexing.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={handleSave}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Save & Deploy Protocol
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMsg}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('framework')}
              className={`${
                activeTab === 'framework'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
            >
              <Database className="h-4 w-4 mr-2" />
              Dynamic Framework Mapper
            </button>
            <button
              onClick={() => setActiveTab('ai_tuning')}
              className={`${
                activeTab === 'ai_tuning'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              AI Confidence Tuner
            </button>
            <button
              onClick={() => setActiveTab('mcp_prompt')}
              className={`${
                activeTab === 'mcp_prompt'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
            >
              <Cpu className="h-4 w-4 mr-2" />
              MCP Prompt Protocols
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'framework' && (
            <div className="space-y-6">
               <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Framework Intelligence Orchestration</h3>
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="frameworkName" className="block text-sm font-medium text-gray-700">Root Framework Schema</label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="frameworkName"
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                          value={frameworkConfig.name}
                          onChange={(e) => setFrameworkConfig({...frameworkConfig, name: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="vectorDb" className="block text-sm font-medium text-gray-700">Vector Database Connection</label>
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-green-600 sm:text-sm font-bold">
                          {frameworkConfig.vectorDbStatus}
                        </span>
                        <button className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md sm:text-sm border border-gray-300 text-gray-600 bg-white hover:bg-gray-50">
                          Resync Embeddings
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 border border-gray-200 rounded-md p-4 bg-gray-50">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-5 w-5 text-indigo-600 mt-1">
                        <ShieldAlert />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">Custom Mapping Protocol Active</h4>
                        <p className="mt-1 text-sm text-gray-500">
                          The system will currently map all uploaded evidence directly against requirements defined by the '{frameworkConfig.name}' vector space. All generative reporting will cite sources from this dedicated database silo.
                        </p>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'ai_tuning' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-1">AI Cognitive Settings</h3>
                <p className="text-sm text-gray-500 mb-6">Adjust the deep learning parameters for the ESG extraction logic.</p>
                
                <div className="grid grid-cols-1 gap-y-8 gap-x-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">Minimum Confidence Score for Audit Approval</label>
                      <span className="text-sm font-bold text-indigo-600">{aiConfig.confidenceThreshold}%</span>
                    </div>
                    <input 
                      type="range" min="50" max="99" 
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      value={aiConfig.confidenceThreshold}
                      onChange={(e) => setAiConfig({...aiConfig, confidenceThreshold: Number(e.target.value)})}
                    />
                    <p className="mt-2 text-xs text-gray-500">If the AI is less than {aiConfig.confidenceThreshold}% confident in an extraction, it will immediately pause and route the task to a human auditor.</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">LLM Temperature (Creativity vs Strictness)</label>
                      <span className="text-sm font-bold text-indigo-600">{aiConfig.temperature.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.01"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      value={aiConfig.temperature}
                      onChange={(e) => setAiConfig({...aiConfig, temperature: Number(e.target.value)})}
                    />
                    <p className="mt-2 text-xs text-gray-500">Lower temperature (e.g. 0.1) creates highly deterministic, strict factual outcomes. Higher amounts are better only for creative narrative generation.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mcp_prompt' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-1">Context Injection and Prompts</h3>
                <p className="text-sm text-gray-500 mb-6">Define the raw context instructions that hit the LLM via Model Context Protocol orchestration.</p>
                 
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">System Instruction Context</label>
                    <textarea 
                       rows={4}
                       className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                       value={aiConfig.systemPrompt}
                       onChange={(e) => setAiConfig({...aiConfig, systemPrompt: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">MCP Retrieval Mode</label>
                    <select 
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                      value={aiConfig.mcpProtocol}
                      onChange={(e) => setAiConfig({...aiConfig, mcpProtocol: e.target.value})}
                    >
                      <option>Strict Extraction (Return ONLY exact text from vectors)</option>
                      <option>Contextual Extrapolation (Allow logical jumps based on evidence)</option>
                      <option>Financial Synthesis (Combine multiple tables from evidence)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
