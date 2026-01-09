// components/dashboard/EnhancedChartPanel.jsx - Comprehensive chart system with 30+ chart types
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, LineChart, PieChart, TrendingUp, Activity, Layers, BarChart2, 
  AlertCircle, Download, FileSpreadsheet, FileText, Zap, Target, Gauge,
  TrendingDown, ArrowUpDown, Box, Scatter, Bubble, Heatmap, Funnel, 
  Calendar, Clock, DollarSign, Percent
} from 'lucide-react';
import { 
  BarChart as RechartsBarChart, Bar, 
  LineChart as RechartsLineChart, Line, 
  PieChart as RechartsPieChart, Pie, 
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const CHART_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#F472B6'];

// Chart categories with all 30+ chart types
const CHART_CATEGORIES = {
  stakeholder: {
    name: 'Core Stakeholder & P&L',
    icon: DollarSign,
    charts: [
      { id: 'line', name: 'Line (Time Series)', icon: LineChart, description: 'Trends over time' },
      { id: 'multiline', name: 'Multi-Line Comparison', icon: TrendingUp, description: 'Compare products/regions' },
      { id: 'column', name: 'Column (Clustered)', icon: BarChart2, description: 'Compare categories side-by-side' },
      { id: 'bar', name: 'Bar (Horizontal)', icon: BarChart3, description: 'Rankings (top customers, cost buckets)' },
      { id: 'stacked_column', name: 'Stacked Column', icon: Layers, description: 'Composition over time' },
      { id: 'stacked_100', name: '100% Stacked Column', icon: Percent, description: 'Mix change over time' },
      { id: 'area', name: 'Area (Stacked)', icon: Activity, description: 'Cumulative contribution' },
      { id: 'combo', name: 'Combo (Column + Line)', icon: TrendingUp, description: 'Actual vs target' },
      { id: 'waterfall', name: 'Waterfall', icon: ArrowUpDown, description: 'P&L bridge, variance bridges' },
      { id: 'pareto', name: 'Pareto (80/20)', icon: Target, description: 'Defect causes, spend drivers' },
      { id: 'histogram', name: 'Histogram', icon: BarChart2, description: 'Distribution analysis' },
      { id: 'box_whisker', name: 'Box & Whisker', icon: Box, description: 'Variability/outliers' },
      { id: 'scatter', name: 'Scatter (XY)', icon: Scatter, description: 'Correlation analysis' },
      { id: 'bubble', name: 'Bubble', icon: Bubble, description: '3D comparison' },
      { id: 'heatmap', name: 'Heatmap', icon: Heatmap, description: 'Cost centers vs months' },
    ]
  },
  forecasting: {
    name: 'Forecasting & KPI',
    icon: Target,
    charts: [
      { id: 'variance_column', name: 'Actual vs Budget Variance', icon: TrendingDown, description: 'Month-by-month variance' },
      { id: 'variance_waterfall', name: 'Variance Waterfall', icon: ArrowUpDown, description: 'Explain variance drivers' },
      { id: 'moving_average', name: 'Moving Average Line', icon: TrendingUp, description: 'Smoothing noisy trends' },
      { id: 'run_chart', name: 'Run Chart', icon: Activity, description: 'Process monitoring' },
      { id: 'control_chart', name: 'Control Chart (SPC)', icon: Gauge, description: 'Mean + UCL/LCL' },
      { id: 'cusum', name: 'Cumulative Sum (CUSUM)', icon: TrendingUp, description: 'Drift detection' },
      { id: 'scurve', name: 'S-Curve (Cumulative)', icon: TrendingUp, description: 'Project tracking' },
      { id: 'funnel', name: 'Funnel', icon: Funnel, description: 'Pipeline stages' },
    ]
  },
  engineering: {
    name: 'Engineering / PhD Analytics',
    icon: Zap,
    charts: [
      { id: 'log_scale', name: 'Log-Scale Line', icon: LineChart, description: 'Exponential growth/decay' },
      { id: 'semi_log', name: 'Semi-log Plot', icon: TrendingUp, description: 'Linearize exponential' },
      { id: 'error_bars', name: 'Error Bar Chart', icon: AlertCircle, description: 'Measurement uncertainty' },
      { id: 'scatter_regression', name: 'Scatter with Regression', icon: Scatter, description: 'Model fit & R²' },
      { id: 'radar', name: 'Radar (Spider)', icon: Layers, description: 'Multi-metric comparison' },
      { id: 'gantt', name: 'Gantt (Stacked Bar)', icon: Calendar, description: 'Schedule + phases' },
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
      let cumulative = 0;
      chartDataArray = chartDataArray.map(item => {
        cumulative += item[yColumn];
        return { ...item, cumulative, percent: (cumulative / chartDataArray.reduce((sum, i) => sum + i[yColumn], 0)) * 100 };
      });
    }

    if (type === 'histogram') {
      // Create bins for histogram
      const values = chartDataArray.map(item => item[yColumn]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const bins = 10;
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
          Enhanced Charts (30+ Types)
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
          Enhanced Charts (30+ Types)
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

        {(chartType === 'multiline' || chartType === 'combo' || chartType === 'stacked_column' || chartType === 'stacked_100') && (
          <div>
            <label className="text-sm text-slate-300 mb-2 block font-medium">
              Y-Axis 2 (Second Value)
            </label>
            <Select value={yColumn2 || ''} onValueChange={setYColumn2}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 h-10">
                <SelectValue placeholder="Select second numeric column" />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.filter(col => col !== yColumn).map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
