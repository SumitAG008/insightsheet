/** Answers whose generated SQL is checked against the engine, in the browser (SQLite) and the lakehouse (DuckDB). Test data only. */
export const SQL_CASES = {
  'one source by a column': { groupBy: 'customer', series: [{ view: 'sales_orders', measure: 'amount', agg: 'sum' }] },
  'count and average': { groupBy: 'region', series: [{ view: 'sales_orders', agg: 'count' }, { view: 'sales_orders', measure: 'amount', agg: 'avg', label: 'Avg order' }] },
  'min and max, sorted ascending': { groupBy: 'stage', sort: 'asc', series: [{ view: 'opportunities', measure: 'amount', agg: 'min', label: 'Smallest' }, { view: 'opportunities', measure: 'amount', agg: 'max', label: 'Largest' }] },
  'three systems joined with a ratio': { groupBy: 'customer', series: [
    { view: 'invoices', measure: 'amount', agg: 'sum', label: 'Invoiced' },
    { view: 'opportunities', measure: 'amount', agg: 'sum', label: 'Pipeline', filters: [{ dim: 'stage', op: 'neq', value: 'Closed lost' }] },
    { view: 'sales_orders', measure: 'amount', agg: 'sum', label: 'Orders' },
  ], derived: [{ label: 'Invoiced per order £', numerator: [0], denominator: 2 }] },
  'lookup through a link (expenses by the employee department)': { groupBy: 'department', series: [{ view: 'expenses', measure: 'amount', agg: 'sum' }, { view: 'employees', agg: 'count', label: 'Headcount' }] },
  'filter on a looked-up column': { groupBy: 'category', filters: [{ dim: 'level', op: 'eq', value: 'Senior' }], series: [{ view: 'expenses', measure: 'amount', agg: 'sum' }] },
  'monthly with a date range': { groupBy: 'month', filters: [{ dim: 'month', op: 'gte', value: '2026-01' }, { dim: 'month', op: 'lte', value: '2026-06' }], series: [{ view: 'sales_orders', measure: 'amount', agg: 'sum', label: 'Orders' }, { view: 'invoices', measure: 'amount', agg: 'sum', label: 'Invoiced' }] },
  'rolling 3 months': { groupBy: 'month', window: 3, series: [{ view: 'sales_orders', measure: 'amount', agg: 'sum' }] },
  'rolling average and count across two sources': { groupBy: 'month', window: 4, series: [{ view: 'invoices', measure: 'days_overdue', agg: 'avg' }, { view: 'expenses', agg: 'count' }] },
  'prior month comparison with a date filter': { groupBy: 'month', compare: 'prior_period', filters: [{ dim: 'month', op: 'gte', value: '2026-03' }], series: [{ view: 'sales_orders', measure: 'amount', agg: 'sum' }] },
  'share of total, top 3': { groupBy: 'product_line', share: true, limit: 3, series: [{ view: 'sales_orders', measure: 'amount', agg: 'sum' }] },
  'split by a second column': { groupBy: 'department', splitBy: 'category', series: [{ view: 'expenses', measure: 'amount', agg: 'sum' }] },
  'split by month, counts': { groupBy: 'region', splitBy: 'month', series: [{ view: 'sales_orders', agg: 'count' }] },
  'rolling split': { groupBy: 'month', splitBy: 'region', window: 2, series: [{ view: 'sales_orders', measure: 'amount', agg: 'sum' }] },
  'totals without a breakdown': { groupBy: null, series: [{ view: 'employees', agg: 'count', label: 'Headcount' }, { view: 'employees', measure: 'salary', agg: 'sum', label: 'Salaries' }], derived: [{ label: 'Average salary', numerator: [1], denominator: 0 }] },
  'sum of two series as one metric': { groupBy: 'department', series: [{ view: 'expenses', measure: 'amount', agg: 'sum', label: 'Expenses' }, { view: 'supplier_spend', measure: 'amount', agg: 'sum', label: 'Supplier spend' }], derived: [{ label: 'Total spend', numerator: [0, 1], denominator: null }], share: true },
};
