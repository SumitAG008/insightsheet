// components/dashboard/DataValidator.jsx - Smart data validation component
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Mail, Phone, Calendar, Hash, Wand2 } from 'lucide-react';

export default function DataValidator({ data, onDataUpdate }) {
  const [validationResults, setValidationResults] = useState(null);
  const [validating, setValidating] = useState(false);

  // Validation functions
  const isValidEmail = (value) => {
    if (!value || typeof value !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const isValidPhone = (value) => {
    if (!value || typeof value !== 'string') return false;
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    const digits = value.replace(/\D/g, '');
    return phoneRegex.test(value) && digits.length >= 10 && digits.length <= 15;
  };

  const isValidDate = (value) => {
    if (!value) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  };

  const isValidNumber = (value) => {
    if (value === null || value === undefined || value === '') return false;
    return !isNaN(parseFloat(value)) && isFinite(value);
  };

  const detectColumnType = (header, rows) => {
    const values = rows.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== '');
    if (values.length === 0) return 'empty';

    // Check for email
    const emailCount = values.filter(v => isValidEmail(v)).length;
    if (emailCount > values.length * 0.8) return 'email';

    // Check for phone
    const phoneCount = values.filter(v => isValidPhone(v)).length;
    if (phoneCount > values.length * 0.8) return 'phone';

    // Check for date
    const dateCount = values.filter(v => isValidDate(v)).length;
    if (dateCount > values.length * 0.8) return 'date';

    // Check for number
    const numberCount = values.filter(v => isValidNumber(v)).length;
    if (numberCount > values.length * 0.8) return 'number';

    return 'text';
  };

  const validateData = () => {
    setValidating(true);
    setValidationResults(null);

    setTimeout(() => {
      const issues = [];
      const columnTypes = {};
      const columnStats = {};

      data.headers.forEach(header => {
        const detectedType = detectColumnType(header, data.rows);
        columnTypes[header] = detectedType;

        const columnIssues = [];
        let validCount = 0;
        let invalidCount = 0;

        data.rows.forEach((row, rowIndex) => {
          const value = row[header];
          let isValid = true;
          let issueType = null;

          if (value === null || value === undefined || value === '') {
            columnIssues.push({
              row: rowIndex,
              value: value,
              issue: 'Empty value',
              severity: 'warning'
            });
            return;
          }

          // Validate based on detected type
          if (detectedType === 'email' && !isValidEmail(value)) {
            isValid = false;
            issueType = 'Invalid email format';
          } else if (detectedType === 'phone' && !isValidPhone(value)) {
            isValid = false;
            issueType = 'Invalid phone format';
          } else if (detectedType === 'date' && !isValidDate(value)) {
            isValid = false;
            issueType = 'Invalid date format';
          } else if (detectedType === 'number' && !isValidNumber(value)) {
            isValid = false;
            issueType = 'Invalid number format';
          }

          if (!isValid) {
            columnIssues.push({
              row: rowIndex,
              value: value,
              issue: issueType,
              severity: 'error'
            });
            invalidCount++;
          } else {
            validCount++;
          }
        });

        if (columnIssues.length > 0) {
          issues.push({
            column: header,
            type: detectedType,
            issues: columnIssues,
            validCount,
            invalidCount,
            totalCount: data.rows.length
          });
        }

        columnStats[header] = {
          type: detectedType,
          validCount,
          invalidCount,
          totalCount: data.rows.length,
          accuracy: ((validCount / data.rows.length) * 100).toFixed(1)
        };
      });

      setValidationResults({
        issues,
        columnTypes,
        columnStats,
        totalIssues: issues.reduce((sum, col) => sum + col.issues.length, 0),
        columnsWithIssues: issues.length
      });

      setValidating(false);
    }, 1000);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'email': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'phone': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'date': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'number': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  if (!data || !data.headers || data.headers.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-blue-400" />
          Smart Data Validation
        </h2>
        <Button
          onClick={validateData}
          disabled={validating}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {validating ? 'Validating...' : 'Validate Data'}
        </Button>
      </div>

      {validationResults && (
        <div className="space-y-4">
          {/* Summary */}
          <Alert className={validationResults.totalIssues === 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}>
            {validationResults.totalIssues === 0 ? (
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            )}
            <AlertDescription className="text-slate-200">
              <strong className={validationResults.totalIssues === 0 ? 'text-emerald-300' : 'text-amber-300'}>
                {validationResults.totalIssues === 0
                  ? '✅ All data validated successfully!'
                  : `⚠️ Found ${validationResults.totalIssues} issues across ${validationResults.columnsWithIssues} columns`}
              </strong>
            </AlertDescription>
          </Alert>

          {/* Column Statistics */}
          <div className="grid md:grid-cols-2 gap-3">
            {Object.entries(validationResults.columnStats).map(([header, stats]) => (
              <div
                key={header}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200">{header}</span>
                  <Badge className={getTypeColor(stats.type)}>
                    {getTypeIcon(stats.type)}
                    <span className="ml-1 capitalize">{stats.type}</span>
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>Valid: {stats.validCount}</span>
                  {stats.invalidCount > 0 && (
                    <span className="text-amber-400">Invalid: {stats.invalidCount}</span>
                  )}
                  <span>Accuracy: {stats.accuracy}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Issues List */}
          {validationResults.issues.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Issues Found:</h3>
              {validationResults.issues.map((columnIssue, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-200">{columnIssue.column}</h4>
                    <Badge className={getTypeColor(columnIssue.type)}>
                      {getTypeIcon(columnIssue.type)}
                      <span className="ml-1 capitalize">{columnIssue.type}</span>
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-400 mb-2">
                    {columnIssue.invalidCount} invalid out of {columnIssue.totalCount} values
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {columnIssue.issues.slice(0, 10).map((issue, issueIdx) => (
                      <div
                        key={issueIdx}
                        className="flex items-center gap-2 text-xs bg-slate-900/50 rounded px-2 py-1"
                      >
                        <XCircle className={`w-3 h-3 ${issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
                        <span className="text-slate-300">Row {issue.row + 1}:</span>
                        <span className="text-slate-400">{issue.value}</span>
                        <span className="text-amber-400">- {issue.issue}</span>
                      </div>
                    ))}
                    {columnIssue.issues.length > 10 && (
                      <div className="text-xs text-slate-500 text-center">
                        ... and {columnIssue.issues.length - 10} more issues
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!validationResults && (
        <p className="text-sm text-slate-400 text-center py-4">
          Click "Validate Data" to automatically detect data types and find validation issues
        </p>
      )}
    </div>
  );
}

DataValidator.propTypes = {
  data: PropTypes.shape({
    headers: PropTypes.arrayOf(PropTypes.string).isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  onDataUpdate: PropTypes.func,
};
