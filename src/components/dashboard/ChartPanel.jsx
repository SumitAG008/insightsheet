
// components/dashboard/ChartPanel.jsx - Fixed colors, labels, and added export
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, LineChart, PieChart, TrendingUp, Activity, Layers, BarChart2, AlertCircle, Download } from 'lucide-react';
import { 
  BarChart, Bar, 
  LineChart as RechartsLineChart, Line, 
  PieChart as RechartsPieChart, Pie, 
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const CHART_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#F472B6'];

const CHART_TYPES = [
  { id: 'bar', name: 'Bar', icon: BarChart3, color: 'from-purple-600 to-purple-700' },
  { id: 'column', name: 'Column', icon: BarChart2, color: 'from-pink-600 to-pink-700' },
  { id: 'line', name: 'Line', icon: LineChart, color: 'from-blue-600 to-blue-700' },
  { id: 'area', name: 'Area', icon: Activity, color: 'from-cyan-600 to-cyan-700' },
  { id: 'pie', name: 'Pie', icon: PieChart, color: 'from-orange-600 to-orange-700' },
  { id: 'radar', name: 'Radar', icon: Layers, color: 'from-emerald-600 to-emerald-700' },
  { id: 'combo', name: 'Combo', icon: TrendingUp, color: 'from-indigo-600 to-indigo-700' }
];

export default function ChartPanel({ data }) {
  const [chartType, setChartType] = useState('bar');
  const [xColumn, setXColumn] = useState('');
  const [yColumn, setYColumn] = useState('');
  const [yColumn2, setYColumn2] = useState('');
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState('');

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
    if (chartType === 'combo' && !yColumn2) {
      setError('Please select Y-Axis 2 for Combo chart');
      return;
    }

    try {
      const aggregated = {};
      let validDataCount = 0;
      
      data.rows.forEach(row => {
        const key = row[xColumn];
        const value = parseFloat(row[yColumn]);
        const value2 = yColumn2 ? parseFloat(row[yColumn2]) : null;
        
        if (key && !isNaN(value)) {
          validDataCount++;
          const keyStr = String(key).trim();
          
          // Truncate long labels
          const displayKey = keyStr.length > 20 ? keyStr.substring(0, 17) + '...' : keyStr;
          
          if (!aggregated[displayKey]) {
            aggregated[displayKey] = { 
              name: displayKey,
              fullName: keyStr, // Keep full name for tooltip
              [yColumn]: 0, 
              count: 0 
            };
            if (yColumn2) {
              aggregated[displayKey][yColumn2] = 0;
            }
          }
          
          aggregated[displayKey][yColumn] += value;
          if (yColumn2 && !isNaN(value2)) {
            aggregated[displayKey][yColumn2] += value2;
          }
          aggregated[displayKey].count += 1;
        }
      });

      if (validDataCount === 0) {
        setError('No valid data found. Please check your column selections.');
        setChartData(null);
        return;
      }

      const chartDataArray = Object.values(aggregated)
        .map(item => {
          const result = {
            name: item.name,
            fullName: item.fullName,
            [yColumn]: Math.round(item[yColumn] / item.count * 100) / 100
          };
          if (yColumn2) {
            result[yColumn2] = Math.round((item[yColumn2] || 0) / item.count * 100) / 100;
          }
          return result;
        })
        .slice(0, 10);

      if (chartDataArray.length === 0) {
        setError('Unable to generate chart. Please check your data.');
        setChartData(null);
        return;
      }

      setChartData(chartDataArray);
      setError('');
    } catch (err) {
      console.error('Chart generation error:', err);
      setError('Error generating chart. Please try different columns.');
      setChartData(null);
    }
  };

  const exportAsCSV = () => {
    const headers = ['Category', yColumn, yColumn2].filter(Boolean);
    const rows = chartData.map(row => [
      row.fullName || row.name,
      row[yColumn],
      yColumn2 ? row[yColumn2] : null
    ].filter(v => v !== null));

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chart_data_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportChart = () => {
    if (!chartData) return;

    // Method 1: Export as PNG image (ACTUAL CHART)
    const chartContainer = document.querySelector('.recharts-wrapper');
    if (!chartContainer) {
      alert('Chart not found. Please generate a chart first.');
      return;
    }

    // Use html2canvas to convert chart to image
    import('html2canvas').then((html2canvas) => {
      html2canvas.default(chartContainer, {
        backgroundColor: '#1e293b', // This matches the slate-800/50 background (approx)
        scale: 2 // Higher quality
      }).then(canvas => {
        // Convert to PNG and download
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `chart_${chartType}_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        });
      });
    }).catch((e) => {
      console.error("Error exporting chart as PNG, falling back to CSV:", e);
      // Fallback: Export as CSV data
      exportAsCSV();
    });
  };

  // Custom Tooltip with better visibility
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

  const renderChart = () => {
    if (!chartData || chartData.length === 0) return null;

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#cbd5e1" 
                style={{ fontSize: '13px', fill: '#cbd5e1' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey={yColumn} fill="#8B5CF6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'column':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#cbd5e1"
                style={{ fontSize: '13px', fill: '#cbd5e1' }}
                angle={-45} 
                textAnchor="end" 
                height={100}
                interval={0}
              />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey={yColumn} fill="#EC4899" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#cbd5e1"
                style={{ fontSize: '13px', fill: '#cbd5e1' }}
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line 
                type="monotone" 
                dataKey={yColumn} 
                stroke="#10B981" 
                strokeWidth={3}
                dot={{ fill: '#10B981', r: 6 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#cbd5e1"
                style={{ fontSize: '13px', fill: '#cbd5e1' }}
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area 
                type="monotone" 
                dataKey={yColumn} 
                stroke="#3B82F6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsPieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent, payload }) => `${payload.fullName || name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={130}
                dataKey={yColumn}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }}
                formatter={(value, entry) => entry.payload.fullName || value}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart {...commonProps} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#64748b" />
              <PolarAngleAxis 
                dataKey="name" 
                stroke="#cbd5e1"
                style={{ fontSize: '12px', fill: '#cbd5e1' }}
              />
              <PolarRadiusAxis stroke="#cbd5e1" style={{ fontSize: '12px', fill: '#cbd5e1' }} />
              <Radar 
                name={yColumn} 
                dataKey={yColumn} 
                stroke="#F59E0B" 
                fill="#F59E0B" 
                fillOpacity={0.6}
                strokeWidth={2}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'combo':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#cbd5e1"
                style={{ fontSize: '13px', fill: '#cbd5e1' }}
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis stroke="#cbd5e1" style={{ fontSize: '13px', fill: '#cbd5e1' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey={yColumn} fill="#8B5CF6" radius={[8, 8, 0, 0]} />
              {yColumn2 && (
                <Line 
                  type="monotone" 
                  dataKey={yColumn2} 
                  stroke="#EC4899" 
                  strokeWidth={3}
                  dot={{ fill: '#EC4899', r: 6 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (numericColumns.length === 0 || categoricalColumns.length === 0) {
    return (
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-blue-600/10 rounded-2xl blur-xl" />
        
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-indigo-200 flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Advanced Charts
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
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-blue-600/10 rounded-2xl blur-xl" />
      
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold text-indigo-200 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Advanced Charts
          </h2>
          {chartData && (
            <Button
              onClick={exportChart}
              variant="outline"
              size="sm"
              className="border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>

        <div className="space-y-4 mb-6">
          {/* Chart Type Selection */}
          <div>
            <label className="text-xs md:text-sm text-slate-300 mb-2 block font-medium">Chart Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {CHART_TYPES.map((type) => (
                <Button
                  key={type.id}
                  onClick={() => setChartType(type.id)}
                  variant="outline"
                  size="sm"
                  className={`${
                    chartType === type.id 
                      ? `bg-gradient-to-r ${type.color} text-white border-transparent shadow-lg scale-105` 
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800 bg-slate-900/50'
                  } h-auto py-3 px-2 flex flex-col items-center gap-1.5 transition-all duration-200`}
                >
                  <type.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs font-medium whitespace-nowrap">{type.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* X-Axis Selection */}
          <div>
            <label className="text-xs md:text-sm text-slate-300 mb-2 block font-medium">
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

          {/* Y-Axis Selection */}
          <div>
            <label className="text-xs md:text-sm text-slate-300 mb-2 block font-medium">
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

          {/* Y-Axis 2 (For Combo Charts) */}
          {chartType === 'combo' && (
            <div>
              <label className="text-xs md:text-sm text-slate-300 mb-2 block font-medium">
                Y-Axis 2 (Second Value) <span className="text-red-400">*</span>
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

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={generateChart}
            disabled={!xColumn || !yColumn || (chartType === 'combo' && !yColumn2)}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 font-semibold h-11 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Generate Chart
          </Button>
        </div>

        {/* Chart Display */}
        {chartData && chartData.length > 0 && (
          <div className="mt-6 p-3 md:p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl recharts-wrapper">
            {renderChart()}
          </div>
        )}
      </div>
    </div>
  );
}

ChartPanel.propTypes = {
  data: PropTypes.shape({
    headers: PropTypes.arrayOf(PropTypes.string),
    rows: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
};
