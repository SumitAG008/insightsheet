// pages/AccountingToolkit.jsx - Comprehensive accounting utilities and calculators
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calculator, TrendingUp, PieChart, DollarSign,
  Receipt, FileSpreadsheet, BarChart3, Percent
} from 'lucide-react';

export default function AccountingToolkit() {
  // GST Calculator State
  const [gstAmount, setGstAmount] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [gstResult, setGstResult] = useState(null);

  // Depreciation Calculator State
  const [assetCost, setAssetCost] = useState('');
  const [salvageValue, setSalvageValue] = useState('');
  const [usefulLife, setUsefulLife] = useState('');
  const [depreciationResult, setDepreciationResult] = useState(null);

  // Profit Margin Calculator State
  const [revenue, setRevenue] = useState('');
  const [cost, setCost] = useState('');
  const [marginResult, setMarginResult] = useState(null);

  // Break-even Calculator State
  const [fixedCosts, setFixedCosts] = useState('');
  const [variableCost, setVariableCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [breakEvenResult, setBreakEvenResult] = useState(null);

  const calculateGST = () => {
    const amount = parseFloat(gstAmount);
    const rate = parseFloat(gstRate);

    if (isNaN(amount) || isNaN(rate)) {
      alert('Please enter valid numbers');
      return;
    }

    const gstValue = (amount * rate) / 100;
    const totalWithGST = amount + gstValue;
    const baseAmount = totalWithGST / (1 + rate / 100);

    setGstResult({
      baseAmount: amount,
      gstRate: rate,
      gstAmount: gstValue.toFixed(2),
      totalAmount: totalWithGST.toFixed(2),
      cgst: (gstValue / 2).toFixed(2),
      sgst: (gstValue / 2).toFixed(2)
    });
  };

  const calculateDepreciation = () => {
    const cost = parseFloat(assetCost);
    const salvage = parseFloat(salvageValue);
    const life = parseFloat(usefulLife);

    if (isNaN(cost) || isNaN(salvage) || isNaN(life) || life === 0) {
      alert('Please enter valid numbers');
      return;
    }

    // Straight-line depreciation
    const annualDepreciation = (cost - salvage) / life;
    const depreciationRate = (annualDepreciation / cost) * 100;

    setDepreciationResult({
      annualDepreciation: annualDepreciation.toFixed(2),
      monthlyDepreciation: (annualDepreciation / 12).toFixed(2),
      depreciationRate: depreciationRate.toFixed(2),
      totalDepreciation: (annualDepreciation * life).toFixed(2),
      endValue: salvage.toFixed(2)
    });
  };

  const calculateMargin = () => {
    const rev = parseFloat(revenue);
    const cst = parseFloat(cost);

    if (isNaN(rev) || isNaN(cst) || rev === 0) {
      alert('Please enter valid numbers');
      return;
    }

    const profit = rev - cst;
    const profitMargin = (profit / rev) * 100;
    const markup = (profit / cst) * 100;
    const roi = (profit / cst) * 100;

    setMarginResult({
      revenue: rev.toFixed(2),
      cost: cst.toFixed(2),
      profit: profit.toFixed(2),
      profitMargin: profitMargin.toFixed(2),
      markup: markup.toFixed(2),
      roi: roi.toFixed(2)
    });
  };

  const calculateBreakEven = () => {
    const fixed = parseFloat(fixedCosts);
    const variable = parseFloat(variableCost);
    const selling = parseFloat(sellingPrice);

    if (isNaN(fixed) || isNaN(variable) || isNaN(selling) || selling <= variable) {
      alert('Please enter valid numbers. Selling price must be greater than variable cost.');
      return;
    }

    const contributionMargin = selling - variable;
    const breakEvenUnits = fixed / contributionMargin;
    const breakEvenRevenue = breakEvenUnits * selling;
    const contributionMarginRatio = (contributionMargin / selling) * 100;

    setBreakEvenResult({
      breakEvenUnits: Math.ceil(breakEvenUnits),
      breakEvenRevenue: breakEvenRevenue.toFixed(2),
      contributionMargin: contributionMargin.toFixed(2),
      contributionMarginRatio: contributionMarginRatio.toFixed(2)
    });
  };

  const resetGST = () => {
    setGstAmount('');
    setGstRate('18');
    setGstResult(null);
  };

  const resetDepreciation = () => {
    setAssetCost('');
    setSalvageValue('');
    setUsefulLife('');
    setDepreciationResult(null);
  };

  const resetMargin = () => {
    setRevenue('');
    setCost('');
    setMarginResult(null);
  };

  const resetBreakEven = () => {
    setFixedCosts('');
    setVariableCost('');
    setSellingPrice('');
    setBreakEvenResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Calculator className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-black mb-3">
            Accounting Toolkit
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Essential accounting calculators and financial tools
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Receipt className="w-6 h-6 text-emerald-500" />
              <div>
                <p className="text-sm text-slate-600">GST</p>
                <p className="text-lg font-bold text-slate-800">Calculator</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              <div>
                <p className="text-sm text-slate-600">Depreciation</p>
                <p className="text-lg font-bold text-slate-800">Analysis</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <PieChart className="w-6 h-6 text-purple-500" />
              <div>
                <p className="text-sm text-slate-600">Profit</p>
                <p className="text-lg font-bold text-slate-800">Margins</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-orange-500" />
              <div>
                <p className="text-sm text-slate-600">Break-even</p>
                <p className="text-lg font-bold text-slate-800">Analysis</p>
              </div>
            </div>
          </div>
        </div>

        {/* Calculators Tabs */}
        <Tabs defaultValue="gst" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="gst" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Receipt className="w-4 h-4 mr-2" />
              GST
            </TabsTrigger>
            <TabsTrigger value="depreciation" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Depreciation
            </TabsTrigger>
            <TabsTrigger value="margin" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Percent className="w-4 h-4 mr-2" />
              Profit Margin
            </TabsTrigger>
            <TabsTrigger value="breakeven" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Break-even
            </TabsTrigger>
          </TabsList>

          {/* GST Calculator */}
          <TabsContent value="gst">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Receipt className="w-6 h-6 text-emerald-500" />
                GST Calculator
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Base Amount (₹)
                    </label>
                    <Input
                      type="number"
                      value={gstAmount}
                      onChange={(e) => setGstAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      GST Rate (%)
                    </label>
                    <select
                      value={gstRate}
                      onChange={(e) => setGstRate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={calculateGST}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Calculate
                    </Button>
                    <Button
                      onClick={resetGST}
                      variant="outline"
                      className="border-slate-300"
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <div>
                  {gstResult && (
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                      <h3 className="font-bold text-slate-800 mb-3">Calculation Results</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Base Amount:</span>
                          <span className="font-semibold">₹{gstResult.baseAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">GST ({gstResult.gstRate}%):</span>
                          <span className="font-semibold">₹{gstResult.gstAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">CGST:</span>
                          <span className="font-semibold">₹{gstResult.cgst}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">SGST:</span>
                          <span className="font-semibold">₹{gstResult.sgst}</span>
                        </div>
                        <div className="pt-2 border-t border-emerald-300">
                          <div className="flex justify-between">
                            <span className="text-slate-800 font-bold">Total Amount:</span>
                            <span className="font-bold text-emerald-700 text-lg">₹{gstResult.totalAmount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Depreciation Calculator */}
          <TabsContent value="depreciation">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-500" />
                Depreciation Calculator (Straight-line Method)
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Asset Cost (₹)
                    </label>
                    <Input
                      type="number"
                      value={assetCost}
                      onChange={(e) => setAssetCost(e.target.value)}
                      placeholder="Enter asset cost"
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Salvage Value (₹)
                    </label>
                    <Input
                      type="number"
                      value={salvageValue}
                      onChange={(e) => setSalvageValue(e.target.value)}
                      placeholder="Enter salvage value"
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Useful Life (years)
                    </label>
                    <Input
                      type="number"
                      value={usefulLife}
                      onChange={(e) => setUsefulLife(e.target.value)}
                      placeholder="Enter useful life"
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={calculateDepreciation}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Calculate
                    </Button>
                    <Button
                      onClick={resetDepreciation}
                      variant="outline"
                      className="border-slate-300"
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <div>
                  {depreciationResult && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h3 className="font-bold text-slate-800 mb-3">Depreciation Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Annual Depreciation:</span>
                          <span className="font-semibold">₹{depreciationResult.annualDepreciation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Monthly Depreciation:</span>
                          <span className="font-semibold">₹{depreciationResult.monthlyDepreciation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Depreciation Rate:</span>
                          <span className="font-semibold">{depreciationResult.depreciationRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Depreciation:</span>
                          <span className="font-semibold">₹{depreciationResult.totalDepreciation}</span>
                        </div>
                        <div className="pt-2 border-t border-blue-300">
                          <div className="flex justify-between">
                            <span className="text-slate-800 font-bold">End Value:</span>
                            <span className="font-bold text-blue-700 text-lg">₹{depreciationResult.endValue}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Profit Margin Calculator */}
          <TabsContent value="margin">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Percent className="w-6 h-6 text-purple-500" />
                Profit Margin Calculator
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Revenue (₹)
                    </label>
                    <Input
                      type="number"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      placeholder="Enter revenue"
                      className="border-slate-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Cost (₹)
                    </label>
                    <Input
                      type="number"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="Enter cost"
                      className="border-slate-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={calculateMargin}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Calculate
                    </Button>
                    <Button
                      onClick={resetMargin}
                      variant="outline"
                      className="border-slate-300"
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <div>
                  {marginResult && (
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                      <h3 className="font-bold text-slate-800 mb-3">Financial Metrics</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Revenue:</span>
                          <span className="font-semibold">₹{marginResult.revenue}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Cost:</span>
                          <span className="font-semibold">₹{marginResult.cost}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Profit:</span>
                          <span className="font-semibold text-green-600">₹{marginResult.profit}</span>
                        </div>
                        <div className="pt-2 border-t border-purple-300 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-800 font-bold">Profit Margin:</span>
                            <span className="font-bold text-purple-700 text-lg">{marginResult.profitMargin}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-800 font-bold">Markup:</span>
                            <span className="font-bold text-purple-700 text-lg">{marginResult.markup}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-800 font-bold">ROI:</span>
                            <span className="font-bold text-purple-700 text-lg">{marginResult.roi}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Break-even Calculator */}
          <TabsContent value="breakeven">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-orange-500" />
                Break-even Analysis
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fixed Costs (₹)
                    </label>
                    <Input
                      type="number"
                      value={fixedCosts}
                      onChange={(e) => setFixedCosts(e.target.value)}
                      placeholder="Enter fixed costs"
                      className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Variable Cost per Unit (₹)
                    </label>
                    <Input
                      type="number"
                      value={variableCost}
                      onChange={(e) => setVariableCost(e.target.value)}
                      placeholder="Enter variable cost"
                      className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Selling Price per Unit (₹)
                    </label>
                    <Input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="Enter selling price"
                      className="border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={calculateBreakEven}
                      className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Calculate
                    </Button>
                    <Button
                      onClick={resetBreakEven}
                      variant="outline"
                      className="border-slate-300"
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <div>
                  {breakEvenResult && (
                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                      <h3 className="font-bold text-slate-800 mb-3">Break-even Analysis</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Contribution Margin:</span>
                          <span className="font-semibold">₹{breakEvenResult.contributionMargin}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">CM Ratio:</span>
                          <span className="font-semibold">{breakEvenResult.contributionMarginRatio}%</span>
                        </div>
                        <div className="pt-2 border-t border-orange-300 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-800 font-bold">Break-even Units:</span>
                            <span className="font-bold text-orange-700 text-lg">{breakEvenResult.breakEvenUnits}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-800 font-bold">Break-even Revenue:</span>
                            <span className="font-bold text-orange-700 text-lg">₹{breakEvenResult.breakEvenRevenue}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Info Box */}
        <div className="mt-8 bg-emerald-50 rounded-xl p-6 border border-emerald-200">
          <h3 className="text-lg font-bold text-slate-800 mb-3">
            💼 Accounting Tools Guide
          </h3>
          <div className="text-sm text-slate-700 space-y-2">
            <p>• <strong>GST Calculator:</strong> Calculate GST, CGST, and SGST on any amount</p>
            <p>• <strong>Depreciation:</strong> Straight-line depreciation for asset valuation</p>
            <p>• <strong>Profit Margin:</strong> Analyze profitability with margin, markup, and ROI</p>
            <p>• <strong>Break-even:</strong> Find the point where revenue equals costs</p>
            <p>• All calculations are performed locally in your browser</p>
          </div>
        </div>
      </div>
    </div>
  );
}
