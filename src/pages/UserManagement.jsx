// UserManagement.jsx - User and subscription management for admins
import React, { useState, useEffect } from 'react';
import { Users, Search, Shield, Crown, Calendar, Mail, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, free, pro, admin

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockUsers = [
        {
          id: 1,
          email: 'sumit@meldra.ai',
          name: 'Sumit',
          role: 'admin',
          subscription: 'pro',
          status: 'active',
          createdAt: '2024-01-15',
          lastLogin: '2024-11-12',
          uploads: 145,
          totalUsage: '2.5 GB'
        },
        {
          id: 2,
          email: 'user1@example.com',
          name: 'John Doe',
          role: 'user',
          subscription: 'pro',
          status: 'active',
          createdAt: '2024-02-20',
          lastLogin: '2024-11-10',
          uploads: 78,
          totalUsage: '1.2 GB'
        },
        {
          id: 3,
          email: 'user2@example.com',
          name: 'Jane Smith',
          role: 'user',
          subscription: 'free',
          status: 'active',
          createdAt: '2024-03-10',
          lastLogin: '2024-11-08',
          uploads: 12,
          totalUsage: '150 MB'
        },
        {
          id: 4,
          email: 'inactive@example.com',
          name: 'Bob Wilson',
          role: 'user',
          subscription: 'free',
          status: 'inactive',
          createdAt: '2024-01-05',
          lastLogin: '2024-09-15',
          uploads: 3,
          totalUsage: '45 MB'
        }
      ];

      setUsers(mockUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'admin' && user.role === 'admin') ||
      (filter === 'pro' && user.subscription === 'pro') ||
      (filter === 'free' && user.subscription === 'free');

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    pro: users.filter(u => u.subscription === 'pro').length,
    free: users.filter(u => u.subscription === 'free').length,
    admins: users.filter(u => u.role === 'admin').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">User Management</h1>
          <p className="text-slate-700">
            Manage users, subscriptions, and access control
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white border border-slate-300 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700">Total Users</p>
                  <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                </div>
                <Users className="w-10 h-10 text-slate-800" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Active</p>
                  <p className="text-3xl font-bold text-emerald-300">{stats.active}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Pro Users</p>
                  <p className="text-3xl font-bold text-blue-300">{stats.pro}</p>
                </div>
                <Crown className="w-10 h-10 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Free Users</p>
                  <p className="text-3xl font-bold text-slate-300">{stats.free}</p>
                </div>
                <Users className="w-10 h-10 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Admins</p>
                  <p className="text-3xl font-bold text-amber-300">{stats.admins}</p>
                </div>
                <Shield className="w-10 h-10 text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-slate-900/50 border-slate-300 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-slate-300"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setFilter('all')}
                  variant={filter === 'all' ? 'default' : 'outline'}
                  className={filter === 'all' ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600'}
                >
                  All
                </Button>
                <Button
                  onClick={() => setFilter('admin')}
                  variant={filter === 'admin' ? 'default' : 'outline'}
                  className={filter === 'admin' ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600'}
                >
                  Admins
                </Button>
                <Button
                  onClick={() => setFilter('pro')}
                  variant={filter === 'pro' ? 'default' : 'outline'}
                  className={filter === 'pro' ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600'}
                >
                  Pro
                </Button>
                <Button
                  onClick={() => setFilter('free')}
                  variant={filter === 'free' ? 'default' : 'outline'}
                  className={filter === 'free' ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600'}
                >
                  Free
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-slate-900/50 border-slate-300">
          <CardHeader>
            <CardTitle className="text-purple-200">
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
                <p className="text-slate-400">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-4 py-3 text-left text-purple-300">User</th>
                      <th className="px-4 py-3 text-left text-purple-300">Role</th>
                      <th className="px-4 py-3 text-left text-purple-300">Subscription</th>
                      <th className="px-4 py-3 text-left text-purple-300">Status</th>
                      <th className="px-4 py-3 text-left text-purple-300">Created</th>
                      <th className="px-4 py-3 text-left text-purple-300">Last Login</th>
                      <th className="px-4 py-3 text-right text-purple-300">Usage</th>
                      <th className="px-4 py-3 text-center text-purple-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium text-slate-200">{user.name}</div>
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {user.role === 'admin' ? (
                            <Badge className="bg-amber-600">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                              User
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {user.subscription === 'pro' ? (
                            <Badge className="bg-blue-600">
                              <Crown className="w-3 h-3 mr-1" />
                              Pro
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                              Free
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {user.status === 'active' ? (
                            <Badge className="bg-emerald-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-600 text-red-400">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1 text-slate-400 text-xs">
                            <Calendar className="w-3 h-3" />
                            {user.createdAt}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-slate-400 text-xs">
                            {user.lastLogin}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="text-slate-300 text-xs">
                            <div>{user.uploads} uploads</div>
                            <div className="text-slate-500">{user.totalUsage}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-800"
                          >
                            Edit
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

        {/* Admin Note */}
        <Alert className="mt-6 bg-purple-900/20 border-purple-500/30">
          <Shield className="w-4 h-4 text-slate-700" />
          <AlertDescription className="text-purple-200">
            <strong>Admin Access Only:</strong> This page is only visible to administrators.
            User data is displayed for management purposes only.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
