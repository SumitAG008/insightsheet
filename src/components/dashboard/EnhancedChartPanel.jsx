// components/dashboard/EnhancedChartPanel.jsx - Comprehensive chart system with 30+ chart types
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, LineChart, PieChart, TrendingUp, Activity, Layers, BarChart2, 
  AlertCircle, Download, FileSpreadsheet, FileText, Zap, Target, Gauge,
  TrendingDown, ArrowUpDown, Box, Circle, Grid3x3, Filter, 
  Calendar, Clock, DollarSign, Percent
} from 'lucide-react';
import { 
  BarChart as RechartsBarChart, Bar, 
  LineChart as RechartsLineChart, Line, 
  PieChart as RechartsPieChart, Pie, 
  AreaChart, Area,
  ScatterChart, Scatter, ZAxis,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const CHART_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#F472B6'];

// Chart categories with all 30+ chart types - Clean, professional names
const CHART_CATEGORIES = {
  stakeholder: {
    name: 'Core P&L',
    icon: DollarSign,
    charts: [
      { id: 'line', name: 'Line Chart', icon: LineChart, description: 'Trends over time' },
      { id: 'multiline', name: 'Multi-Line', icon: TrendingUp, description: 'Compare products/regions' },
      { id: 'column', name: 'Column Chart', icon: BarChart2, description: 'Compare categories side-by-side' },
      { id: 'bar', name: 'Bar Chart', icon: BarChart3, description: 'Rankings and comparisons' },
      { id: 'stacked_column', name: 'Stacked Column', icon: Layers, description: 'Composition over time' },
      { id: 'stacked_100', name: '100% Stacked', icon: Percent, description: 'Mix change over time' },
      { id: 'area', name: 'Area Chart', icon: Activity, description: 'Cumulative contribution' },
      { id: 'combo', name: 'Combo Chart', icon: TrendingUp, description: 'Column and line combined' },
      { id: 'waterfall', name: 'Waterfall', icon: ArrowUpDown, description: 'P&L bridge analysis' },
      { id: 'pareto', name: 'Pareto Chart', icon: Target, description: '80/20 analysis' },
      { id: 'histogram', name: 'Histogram', icon: BarChart2, description: 'Distribution analysis' },
      { id: 'box_whisker', name: 'Box & Whisker', icon: Box, description: 'Variability analysis' },
      { id: 'scatter', name: 'Scatter Plot', icon: Circle, description: 'Correlation analysis' },
      { id: 'bubble', name: 'Bubble Chart', icon: Circle, description: '3D comparison' },
      { id: 'heatmap', name: 'Heatmap', icon: Grid3x3, description: 'Matrix visualization' },
    ]
  },
  forecasting: {
    name: 'Forecasting',
    icon: Target,
    charts: [
      { id: 'variance_column', name: 'Variance Column', icon: TrendingDown, description: 'Budget vs actual' },
      { id: 'variance_waterfall', name: 'Variance Waterfall', icon: ArrowUpDown, description: 'Variance drivers' },
      { id: 'moving_average', name: 'Moving Average', icon: TrendingUp, description: 'Trend smoothing' },
      { id: 'run_chart', name: 'Run Chart', icon: Activity, description: 'Process monitoring' },
      { id: 'control_chart', name: 'Control Chart', icon: Gauge, description: 'SPC analysis' },
      { id: 'cusum', name: 'CUSUM Chart', icon: TrendingUp, description: 'Drift detection' },
      { id: 'scurve', name: 'S-Curve', icon: TrendingUp, description: 'Cumulative tracking' },
      { id: 'funnel', name: 'Funnel Chart', icon: Filter, description: 'Pipeline stages' },
    ]
  },
  engineering: {
    name: 'Analytics',
    icon: Zap,
    charts: [
      { id: 'log_scale', name: 'Log Scale Line', icon: LineChart, description: 'Exponential trends' },
      { id: 'semi_log', name: 'Semi-Log Plot', icon: TrendingUp, description: 'Linearized exponential' },
      { id: 'error_bars', name: 'Error Bars', icon: AlertCircle, description: 'Uncertainty intervals' },
      { id: 'scatter_regression', name: 'Regression Plot', icon: Circle, description: 'Model fit analysis' },
      { id: 'radar', name: 'Radar Chart', icon: Layers, description: 'Multi-metric comparison' },
      { id: 'gantt', name: 'Gantt Chart', icon: Calendar, description: 'Project timeline' },
      { id: 'pie', name: 'Pie Chart', icon: PieChart, description: 'Composition analysis' },
    ]
  }
};

export default function EnhancedChartPanel({ data }) {
  const [selectedCategory, setSelectedCategory] = useState('stakeholder');
  const [chartType, setChartType] = useState('line');
  const [xColumn, setXColumn] = useState('');
  const [yColumn, setYColumn] = useState('');
  const [yColumn2, setYColumn2] = useState('');
  const [yColumn3, setYColumn3] = useState('');
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#8B5CF6');
  const [secondaryColor, setSecondaryColor] = useState('#EC4899');
  const [isExporting, setIsExporting] = useState(false);

  const validHeaders = data?.headers?.filter(header => header && header.trim() !== '') || [];

  const numericColumns = validHeaders.filter(header => {
    return data.rows.some(row => {
      const val = row[header];
      return val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(val));
    });
  });

  const categoricalColumns = validHeaders.filter(header => !numericColumns.includes(header));

  useEffect(() => {
    if (categoricalColumns.length > 0 && !xColumn) {
      setXColumn(categoricalColumns[0]);
    }
    if (numericColumns.length > 0 && !yColumn) {
      setYColumn(numericColumns[0]);
    }
    if (numericColumns.length > 1 && !yColumn2) {
      setYColumn2(numericColumns[1]);
    }
  }, [categoricalColumns, numericColumns, xColumn, yColumn, yColumn2]);

  // Enhanced data processing for different chart types
  const processChartData = (type) => {
    const aggregated = {};
    let validDataCount = 0;
    
    data.rows.forEach(row => {
      const key = row[xColumn];
      const value = parseFloat(row[yColumn]);
      const value2 = yColumn2 ? parseFloat(row[yColumn2]) : null;
      const value3 = yColumn3 ? parseFloat(row[yColumn3]) : null;
      
      if (key && !isNaN(value)) {
        validDataCount++;
        const keyStr = String(key).trim();
        const displayKey = keyStr.length > 20 ? keyStr.substring(0, 17) + '...' : keyStr;
        
        if (!aggregated[displayKey]) {
          aggregated[displayKey] = { 
            name: displayKey,
            fullName: keyStr,
            [yColumn]: 0,
            count: 0
          };
          if (yColumn2) aggregated[displayKey][yColumn2] = 0;
          if (yColumn3) aggregated[displayKey][yColumn3] = 0;
        }
        
        aggregated[displayKey][yColumn] += value;
        if (yColumn2 && !isNaN(value2)) aggregated[displayKey][yColumn2] += value2;
        if (yColumn3 && !isNaN(value3)) aggregated[displayKey][yColumn3] += value3;
        aggregated[displayKey].count += 1;
      }
    });

    if (validDataCount === 0) {
      setError('No valid data found. Please check your column selections.');
      return null;
    }

    let chartDataArray = Object.values(aggregated).map(item => {
      const result = {
        name: item.name,
        fullName: item.fullName,
        [yColumn]: Math.round(item[yColumn] / item.count * 100) / 100
      };
      if (yColumn2) result[yColumn2] = Math.round((item[yColumn2] || 0) / item.count * 100) / 100;
      if (yColumn3) result[yColumn3] = Math.round((item[yColumn3] || 0) / item.count * 100) / 100;
      return result;
    });

    // Special processing for specific chart types
    if (type === 'pareto') {
      chartDataArray.sort((a, b) => b[yColumn] - a[yColumn]);
      const total = chartDataArray.reduce((sum, i) => sum + (Number(i[yColumn]) || 0), 0) || 1;
      let cumulative = 0;
      chartDataArray = chartDataArray.map(item => {
        cumulative += item[yColumn];
        return { ...item, cumulative, percent: (cumulative / total) * 100 };
      });
    }

    if (type === 'histogram') {
      // Create bins for histogram
      const values = chartDataArray.map(item => item[yColumn]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const bins = 10;
      if (!isFinite(min) || !isFinite(max)) {
        setError('Histogram needs numeric values. Please check your Y column.');
        return null;
      }

      if (min === max) {
        chartDataArray = [{ name: `${min.toFixed(2)}`, count: values.length }];
      } else {
        const binWidth = (max - min) / bins;
        const histogram = Array(bins).fill(0).map((_, i) => ({
          name: `${(min + i * binWidth).toFixed(1)}-${(min + (i + 1) * binWidth).toFixed(1)}`,
          count: 0
        }));
        values.forEach(val => {
          const binIndex = Math.min(Math.floor((val - min) / binWidth), bins - 1);
          histogram[binIndex].count++;
        });
        chartDataArray = histogram;
      }
    }

    if (type === 'bubble') {
      chartDataArray = chartDataArray.map(item => {
        const z = yColumn2 && item[yColumn2] !== undefined
          ? Math.abs(Number(item[yColumn2]) || 0)
          : Math.max(1, Math.abs(Number(item[yColumn]) || 0));
        return { ...item, z };
      });
    }

    if (type === 'funnel') {
      chartDataArray.sort((a, b) => (Number(b[yColumn]) || 0) - (Number(a[yColumn]) || 0));
    }

    if (type === 'variance_column' || type === 'variance_waterfall') {
      if (!yColumn2) {
        setError('This chart requires Y-Axis 2 (Second Value).');
        return null;
      }

      chartDataArray = chartDataArray.map(item => {
        const actual = Number(item[yColumn]) || 0;
        const budget = Number(item[yColumn2]) || 0;
        const variance = actual - budget;
        const variancePct = budget === 0 ? null : (variance / budget) * 100;
        return { ...item, actual, budget, variance, variancePct };
      });

      if (type === 'variance_waterfall') {
        let cumulative = 0;
        chartDataArray = chartDataArray
          .slice()
          .sort((a, b) => Math.abs(Number(b.variance) || 0) - Math.abs(Number(a.variance) || 0))
          .map(item => {
            const delta = Number(item.variance) || 0;
            const start = cumulative;
            const end = start + delta;
            cumulative = end;
            return {
              ...item,
              start,
              delta,
              base: Math.min(start, end),
              pos: delta > 0 ? delta : 0,
              neg: delta < 0 ? delta : 0,
              end
            };
          });
      }
    }

    if (type === 'moving_average') {
      const windowSize = 3;
      const series = chartDataArray.slice();
      chartDataArray = series.map((item, idx) => {
        const start = Math.max(0, idx - windowSize + 1);
        const window = series.slice(start, idx + 1).map(d => Number(d[yColumn]) || 0);
        const ma = window.reduce((a, b) => a + b, 0) / window.length;
        return { ...item, ma: Math.round(ma * 100) / 100 };
      });
    }

    if (type === 'run_chart') {
      const values = chartDataArray.map(d => Number(d[yColumn]) || 0);
      const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
      chartDataArray = chartDataArray.map(d => ({ ...d, mean }));
    }

    if (type === 'control_chart' || type === 'cusum') {
      const values = chartDataArray.map(d => Number(d[yColumn]) || 0);
      const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length || 1);
      const sigma = Math.sqrt(variance);
      const ucl = mean + 3 * sigma;
      const lcl = mean - 3 * sigma;

      if (type === 'control_chart') {
        chartDataArray = chartDataArray.map(d => ({ ...d, mean, ucl, lcl }));
      }

      if (type === 'cusum') {
        let s = 0;
        chartDataArray = chartDataArray.map(d => {
          const v = Number(d[yColumn]) || 0;
          s += v - mean;
          return { ...d, mean, cusum: Math.round(s * 100) / 100 };
        });
      }
    }

    if (type === 'scurve') {
      let cumulative = 0;
      chartDataArray = chartDataArray.map(d => {
        cumulative += Number(d[yColumn]) || 0;
        return { ...d, cumulative: Math.round(cumulative * 100) / 100 };
      });
    }

    if (type === 'log_scale' || type === 'semi_log') {
      const mapped = chartDataArray
        .map(d => {
          const v = Number(d[yColumn]);
          if (!isFinite(v) || v <= 0) return null;
          return { ...d, logValue: Math.round(Math.log10(v) * 1000) / 1000 };
        })
        .filter(Boolean);
      if (mapped.length === 0) {
        setError('Log charts require positive numeric values (> 0).');
        return null;
      }
      chartDataArray = mapped;
    }

    if (type === 'waterfall') {
      let cumulative = 0;
      chartDataArray = chartDataArray.map(item => {
        const delta = Number(item[yColumn]) || 0;
        const start = cumulative;
        const end = start + delta;
        cumulative = end;
        return {
          ...item,
          start,
          delta,
          base: Math.min(start, end),
          pos: delta > 0 ? delta : 0,
          neg: delta < 0 ? delta : 0,
          end
        };
      });
    }

    if (type === 'heatmap') {
      const vals = chartDataArray.map(d => Number(d[yColumn]) || 0);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const span = (max - min) || 1;
      chartDataArray = chartDataArray.map(d => {
        const v = Number(d[yColumn]) || 0;
        const t = (v - min) / span;
        return { ...d, _heat: Math.max(0, Math.min(1, t)) };
      });
    }

    if (type === 'gantt') {
      if (!yColumn2) {
        setError('Gantt chart requires Y-Axis 2 (Second Value) as Duration (or End).');
        return null;
      }
      chartDataArray = chartDataArray.map(item => {
        const start = Number(item[yColumn]) || 0;
        const duration = Number(item[yColumn2]) || 0;
        return {
          ...item,
          ganttStart: Math.max(0, start),
          ganttDuration: Math.max(0, duration)
        };
      });
    }

    if (type === 'box_whisker') {
      const groups = {};
      data.rows.forEach(row => {
        const key = row[xColumn];
        const val = parseFloat(row[yColumn]);
        if (!key || isNaN(val)) return;
        const keyStr = String(key).trim();
        const displayKey = keyStr.length > 20 ? keyStr.substring(0, 17) + '...' : keyStr;
        if (!groups[displayKey]) {
          groups[displayKey] = { name: displayKey, fullName: keyStr, values: [] };
        }
        groups[displayKey].values.push(val);
      });

      const quantile = (sorted, q) => {
        const pos = (sorted.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (sorted[base + 1] !== undefined) {
          return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        }
        return sorted[base];
      };

      chartDataArray = Object.values(groups).map(g => {
        const sorted = g.values.slice().sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const q1 = quantile(sorted, 0.25);
        const median = quantile(sorted, 0.5);
        const q3 = quantile(sorted, 0.75);
        return {
          name: g.name,
          fullName: g.fullName,
          min,
          q1,
          median,
          q3,
          max,
          iqr: q3 - q1
        };
      });

      if (chartDataArray.length === 0) {
        setError('Box & Whisker needs at least one category and numeric values.');
        return null;
      }

      chartDataArray.sort((a, b) => (Number(b.median) || 0) - (Number(a.median) || 0));
    }

    if (type === 'error_bars') {
      // For error bars, calculate error values if not provided
      // If yColumn2 exists, use it as error value, otherwise calculate standard deviation
      chartDataArray = chartDataArray.map(item => {
        const value = item[yColumn];
        let errorValue = 0;
        
        if (yColumn2 && item[yColumn2] !== undefined) {
          // Use provided error column
          errorValue = Math.abs(parseFloat(item[yColumn2]) || 0);
        } else {
          // Calculate standard deviation from all values in this category
          const categoryValues = chartDataArray
            .filter(d => d.name === item.name)
            .map(d => parseFloat(d[yColumn]))
            .filter(v => !isNaN(v));
          
          if (categoryValues.length > 1) {
            const mean = categoryValues.reduce((a, b) => a + b, 0) / categoryValues.length;
            const variance = categoryValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / categoryValues.length;
            errorValue = Math.sqrt(variance);
          } else {
            // If only one value, use 10% as default error
            errorValue = Math.abs(value) * 0.1;
          }
        }
        
        return {
          ...item,
          errorValue,
          errorUpper: value + errorValue,
          errorLower: Math.max(0, value - errorValue) // Ensure non-negative for display
        };
      });
    }

    return chartDataArray.slice(0, 50); // Limit to 50 items for performance
  };

  const generateChart = () => {
    setError('');
    
    if (!xColumn) {
      setError('Please select X-Axis (Category) column');
      return;
    }
    if (!yColumn) {
      setError('Please select Y-Axis (Value) column');
      return;
    }

    try {
      const processed = processChartData(chartType);
      if (!processed || processed.length === 0) {
        setError('Unable to generate chart. Please check your data.');
        setChartData(null);
        return;
      }
      setChartData(processed);
      setError('');
    } catch (err) {
      console.error('Chart generation error:', err);
      setError('Error generating chart. Please try different columns.');
      setChartData(null);
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    if (!chartData) return;
    setIsExporting(true);
    
    try {
      const XLSX = await import('xlsx');
      const saveAs = (await import('file-saver')).default;
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Add chart data sheet
      const wsData = XLSX.utils.json_to_sheet(chartData);
      XLSX.utils.book_append_sheet(wb, wsData, 'Chart Data');
      
      // Add original data sheet
      const wsOriginal = XLSX.utils.json_to_sheet(data.rows);
      XLSX.utils.book_append_sheet(wb, wsOriginal, 'Source Data');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `chart_${chartType}_${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Word
  const exportToWord = async () => {
    if (!chartData) return;
    setIsExporting(true);
    
    try {
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } = await import('docx');
      const saveAs = (await import('file-saver')).default;
      
      // Capture chart as image
      const chartContainer = document.querySelector('.recharts-wrapper');
      if (!chartContainer) {
        alert('Chart not found. Please generate a chart first.');
        setIsExporting(false);
        return;
      }

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartContainer, {
        backgroundColor: '#1e293b',
        scale: 2
      });

      canvas.toBlob(async (imageBlob) => {
        const arrayBuffer = await imageBlob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const imageData = `data:image/png;base64,${base64}`;

        // Create Word document
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                text: `Chart Report: ${CHART_CATEGORIES[selectedCategory].charts.find(c => c.id === chartType)?.name || chartType}`,
                heading: 'Heading1',
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                text: `Generated: ${new Date().toLocaleString()}`,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({ text: '' }), // Spacing
              new Paragraph({
                children: [
                  new Paragraph({
                    text: 'Chart Image',
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              }),
              // Add chart image (simplified - would need proper image embedding)
              new Paragraph({ text: '' }),
              new Paragraph({
                text: 'Chart Data',
                heading: 'Heading2',
              }),
              new Table({
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph('Category')] }),
                      new TableCell({ children: [new Paragraph(yColumn)] }),
                      ...(yColumn2 ? [new TableCell({ children: [new Paragraph(yColumn2)] })] : []),
                    ],
                  }),
                  ...chartData.slice(0, 20).map(item => 
                    new TableRow({
                      children: [
                        new TableCell({ children: [new Paragraph(item.fullName || item.name)] }),
                        new TableCell({ children: [new Paragraph(String(item[yColumn]))] }),
                        ...(yColumn2 ? [new TableCell({ children: [new Paragraph(String(item[yColumn2] || ''))] })] : []),
                      ],
                    })
                  ),
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
            ],
          }],
        });

        const docBlob = await Packer.toBlob(doc);
        saveAs(docBlob, `chart_${chartType}_${Date.now()}.docx`);
        setIsExporting(false);
      });
    } catch (error) {
      console.error('Word export error:', error);
      alert('Failed to export to Word. Please try again.');
      setIsExporting(false);
    }
  };

  // Export as PNG
  const exportAsPNG = async () => {
    if (!chartData) return;
    setIsExporting(true);
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const saveAs = (await import('file-saver')).default;
      
      const chartContainer = document.querySelector('.recharts-wrapper');
      if (!chartContainer) {
        alert('Chart not found. Please generate a chart first.');
        setIsExporting(false);
        return;
      }

      const canvas = await html2canvas(chartContainer, {
        backgroundColor: '#1e293b',
        scale: 2
      });

      canvas.toBlob((blob) => {
        saveAs(blob, `chart_${chartType}_${Date.now()}.png`);
        setIsExporting(false);
      });
    } catch (error) {
      console.error('PNG export error:', error);
      alert('Failed to export as PNG. Please try again.');
      setIsExporting(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border-2 border-slate-300 rounded-lg p-4 shadow-2xl">
          <p className="font-bold text-slate-900 mb-2">{payload[0].payload.fullName || label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-semibold">{entry.name}:</span> {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render different chart types
  const renderChart = () => {
    if (!chartData || chartData.length === 0) return null;

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 }
    };

    switch (chartType) {
      case 'line':
      case 'multiline':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey={yColumn} stroke={primaryColor} strokeWidth={3} dot={{ fill: primaryColor, r: 6 }} />
              {chartType === 'multiline' && yColumn2 && (
                <Line type="monotone" dataKey={yColumn2} stroke={secondaryColor} strokeWidth={3} dot={{ fill: secondaryColor, r: 6 }} />
              )}
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart {...commonProps} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} interval={0} angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey={yColumn} fill={primaryColor} radius={[8, 8, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      case 'column':
      case 'stacked_column':
      case 'stacked_100':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {chartType === 'stacked_column' || chartType === 'stacked_100' ? (
                <>
                  <Bar dataKey={yColumn} stackId="a" fill={primaryColor} />
                  {yColumn2 && <Bar dataKey={yColumn2} stackId="a" fill={secondaryColor} />}
                </>
              ) : (
                <Bar dataKey={yColumn} fill={primaryColor} radius={[8, 8, 0, 0]} />
              )}
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area type="monotone" dataKey={yColumn} stroke={primaryColor} strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'combo':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey={yColumn} fill={primaryColor} radius={[8, 8, 0, 0]} />
              {yColumn2 && <Line type="monotone" dataKey={yColumn2} stroke={secondaryColor} strokeWidth={3} dot={{ fill: secondaryColor, r: 6 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'waterfall':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '12px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="base" stackId="a" fill="transparent" />
              <Bar dataKey="pos" name="Increase" stackId="a" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="neg" name="Decrease" stackId="a" fill="#EF4444" radius={[6, 6, 0, 0]} />
              <ReferenceLine y={0} stroke="#94a3b8" opacity={0.5} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      case 'heatmap':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '12px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey={yColumn} name={yColumn} radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => {
                  const t = Number(entry._heat);
                  const r = Math.round(59 + (16 - 59) * t);
                  const g = Math.round(130 + (185 - 130) * t);
                  const b = Math.round(246 + (129 - 246) * t);
                  const color = `rgb(${r}, ${g}, ${b})`;
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      case 'variance_column':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '12px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="variance" name="Variance" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={(Number(entry.variance) || 0) >= 0 ? '#10B981' : '#EF4444'} />
                ))}
              </Bar>
              <ReferenceLine y={0} stroke="#94a3b8" opacity={0.5} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      case 'variance_waterfall':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '12px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="base" stackId="a" fill="transparent" />
              <Bar dataKey="pos" name="Favorable" stackId="a" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="neg" name="Unfavorable" stackId="a" fill="#EF4444" radius={[6, 6, 0, 0]} />
              <ReferenceLine y={0} stroke="#94a3b8" opacity={0.5} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      case 'moving_average':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey={yColumn} name={yColumn} stroke={primaryColor} strokeWidth={3} dot={{ fill: primaryColor, r: 5 }} />
              <Line type="monotone" dataKey="ma" name="Moving Avg" stroke={secondaryColor} strokeWidth={3} dot={false} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'run_chart':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <ReferenceLine y={chartData[0]?.mean} stroke="#F59E0B" strokeDasharray="4 4" opacity={0.9} />
              <Line type="monotone" dataKey={yColumn} stroke={primaryColor} strokeWidth={3} dot={{ fill: primaryColor, r: 5 }} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'control_chart':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <ReferenceLine y={chartData[0]?.ucl} stroke="#EF4444" strokeDasharray="4 4" opacity={0.8} />
              <ReferenceLine y={chartData[0]?.mean} stroke="#F59E0B" strokeDasharray="4 4" opacity={0.9} />
              <ReferenceLine y={chartData[0]?.lcl} stroke="#EF4444" strokeDasharray="4 4" opacity={0.8} />
              <Line type="monotone" dataKey={yColumn} stroke={primaryColor} strokeWidth={3} dot={{ fill: primaryColor, r: 5 }} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'cusum':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <ReferenceLine y={0} stroke="#94a3b8" opacity={0.5} />
              <Line type="monotone" dataKey="cusum" name="CUSUM" stroke={secondaryColor} strokeWidth={3} dot={{ fill: secondaryColor, r: 5 }} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'scurve':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke={primaryColor} strokeWidth={3} dot={{ fill: primaryColor, r: 5 }} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'log_scale':
      case 'semi_log':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="logValue" name="log10(value)" stroke={primaryColor} strokeWidth={3} dot={{ fill: primaryColor, r: 5 }} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'gantt':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart {...commonProps} layout="vertical" margin={{ top: 20, right: 30, left: 110, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis type="number" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <YAxis type="category" dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="ganttStart" stackId="a" fill="transparent" />
              <Bar dataKey="ganttDuration" name="Duration" stackId="a" fill={primaryColor} radius={[0, 8, 8, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      case 'pareto':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis yAxisId="left" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar yAxisId="left" dataKey={yColumn} fill={primaryColor} radius={[8, 8, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="percent" stroke={secondaryColor} strokeWidth={3} dot={{ fill: secondaryColor, r: 5 }} />
              <ReferenceLine yAxisId="right" y={80} stroke="#F59E0B" strokeDasharray="4 4" opacity={0.8} />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'histogram':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '12px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="count" name="Count" fill={primaryColor} radius={[6, 6, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      case 'funnel':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart {...commonProps} layout="vertical" margin={{ top: 20, right: 30, left: 90, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis type="number" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <YAxis type="category" dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey={yColumn} fill={primaryColor} radius={[0, 8, 8, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      case 'bubble': {
        const maxZ = Math.max(...chartData.map(d => Number(d.z) || 0), 1);
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis type="category" dataKey="name" stroke="#cbd5e1" style={{ fontSize: '12px', fill: '#cbd5e1' }} interval={0} angle={-45} textAnchor="end" height={100} />
              <YAxis type="number" dataKey={yColumn} stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <ZAxis type="number" dataKey="z" range={[60, 600]} domain={[0, maxZ]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Scatter name={yColumn} data={chartData} fill={primaryColor} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      }

      case 'box_whisker':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '12px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
                        <p className="text-white font-semibold mb-1">{d.fullName || d.name}</p>
                        <p className="text-slate-300 text-sm">Min: <span className="text-white">{Number(d.min).toFixed(2)}</span></p>
                        <p className="text-slate-300 text-sm">Q1: <span className="text-white">{Number(d.q1).toFixed(2)}</span></p>
                        <p className="text-slate-300 text-sm">Median: <span className="text-white">{Number(d.median).toFixed(2)}</span></p>
                        <p className="text-slate-300 text-sm">Q3: <span className="text-white">{Number(d.q3).toFixed(2)}</span></p>
                        <p className="text-slate-300 text-sm">Max: <span className="text-white">{Number(d.max).toFixed(2)}</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {/* IQR box (q1 -> q3) */}
              <Bar dataKey="q3" stackId="a" fill="transparent" />
              <Bar dataKey="iqr" stackId="a" name="IQR" fill={primaryColor} radius={[6, 6, 6, 6]} />
              {/* Median line */}
              <Line type="monotone" dataKey="median" name="Median" stroke={secondaryColor} strokeWidth={3} dot={false} />
              {/* Whiskers */}
              {chartData.map((entry, index) => (
                <g key={`bw-${index}`}>
                  <ReferenceLine x={entry.name} y={entry.min} stroke="#94a3b8" strokeDasharray="2 2" opacity={0.8} />
                  <ReferenceLine x={entry.name} y={entry.max} stroke="#94a3b8" strokeDasharray="2 2" opacity={0.8} />
                </g>
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'scatter':
      case 'scatter_regression':
        // Scatter chart visualization using line chart with dots
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey={yColumn} stroke={primaryColor} strokeWidth={2} dot={{ fill: primaryColor, r: 6 }} />
              {chartType === 'scatter_regression' && <ReferenceLine stroke={secondaryColor} strokeDasharray="5 5" />}
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'error_bars':
        // Error Bars chart - shows uncertainty intervals (standard deviation, confidence intervals, etc.)
        // Uses Line chart with custom error bar visualization
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart {...commonProps}>
              <defs>
                {/* Custom shape for error bars */}
                <g id="errorBar">
                  <line x1="0" y1="0" x2="0" y2="1" stroke="currentColor" strokeWidth="2" />
                  <line x1="-5" y1="0" x2="5" y2="0" stroke="currentColor" strokeWidth="2" />
                  <line x1="-5" y1="1" x2="5" y2="1" stroke="currentColor" strokeWidth="2" />
                </g>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
                        <p className="text-white font-semibold mb-1">{data.name}</p>
                        <p className="text-slate-300 text-sm">
                          Value: <span className="text-white">{data[yColumn]?.toFixed(2)}</span>
                        </p>
                        {data.errorValue !== undefined && (
                          <>
                            <p className="text-slate-300 text-sm">
                              Error: ±<span className="text-white">{data.errorValue?.toFixed(2)}</span>
                            </p>
                            <p className="text-slate-400 text-xs mt-1">
                              Range: {data.errorLower?.toFixed(2)} - {data.errorUpper?.toFixed(2)}
                            </p>
                          </>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {/* Error bars as reference lines */}
              {chartData.map((entry, index) => {
                if (entry.errorUpper === undefined || entry.errorLower === undefined) return null;
                return (
                  <g key={`error-${index}`}>
                    <ReferenceLine 
                      y={entry.errorUpper} 
                      stroke={primaryColor} 
                      strokeWidth={1} 
                      strokeDasharray="2 2"
                      opacity={0.5}
                    />
                    <ReferenceLine 
                      y={entry.errorLower} 
                      stroke={primaryColor} 
                      strokeWidth={1} 
                      strokeDasharray="2 2"
                      opacity={0.5}
                    />
                  </g>
                );
              })}
              {/* Main data line with points */}
              <Line 
                type="monotone" 
                dataKey={yColumn} 
                stroke={primaryColor} 
                strokeWidth={3} 
                dot={{ fill: primaryColor, r: 6, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsPieChart>
              <Pie data={chartData} cx="50%" cy="50%" labelLine={true} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`} outerRadius={130} dataKey={yColumn}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} formatter={(value, entry) => entry.payload.fullName || value} />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart {...commonProps} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#64748b" />
              <PolarAngleAxis dataKey="name" stroke="#cbd5e1" style={{ fontSize: '12px', fill: '#cbd5e1' }} />
              <PolarRadiusAxis stroke="#cbd5e1" style={{ fontSize: '12px', fill: '#cbd5e1' }} />
              <Radar name={yColumn} dataKey={yColumn} stroke={primaryColor} fill={primaryColor} fillOpacity={0.6} strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
            </RadarChart>
          </ResponsiveContainer>
        );

      // Add more chart types as needed...
      default:
        return (
          <div className="text-center py-20 text-slate-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3" />
            <p>Chart type "{chartType}" is coming soon!</p>
          </div>
        );
    }
  };

  if (numericColumns.length === 0 || categoricalColumns.length === 0) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-indigo-200 flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          Enhanced Charts
        </h2>
        <div className="text-center py-8 text-slate-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
          <p className="text-sm">
            {numericColumns.length === 0 
              ? 'No numeric columns found. Charts need at least one column with numbers.' 
              : 'No text columns found. Charts need at least one column with categories.'}
          </p>
        </div>
      </div>
    );
  }

  const currentCategory = CHART_CATEGORIES[selectedCategory];
  const currentCharts = currentCategory.charts;

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-indigo-200 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          Enhanced Charts
        </h2>
        {chartData && (
          <div className="flex gap-2">
            <Button onClick={exportToExcel} variant="outline" size="sm" className="border-green-500/50 bg-green-500/10 hover:bg-green-500/20 text-green-300" disabled={isExporting}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button onClick={exportToWord} variant="outline" size="sm" className="border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300" disabled={isExporting}>
              <FileText className="w-4 h-4 mr-2" />
              Word
            </Button>
            <Button onClick={exportAsPNG} variant="outline" size="sm" className="border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300" disabled={isExporting}>
              <Download className="w-4 h-4 mr-2" />
              PNG
            </Button>
          </div>
        )}
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border-slate-700">
          {Object.entries(CHART_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            return (
              <TabsTrigger key={key} value={key} className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Icon className="w-4 h-4 mr-2" />
                {category.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(CHART_CATEGORIES).map(([key, category]) => (
          <TabsContent key={key} value={key} className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {category.charts.map((chart) => {
                const Icon = chart.icon;
                return (
                  <Button
                    key={chart.id}
                    onClick={() => {
                      setChartType(chart.id);
                      setChartData(null);
                    }}
                    variant="outline"
                    size="sm"
                    className={`${
                      chartType === chart.id 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-transparent shadow-lg' 
                        : 'border-slate-700 text-slate-300 hover:bg-slate-800 bg-slate-900/50'
                    } h-auto py-3 px-2 flex flex-col items-center gap-1.5 transition-all`}
                    title={chart.description}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium text-center">{chart.name}</span>
                  </Button>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-300 mb-2 block font-medium">
              X-Axis (Category) <span className="text-red-400">*</span>
            </label>
            <Select value={xColumn || ''} onValueChange={setXColumn}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 h-10">
                <SelectValue placeholder="Select category column" />
              </SelectTrigger>
              <SelectContent>
                {categoricalColumns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-2 block font-medium">
              Y-Axis (Value) <span className="text-red-400">*</span>
            </label>
            <Select value={yColumn || ''} onValueChange={setYColumn}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 h-10">
                <SelectValue placeholder="Select numeric column" />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(chartType === 'multiline' || chartType === 'combo' || chartType === 'stacked_column' || chartType === 'stacked_100' || chartType === 'error_bars' || chartType === 'variance_column' || chartType === 'variance_waterfall' || chartType === 'gantt' || chartType === 'bubble') && (
          <div>
            <label className="text-sm text-slate-300 mb-2 block font-medium">
              {chartType === 'error_bars' ? 'Error Value (Optional)' : 'Y-Axis 2 (Second Value)'}
            </label>
            <Select value={yColumn2 || ''} onValueChange={setYColumn2}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 h-10">
                <SelectValue placeholder={chartType === 'error_bars' ? 'Select error column (or leave empty for auto-calculated)' : 'Select second numeric column'} />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.filter(col => col !== yColumn).map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {chartType === 'error_bars' && (
              <p className="text-xs text-slate-500 mt-1">
                Optional: Select a column with error values. If not provided, standard deviation will be calculated automatically.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <Button
          onClick={generateChart}
          disabled={!xColumn || !yColumn}
          className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 font-semibold h-11"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Generate Chart
        </Button>
      </div>

      {chartData && chartData.length > 0 && (
        <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl recharts-wrapper">
          {renderChart()}
        </div>
      )}
    </div>
  );
}

EnhancedChartPanel.propTypes = {
  data: PropTypes.shape({
    headers: PropTypes.arrayOf(PropTypes.string),
    rows: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
};
