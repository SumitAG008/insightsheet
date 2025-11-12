// AccountingToolkit.jsx - Full accounting suite with journal entries, trial balance, and financial statements
import React, { useState, useEffect } from 'react';
import { Calculator, Plus, Download, Trash2, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AccountingToolkit() {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().slice(0, 10),
    account: '',
    description: '',
    debit: '',
    credit: ''
  });

  useEffect(() => {
    // Load entries from localStorage
    const saved = localStorage.getItem('accounting_entries');
    if (saved) {
      setEntries(JSON.parse(saved));
    }
  }, []);

  const saveEntries = (newEntries) => {
    localStorage.setItem('accounting_entries', JSON.stringify(newEntries));
    setEntries(newEntries);
  };

  const handleAddEntry = () => {
    if (!newEntry.account || (!newEntry.debit && !newEntry.credit)) {
      alert('Please fill in account and either debit or credit amount');
      return;
    }

    const entry = {
      id: Date.now(),
      date: newEntry.date,
      account: newEntry.account,
      description: newEntry.description,
      debit: parseFloat(newEntry.debit) || 0,
      credit: parseFloat(newEntry.credit) || 0
    };

    const updatedEntries = [...entries, entry];
    saveEntries(updatedEntries);

    // Reset form
    setNewEntry({
      date: new Date().toISOString().slice(0, 10),
      account: '',
      description: '',
      debit: '',
      credit: ''
    });
  };

  const handleDeleteEntry = (id) => {
    if (confirm('Delete this entry?')) {
      saveEntries(entries.filter(e => e.id !== id));
    }
  };

  const calculateTrialBalance = () => {
    const accounts = {};

    entries.forEach(entry => {
      if (!accounts[entry.account]) {
        accounts[entry.account] = { debit: 0, credit: 0 };
      }
      accounts[entry.account].debit += entry.debit;
      accounts[entry.account].credit += entry.credit;
    });

    return Object.entries(accounts).map(([account, amounts]) => ({
      account,
      debit: amounts.debit,
      credit: amounts.credit,
      balance: amounts.debit - amounts.credit
    }));
  };

  const calculateFinancials = () => {
    const trialBalance = calculateTrialBalance();

    // Simple categorization (in practice, you'd have account types)
    const revenue = trialBalance
      .filter(a => a.account.toLowerCase().includes('revenue') || a.account.toLowerCase().includes('income'))
      .reduce((sum, a) => sum + a.credit - a.debit, 0);

    const expenses = trialBalance
      .filter(a => a.account.toLowerCase().includes('expense') || a.account.toLowerCase().includes('cost'))
      .reduce((sum, a) => sum + a.debit - a.credit, 0);

    const assets = trialBalance
      .filter(a => a.account.toLowerCase().includes('asset') || a.account.toLowerCase().includes('cash'))
      .reduce((sum, a) => sum + a.debit - a.credit, 0);

    const liabilities = trialBalance
      .filter(a => a.account.toLowerCase().includes('liability') || a.account.toLowerCase().includes('payable'))
      .reduce((sum, a) => sum + a.credit - a.debit, 0);

    const equity = trialBalance
      .filter(a => a.account.toLowerCase().includes('equity') || a.account.toLowerCase().includes('capital'))
      .reduce((sum, a) => sum + a.credit - a.debit, 0);

    const netIncome = revenue - expenses;
    const profitMargin = revenue > 0 ? (netIncome / revenue * 100).toFixed(2) : 0;

    return {
      revenue,
      expenses,
      netIncome,
      assets,
      liabilities,
      equity: equity + netIncome,
      profitMargin
    };
  };

  const exportToCSV = () => {
    const lines = ['Date,Account,Description,Debit,Credit'];
    entries.forEach(entry => {
      lines.push(`${entry.date},"${entry.account}","${entry.description}",${entry.debit},${entry.credit}`);
    });

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journal_entries_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const trialBalance = calculateTrialBalance();
  const totalDebit = trialBalance.reduce((sum, a) => sum + a.debit, 0);
  const totalCredit = trialBalance.reduce((sum, a) => sum + a.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const financials = calculateFinancials();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-purple-200 mb-2">Accounting Toolkit</h1>
          <p className="text-slate-400">
            Journal entries, trial balance, and financial statements
          </p>
        </div>

        <Tabs defaultValue="journal" className="space-y-6">
          <TabsList className="bg-slate-900/80 border border-slate-700/50 p-1">
            <TabsTrigger value="journal" className="data-[state=active]:bg-purple-600">
              Journal Entries
            </TabsTrigger>
            <TabsTrigger value="trial" className="data-[state=active]:bg-blue-600">
              Trial Balance
            </TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-emerald-600">
              Financial Statements
            </TabsTrigger>
          </TabsList>

          {/* Journal Entries Tab */}
          <TabsContent value="journal" className="space-y-6">
            {/* Add New Entry */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-purple-200 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  New Journal Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-5 gap-4">
                  <Input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-300"
                  />
                  <Input
                    placeholder="Account (e.g., Cash, Revenue)"
                    value={newEntry.account}
                    onChange={(e) => setNewEntry({ ...newEntry, account: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-300"
                  />
                  <Input
                    placeholder="Description"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-300"
                  />
                  <Input
                    type="number"
                    placeholder="Debit"
                    value={newEntry.debit}
                    onChange={(e) => setNewEntry({ ...newEntry, debit: e.target.value, credit: '' })}
                    className="bg-slate-800 border-slate-700 text-slate-300"
                  />
                  <Input
                    type="number"
                    placeholder="Credit"
                    value={newEntry.credit}
                    onChange={(e) => setNewEntry({ ...newEntry, credit: e.target.value, debit: '' })}
                    className="bg-slate-800 border-slate-700 text-slate-300"
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={handleAddEntry}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Entry
                  </Button>
                  <Button
                    onClick={exportToCSV}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    disabled={entries.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Entries List */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-purple-200">All Entries ({entries.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    No entries yet. Add your first journal entry above.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="px-4 py-2 text-left text-purple-300">Date</th>
                          <th className="px-4 py-2 text-left text-purple-300">Account</th>
                          <th className="px-4 py-2 text-left text-purple-300">Description</th>
                          <th className="px-4 py-2 text-right text-purple-300">Debit</th>
                          <th className="px-4 py-2 text-right text-purple-300">Credit</th>
                          <th className="px-4 py-2 text-center text-purple-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr key={entry.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="px-4 py-2 text-slate-300">{entry.date}</td>
                            <td className="px-4 py-2 text-slate-300">{entry.account}</td>
                            <td className="px-4 py-2 text-slate-400">{entry.description}</td>
                            <td className="px-4 py-2 text-right text-emerald-400">
                              {entry.debit > 0 ? `$${entry.debit.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-2 text-right text-blue-400">
                              {entry.credit > 0 ? `$${entry.credit.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <Button
                                onClick={() => handleDeleteEntry(entry.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trial Balance Tab */}
          <TabsContent value="trial" className="space-y-6">
            <Alert className={`${isBalanced ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
              <Calculator className={`w-4 h-4 ${isBalanced ? 'text-emerald-400' : 'text-red-400'}`} />
              <AlertDescription className={isBalanced ? 'text-emerald-200' : 'text-red-200'}>
                {isBalanced
                  ? '✓ Books are balanced! Total debits equal total credits.'
                  : `⚠ Books not balanced. Difference: $${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
              </AlertDescription>
            </Alert>

            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-purple-200">Trial Balance</CardTitle>
                <CardDescription className="text-slate-400">
                  Summary of all account balances
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trialBalance.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    No entries yet. Add journal entries to see trial balance.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="px-4 py-2 text-left text-purple-300">Account</th>
                          <th className="px-4 py-2 text-right text-purple-300">Debit</th>
                          <th className="px-4 py-2 text-right text-purple-300">Credit</th>
                          <th className="px-4 py-2 text-right text-purple-300">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trialBalance.map((account, idx) => (
                          <tr key={idx} className="border-b border-slate-800">
                            <td className="px-4 py-2 text-slate-300">{account.account}</td>
                            <td className="px-4 py-2 text-right text-emerald-400">
                              ${account.debit.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-right text-blue-400">
                              ${account.credit.toFixed(2)}
                            </td>
                            <td className={`px-4 py-2 text-right font-semibold ${
                              account.balance >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              ${Math.abs(account.balance).toFixed(2)} {account.balance >= 0 ? 'Dr' : 'Cr'}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-purple-500 font-bold">
                          <td className="px-4 py-3 text-purple-200">TOTAL</td>
                          <td className="px-4 py-3 text-right text-emerald-300">
                            ${totalDebit.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-blue-300">
                            ${totalCredit.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-purple-200">
                            {isBalanced ? 'Balanced ✓' : 'Not Balanced ✗'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Statements Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Income Statement */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Income Statement
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Revenue and expenses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                    <span className="text-slate-300">Revenue</span>
                    <span className="text-emerald-400 font-semibold">${financials.revenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                    <span className="text-slate-300">Expenses</span>
                    <span className="text-red-400 font-semibold">${financials.expenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-purple-500">
                    <span className="text-purple-200 font-bold">Net Income</span>
                    <span className={`font-bold text-lg ${financials.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${Math.abs(financials.netIncome).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Balance Sheet */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Balance Sheet
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Assets, liabilities, and equity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                    <span className="text-slate-300">Assets</span>
                    <span className="text-blue-400 font-semibold">${financials.assets.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                    <span className="text-slate-300">Liabilities</span>
                    <span className="text-amber-400 font-semibold">${financials.liabilities.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                    <span className="text-slate-300">Equity</span>
                    <span className="text-purple-400 font-semibold">${financials.equity.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-purple-500">
                    <span className="text-purple-200 font-bold">Total</span>
                    <span className="text-purple-300 font-bold text-lg">
                      ${(financials.liabilities + financials.equity).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Ratios */}
              <Card className="bg-slate-900/50 border-slate-700/50 md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-purple-200 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Financial Ratios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-sm text-slate-400 mb-1">Profit Margin</p>
                      <p className="text-2xl font-bold text-purple-300">{financials.profitMargin}%</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-sm text-slate-400 mb-1">Current Ratio</p>
                      <p className="text-2xl font-bold text-blue-300">
                        {financials.liabilities > 0
                          ? (financials.assets / financials.liabilities).toFixed(2)
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-sm text-slate-400 mb-1">ROE</p>
                      <p className="text-2xl font-bold text-emerald-300">
                        {financials.equity > 0
                          ? ((financials.netIncome / financials.equity) * 100).toFixed(2) + '%'
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
