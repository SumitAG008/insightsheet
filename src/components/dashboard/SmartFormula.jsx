// components/dashboard/SmartFormula.jsx - Fixed with better contrast
import React, { useState } from 'react';
import { InvokeLLM } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SmartFormula({ data, onDataUpdate }) {
  const [prompt, setPrompt] = useState('');
  const [generatedFormula, setGeneratedFormula] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const examplePrompts = [
    'Calculate the percentage of Sales relative to Total',
    'Find the difference between Price and Cost',
    'Calculate profit margin as (Revenue - Cost) / Revenue * 100'
  ];

  const handleGenerateFormula = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGeneratedFormula(null);

    try {
      const sampleData = data.rows.slice(0, 5);
      
      const aiPrompt = `Given this dataset structure:

Columns: ${data.headers.join(', ')}
Sample data: ${JSON.stringify(sampleData, null, 2)}

User wants to: "${prompt}"

Please provide:
1. A clear formula/calculation
2. Which columns to use
3. What the new column should be named
4. Step-by-step explanation

Format your response clearly.`;

      const response = await InvokeLLM({
        prompt: aiPrompt,
        add_context_from_internet: false
      });

      setGeneratedFormula(response);
    } catch (error) {
      setGeneratedFormula('Error generating formula. Please try again.');
    }

    setIsGenerating(false);
  };

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 rounded-2xl blur-xl" />
      
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-emerald-200 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Smart Formula Builder
          </h2>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            AI-Powered
          </Badge>
        </div>

        <p className="text-slate-300 text-sm mb-4">
          Describe what you want to calculate, and AI will generate the formula for you!
        </p>

        {/* Example Prompts */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400 font-medium">Example:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(example)}
                className="text-xs px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-slate-300 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-200 block">
            Describe what you want to calculate:
          </label>
          <Textarea
            placeholder="Example: 'Calculate the percentage of Sales relative to Total' or 'Find the difference between Price and Cost'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 min-h-[100px]"
            disabled={isGenerating}
          />
          
          <Button
            onClick={handleGenerateFormula}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Formula...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Formula
              </>
            )}
          </Button>
        </div>

        {/* Generated Formula */}
        {generatedFormula && (
          <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-300">AI Generated Formula:</span>
            </div>
            <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
              {generatedFormula}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}