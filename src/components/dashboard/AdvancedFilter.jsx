// components/dashboard/AdvancedFilter.jsx - Advanced filtering and search component
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, Search, X, Plus } from 'lucide-react';

export default function AdvancedFilter({ data, onFilteredData }) {
  const [filters, setFilters] = useState([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchOperator, setSearchOperator] = useState('AND');

  const addFilter = () => {
    setFilters([...filters, {
      id: Date.now(),
      column: '',
      operator: 'contains',
      value: '',
      enabled: true
    }]);
  };

  const removeFilter = (id) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const updateFilter = (id, field, value) => {
    setFilters(filters.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const applyFilters = () => {
    if (!data || !data.rows) return;

    let filteredRows = [...data.rows];

    // Apply column filters
    filters.forEach(filter => {
      if (!filter.enabled || !filter.column || !filter.value) return;

      filteredRows = filteredRows.filter(row => {
        const cellValue = String(row[filter.column] || '').toLowerCase();
        const filterValue = String(filter.value).toLowerCase();

        switch (filter.operator) {
          case 'contains':
            return cellValue.includes(filterValue);
          case 'not_contains':
            return !cellValue.includes(filterValue);
          case 'equals':
            return cellValue === filterValue;
          case 'not_equals':
            return cellValue !== filterValue;
          case 'starts_with':
            return cellValue.startsWith(filterValue);
          case 'ends_with':
            return cellValue.endsWith(filterValue);
          case 'greater_than':
            return parseFloat(cellValue) > parseFloat(filterValue);
          case 'less_than':
            return parseFloat(cellValue) < parseFloat(filterValue);
          case 'greater_equal':
            return parseFloat(cellValue) >= parseFloat(filterValue);
          case 'less_equal':
            return parseFloat(cellValue) <= parseFloat(filterValue);
          default:
            return true;
        }
      });
    });

    // Apply global search
    if (globalSearch.trim()) {
      const searchTerms = globalSearch.toLowerCase().split(' ').filter(t => t);
      
      filteredRows = filteredRows.filter(row => {
        const rowValues = data.headers.map(header => 
          String(row[header] || '').toLowerCase()
        ).join(' ');

        if (searchOperator === 'AND') {
          return searchTerms.every(term => rowValues.includes(term));
        } else {
          return searchTerms.some(term => rowValues.includes(term));
        }
      });
    }

    onFilteredData({ ...data, rows: filteredRows });
  };

  const clearFilters = () => {
    setFilters([]);
    setGlobalSearch('');
    onFilteredData(data);
  };

  const activeFiltersCount = filters.filter(f => f.enabled && f.column && f.value).length + (globalSearch ? 1 : 0);

  if (!data || !data.headers || data.headers.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-900/80 backdrop-blur-xl border border-blue-700/40 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-300" />
          Advanced Filter & Search
          {activeFiltersCount > 0 && (
            <Badge className="bg-blue-600 text-white ml-2">
              {activeFiltersCount} active
            </Badge>
          )}
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={applyFilters}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            Apply Filters
          </Button>
          <Button
            onClick={clearFilters}
            variant="outline"
            size="sm"
            className="bg-black/40 border-blue-700/60 text-white font-bold hover:bg-black/55"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Global Search */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-4 h-4 text-blue-200/70" />
          <label className="text-sm font-medium text-blue-100">Global Search</label>
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Search across all columns..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="bg-blue-800/40 border-blue-700/50 text-blue-50 placeholder:text-blue-200/50"
          />
          <Select value={searchOperator} onValueChange={setSearchOperator}>
            <SelectTrigger className="w-32 bg-blue-800/40 border-blue-700/50 text-blue-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">All words (AND)</SelectItem>
              <SelectItem value="OR">Any word (OR)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Column Filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-blue-50">Column Filters</label>
          <Button
            onClick={addFilter}
            variant="outline"
            size="sm"
            className="bg-black/40 border-blue-700/60 text-white font-bold hover:bg-black/55"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Filter
          </Button>
        </div>

        {filters.length === 0 && (
          <p className="text-sm text-blue-200/70 text-center py-4">
            No filters added. Click "Add Filter" to create column-specific filters.
          </p>
        )}

        {filters.map((filter) => (
          <div
            key={filter.id}
            className="flex items-center gap-2 p-3 bg-blue-800/30 border border-blue-700/40 rounded-lg"
          >
            <Select
              value={filter.column}
              onValueChange={(value) => updateFilter(filter.id, 'column', value)}
            >
              <SelectTrigger className="w-40 bg-blue-900/40 border-blue-700/50 text-blue-50">
                <SelectValue placeholder="Column" />
              </SelectTrigger>
              <SelectContent>
                {data.headers.map(header => (
                  <SelectItem key={header} value={header}>{header}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filter.operator}
              onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
            >
              <SelectTrigger className="w-36 bg-blue-900/40 border-blue-700/50 text-blue-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="not_contains">Not Contains</SelectItem>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not Equals</SelectItem>
                <SelectItem value="starts_with">Starts With</SelectItem>
                <SelectItem value="ends_with">Ends With</SelectItem>
                <SelectItem value="greater_than">Greater Than</SelectItem>
                <SelectItem value="less_than">Less Than</SelectItem>
                <SelectItem value="greater_equal">Greater or Equal</SelectItem>
                <SelectItem value="less_equal">Less or Equal</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="text"
              placeholder="Value"
              value={filter.value}
              onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
              className="flex-1 bg-blue-900/40 border-blue-700/50 text-blue-50 placeholder:text-blue-200/50"
            />

            <Button
              onClick={() => removeFilter(filter.id)}
              variant="ghost"
              size="sm"
              className="text-blue-200/70 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

AdvancedFilter.propTypes = {
  data: PropTypes.shape({
    headers: PropTypes.arrayOf(PropTypes.string).isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  onFilteredData: PropTypes.func.isRequired,
};
