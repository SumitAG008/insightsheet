// pages/DatabaseConnection.jsx - Database Connection Manager
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Database, Plug, CheckCircle, XCircle, Loader2, Play, 
  Eye, Table, Key, Server, AlertCircle, Trash2, RefreshCw,
  ChevronDown, ChevronRight, FileCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { backendApi } from '@/api/backendClient';

const DB_TYPES = {
  postgresql: {
    name: 'PostgreSQL',
    icon: Database,
    fields: [
      { name: 'host', label: 'Host', type: 'text', required: true, placeholder: 'localhost or your-db-host.com' },
      { name: 'port', label: 'Port', type: 'number', required: true, placeholder: '5432', default: 5432 },
      { name: 'database', label: 'Database Name', type: 'text', required: true, placeholder: 'mydatabase' },
      { name: 'username', label: 'Username', type: 'text', required: true, placeholder: 'postgres' },
      { name: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' },
      { name: 'sslMode', label: 'SSL Mode', type: 'select', required: false, options: ['disable', 'require', 'prefer', 'verify-ca', 'verify-full'], default: 'prefer' }
    ]
  },
  mysql: {
    name: 'MySQL',
    icon: Database,
    fields: [
      { name: 'host', label: 'Host', type: 'text', required: true, placeholder: 'localhost or your-db-host.com' },
      { name: 'port', label: 'Port', type: 'number', required: true, placeholder: '3306', default: 3306 },
      { name: 'database', label: 'Database Name', type: 'text', required: true, placeholder: 'mydatabase' },
      { name: 'username', label: 'Username', type: 'text', required: true, placeholder: 'root' },
      { name: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' },
      { name: 'sslCa', label: 'SSL CA Certificate (optional)', type: 'textarea', required: false, placeholder: 'Paste SSL CA certificate if required' }
    ]
  },
  mongodb: {
    name: 'MongoDB',
    icon: Database,
    fields: [
      { name: 'connectionString', label: 'Connection String', type: 'textarea', required: true, placeholder: 'mongodb://username:password@host:port/database?authSource=admin' },
      { name: 'database', label: 'Database Name', type: 'text', required: true, placeholder: 'mydatabase' },
      { name: 'authSource', label: 'Auth Source (optional)', type: 'text', required: false, placeholder: 'admin' }
    ]
  },
  mssql: {
    name: 'Microsoft SQL Server',
    icon: Database,
    fields: [
      { name: 'server', label: 'Server', type: 'text', required: true, placeholder: 'localhost or server\\instance' },
      { name: 'port', label: 'Port', type: 'number', required: false, placeholder: '1433', default: 1433 },
      { name: 'database', label: 'Database Name', type: 'text', required: true, placeholder: 'mydatabase' },
      { name: 'username', label: 'Username', type: 'text', required: true, placeholder: 'sa' },
      { name: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' },
      { name: 'encrypt', label: 'Encrypt Connection', type: 'select', required: false, options: ['true', 'false'], default: 'true' },
      { name: 'trustServerCertificate', label: 'Trust Server Certificate', type: 'select', required: false, options: ['true', 'false'], default: 'false' }
    ]
  },
  oracle: {
    name: 'Oracle',
    icon: Database,
    fields: [
      { name: 'host', label: 'Host', type: 'text', required: true, placeholder: 'localhost' },
      { name: 'port', label: 'Port', type: 'number', required: true, placeholder: '1521', default: 1521 },
      { name: 'serviceName', label: 'Service Name / SID', type: 'text', required: true, placeholder: 'ORCL or XE' },
      { name: 'username', label: 'Username', type: 'text', required: true, placeholder: 'system' },
      { name: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' }
    ]
  },
  sqlite: {
    name: 'SQLite',
    icon: Database,
    fields: [
      { name: 'filePath', label: 'Database File Path', type: 'text', required: true, placeholder: '/path/to/database.db or C:\\path\\to\\database.db' },
      { name: 'readOnly', label: 'Read Only Mode', type: 'select', required: false, options: ['true', 'false'], default: 'false' }
    ]
  }
};

export default function DatabaseConnection() {
  const navigate = useNavigate();
  const [dbType, setDbType] = useState('postgresql');
  const [connectionData, setConnectionData] = useState({});
  const [connectionId, setConnectionId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [expandedTables, setExpandedTables] = useState(new Set());
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [schema, setSchema] = useState(null);

  // Load connection from session storage on mount
  useEffect(() => {
    const savedConnection = sessionStorage.getItem('db_connection');
    if (savedConnection) {
      try {
        const conn = JSON.parse(savedConnection);
        setConnectionId(conn.connectionId);
        setDbType(conn.dbType);
        setConnectionData(conn.connectionData || {});
        setIsConnected(true);
        loadSchema();
      } catch (e) {
        console.error('Failed to load saved connection:', e);
      }
    }
  }, []);

  const handleFieldChange = (fieldName, value) => {
    setConnectionData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    setError('');
  };

  const testConnection = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      const response = await backendApi.db.testConnection(dbType, connectionData);
      
      if (response.success) {
        toast.success('Connection successful!');
        setIsConnected(true);
        const connId = response.connectionId || `conn_${Date.now()}`;
        setConnectionId(connId);
        
        // Save to session storage (not persisted, cleared on logout)
        sessionStorage.setItem('db_connection', JSON.stringify({
          connectionId: connId,
          dbType,
          connectionData
        }));
        
        await loadSchema();
      } else {
        setError(response.error || 'Connection failed');
        toast.error('Connection failed');
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to connect to database';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsConnecting(false);
    }
  };

  const loadSchema = async () => {
    if (!connectionId) return;
    
    try {
      const response = await backendApi.db.getSchema(connectionId, dbType);
      if (response.success) {
        setTables(response.tables || []);
        setSchema(response.schema);
      }
    } catch (err) {
      console.error('Failed to load schema:', err);
    }
  };

  const disconnect = () => {
    if (connectionId) {
      backendApi.db.disconnect(connectionId, dbType).catch(console.error);
    }
    sessionStorage.removeItem('db_connection');
    setConnectionId(null);
    setIsConnected(false);
    setTables([]);
    setTableData([]);
    setQueryResult(null);
    setSchema(null);
    setConnectionData({});
    toast.success('Disconnected from database');
  };

  const toggleTable = (tableName) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
      setExpandedTables(newExpanded);
    } else {
      newExpanded.add(tableName);
      setExpandedTables(newExpanded);
      loadTableData(tableName);
    }
  };

  const loadTableData = async (tableName) => {
    if (!connectionId) return;
    
    try {
      const response = await backendApi.db.query(connectionId, dbType, `SELECT * FROM "${tableName}" LIMIT 100`);
      if (response.success) {
        setTableData(prev => ({
          ...prev,
          [tableName]: response.data
        }));
      }
    } catch (err) {
      console.error('Failed to load table data:', err);
    }
  };

  const executeQuery = async () => {
    if (!query.trim() || !connectionId) return;
    
    setIsExecutingQuery(true);
    setError('');
    
    try {
      const response = await backendApi.db.query(connectionId, dbType, query);
      
      if (response.success) {
        setQueryResult({
          columns: response.columns || [],
          data: response.data || [],
          rowCount: response.rowCount || 0
        });
        toast.success(`Query executed successfully. ${response.rowCount || 0} rows returned.`);
      } else {
        setError(response.error || 'Query execution failed');
        toast.error('Query execution failed');
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to execute query';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsExecutingQuery(false);
    }
  };

  const currentDbConfig = DB_TYPES[dbType];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em' }}>
                Database Connection
              </h1>
              <p className="text-lg text-slate-400 font-light" style={{ letterSpacing: '-0.01em' }}>
                Connect to external databases, explore schemas, and execute queries
              </p>
            </div>
          </div>
          
          {/* Zero Storage Notice */}
          <Alert className="bg-emerald-500/10 border-emerald-500/30 mb-6">
            <AlertCircle className="h-5 w-5 text-emerald-400" />
            <AlertDescription className="text-emerald-200">
              <strong className="text-emerald-100">Zero Storage Policy:</strong> All database connections and query results are stored only in your browser session. 
              All data will be permanently deleted when you log out or close the application. No database credentials or data are stored on our servers.
            </AlertDescription>
          </Alert>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Connection Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <Plug className="w-5 h-5" />
                  Connection Settings
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure your database connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isConnected ? (
                  <>
                    <div>
                      <Label className="text-slate-300 mb-2 block">Database Type</Label>
                      <Select value={dbType} onValueChange={(value) => {
                        setDbType(value);
                        setConnectionData({});
                        setError('');
                      }}>
                        <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DB_TYPES).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <config.icon className="w-4 h-4" />
                                {config.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {currentDbConfig.fields.map((field) => (
                      <div key={field.name}>
                        <Label className="text-slate-300 mb-2 block">
                          {field.label} {field.required && <span className="text-red-400">*</span>}
                        </Label>
                        {field.type === 'textarea' ? (
                          <Textarea
                            value={connectionData[field.name] || ''}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            className="bg-slate-800/50 border-slate-700 text-slate-200 min-h-[100px]"
                          />
                        ) : field.type === 'select' ? (
                          <Select
                            value={connectionData[field.name] || field.default || ''}
                            onValueChange={(value) => handleFieldChange(field.name, value)}
                          >
                            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
                              <SelectValue placeholder={field.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={field.type}
                            value={connectionData[field.name] || ''}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            className="bg-slate-800/50 border-slate-700 text-slate-200"
                          />
                        )}
                      </div>
                    ))}

                    {error && (
                      <Alert className="bg-red-500/10 border-red-500/30">
                        <XCircle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-300 text-sm">{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={testConnection}
                      disabled={isConnecting}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plug className="w-4 h-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <Alert className="bg-emerald-500/10 border-emerald-500/30">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <AlertDescription className="text-emerald-200 text-sm">
                        Connected to {currentDbConfig.name}
                      </AlertDescription>
                    </Alert>
                    
                    <div className="text-sm text-slate-400 space-y-1">
                      <p><strong className="text-slate-300">Database:</strong> {connectionData.database || connectionData.serviceName || 'N/A'}</p>
                      <p><strong className="text-slate-300">Host:</strong> {connectionData.host || connectionData.server || 'N/A'}</p>
                    </div>

                    <Button
                      onClick={disconnect}
                      variant="outline"
                      className="w-full border-red-500/50 text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {isConnected ? (
              <Tabs defaultValue="schema" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border-slate-700">
                  <TabsTrigger value="schema" className="data-[state=active]:bg-indigo-600">
                    <Eye className="w-4 h-4 mr-2" />
                    Schema
                  </TabsTrigger>
                  <TabsTrigger value="query" className="data-[state=active]:bg-indigo-600">
                    <FileCode className="w-4 h-4 mr-2" />
                    Query
                  </TabsTrigger>
                  <TabsTrigger value="data" className="data-[state=active]:bg-indigo-600">
                    <Table className="w-4 h-4 mr-2" />
                    Data
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="schema" className="mt-6">
                  <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        <Database className="w-5 h-5" />
                        Database Schema
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {tables.length > 0 ? (
                        <div className="space-y-2">
                          {tables.map((table) => (
                            <div key={table.name} className="border border-slate-700/50 rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleTable(table.name)}
                                className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {expandedTables.has(table.name) ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                  <Table className="w-4 h-4 text-indigo-400" />
                                  <span className="font-semibold text-white">{table.name}</span>
                                  {table.rowCount !== undefined && (
                                    <span className="text-xs text-slate-400">({table.rowCount} rows)</span>
                                  )}
                                </div>
                              </button>
                              {expandedTables.has(table.name) && (
                                <div className="p-4 bg-slate-900/50 border-t border-slate-700/50">
                                  <div className="space-y-2">
                                    {table.columns?.map((col) => (
                                      <div key={col.name} className="flex items-center gap-3 text-sm">
                                        <div className="flex items-center gap-2">
                                          {col.primaryKey && <Key className="w-3 h-3 text-yellow-400" />}
                                          <span className="font-mono text-slate-300">{col.name}</span>
                                        </div>
                                        <span className="text-slate-400">{col.type}</span>
                                        {col.nullable === false && <span className="text-xs text-red-400">NOT NULL</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-center py-8">No tables found or schema not loaded</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="query" className="mt-6">
                  <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        <FileCode className="w-5 h-5" />
                        SQL Query Editor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter your SQL query here..."
                        className="bg-slate-800/50 border-slate-700 text-slate-200 font-mono min-h-[200px]"
                      />
                      <Button
                        onClick={executeQuery}
                        disabled={!query.trim() || isExecutingQuery}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      >
                        {isExecutingQuery ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Execute Query
                          </>
                        )}
                      </Button>
                      
                      {queryResult && (
                        <div className="mt-4">
                          <div className="mb-2 text-sm text-slate-400">
                            {queryResult.rowCount} row(s) returned
                          </div>
                          <div className="border border-slate-700/50 rounded-lg overflow-auto max-h-[500px]">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-800/50 sticky top-0">
                                <tr>
                                  {queryResult.columns.map((col) => (
                                    <th key={col} className="px-4 py-2 text-left text-slate-300 font-semibold border-b border-slate-700">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {queryResult.data.map((row, idx) => (
                                  <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                                    {queryResult.columns.map((col) => (
                                      <td key={col} className="px-4 py-2 text-slate-300">
                                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL'}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="data" className="mt-6">
                  <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        <Table className="w-5 h-5" />
                        Table Data
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedTable && tableData[selectedTable] ? (
                        <div className="border border-slate-700/50 rounded-lg overflow-auto max-h-[600px]">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-800/50 sticky top-0">
                              <tr>
                                {Object.keys(tableData[selectedTable][0] || {}).map((col) => (
                                  <th key={col} className="px-4 py-2 text-left text-slate-300 font-semibold border-b border-slate-700">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tableData[selectedTable].map((row, idx) => (
                                <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                                  {Object.values(row).map((val, colIdx) => (
                                    <td key={colIdx} className="px-4 py-2 text-slate-300">
                                      {val !== null && val !== undefined ? String(val) : 'NULL'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-center py-8">
                          Select a table from the Schema tab to view its data
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
                <CardContent className="py-16 text-center">
                  <Database className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">
                    Connect to a database to explore schemas and execute queries
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
