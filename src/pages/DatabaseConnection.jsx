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
import { useI18n } from '@/lib/i18n';

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
  const { t } = useI18n();
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
        toast.success(t('db_connect_toast_connection_successful'));
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
        toast.error(t('db_connect_toast_connection_failed'));
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
    toast.success(t('db_connect_toast_disconnected'));
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
        toast.success(t('db_connect_toast_query_executed', { rowCount: response.rowCount || 0 }));
      } else {
        setError(response.error || 'Query execution failed');
        toast.error(t('db_connect_toast_query_execution_failed'));
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
    <div className="min-h-screen bg-white dark:bg-slate-950 p-4 md:p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header — same background as Data Model Creator (DB Schema) */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-[#4169E1] rounded-2xl flex items-center justify-center">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em' }}>
                {t('db_connect_title')}
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 font-light" style={{ letterSpacing: '-0.01em' }}>
                {t('db_connect_subtitle')}
              </p>
            </div>
          </div>
          
          {/* Zero Storage Notice */}
          <Alert className="bg-emerald-50 dark:bg-[#059669]/10 border-emerald-200 dark:border-[#059669]/40 mb-6">
            <AlertCircle className="h-5 w-5 text-emerald-600 dark:text-[#10b981]" />
            <AlertDescription className="text-slate-900 dark:text-slate-200">
              <strong className="text-slate-900 dark:text-slate-100">{t('db_connect_zero_storage_title')}</strong> {t('db_connect_zero_storage_body')}
            </AlertDescription>
          </Alert>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Connection Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <Plug className="w-5 h-5 text-[#4169E1]" />
                  {t('db_connect_connection_settings_title')}
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  {t('db_connect_connection_settings_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isConnected ? (
                  <>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300 mb-2 block">{t('db_connect_database_type')}</Label>
                      <Select value={dbType} onValueChange={(value) => {
                        setDbType(value);
                        setConnectionData({});
                        setError('');
                      }}>
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200">
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
                        <Label className="text-slate-700 dark:text-slate-300 mb-2 block">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        {field.type === 'textarea' ? (
                          <Textarea
                            value={connectionData[field.name] || ''}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 min-h-[100px]"
                          />
                        ) : field.type === 'select' ? (
                          <Select
                            value={connectionData[field.name] || field.default || ''}
                            onValueChange={(value) => handleFieldChange(field.name, value)}
                          >
                            <SelectTrigger className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200">
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
                            className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"
                          />
                        )}
                      </div>
                    ))}

                    {error && (
                      <Alert className="bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30">
                        <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                        <AlertDescription className="text-red-700 dark:text-red-300 text-sm">{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={testConnection}
                      disabled={isConnecting}
                      className="w-full bg-[#4169E1] hover:bg-[#3659c7] text-white"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('db_connect_connecting')}
                        </>
                      ) : (
                        <>
                          <Plug className="w-4 h-4 mr-2" />
                          {t('db_connect_test_connection')}
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <Alert className="bg-emerald-50 dark:bg-[#059669]/10 border-emerald-200 dark:border-[#059669]/40">
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-[#10b981]" />
                      <AlertDescription className="text-slate-900 dark:text-slate-200 text-sm">
                        {t('db_connect_connected_to', { dbName: currentDbConfig.name })}
                      </AlertDescription>
                    </Alert>
                    
                    <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                      <p><strong className="text-slate-900 dark:text-slate-100">Database:</strong> {connectionData.database || connectionData.serviceName || 'N/A'}</p>
                      <p><strong className="text-slate-900 dark:text-slate-100">Host:</strong> {connectionData.host || connectionData.server || 'N/A'}</p>
                    </div>

                    <Button
                      onClick={disconnect}
                      variant="outline"
                      className="w-full border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('db_connect_disconnect')}
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
                <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <TabsTrigger value="schema" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white">
                    <Eye className="w-4 h-4 mr-2" />
                    {t('db_connect_tab_schema')}
                  </TabsTrigger>
                  <TabsTrigger value="query" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white">
                    <FileCode className="w-4 h-4 mr-2" />
                    {t('db_connect_tab_query')}
                  </TabsTrigger>
                  <TabsTrigger value="data" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white">
                    <Table className="w-4 h-4 mr-2" />
                    {t('db_connect_tab_data')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="schema" className="mt-6">
                  <Card className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        <Database className="w-5 h-5 text-[#4169E1]" />
                        {t('db_connect_database_schema_title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {tables.length > 0 ? (
                        <div className="space-y-2">
                          {tables.map((table) => (
                            <div key={table.name} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleTable(table.name)}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {expandedTables.has(table.name) ? (
                                    <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                  )}
                                  <Table className="w-4 h-4 text-[#4169E1]" />
                                  <span className="font-semibold text-slate-900 dark:text-white">{table.name}</span>
                                  {table.rowCount !== undefined && (
                                    <span className="text-xs text-slate-600 dark:text-slate-400">({table.rowCount} rows)</span>
                                  )}
                                </div>
                              </button>
                              {expandedTables.has(table.name) && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                                  <div className="space-y-2">
                                    {table.columns?.map((col) => (
                                      <div key={col.name} className="flex items-center gap-3 text-sm">
                                        <div className="flex items-center gap-2">
                                          {col.primaryKey && <Key className="w-3 h-3 text-emerald-600 dark:text-[#10b981]" />}
                                          <span className="font-mono text-slate-700 dark:text-slate-300">{col.name}</span>
                                        </div>
                                        <span className="text-slate-600 dark:text-slate-400">{col.type}</span>
                                        {col.nullable === false && <span className="text-xs text-red-500 dark:text-red-400">NOT NULL</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-600 dark:text-slate-400 text-center py-8">{t('db_connect_no_tables_found')}</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="query" className="mt-6">
                  <Card className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        <FileCode className="w-5 h-5 text-[#4169E1]" />
                        {t('db_connect_sql_query_editor_title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('db_connect_sql_query_placeholder')}
                        className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 font-mono min-h-[200px]"
                      />
                      <Button
                        onClick={executeQuery}
                        disabled={!query.trim() || isExecutingQuery}
                        className="bg-[#4169E1] hover:bg-[#3659c7] text-white"
                      >
                        {isExecutingQuery ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('db_connect_executing')}
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            {t('db_connect_execute_query')}
                          </>
                        )}
                      </Button>
                      
                      {queryResult && (
                        <div className="mt-4">
                          <div className="mb-2 text-sm text-slate-700 dark:text-slate-300">
                            {t('db_connect_rows_returned', { rowCount: queryResult.rowCount })}
                          </div>
                          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-auto max-h-[500px]">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-100 dark:bg-slate-800/50 sticky top-0">
                                <tr>
                                  {queryResult.columns.map((col) => (
                                    <th key={col} className="px-4 py-2 text-left text-slate-900 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {queryResult.data.map((row, idx) => (
                                  <tr key={idx} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                    {queryResult.columns.map((col) => (
                                      <td key={col} className="px-4 py-2 text-slate-700 dark:text-slate-300">
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
                  <Card className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        <Table className="w-5 h-5 text-[#4169E1]" />
                        {t('db_connect_table_data_title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedTable && tableData[selectedTable] ? (
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-auto max-h-[600px]">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-800/50 sticky top-0">
                              <tr>
                                {Object.keys(tableData[selectedTable][0] || {}).map((col) => (
                                  <th key={col} className="px-4 py-2 text-left text-slate-900 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tableData[selectedTable].map((row, idx) => (
                                <tr key={idx} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                  {Object.values(row).map((val, colIdx) => (
                                    <td key={colIdx} className="px-4 py-2 text-slate-700 dark:text-slate-300">
                                      {val !== null && val !== undefined ? String(val) : 'NULL'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-600 dark:text-slate-400 text-center py-8">
                          {t('db_connect_select_table_to_view_data')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700">
                <CardContent className="py-16 text-center">
                  <Database className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 text-lg">
                    {t('db_connect_empty_state')}
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
