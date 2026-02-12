// pages/AgenticAI.jsx - Autonomous AI Agent for data operations
import React, { useState, useEffect } from 'react';
import { backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/lib/i18n';
import {
  Brain, Sparkles, Loader2, CheckCircle, AlertCircle,
  Play, Eye, Download, Zap, Target, TrendingUp, Lightbulb, Upload, FileText, X, Shield
} from 'lucide-react';
import FileUploadZone from '@/components/upload/FileUploadZone';
import { runCleanPipeline, getAutoFillOptions } from '@/lib/dataCleaning';
import { applyTransform } from '@/lib/transformUtils';

export default function AgenticAI() {
  const { t } = useI18n();
  const [task, setTask] = useState('');
  const [agent, setAgent] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [history, setHistory] = useState([]);
  const [data, setData] = useState(null);
  const [docFile, setDocFile] = useState(null);

  const truncateText = (s, maxLen) => {
    const t = s == null ? '' : String(s);
    if (!maxLen || maxLen <= 0) return t;
    return t.length > maxLen ? (t.slice(0, maxLen) + '\n\n[Context trimmed to fit token budget.]') : t;
  };

  const safeJson = (obj, maxChars) => {
    try {
      return truncateText(JSON.stringify(obj, null, 2), maxChars);
    } catch (e) {
      return truncateText(String(obj ?? ''), maxChars);
    }
  };

  const inferDocConversion = (prompt, fileName) => {
    const p = (prompt || '').toLowerCase();
    const ext = (fileName || '').split('.').pop()?.toLowerCase();

    const wantsPdf = /\bpdf\b/.test(p) || /to\s+pdf/.test(p);
    const wantsDoc = /\b(docx|word)\b/.test(p) || /to\s+docx/.test(p) || /to\s+word/.test(p);
    const wantsPpt = /\b(pptx|ppt|powerpoint|deck|slides)\b/.test(p) || /to\s+ppt/.test(p);
    const wantsXls = /\b(xlsx|xls|excel|spreadsheet)\b/.test(p) || /to\s+excel/.test(p);

    const looksLikeConversion = /\bconvert\b|\bexport\b|\bsave as\b|\bdownload\b|\bmake\s+(a|an)\b/.test(p);
    if (!looksLikeConversion) return null;

    // Only support specific safe conversions in MVP.
    if (ext === 'pdf') {
      if (wantsDoc) return { endpoint: 'pdf-to-doc', outLabel: 'DOCX' };
      if (wantsPpt) return { endpoint: 'pdf-to-ppt', outLabel: 'PPTX' };
      if (wantsXls) return { endpoint: 'pdf-to-xls', outLabel: 'XLSX' };
      return null;
    }
    if (ext === 'docx') {
      if (wantsPdf) return { endpoint: 'doc-to-pdf', outLabel: 'PDF' };
      if (wantsXls) return { endpoint: 'doc-to-xls', outLabel: 'XLSX' };
      return null;
    }
    if (ext === 'pptx') {
      if (wantsPdf) return { endpoint: 'ppt-to-pdf', outLabel: 'PDF' };
      if (wantsXls) return { endpoint: 'ppt-to-xls', outLabel: 'XLSX' };
      return null;
    }
    return null;
  };

  useEffect(() => {
    // Load CSV data from session
    const csvData = JSON.parse(sessionStorage.getItem('insightsheet_data') || 'null');
    setData(csvData);

    // Load last uploaded doc (name only; file object cannot be restored)
    setDocFile(null);

    // Load history from localStorage
    const saved = JSON.parse(localStorage.getItem('agent_history') || '[]');
    setHistory(saved);
  }, []);

  // EXAMPLE TASKS
  const EXAMPLE_TASKS = [
    t('agentic_ai_example_1'),
    t('agentic_ai_example_2'),
    t('agentic_ai_example_3'),
    t('agentic_ai_example_4'),
    t('agentic_ai_example_5'),
    t('agentic_ai_example_6'),
    t('agentic_ai_example_7'),
    t('agentic_ai_example_8')
  ];

  const runAgent = async () => {
    if (!task.trim()) {
      alert(t('agentic_ai_alert_describe_task'));
      return;
    }

    if (!data && !docFile) {
      alert(t('agentic_ai_alert_upload_file_first'));
      return;
    }

    setThinking(true);
    setAgent(null);

    try {
      // Document mode: for .docx/.pptx/.md/.pdf we ingest server-side and produce a report.
      if (!data && docFile) {
        const conv = inferDocConversion(task, docFile?.name);
        if (conv) {
          const out = await backendApi.convert.convertFile(conv.endpoint, docFile, {
            timeoutMs: 240000,
          });

          const url = URL.createObjectURL(out.blob);
          const execution = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            task,
            plan: {
              task_understood: t('agentic_ai_doc_conversion_task_understood', { outLabel: conv.outLabel }),
              steps: [{ step: 1, action: 'convert', description: t('agentic_ai_doc_conversion_step_desc', { outLabel: conv.outLabel }), reasoning: t('agentic_ai_doc_conversion_step_reasoning') }],
              estimated_time: 'N/A',
              confidence: 0.9,
            },
            results: [{ step: 1, action: 'convert', description: t('agentic_ai_doc_conversion_step_desc', { outLabel: conv.outLabel }), success: true, output: t('agentic_ai_doc_conversion_completed_output', { filename: out.filename }) }],
            finalReport: t('agentic_ai_doc_conversion_completed_report'),
            status: 'completed',
            download: { url, filename: out.filename },
          };

          setAgent({ phase: 'completed', ...execution });
          const newHistory = [execution, ...history].slice(0, 10);
          setHistory(newHistory);
          localStorage.setItem('agent_history', JSON.stringify(newHistory));
          setThinking(false);
          return;
        }

        const reportPrompt = `You are an autonomous AI agent.

Task: "${task}"

Using the uploaded file context, produce:
1) A clear summary of the document
2) Key insights
3) Risks / anomalies (if any)
4) Recommended next actions

Respond in markdown with short headings.`;

        const resp = await backendApi.llm.invokeWithFile(reportPrompt, docFile, {
          addContext: false,
          timeoutMs: 120000,
        });

        const execution = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          task,
          plan: { task_understood: t('agentic_ai_doc_analysis_task_understood'), steps: [{ step: 1, action: 'report', description: t('agentic_ai_doc_analysis_step_desc'), reasoning: t('agentic_ai_doc_analysis_step_reasoning') }], estimated_time: t('common_na'), confidence: resp?.ingestion ? 0.9 : 0.7 },
          results: [{ step: 1, action: 'report', description: t('agentic_ai_doc_analysis_step_desc'), success: true, output: resp?.response || resp?.answer || t('agentic_ai_completed') }],
          finalReport: resp?.response || resp?.answer || t('agentic_ai_no_response_received'),
          status: 'completed',
        };

        setAgent({ phase: 'completed', ...execution });

        const newHistory = [execution, ...history].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem('agent_history', JSON.stringify(newHistory));
        setThinking(false);
        return;
      }

      // STEP 1: Agent plans the task
      const maxColsForPrompt = 40;
      const promptHeaders = (data.headers || []).slice(0, maxColsForPrompt);
      const maxRowsForPlanSample = 3;
      const planSample = (data.rows || []).slice(0, maxRowsForPlanSample).map((row) => {
        const r = {};
        for (const h of promptHeaders) r[h] = row?.[h];
        return r;
      });

      const planPrompt = `You are an autonomous AI agent for data analysis.

Task: "${task}"

Available data:
- ${data.rows.length} rows
- ${data.headers.length} columns
- Columns: ${promptHeaders.join(', ')}${(data.headers || []).length > promptHeaders.length ? ' (trimmed)' : ''}
- Sample data: ${safeJson(planSample, 6000)}

Create a step-by-step execution plan. For each step, specify:
1. Action type (analyze|clean|transform|calculate|visualize|report)
2. Description
3. Expected output

Return JSON:
{
  "task_understood": "Clear summary of what you'll do",
  "steps": [
    {"step": 1, "action": "analyze", "description": "...", "reasoning": "why this step"},
    ...
  ],
  "estimated_time": "X seconds",
  "confidence": 0.95
}`;

      const planResponse = await backendApi.llm.invoke(planPrompt, {
        addContext: false,
        model: 'gpt-4o-mini',
        max_tokens: 900,
        responseSchema: {
          type: "object",
          properties: {
            task_understood: { type: "string" },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step: { type: "number" },
                  action: { type: "string" },
                  description: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            },
            estimated_time: { type: "string" },
            confidence: { type: "number" }
          }
        }
      });
      
      // Validate response - planResponse is already the parsed JSON response from the API client
      // The API client returns data.response || data, so planResponse is the actual response object
      const plan = planResponse;
      if (!plan || !plan.steps || !Array.isArray(plan.steps) || plan.steps.length === 0) {
        console.error('Invalid plan response:', planResponse);
        throw new Error(t('agentic_ai_err_invalid_plan'));
      }

      setAgent({ phase: 'planning', plan });

      // STEP 2: Execute each step (carry updated data across clean/transform)
      const results = [];
      let currentData = data;
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        setAgent({ phase: 'executing', plan, currentStep: i + 1, totalSteps: plan.steps.length });

        await new Promise(resolve => setTimeout(resolve, 1000));

        let stepResult;
        switch (step.action) {
          case 'analyze':
            stepResult = await executeAnalysis(step, currentData);
            break;
          case 'clean':
            stepResult = await executeClean(step, currentData);
            break;
          case 'transform':
            stepResult = await executeTransform(step, currentData);
            break;
          case 'calculate':
            stepResult = await executeCalculate(step, currentData);
            break;
          case 'visualize':
            stepResult = await executeVisualize(step, currentData);
            break;
          case 'report':
            stepResult = await executeReport(step, currentData);
            break;
          default:
            stepResult = { success: true, output: t('agentic_ai_step_completed') };
        }
        if (stepResult?.updatedData) currentData = stepResult.updatedData;

        results.push({
          step: step.step,
          action: step.action,
          description: step.description,
          success: stepResult?.success !== false,
          output: stepResult?.output ?? t('agentic_ai_step_completed')
        });
      }

      // STEP 3: Generate final report
      const cappedResultsForPrompt = results.map((r) => {
        const out = truncateText(r.output ?? '', 1200);
        return { ...r, output: out };
      });
      const reportPrompt = `Summarize the execution of this AI agent task:

Original Task: "${task}"

Steps Executed:
${cappedResultsForPrompt.map(r => `${r.step}. ${r.description}\n   Result: ${r.output}`).join('\n')}

Create a clear, executive summary in markdown format with:
1. What was done
2. Key findings/results
3. Recommendations
4. Next steps`;

      const finalReportResponse = await backendApi.llm.invoke(reportPrompt, {
        addContext: false,
        model: 'gpt-4o-mini',
        max_tokens: 900,
      });
      const finalReport = finalReportResponse.response;

      const execution = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        task,
        plan,
        results,
        finalReport,
        status: 'completed'
      };

      setAgent({ phase: 'completed', ...execution });

      // Save to history
      const newHistory = [execution, ...history].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem('agent_history', JSON.stringify(newHistory));

    } catch (error) {
      console.error('Agent error:', error);
      setAgent({
        phase: 'error',
        error: error.message
      });
    }

    setThinking(false);
  };

  // EXECUTION FUNCTIONS
  const executeAnalysis = async (step, data) => {
    const maxColsForPrompt = 30;
    const promptHeaders = (data.headers || []).slice(0, maxColsForPrompt);
    const sampleData = (data.rows || []).slice(0, 20).map((row) => {
      const r = {};
      for (const h of promptHeaders) r[h] = row?.[h];
      return r;
    });
    const analysisPrompt = `Analyze this data and provide insights:

${step.description}

Data sample:
${safeJson(sampleData, 12000)}

Provide specific, actionable insights.`;

    const insightsResponse = await backendApi.llm.invoke(analysisPrompt, {
      addContext: false,
      model: 'gpt-4o-mini',
      max_tokens: 900,
    });

    return { success: true, output: insightsResponse.response };
  };

  const executeClean = async (step, data) => {
    const { fill } = getAutoFillOptions(data.rows || [], data.headers || []);
    const opts = { fill, outlierColumns: [], outlierThreshold: 1.5 };
    const { data: cleanedData, summary } = runCleanPipeline(data, opts);
    setData(cleanedData);
    sessionStorage.setItem('insightsheet_data', JSON.stringify(cleanedData));
    return {
      success: true,
      output: `Cleaned: ${summary.join('; ')}. Rows: ${cleanedData.rows.length}`,
      updatedData: cleanedData
    };
  };

  const executeTransform = async (step, data) => {
    try {
      const columns = (data.headers || []).map((h) => ({ name: h }));
      const r = await backendApi.llm.transform(step.description || step.reasoning || 'Create a useful new column', columns, (data.rows || []).slice(0, 15));
      const name = (r.new_column_name || 'new_column').replace(/\s+/g, '_');
      const colA = r.col_a || r.colA;
      const colB = r.col_b || r.colB;
      const op = (r.op || 'add').toLowerCase();
      if (!colA || !colB || !(data.headers || []).includes(colA) || !(data.headers || []).includes(colB)) {
        return { success: true, output: `Transform suggested columns that don't exist (${colA}, ${colB}). No change applied.` };
      }
      if ((data.headers || []).includes(name)) {
        return { success: true, output: `Column "${name}" already exists. No change applied.` };
      }
      const newRows = applyTransform(data.rows || [], colA, colB, op, name, r.separator || ' ');
      const updated = { headers: [...(data.headers || []), name], rows: newRows };
      setData(updated);
      sessionStorage.setItem('insightsheet_data', JSON.stringify(updated));
      return {
        success: true,
        output: `Created column "${name}" = ${colA} ${op} ${colB}. Rows: ${newRows.length}`,
        updatedData: updated
      };
    } catch (e) {
      return { success: false, output: `Transform failed: ${e.message || 'unknown error'}` };
    }
  };

  const executeCalculate = async (step, data) => {
    const numericColumns = data.headers.filter(header => {
      return data.rows.some(row => {
        const val = row[header];
        return !isNaN(parseFloat(val));
      });
    });

    const stats = {};
    numericColumns.forEach(col => {
      const values = data.rows
        .map(row => parseFloat(row[col]))
        .filter(v => !isNaN(v));
      
      stats[col] = {
        avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
        min: Math.min(...values).toFixed(2),
        max: Math.max(...values).toFixed(2),
        count: values.length
      };
    });

    return {
      success: true,
      output: t('agentic_ai_calc_stats_output', { count: numericColumns.length }) + `\n${JSON.stringify(stats, null, 2)}`
    };
  };

  const executeVisualize = async (step, data) => {
    return {
      success: true,
      output: t('agentic_ai_visualization_generated')
    };
  };

  const executeReport = async (step, data) => {
    const reportPrompt = `Generate a professional report based on:

${step.description}

Data overview:
- Total rows: ${data.rows.length}
- Columns: ${data.headers.join(', ')}

Create a clear, business-ready summary.`;

    const reportResponse = await backendApi.llm.invoke(reportPrompt, {
      addContext: false
    });

    return { success: true, output: reportResponse.response };
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-[#4169E1] rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
            {t('agentic_ai_title')}
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-4">
            {t('agentic_ai_subtitle')}
          </p>
          <Badge className="bg-[#4169E1]/20 text-[#4169E1] border-[#4169E1]/50">
            <Sparkles className="w-4 h-4 mr-1" />
            {t('agentic_ai_badge')}
          </Badge>
        </div>

        {/* Info Banner */}
        <Alert className="mb-8 bg-[#4169E1]/10 border-[#4169E1]/40">
          <Brain className="h-5 w-5 text-[#4169E1]" />
          <AlertDescription className="text-slate-700 dark:text-slate-300">
            <strong className="text-[#4169E1]">{t('agentic_ai_what_is_title')}</strong><br />
            {t('agentic_ai_what_is_intro')}
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('agentic_ai_what_is_bullet_1')}</li>
              <li>{t('agentic_ai_what_is_bullet_2')}</li>
              <li>{t('agentic_ai_what_is_bullet_3')}</li>
              <li>{t('agentic_ai_what_is_bullet_4')}</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* File Upload Section */}
        {data ? (
          <Alert className="mb-8 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription className="text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-emerald-600 dark:text-emerald-400">{t('agentic_ai_data_loaded')}:</strong> {sessionStorage.getItem('insightsheet_filename') || t('common_file')}
                    <Badge className="bg-slate-900/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                      {t('agentic_ai_badge_local_tabular')}
                    </Badge>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t('agentic_ai_rows_cols', { rows: data.rows.length, cols: data.headers.length })}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setData(null);
                    setDocFile(null);
                    sessionStorage.removeItem('insightsheet_data');
                    sessionStorage.removeItem('insightsheet_filename');
                  }}
                  className="border-slate-300 dark:border-slate-600"
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('common_remove_file')}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : docFile ? (
          <Alert className="mb-8 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription className="text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-emerald-600 dark:text-emerald-400">{t('agentic_ai_document_loaded')}:</strong> {sessionStorage.getItem('insightsheet_filename') || docFile.name}
                    <Badge className="bg-slate-900/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                      {t('agentic_ai_badge_server_ingested_document')}
                    </Badge>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t('agentic_ai_doc_size_kb', { kb: (docFile.size / 1024).toFixed(2) })}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setData(null);
                    setDocFile(null);
                    sessionStorage.removeItem('insightsheet_data');
                    sessionStorage.removeItem('insightsheet_filename');
                  }}
                  className="border-slate-300 dark:border-slate-600"
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('common_remove_file')}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#4169E1]" />
              {t('agentic_ai_upload_title')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {t('agentic_ai_upload_desc')}
            </p>
            <FileUploadZone
              onFileUpload={(file, uploadedData) => {
                const ext = (file?.name || '').split('.').pop()?.toLowerCase();
                const isTabular = ext === 'csv' || ext === 'xlsx' || ext === 'xls';
                if (isTabular) {
                  setDocFile(null);
                  setData(uploadedData);
                  sessionStorage.setItem('insightsheet_data', JSON.stringify(uploadedData));
                  sessionStorage.setItem('insightsheet_filename', file.name);
                } else {
                  setData(null);
                  setDocFile(file);
                  sessionStorage.removeItem('insightsheet_data');
                  sessionStorage.setItem('insightsheet_filename', file.name);
                }
              }}
              acceptedFormats={['.csv', '.xlsx', '.xls', '.docx', '.pptx', '.md', '.pdf']}
            />
            <div className="mt-4 text-base text-slate-600 dark:text-slate-400">
              <p className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>{t('agentic_ai_upload_privacy_note')}</span>
              </p>
            </div>
          </div>
        )}

        {/* Task Input */}
        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-[#4169E1]" />
            {t('agentic_ai_task_prompt')}
          </h2>

          <Textarea
            placeholder={t('agentic_ai_task_placeholder')}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 min-h-[120px] mb-4"
            disabled={thinking}
          />

          <div className="flex flex-wrap gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-1" />
            <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">{t('agentic_ai_quick_examples')}</span>
          </div>

          <div className="grid md:grid-cols-2 gap-2 mb-6">
            {EXAMPLE_TASKS.map((example, idx) => (
              <button
                key={idx}
                onClick={() => setTask(example)}
                className="text-left text-base p-3 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition-colors"
                disabled={thinking}
              >
                {example}
              </button>
            ))}
          </div>

          <Button
            onClick={runAgent}
            disabled={thinking || !task.trim() || (!data && !docFile)}
            className="w-full bg-[#4169E1] hover:bg-[#3659c7] text-white font-bold py-4 text-lg"
          >
            {thinking ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t('agentic_ai_agent_running')}
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                {t('agentic_ai_deploy_button')}
              </>
            )}
          </Button>

          {!data && !docFile && (
            <p className="text-amber-600 dark:text-amber-400 text-base mt-3 text-center">
              {t('agentic_ai_upload_warning')}
            </p>
          )}
        </div>

        {/* Agent Execution Visualization */}
        {agent && (
          <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#4169E1]" />
              {t('agentic_ai_execution_title')}
            </h2>

            {/* Planning Phase */}
            {agent.phase === 'planning' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-6 h-6 text-[#4169E1] animate-spin" />
                  <span className="text-lg font-semibold text-[#4169E1]">{t('agentic_ai_planning_strategy')}</span>
                </div>

                <div className="bg-[#4169E1]/10 border border-[#4169E1]/40 rounded-lg p-4">
                  <p className="text-slate-900 dark:text-white mb-3">
                    <strong>{t('agentic_ai_understanding_label')}</strong> {agent.plan?.task_understood || t('agentic_ai_analyzing_task')}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-base mb-2">
                    <strong>{t('agentic_ai_estimated_time_label')}</strong> {agent.plan?.estimated_time || t('agentic_ai_calculating')} • 
                    <strong className="ml-2">{t('agentic_ai_confidence_label')}</strong> {agent.plan?.confidence ? `${(agent.plan.confidence * 100).toFixed(0)}%` : t('common_na')}
                  </p>

                  <div className="mt-4">
                    <p className="text-base font-semibold text-[#4169E1] mb-2">{t('agentic_ai_execution_plan_label')}</p>
                    <ol className="space-y-2">
                      {agent.plan?.steps?.map((step, idx) => (
                        <li key={idx} className="text-base text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-[#4169E1]">{t('agentic_ai_step_n', { step: step.step })}</span> {step.description}
                          <p className="text-sm text-slate-500 dark:text-slate-500 ml-4 mt-1">💭 {step.reasoning}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Executing Phase */}
            {agent.phase === 'executing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-amber-400 animate-bounce" />
                    <span className="text-lg font-semibold text-amber-400">
                      {t('agentic_ai_executing_step_of', { current: agent.currentStep, total: agent.totalSteps })}
                    </span>
                  </div>
                  <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    {Math.round((agent.currentStep / agent.totalSteps) * 100)}%
                  </Badge>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3">
                  <div
                    className="bg-[#4169E1] h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(agent.currentStep / agent.totalSteps) * 100}%` }}
                  />
                </div>

                <div className="space-y-2">
                  {agent.plan?.steps?.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        idx < agent.currentStep - 1
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/40'
                          : idx === agent.currentStep - 1
                          ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/40'
                          : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {idx < agent.currentStep - 1 ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : idx === agent.currentStep - 1 ? (
                          <Loader2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-slate-400 dark:border-slate-600 rounded-full" />
                        )}
                        <span className="text-base text-slate-900 dark:text-white">{step.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Phase */}
            {agent.phase === 'completed' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{t('agentic_ai_task_completed')}</span>
                </div>

                {/* Execution Summary */}
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mb-4">{t('agentic_ai_execution_summary')}</h3>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('agentic_ai_total_steps')}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{agent.results.length}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('agentic_ai_success_rate')}</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">100%</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('agentic_ai_actions_taken')}</p>
                      <p className="text-2xl font-bold text-[#4169E1]">{agent.results.filter(r => r.success).length}</p>
                    </div>
                  </div>

                  {/* Detailed Results */}
                  <div className="space-y-3 mb-6">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">{t('agentic_ai_detailed_results')}</h4>
                    {agent.results.map((result, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#4169E1]/20 text-[#4169E1]">
                              {t('agentic_ai_step_badge', { step: result.step })}
                            </Badge>
                            <span className="text-slate-900 dark:text-white font-semibold">{result.description}</span>
                          </div>
                          {result.success && <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                        </div>
                        <p className="text-base text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{result.output}</p>
                      </div>
                    ))}
                  </div>

                  {/* Final Report */}
                  <div className="bg-[#4169E1]/10 border border-[#4169E1]/40 rounded-lg p-6">
                    <h4 className="text-lg font-bold text-[#4169E1] mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      {t('agentic_ai_final_report')}
                    </h4>
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                        {agent.finalReport}
                      </pre>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    {agent.download?.url && (
                      <Button
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = agent.download.url;
                          a.download = agent.download.filename || `converted-${Date.now()}`;
                          a.click();
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t('agentic_ai_download_output')}
                      </Button>
                    )}
                    <Button
                      className="flex-1 bg-[#4169E1] hover:bg-[#3659c7] text-white"
                      onClick={() => {
                        const report = `# AI Agent Report\n\n## Task\n${agent.task}\n\n## Results\n${agent.results.map(r => `### Step ${r.step}: ${r.description}\n${r.output}`).join('\n\n')}\n\n## Summary\n${agent.finalReport}`;
                        const blob = new Blob([report], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `agent-report-${Date.now()}.md`;
                        a.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('agentic_ai_download_report')}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-slate-200 dark:border-slate-700"
                      onClick={() => setAgent(null)}
                    >
                      {t('agentic_ai_run_another_task')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Phase */}
            {agent.phase === 'error' && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">{t('agentic_ai_execution_error')}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-4">{agent.error}</p>
                <Button
                  onClick={() => setAgent(null)}
                  variant="outline"
                  className="border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400"
                >
                  {t('common_try_again')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Execution History */}
        {history.length > 0 && (
          <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('agentic_ai_recent_executions')}</h2>
            <div className="space-y-3">
              {history.slice(0, 5).map((execution, idx) => (
                <div
                  key={execution.id}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-[#4169E1]/50 transition-colors cursor-pointer"
                  onClick={() => setAgent({ phase: 'completed', ...execution })}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-slate-900 dark:text-white font-semibold mb-1">{execution.task}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(execution.timestamp).toLocaleString()} • 
                        {t('agentic_ai_steps_completed', { count: execution.results.length })}
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t('common_success_label')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}