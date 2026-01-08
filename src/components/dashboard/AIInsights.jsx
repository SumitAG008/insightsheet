
// components/dashboard/AIInsights.jsx - AI-powered data analysis component
import { useState } from 'react';
import PropTypes from 'prop-types';
import { InvokeLLM } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Lightbulb, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AIInsights({ data }) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [insights, setInsights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState('');

  const analyzeData = async (type) => {
    setIsAnalyzing(true);
    setActiveAnalysis(type);
    
    const sampleData = data.rows.slice(0, 100).map(row => {
      const simplified = {};
      Object.keys(row).forEach(key => {
        if (row[key] !== null && row[key] !== undefined) {
          simplified[key] = row[key];
        }
      });
      return simplified;
    });

    let prompt = '';
    
    if (type === 'summary') {
      prompt = `Analyze this dataset and provide a concise summary:
      
Dataset has ${data.rows.length} rows and ${data.headers.length} columns.
Columns: ${data.headers.join(', ')}

Sample data (first 100 rows):
${JSON.stringify(sampleData, null, 2)}

Provide:
1. Key insights about the data
2. Data quality observations
3. Interesting patterns or trends
4. Recommendations for analysis

Keep response concise and actionable.`;
    } else if (type === 'formula') {
      prompt = `Based on this dataset, suggest 5 useful Excel formulas:

Columns: ${data.headers.join(', ')}
Sample data:
${JSON.stringify(sampleData.slice(0, 5), null, 2)}

For each formula:
1. What it calculates
2. The Excel formula
3. When to use it

Format as clear, numbered list.`;
    } else if (type === 'custom') {
      prompt = `Analyze this dataset and answer: ${customPrompt}

Dataset: ${data.rows.length} rows, ${data.headers.length} columns
Columns: ${data.headers.join(', ')}
Sample: ${JSON.stringify(sampleData.slice(0, 20), null, 2)}

Provide detailed answer based on the data.`;
    }

    try {
      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: false
      });
      
      setInsights({ type, content: response });
    } catch (error) {
      setInsights({ type, content: 'Error analyzing data. Please try again.' });
    }
    
    setIsAnalyzing(false);
    setActiveAnalysis('');
  };

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-2xl blur-xl" />
      
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-purple-400" />
          AI Analysis
        </h2>

        <div className="space-y-3 mb-6">
          <Button
            onClick={() => analyzeData('summary')}
            disabled={isAnalyzing}
            className="w-full justify-start bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold"
          >
            {isAnalyzing && activeAnalysis === 'summary' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4 mr-2" />
            )}
            Explain My Sheet
          </Button>

          <Button
            onClick={() => analyzeData('formula')}
            disabled={isAnalyzing}
            className="w-full justify-start bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold"
          >
            {isAnalyzing && activeAnalysis === 'formula' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Lightbulb className="w-4 h-4 mr-2" />
            )}
            Formula Suggestions
          </Button>
        </div>

        <div className="border-t border-slate-700/50 pt-6">
          <label className="text-sm text-white font-semibold mb-2 block">Custom Question</label>
          <Textarea
            placeholder="Ask anything about your data..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400 mb-3"
            rows={3}
          />
          <Button
            onClick={() => analyzeData('custom')}
            disabled={isAnalyzing || !customPrompt.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
          >
            {isAnalyzing && activeAnalysis === 'custom' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Ask AI
              </>
            )}
          </Button>
        </div>

        {insights && (
          <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                {insights.type === 'summary' ? 'Summary' : insights.type === 'formula' ? 'Formulas' : 'Custom Analysis'}
              </Badge>
            </div>
            <div className="text-sm text-white whitespace-pre-wrap leading-relaxed">
              {insights.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

AIInsights.propTypes = {
  data: PropTypes.shape({
    headers: PropTypes.arrayOf(PropTypes.string).isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};
