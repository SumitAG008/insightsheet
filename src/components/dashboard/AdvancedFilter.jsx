// components/dashboard/AdvancedFilter.jsx - Advanced filtering and search component
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, Search, X, Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function AdvancedFilter({ data, onFilteredData }) {
  const { t } = useI18n();
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
          {t('advanced_filter_title')}
          {activeFiltersCount > 0 && (
            <Badge className="bg-blue-600 text-white ml-2">
              {t('advanced_filter_active_badge', { count: activeFiltersCount })}
            </Badge>
          )}
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={applyFilters}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            {t('advanced_filter_apply_filters')}
          </Button>
          <Button
            onClick={clearFilters}
            variant="outline"
            size="sm"
            className="bg-black/40 border-blue-700/60 text-white font-bold hover:bg-black/55"
          >
            {t('common_clear')}
          </Button>
        </div>
      </div>

      {/* Global Search */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-4 h-4 text-blue-200/70" />
          <label className="text-sm font-medium text-blue-100">{t('advanced_filter_global_search')}</label>
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={t('advanced_filter_global_search_placeholder')}
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="bg-blue-800/40 border-blue-700/50 text-blue-50 placeholder:text-blue-200/50"
          />
          <Select value={searchOperator} onValueChange={setSearchOperator}>
            <SelectTrigger className="w-32 bg-blue-800/40 border-blue-700/50 text-blue-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">{t('advanced_filter_operator_and')}</SelectItem>
              <SelectItem value="OR">{t('advanced_filter_operator_or')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Column Filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-blue-50">{t('advanced_filter_column_filters')}</label>
          <Button
            onClick={addFilter}
            variant="outline"
            size="sm"
            className="bg-black/40 border-blue-700/60 text-white font-bold hover:bg-black/55"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('advanced_filter_add_filter')}
          </Button>
        </div>

        {filters.length === 0 && (
          <p className="text-sm text-blue-200/70 text-center py-4">
            {t('advanced_filter_empty')}
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
                <SelectValue placeholder={t('common_column')} />
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
                <SelectItem value="contains">{t('advanced_filter_op_contains')}</SelectItem>
                <SelectItem value="not_contains">{t('advanced_filter_op_not_contains')}</SelectItem>
                <SelectItem value="equals">{t('advanced_filter_op_equals')}</SelectItem>
                <SelectItem value="not_equals">{t('advanced_filter_op_not_equals')}</SelectItem>
                <SelectItem value="starts_with">{t('advanced_filter_op_starts_with')}</SelectItem>
                <SelectItem value="ends_with">{t('advanced_filter_op_ends_with')}</SelectItem>
                <SelectItem value="greater_than">{t('advanced_filter_op_greater_than')}</SelectItem>
                <SelectItem value="less_than">{t('advanced_filter_op_less_than')}</SelectItem>
                <SelectItem value="greater_equal">{t('advanced_filter_op_greater_equal')}</SelectItem>
                <SelectItem value="less_equal">{t('advanced_filter_op_less_equal')}</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="text"
              placeholder={t('common_value')}
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
