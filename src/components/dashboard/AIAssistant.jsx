// components/dashboard/AIAssistant.jsx - AI-powered data operations assistant
import { useState } from 'react';
import PropTypes from 'prop-types';
import { InvokeLLM } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Loader2, Lightbulb, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AIAssistant({ data, onDataUpdate }) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
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
      // Prepare data context for AI
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
    } catch (error) {
      setResponse('Error: Unable to process request. Please try again.');
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-2xl blur-xl" />
      
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-purple-200 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Assistant
          </h2>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
            Powered by AI
          </Badge>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Describe any operation you want to perform on your data. The AI will guide you through it!
        </p>

        {/* Quick Suggestions */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400 font-medium">Quick Examples:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 3).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(suggestion)}
                className="text-xs px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-slate-300 transition-colors"
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
            className="bg-slate-800/50 border-slate-700 text-slate-200 min-h-[100px]"
            disabled={isProcessing}
          />
          
          <Button
            onClick={handleAIOperation}
            disabled={isProcessing || !prompt.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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
          <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-semibold text-purple-300">AI Response:</span>
            </div>
            <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
              {response}
            </div>
          </div>
        )}

        {/* All Suggestions */}
        <details className="mt-4">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
            View all example operations
          </summary>
          <div className="mt-2 space-y-1">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(suggestion)}
                className="block w-full text-left text-xs px-3 py-2 bg-slate-800/30 hover:bg-slate-700/50 border border-slate-700/50 rounded text-slate-400 hover:text-slate-300 transition-colors"
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
  data: PropTypes.object.isRequired,
  onDataUpdate: PropTypes.func.isRequired,
};