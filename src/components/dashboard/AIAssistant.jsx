// components/dashboard/AIAssistant.jsx - AI-powered data operations assistant
import { useState } from 'react';
import PropTypes from 'prop-types';
import { InvokeLLM } from '@/api/integrations';
import { backendApi } from '@/api/backendClient';
import { applyTransform } from '@/lib/transformUtils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Loader2, Lightbulb, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AIAssistant({ data, onDataUpdate }) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [applyToData, setApplyToData] = useState(true);
  const [suggestions] = useState([
    'Calculate the average of all numeric columns',
    'Find duplicate rows',
    'Remove rows with missing values',
    'Sort data by [column name] descending',
    'Create a new column with sum of [col1] and [col2]',
    'Filter rows where [column] > 100',
    'Convert all text to uppercase in [column]'
  ]);

  const handleAIOperation = async () => {
    if (!prompt.trim()) return;

    setIsProcessing(true);
    setResponse(null);

    try {
      // If enabled, try to apply a real transform to the dataset.
      if (applyToData && typeof onDataUpdate === 'function') {
        const columns = (data.headers || []).map((h) => ({ name: h }));
        const r = await backendApi.llm.transform(prompt, columns, (data.rows || []).slice(0, 15));

        const name = (r.new_column_name || 'new_column').replace(/\s+/g, '_');
        const colA = r.col_a || r.colA;
        const colB = r.col_b || r.colB;
        const op = (r.op || 'add').toLowerCase();
        const separator = r.separator || ' ';

        if (!colA || !colB || !(data.headers || []).includes(colA) || !(data.headers || []).includes(colB)) {
          setResponse(`AI suggestion couldn't be applied (missing columns: ${colA || '—'}, ${colB || '—'}). Showing guidance instead.`);
        } else if ((data.headers || []).includes(name)) {
          setResponse(`Column "${name}" already exists. Showing guidance instead.`);
        } else {
          const newRows = applyTransform(data.rows || [], colA, colB, op, name, separator);
          const updated = { ...data, headers: [...(data.headers || []), name], rows: newRows };
          onDataUpdate(updated, {
            title: 'AI applied transform',
            detail: `Created ${name} = ${colA} ${op} ${colB}`,
            badge: 'AI',
          });
          setResponse(`Applied: Created column "${name}" = ${colA} ${op} ${colB}`);
          setIsProcessing(false);
          return;
        }
      }

      // Fallback: guidance-only response
      const sampleData = data.rows.slice(0, 5);

      const aiPrompt = `You are a data analysis assistant. The user has a CSV file with the following structure:

Headers: ${data.headers.join(', ')}
Total Rows: ${data.rows.length}
Sample Data (first 5 rows): ${JSON.stringify(sampleData, null, 2)}

User Request: "${prompt}"

Please provide:
1. A clear explanation of what operation will be performed
2. Step-by-step instructions on how to accomplish this
3. If it involves calculations, provide the formula
4. Any warnings or considerations

Format your response in a clear, structured way.`;

      const result = await InvokeLLM({
        prompt: aiPrompt,
        add_context_from_internet: false
      });

      setResponse(result);
    } catch {
      setResponse('Error: Unable to process request. Please try again.');
    }

    setIsProcessing(false);
  };

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-blue-600/10 rounded-2xl blur-xl" />

      <div className="relative bg-blue-900/80 backdrop-blur-xl border border-blue-700/40 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-blue-200 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            AI Assistant
          </h2>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            Powered by AI
          </Badge>
        </div>

        <p className="text-blue-200/70 text-sm mb-4">
          Describe any operation you want to perform on your data. The AI will guide you through it!
        </p>

        <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-700/40 bg-blue-800/20 p-3">
          <div className="text-xs text-blue-100">
            <span className="font-semibold">Apply to data:</span> {applyToData ? 'On' : 'Off'}
            <div className="text-[11px] text-blue-200/70 mt-0.5">
              When On, AI will try to create a new column automatically.
            </div>
          </div>
          <button
            type="button"
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${applyToData ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20' : 'bg-blue-900/30 border-blue-800/50 text-blue-100 hover:bg-blue-900/40'}`}
            onClick={() => setApplyToData((v) => !v)}
            disabled={isProcessing}
          >
            {applyToData ? 'Disable' : 'Enable'}
          </button>
        </div>

        {/* Quick Suggestions */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-blue-200/70 font-medium">Quick Examples:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 3).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(suggestion)}
                className="text-xs px-3 py-1.5 bg-blue-800/30 hover:bg-blue-800/40 border border-blue-700/50 rounded-lg text-blue-100 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="space-y-3">
          <Textarea
            placeholder="Example: 'Calculate the total of Sales column' or 'Find rows where Amount > 1000'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="bg-blue-800/40 border-blue-700/50 text-blue-50 placeholder:text-blue-200/50 min-h-[100px]"
            disabled={isProcessing}
          />

          <Button
            onClick={handleAIOperation}
            disabled={isProcessing || !prompt.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Ask AI Assistant
              </>
            )}
          </Button>
        </div>

        {/* AI Response */}
        {response && (
          <div className="mt-6 p-4 bg-blue-800/30 border border-blue-700/40 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-semibold text-blue-300">AI Response:</span>
            </div>
            <div className="text-sm text-blue-50 whitespace-pre-wrap leading-relaxed">
              {response}
            </div>
          </div>
        )}

        {/* All Suggestions */}
        <details className="mt-4">
          <summary className="text-xs text-blue-200/70 cursor-pointer hover:text-blue-100">
            View all example operations
          </summary>
          <div className="mt-2 space-y-1">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(suggestion)}
                className="block w-full text-left text-xs px-3 py-2 bg-blue-800/20 hover:bg-blue-800/30 border border-blue-700/40 rounded text-blue-200/70 hover:text-blue-100 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

AIAssistant.propTypes = {
  data: PropTypes.shape({
    headers: PropTypes.arrayOf(PropTypes.string).isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  onDataUpdate: PropTypes.func, // Optional - not currently used but may be needed in future
};