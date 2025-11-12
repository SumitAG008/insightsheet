// pages/AdminDashboard.js - Admin dashboard with exact email check and fixed dependencies
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Subscription } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DollarSign, Users, TrendingUp, Calendar, 
  CreditCard, AlertCircle, CheckCircle, Clock,
  Search, Filter, Download
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeSubscriptions: 0,
    trialUsers: 0,
    expiredTrials: 0,
    monthlyRevenue: 0,
    conversionRate: 0
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Check if current user is admin with EXACT email match
        const user = await User.me();
        setCurrentUser(user);

        // EXACT EMAIL CHECK - only sumit@meldra.ai
        if (user.email !== 'sumit@meldra.ai') {
          alert('Access Denied: Admin access only for sumit@meldra.ai');
          return;
        }

        // Load all subscriptions
        const allSubs = await Subscription.list('-created_date');
        setSubscriptions(allSubs);

        // Load all users
        const allUsers = await User.list();
        setUsers(allUsers);

        // Calculate statistics
        calculateStats(allSubs);
      } catch (error) {
        console.error('Error loading data:', error);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  const calculateStats = (subs) => {
    const totalRevenue = subs.reduce((sum, sub) => sum + (sub.amount_paid || 0), 0);
    const activeSubscriptions = subs.filter(s => s.status === 'active').length;
    const trialUsers = subs.filter(s => s.status === 'trial').length;
    const expiredTrials = subs.filter(s => s.status === 'expired').length;
    
    // Calculate monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyRevenue = subs
      .filter(s => new Date(s.created_date) > thirtyDaysAgo && s.amount_paid)
      .reduce((sum, sub) => sum + (sub.amount_paid || 0), 0);

    // Conversion rate (trial to paid)
    const totalTrials = trialUsers + activeSubscriptions + expiredTrials;
    const conversionRate = totalTrials > 0 ? (activeSubscriptions / totalTrials * 100).toFixed(1) : 0;

    setStats({
      totalRevenue,
      activeSubscriptions,
      trialUsers,
      expiredTrials,
      monthlyRevenue,
      conversionRate
    });
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getStatusBadge = (status) => {
    const badges = {
      trial: { color: 'bg-blue-500/20 text-blue-300 border-slate-2000/30', icon: Clock },
      active: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: CheckCircle },
      expired: { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: AlertCircle },
      cancelled: { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', icon: AlertCircle }
    };
    const badge = badges[status] || badges.expired;
    const Icon = badge.icon;
    
    return (
      <Badge className={badge.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getPlanBadge = (plan) => {
    const plans = {
      free_trial: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      free: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      premium: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      business: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    };
    return <Badge className={plans[plan] || plans.free}>{plan.replace('_', ' ')}</Badge>;
  };

  const exportData = () => {
    const csv = [
      ['Email', 'Plan', 'Status', 'Amount Paid', 'Payment Method', 'Trial End', 'Created Date'].join(','),
      ...subscriptions.map(sub => [
        sub.user_email,
        sub.plan,
        sub.status,
        sub.amount_paid || 0,
        sub.payment_method || 'N/A',
        sub.trial_end_date || 'N/A',
        format(new Date(sub.created_date), 'yyyy-MM-dd')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subscriptions_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || sub.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!currentUser || currentUser.email !== 'sumit@meldra.ai') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-700">This page is only accessible to sumit@meldra.ai</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Subscription Admin Dashboard</h1>
          <p className="text-slate-700">Track all subscriptions, trials, and revenue</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-slate-300 shadow-lg rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-10 h-10 text-emerald-400" />
              <Badge className="bg-emerald-500/20 text-emerald-300">Total</Badge>
            </div>
            <h3 className="text-3xl font-bold text-emerald-300 mb-1">
              ${stats.totalRevenue.toLocaleString()}
            </h3>
            <p className="text-sm text-slate-400">Total Revenue</p>
            <p className="text-xs text-emerald-400 mt-2">
              ${stats.monthlyRevenue.toFixed(2)} this month
            </p>
          </div>

          <div className="bg-white backdrop-blur-xl border border-slate-300 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-10 h-10 text-indigo-400" />
              <Badge className="bg-indigo-500/20 text-indigo-300">Active</Badge>
            </div>
            <h3 className="text-3xl font-bold text-indigo-300 mb-1">
              {stats.activeSubscriptions}
            </h3>
            <p className="text-sm text-slate-400">Paid Subscriptions</p>
            <p className="text-xs text-indigo-400 mt-2">
              {stats.conversionRate}% conversion rate
            </p>
          </div>

          <div className="bg-white backdrop-blur-xl border border-slate-300 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-10 h-10 text-blue-400" />
              <Badge className="bg-blue-500/20 text-blue-300">Trial</Badge>
            </div>
            <h3 className="text-3xl font-bold text-blue-300 mb-1">
              {stats.trialUsers}
            </h3>
            <p className="text-sm text-slate-400">Active Trials</p>
            <p className="text-xs text-blue-400 mt-2">
              {stats.expiredTrials} expired
            </p>
          </div>

          <div className="bg-white backdrop-blur-xl border border-slate-300 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-10 h-10 text-slate-700" />
              <Badge className="bg-purple-500/20 text-purple-300">Total</Badge>
            </div>
            <h3 className="text-3xl font-bold text-purple-300 mb-1">
              {users.length}
            </h3>
            <p className="text-sm text-slate-400">Total Users</p>
            <p className="text-xs text-slate-700 mt-2">
              {subscriptions.length} subscriptions
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white backdrop-blur-xl border border-slate-300 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                className="border-slate-700"
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'trial' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('trial')}
                className="border-slate-700"
              >
                Trial
              </Button>
              <Button
                variant={filterStatus === 'active' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('active')}
                className="border-slate-700"
              >
                Active
              </Button>
              <Button
                variant={filterStatus === 'expired' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('expired')}
                className="border-slate-700"
              >
                Expired
              </Button>
            </div>

            <Button
              onClick={exportData}
              variant="outline"
              className="border-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white backdrop-blur-xl border border-slate-300 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-300">
            <h2 className="text-xl font-bold text-purple-200">
              All Subscriptions ({filteredSubscriptions.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-300">
                  <TableHead className="text-purple-300">User Email</TableHead>
                  <TableHead className="text-purple-300">Plan</TableHead>
                  <TableHead className="text-purple-300">Status</TableHead>
                  <TableHead className="text-purple-300">Trial Ends</TableHead>
                  <TableHead className="text-purple-300">Amount Paid</TableHead>
                  <TableHead className="text-purple-300">Payment Method</TableHead>
                  <TableHead className="text-purple-300">AI Queries</TableHead>
                  <TableHead className="text-purple-300">Created Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((sub) => {
                  const daysLeft = getDaysRemaining(sub.trial_end_date);
                  const isTrialExpiringSoon = sub.status === 'trial' && daysLeft <= 3;

                  return (
                    <TableRow key={sub.id} className="border-slate-700/30 hover:bg-slate-800/30">
                      <TableCell className="text-slate-300 font-medium">
                        {sub.user_email}
                      </TableCell>
                      <TableCell>
                        {getPlanBadge(sub.plan)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(sub.status)}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {sub.trial_end_date ? (
                          <div>
                            <div>{format(new Date(sub.trial_end_date), 'MMM d, yyyy')}</div>
                            {sub.status === 'trial' && (
                              <div className={`text-xs ${isTrialExpiringSoon ? 'text-red-400' : 'text-slate-500'}`}>
                                {daysLeft} days left
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-emerald-400 font-semibold">
                        {sub.amount_paid ? `$${sub.amount_paid.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {sub.payment_method || '-'}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {sub.ai_queries_used} / {sub.ai_queries_limit}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {format(new Date(sub.created_date), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Trial Expiration Alerts */}
        <div className="mt-6 bg-white backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-amber-400" />
            <h3 className="text-lg font-bold text-amber-300">Trials Expiring Soon (3 days or less)</h3>
          </div>
          <div className="space-y-2">
            {subscriptions
              .filter(sub => sub.status === 'trial' && getDaysRemaining(sub.trial_end_date) <= 3)
              .map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg">
                  <div>
                    <p className="text-slate-200 font-medium">{sub.user_email}</p>
                    <p className="text-xs text-slate-400">
                      Expires: {format(new Date(sub.trial_end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-300">
                    {getDaysRemaining(sub.trial_end_date)} days left
                  </Badge>
                </div>
              ))}
            {subscriptions.filter(sub => sub.status === 'trial' && getDaysRemaining(sub.trial_end_date) <= 3).length === 0 && (
              <p className="text-slate-400 text-sm">No trials expiring soon</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}