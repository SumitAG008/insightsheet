// components/dashboard/CleaningTools.jsx - Fixed with WHITE text for contrast
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, Trash, Type, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CleaningTools({ data, onDataUpdate, onCleanedCount }) {
  const [cleaning, setCleaning] = useState(false);
  const [lastAction, setLastAction] = useState('');

  const removeDuplicates = () => {
    setCleaning(true);
    setLastAction('');
    
    setTimeout(() => {
      const seen = new Set();
      const uniqueRows = data.rows.filter(row => {
        const key = JSON.stringify(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      const removed = data.rows.length - uniqueRows.length;
      onDataUpdate({ ...data, rows: uniqueRows });
      onCleanedCount(removed);
      setLastAction(`Removed ${removed} duplicate rows`);
      setCleaning(false);
    }, 800);
  };

  const trimWhitespace = () => {
    setCleaning(true);
    setLastAction('');
    
    setTimeout(() => {
      const trimmedRows = data.rows.map(row => {
        const newRow = {};
        Object.keys(row).forEach(key => {
          newRow[key] = typeof row[key] === 'string' ? row[key].trim() : row[key];
        });
        return newRow;
      });
      
      onDataUpdate({ ...data, rows: trimmedRows });
      setLastAction('Trimmed whitespace from all cells');
      setCleaning(false);
    }, 600);
  };

  const inferTypes = () => {
    setCleaning(true);
    setLastAction('');
    
    setTimeout(() => {
      const typedRows = data.rows.map(row => {
        const newRow = {};
        Object.keys(row).forEach(key => {
          const value = row[key];
          if (value === null || value === undefined || value === '') {
            newRow[key] = null;
          } else if (!isNaN(value) && !isNaN(parseFloat(value))) {
            newRow[key] = parseFloat(value);
          } else if (value === 'true' || value === 'false') {
            newRow[key] = value === 'true';
          } else {
            newRow[key] = value;
          }
        });
        return newRow;
      });
      
      onDataUpdate({ ...data, rows: typedRows });
      setLastAction('Converted data types automatically');
      setCleaning(false);
    }, 700);
  };

  const cleanAll = () => {
    setCleaning(true);
    setLastAction('');
    
    setTimeout(() => {
      let cleanedRows = data.rows;
      
      cleanedRows = cleanedRows.map(row => {
        const newRow = {};
        Object.keys(row).forEach(key => {
          newRow[key] = typeof row[key] === 'string' ? row[key].trim() : row[key];
        });
        return newRow;
      });
      
      cleanedRows = cleanedRows.map(row => {
        const newRow = {};
        Object.keys(row).forEach(key => {
          const value = row[key];
          if (value === null || value === undefined || value === '') {
            newRow[key] = null;
          } else if (!isNaN(value) && !isNaN(parseFloat(value))) {
            newRow[key] = parseFloat(value);
          } else if (value === 'true' || value === 'false') {
            newRow[key] = value === 'true';
          } else {
            newRow[key] = value;
          }
        });
        return newRow;
      });
      
      const seen = new Set();
      cleanedRows = cleanedRows.filter(row => {
        const key = JSON.stringify(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      const removed = data.rows.length - cleanedRows.length;
      onDataUpdate({ ...data, rows: cleanedRows });
      onCleanedCount(removed);
      setLastAction(`Complete cleanup: ${removed} duplicates removed, types inferred, whitespace trimmed`);
      setCleaning(false);
    }, 1200);
  };

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-orange-600/10 rounded-2xl blur-xl" />
      
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-amber-400" />
            Smart Cleaning Tools
          </h2>
          
          {lastAction && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              {lastAction}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            onClick={removeDuplicates}
            disabled={cleaning}
            className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold"
          >
            <Trash className="w-4 h-4 mr-2" />
            Remove Dupes
          </Button>

          <Button
            onClick={trimWhitespace}
            disabled={cleaning}
            className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
          >
            <Type className="w-4 h-4 mr-2" />
            Trim Space
          </Button>

          <Button
            onClick={inferTypes}
            disabled={cleaning}
            className="bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold"
          >
            <Type className="w-4 h-4 mr-2" />
            Fix Types
          </Button>

          <Button
            onClick={cleanAll}
            disabled={cleaning}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Clean All
          </Button>
        </div>

        {cleaning && (
          <div className="mt-4 flex items-center justify-center gap-2 text-purple-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400" />
            <span className="text-sm">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}