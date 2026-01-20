// components/dashboard/DataTransform.jsx - NL "Create column" + manual ops
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, Plus, Minus, Divide, X as Multiply, Percent, Calculator, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { backendApi } from '@/api/meldraClient';
import { applyTransform } from '@/lib/transformUtils';

export default function DataTransform({ data, onDataUpdate }) {
  const [operation, setOperation] = useState('add');
  const [column1, setColumn1] = useState('');
  const [column2, setColumn2] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [transforming, setTransforming] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const numericColumns = data.headers.filter(header => {
    return data.rows.some(row => {
      const val = row[header];
      return val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(val));
    });
  });

  const operations = [
    { id: 'add', name: 'Add (+)', icon: Plus, example: 'A + B' },
    { id: 'subtract', name: 'Subtract (-)', icon: Minus, example: 'A - B' },
    { id: 'multiply', name: 'Multiply (×)', icon: Multiply, example: 'A × B' },
    { id: 'divide', name: 'Divide (÷)', icon: Divide, example: 'A ÷ B' },
    { id: 'percentage', name: 'Percentage (%)', icon: Percent, example: '(A / B) × 100' }
  ];

  const handleAiTransform = async () => {
    if (!aiInstruction.trim()) return;
    setAiError('');
    setAiLoading(true);
    try {
      const columns = (data.headers || []).map((h) => ({ name: h }));
      const r = await backendApi.llm.transform(aiInstruction, columns, (data.rows || []).slice(0, 5));
      const name = (r.new_column_name || 'new_column').replace(/\s+/g, '_');
      if (!(data.headers || []).includes(r.col_a) || !(data.headers || []).includes(r.col_b)) {
        setAiError('AI chose columns that don\'t exist. Try: "Profit as Revenue minus Cost"');
        return;
      }
      if ((data.headers || []).includes(name)) {
        setAiError('Column "' + name + '" already exists.');
        return;
      }
      const newRows = applyTransform(data.rows || [], r.col_a, r.col_b, r.op || 'add', name, r.separator);
      onDataUpdate({ headers: [...(data.headers || []), name], rows: newRows });
      setAiInstruction('');
    } catch (e) {
      setAiError(e.message || 'AI transform failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleTransform = () => {
    if (!column1 || !column2 || !newColumnName) {
      alert('Please select both columns and enter a name for the new column');
      return;
    }
    if ((data.headers || []).includes(newColumnName)) {
      alert('A column with this name already exists');
      return;
    }
    setTransforming(true);
    setTimeout(() => {
      const newRows = applyTransform(data.rows || [], column1, column2, operation, newColumnName);
      onDataUpdate({ headers: [...(data.headers || []), newColumnName], rows: newRows });
      setColumn1(''); setColumn2(''); setNewColumnName('');
      setTransforming(false);
    }, 500);
  };

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-2xl blur-xl" />
      
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-blue-200 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-400" />
            Data Transform
          </h2>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            Create Columns
          </Badge>
        </div>

        <div className="space-y-4">
          {/* Create with AI */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <label className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Create with AI
            </label>
            <p className="text-xs text-slate-400 mb-2">e.g. &quot;Profit as Revenue minus Cost&quot;, &quot;FullName as First plus Last&quot;</p>
            <div className="flex gap-2">
              <Input
                placeholder="Describe the new column..."
                value={aiInstruction}
                onChange={(e) => { setAiInstruction(e.target.value); setAiError(''); }}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 flex-1"
                disabled={aiLoading}
              />
              <Button
                onClick={handleAiTransform}
                disabled={aiLoading || !aiInstruction.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              >
                {aiLoading ? <span className="animate-spin">⏳</span> : <Sparkles className="w-4 h-4 mr-1" />}
                Generate
              </Button>
            </div>
            {aiError && <p className="text-red-400 text-sm mt-1">{aiError}</p>}
          </div>

          {/* Operation Selection */}
          <div>
            <label className="text-sm font-semibold text-slate-200 mb-3 block">
              Operation
            </label>
            <div className="grid grid-cols-2 gap-2">
              {operations.map((op) => (
                <Button
                  key={op.id}
                  onClick={() => setOperation(op.id)}
                  variant="outline"
                  className={`justify-start h-auto py-3 ${
                    operation === op.id
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <op.icon className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">{op.name}</div>
                    <div className="text-xs opacity-75">{op.example}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Column 1 Selection */}
          <div>
            <label className="text-sm font-semibold text-slate-200 mb-2 block">
              Column 1
            </label>
            <Select value={column1} onValueChange={setColumn1}>
              <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                <SelectValue placeholder="Select first column" className="text-white" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {numericColumns.map(col => (
                  <SelectItem key={col} value={col} className="text-white hover:bg-slate-700">
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Column 2 Selection */}
          <div>
            <label className="text-sm font-semibold text-slate-200 mb-2 block">
              Column 2
            </label>
            <Select value={column2} onValueChange={setColumn2}>
              <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50">
                <SelectValue placeholder="Select second column" className="text-white" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {numericColumns.map(col => (
                  <SelectItem key={col} value={col} className="text-white hover:bg-slate-700">
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* New Column Name */}
          <div>
            <label className="text-sm font-semibold text-slate-200 mb-2 block">
              New Column Name
            </label>
            <Input
              placeholder="Enter name for new column"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>

          {/* Apply Button */}
          <Button
            onClick={handleTransform}
            disabled={transforming || !column1 || !column2 || !newColumnName}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold"
          >
            {transforming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Applying...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Apply Transformation
              </>
            )}
          </Button>
        </div>

        {/* Preview */}
        {column1 && column2 && operation && (
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-300 font-semibold mb-1">Preview:</p>
            <p className="text-slate-200">
              <span className="text-blue-300">{newColumnName || 'NewColumn'}</span> = 
              <span className="text-emerald-300"> {column1}</span> 
              <span className="text-slate-400"> {operations.find(o => o.id === operation)?.name.split(' ')[0]}</span> 
              <span className="text-emerald-300"> {column2}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}