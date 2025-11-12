// pages/ActivityDashboard.js - View all user activities and login history
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { LoginHistory } from '@/api/entities';
import { UserActivity } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Activity, MapPin, Monitor, Clock, TrendingUp,
  Search, Filter, Download, Users, LogIn, LogOut,
  Eye, Upload as UploadIcon, Sparkles, Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function ActivityDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [userActivities, setUserActivities] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [stats, setStats] = useState({
    totalLogins: 0,
    activeUsers: 0,
    totalActivities: 0,
    avgSessionTime: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      // Only admin can view all activities
      if (user.email !== 'sumit@meldra.ai') {
        alert('Access Denied: Admin access only');
        return;
      }

      // Load all data
      const [logins, activities, users] = await Promise.all([
        LoginHistory.list('-created_date'),
        UserActivity.list('-created_date'),
        User.list()
      ]);

      setLoginHistory(logins);
      setUserActivities(activities);
      setAllUsers(users);

      // Calculate stats
      const uniqueUsers = new Set(logins.map(l => l.user_email)).size;
      const totalLogins = logins.filter(l => l.event_type === 'login').length;
      const logouts = logins.filter(l => l.event_type === 'logout');
      const avgSession = logouts.length > 0
        ? logouts.reduce((sum, l) => sum + (l.session_duration || 0), 0) / logouts.length
        : 0;

      setStats({
        totalLogins,
        activeUsers: uniqueUsers,
        totalActivities: activities.length,
        avgSessionTime: Math.round(avgSession)
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const getActivityIcon = (type) => {
    const icons = {
      page_view: Eye,
      file_upload: UploadIcon,
      file_download: Download,
      ai_query: Sparkles,
      login: LogIn,
      logout: LogOut
    };
    return icons[type] || Activity;
  };

  const getActivityColor = (type) => {
    const colors = {
      page_view: 'text-blue-400',
      file_upload: 'text-green-400',
      file_download: 'text-purple-400',
      ai_query: 'text-pink-400',
      login: 'text-emerald-400',
      logout: 'text-orange-400'
    };
    return colors[type] || 'text-slate-400';
  };

  const exportData = (type) => {
    const data = type === 'logins' ? loginHistory : userActivities;
    const headers = type === 'logins'
      ? ['Email', 'Event', 'IP Address', 'Location', 'Browser', 'Device', 'OS', 'Session Duration', 'Timestamp']
      : ['Email', 'Activity Type', 'Page', 'Details', 'IP Address', 'Browser', 'Timestamp'];
    
    const rows = data.map(item => {
      if (type === 'logins') {
        return [
          item.user_email,
          item.event_type,
          item.ip_address || 'N/A',
          item.location || 'N/A',
          item.browser || 'N/A',
          item.device || 'N/A',
          item.os || 'N/A',
          item.session_duration ? `${item.session_duration} min` : 'N/A',
          format(new Date(item.created_date), 'yyyy-MM-dd HH:mm:ss')
        ];
      } else {
        return [
          item.user_email,
          item.activity_type,
          item.page_name || 'N/A',
          item.details || 'N/A',
          item.ip_address || 'N/A',
          item.browser || 'N/A',
          format(new Date(item.created_date), 'yyyy-MM-dd HH:mm:ss')
        ];
      }
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredLogins = loginHistory.filter(item => {
    const matchesSearch = item.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || item.event_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const filteredActivities = userActivities.filter(item => {
    const matchesSearch = item.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || item.activity_type === filterType;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!currentUser || currentUser.email !== 'sumit@meldra.ai') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-200 mb-2">Access Denied</h1>
          <p className="text-slate-400">This page is only accessible to admin users</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-purple-200 mb-2 flex items-center gap-3">
            <Activity className="w-10 h-10 text-purple-400" />
            Activity & Login Dashboard
          </h1>
          <p className="text-slate-400">Track all user activities, logins, and session data</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <LogIn className="w-10 h-10 text-emerald-400" />
              <Badge className="bg-emerald-500/20 text-emerald-300">Total</Badge>
            </div>
            <h3 className="text-3xl font-bold text-emerald-300 mb-1">
              {stats.totalLogins}
            </h3>
            <p className="text-sm text-slate-400">Total Logins</p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-10 h-10 text-blue-400" />
              <Badge className="bg-blue-500/20 text-blue-300">Active</Badge>
            </div>
            <h3 className="text-3xl font-bold text-blue-300 mb-1">
              {stats.activeUsers}
            </h3>
            <p className="text-sm text-slate-400">Active Users</p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-10 h-10 text-purple-400" />
              <Badge className="bg-purple-500/20 text-purple-300">All Time</Badge>
            </div>
            <h3 className="text-3xl font-bold text-purple-300 mb-1">
              {stats.totalActivities}
            </h3>
            <p className="text-sm text-slate-400">Total Activities</p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-10 h-10 text-amber-400" />
              <Badge className="bg-amber-500/20 text-amber-300">Average</Badge>
            </div>
            <h3 className="text-3xl font-bold text-amber-300 mb-1">
              {stats.avgSessionTime} min
            </h3>
            <p className="text-sm text-slate-400">Avg Session Time</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
            </div>

            <Button
              onClick={() => exportData('logins')}
              variant="outline"
              className="border-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Logins
            </Button>

            <Button
              onClick={() => exportData('activities')}
              variant="outline"
              className="border-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Activities
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="logins" className="space-y-6">
          <TabsList className="bg-slate-900/80 border border-slate-700/50 p-1">
            <TabsTrigger value="logins" className="data-[state=active]:bg-emerald-600">
              <LogIn className="w-4 h-4 mr-2" />
              Login History
            </TabsTrigger>
            <TabsTrigger value="activities" className="data-[state=active]:bg-purple-600">
              <Activity className="w-4 h-4 mr-2" />
              User Activities
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-slate-800">
              <Users className="w-4 h-4 mr-2" />
              User Summary
            </TabsTrigger>
          </TabsList>

          {/* Login History Tab */}
          <TabsContent value="logins">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-xl font-bold text-emerald-200">
                  Login History ({filteredLogins.length})
                </h2>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50">
                      <TableHead className="text-emerald-300">User Email</TableHead>
                      <TableHead className="text-emerald-300">Event</TableHead>
                      <TableHead className="text-emerald-300">IP Address</TableHead>
                      <TableHead className="text-emerald-300">Location</TableHead>
                      <TableHead className="text-emerald-300">Browser</TableHead>
                      <TableHead className="text-emerald-300">Device</TableHead>
                      <TableHead className="text-emerald-300">OS</TableHead>
                      <TableHead className="text-emerald-300">Session</TableHead>
                      <TableHead className="text-emerald-300">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogins.map((item) => (
                      <TableRow key={item.id} className="border-slate-700/30 hover:bg-slate-800/30">
                        <TableCell className="text-slate-300 font-medium">
                          {item.user_email}
                        </TableCell>
                        <TableCell>
                          <Badge className={item.event_type === 'login' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-orange-500/20 text-orange-300'}>
                            {item.event_type === 'login' ? <LogIn className="w-3 h-3 mr-1" /> : <LogOut className="w-3 h-3 mr-1" />}
                            {item.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">{item.ip_address || 'N/A'}</TableCell>
                        <TableCell className="text-slate-300">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {item.location || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">{item.browser || 'N/A'}</TableCell>
                        <TableCell className="text-slate-300">
                          <div className="flex items-center gap-1">
                            <Monitor className="w-3 h-3 text-slate-500" />
                            {item.device || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">{item.os || 'N/A'}</TableCell>
                        <TableCell className="text-slate-300">
                          {item.session_duration ? `${item.session_duration} min` : '-'}
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {format(new Date(item.created_date), 'MMM d, yyyy HH:mm:ss')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* User Activities Tab */}
          <TabsContent value="activities">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-xl font-bold text-purple-200">
                  User Activities ({filteredActivities.length})
                </h2>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50">
                      <TableHead className="text-purple-300">User Email</TableHead>
                      <TableHead className="text-purple-300">Activity Type</TableHead>
                      <TableHead className="text-purple-300">Page</TableHead>
                      <TableHead className="text-purple-300">IP Address</TableHead>
                      <TableHead className="text-purple-300">Browser</TableHead>
                      <TableHead className="text-purple-300">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.map((item) => {
                      const Icon = getActivityIcon(item.activity_type);
                      const color = getActivityColor(item.activity_type);
                      
                      return (
                        <TableRow key={item.id} className="border-slate-700/30 hover:bg-slate-800/30">
                          <TableCell className="text-slate-300 font-medium">
                            {item.user_email}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${color}`} />
                              <span className="text-slate-300">{item.activity_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">{item.page_name || 'N/A'}</TableCell>
                          <TableCell className="text-slate-300">{item.ip_address || 'N/A'}</TableCell>
                          <TableCell className="text-slate-300">{item.browser || 'N/A'}</TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {format(new Date(item.created_date), 'MMM d, yyyy HH:mm:ss')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* User Summary Tab */}
          <TabsContent value="users">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-blue-200 mb-6">User Login Summary</h2>
              
              <div className="space-y-4">
                {allUsers.map(user => {
                  const userLogins = loginHistory.filter(l => l.user_email === user.email && l.event_type === 'login');
                  const lastLogin = userLogins[0];
                  const loginCount = userLogins.length;
                  const uniqueIPs = new Set(userLogins.map(l => l.ip_address)).size;
                  const uniqueLocations = new Set(userLogins.map(l => l.location)).size;
                  
                  return (
                    <div key={user.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-blue-300">{user.full_name}</h3>
                          <p className="text-sm text-slate-400">{user.email}</p>
                        </div>
                        <Badge className="bg-blue-500/20 text-blue-300">
                          {loginCount} logins
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Last Login</p>
                          <p className="text-sm text-slate-300">
                            {lastLogin ? format(new Date(lastLogin.created_date), 'MMM d, HH:mm') : 'Never'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Unique IPs</p>
                          <p className="text-sm text-slate-300">{uniqueIPs}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Locations</p>
                          <p className="text-sm text-slate-300">{uniqueLocations}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Last IP</p>
                          <p className="text-sm text-slate-300">{lastLogin?.ip_address || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {lastLogin && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <p className="text-xs text-slate-500">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {lastLogin.location} • {lastLogin.browser} • {lastLogin.device} • {lastLogin.os}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}