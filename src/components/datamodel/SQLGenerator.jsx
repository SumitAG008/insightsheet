import React, { useState, useMemo } from 'react';
import { Copy, Download, Database, Check, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { backendApi } from '@/api/meldraClient';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const SQL_DIALECTS = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'mssql', label: 'Microsoft SQL Server' },
  { value: 'oracle', label: 'Oracle' }
];

function generateCreateTable(table, dialect) {
  let sql = `CREATE TABLE ${table.name} (\n`;

  const columnDefs = table.columns.map(col => {
    let def = `  ${col.name} ${col.type}`;

    if (col.primaryKey) {
      def += ' PRIMARY KEY';
    }

    if (col.autoIncrement) {
      if (dialect === 'postgresql') {
        def = `  ${col.name} SERIAL`;
        if (col.primaryKey) def += ' PRIMARY KEY';
      } else if (dialect === 'mysql') {
        def += ' AUTO_INCREMENT';
      } else if (dialect === 'sqlite') {
        def += ' AUTOINCREMENT';
      } else if (dialect === 'mssql') {
        def += ' IDENTITY(1,1)';
      }
    }

    if (!col.nullable && !col.primaryKey) {
      def += ' NOT NULL';
    }

    if (col.unique) {
      def += ' UNIQUE';
    }

    if (col.defaultValue) {
      if (col.type.includes('CHAR') || col.type.includes('TEXT')) {
        def += ` DEFAULT '${col.defaultValue}'`;
      } else {
        def += ` DEFAULT ${col.defaultValue}`;
      }
    }

    return def;
  });

  sql += columnDefs.join(',\n');
  sql += '\n);\n';

  return sql;
}

function generateForeignKey(rel, tables, dialect) {
  const fromTable = tables.find(t => t.id === rel.fromTable);
  const toTable = tables.find(t => t.id === rel.toTable);
  const fromColumn = fromTable?.columns.find(c => c.id === rel.fromColumn);
  const toColumn = toTable?.columns.find(c => c.id === rel.toColumn);

  if (!fromTable || !toTable || !fromColumn || !toColumn) {
    return '-- Invalid relationship\n';
  }

  const constraintName = `fk_${fromTable.name}_${toTable.name}_${fromColumn.name}`;

  return `ALTER TABLE ${fromTable.name}\n  ADD CONSTRAINT ${constraintName}\n  FOREIGN KEY (${fromColumn.name})\n  REFERENCES ${toTable.name}(${toColumn.name});\n\n`;
}

export default function SQLGenerator({ schema }) {
  const [dialect, setDialect] = useState('postgresql');
  const [copied, setCopied] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainResult, setExplainResult] = useState('');

  const generateSQL = useMemo(() => {
    if (!schema.tables || schema.tables.length === 0) {
      return '-- No tables to generate SQL';
    }

    let sql = `-- Database Schema: ${schema.name}\n`;
    sql += `-- Generated on: ${new Date().toLocaleString()}\n`;
    sql += `-- Dialect: ${SQL_DIALECTS.find(d => d.value === dialect)?.label}\n\n`;

    schema.tables.forEach((table, index) => {
      if (index > 0) sql += '\n';
      sql += generateCreateTable(table, dialect);
    });

    if (schema.relationships && schema.relationships.length > 0) {
      sql += '\n-- Foreign Key Constraints\n\n';
      schema.relationships.forEach(rel => {
        sql += generateForeignKey(rel, schema.tables, dialect);
      });
    }

    return sql;
  }, [schema, dialect]);

  const generateInsertStatements = () => {
    if (!schema.tables || schema.tables.length === 0) {
      return '-- No tables defined in schema\n-- Add tables to generate INSERT statements';
    }

    let sql = `-- Sample INSERT Statements\n`;
    sql += `-- Generated: ${new Date().toLocaleString()}\n`;
    sql += `-- These are example INSERT statements with sample data\n`;
    sql += `-- Modify the values according to your requirements\n\n`;

    schema.tables.forEach((table, index) => {
      if (index > 0) sql += '\n';
      
      sql += `-- Insert sample data into ${table.name}\n`;

      const columns = table.columns
        .filter(col => !col.autoIncrement)
        .map(col => col.name)
        .join(', ');

      if (!columns) {
        sql += `-- No insertable columns (all are auto-increment)\n`;
        return;
      }

      // Generate multiple sample rows
      for (let row = 1; row <= 3; row++) {
        const values = table.columns
          .filter(col => !col.autoIncrement)
          .map((col, idx) => {
            if (col.type.includes('CHAR') || col.type.includes('TEXT') || col.type.includes('VARCHAR')) {
              return `'sample_${col.name}_${row}'`;
            } else if (col.type.includes('INT') || col.type.includes('NUMERIC') || col.type.includes('DECIMAL') || col.type.includes('BIGINT')) {
              return String(row * 10 + idx);
            } else if (col.type.includes('BOOL') || col.type.includes('BOOLEAN')) {
              return row % 2 === 0 ? 'true' : 'false';
            } else if (col.type.includes('DATE')) {
              return `'2024-01-${String(row).padStart(2, '0')}'`;
            } else if (col.type.includes('TIME')) {
              return `'12:00:00'`;
            } else if (col.type.includes('TIMESTAMP')) {
              return `'2024-01-${String(row).padStart(2, '0')} 12:00:00'`;
            } else {
              return 'NULL';
            }
          })
          .join(', ');

        sql += `INSERT INTO ${table.name} (${columns})\nVALUES (${values});\n`;
      }
    });

    return sql;
  };

  const generateDropStatements = () => {
    if (!schema.tables || schema.tables.length === 0) {
      return '-- No tables defined in schema\n-- Add tables to generate DROP statements';
    }

    let sql = `-- DROP TABLE Statements\n`;
    sql += `-- Generated: ${new Date().toLocaleString()}\n`;
    sql += `-- WARNING: These statements will permanently delete tables and all data!\n`;
    sql += `-- Use with extreme caution. Always backup your data before executing.\n\n`;

    // Drop in reverse order to handle foreign keys (drop dependent tables first)
    const reversedTables = [...schema.tables].reverse();
    
    sql += `-- Dropping tables in reverse order to handle foreign key dependencies\n\n`;
    
    reversedTables.forEach((table, index) => {
      if (index > 0) sql += '\n';
      sql += `DROP TABLE IF EXISTS ${table.name} CASCADE;\n`;
    });

    sql += `\n-- All tables have been dropped\n`;

    return sql;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateSQL);
    setCopied(true);
    toast.success('SQL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExplain = async () => {
    setExplainLoading(true);
    setExplainResult('');
    try {
      const r = await backendApi.llm.explainSql(generateSQL, schema);
      setExplainResult(r.explanation || '');
    } catch (e) {
      setExplainResult('Error: ' + (e.message || 'Could not explain'));
    } finally {
      setExplainLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generateSQL], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${schema.name.replace(/\s+/g, '_')}_${dialect}.sql`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('SQL file downloaded');
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200 mb-1">
              SQL Generator
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Generate SQL DDL statements for your schema. Copy or download the generated SQL code.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-48">
              <Select value={dialect} onValueChange={setDialect}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SQL_DIALECTS.map(d => (
                    <SelectItem key={d.value} value={d.value} className="font-semibold">
                      <span className="font-bold">{d.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={handleCopy}
              className={`border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 ${copied ? 'bg-emerald-50 dark:bg-green-600/20 border-emerald-500 dark:border-green-600 text-emerald-700 dark:text-green-400' : ''}`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>

            <Button
              onClick={handleExplain}
              disabled={explainLoading || !generateSQL || (schema.tables?.length || 0) === 0}
              variant="outline"
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
            >
              {explainLoading ? <span className="animate-spin">⏳</span> : <MessageSquare className="w-4 h-4 mr-2" />}
              Explain
            </Button>
            <Button
              onClick={handleDownload}
              className="bg-gradient-to-r from-blue-600 to-emerald-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Download SQL
            </Button>
          </div>
        </div>

        {explainResult && (
          <Alert className="mb-4 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-700">
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-slate-800 dark:text-slate-200">{explainResult}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700">
            <TabsTrigger value="create" className="text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100">CREATE Tables</TabsTrigger>
            <TabsTrigger value="insert" className="text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100">INSERT Samples</TabsTrigger>
            <TabsTrigger value="drop" className="text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100">DROP Tables</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4">
            <div className="relative">
              <pre className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700/50 rounded-lg p-6 overflow-x-auto text-sm text-slate-900 dark:text-slate-100 font-mono max-h-[600px] overflow-y-auto leading-relaxed shadow-inner">
                <code className="text-slate-900 dark:text-slate-100">{generateSQL}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="insert" className="mt-4">
            <div className="relative">
              <pre className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700/50 rounded-lg p-6 overflow-x-auto text-sm text-slate-900 dark:text-slate-100 font-mono max-h-[600px] overflow-y-auto leading-relaxed shadow-inner">
                <code className="text-slate-900 dark:text-slate-100">{generateInsertStatements()}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="drop" className="mt-4">
            <div className="mb-3 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
              <div className="text-sm font-semibold text-red-700 dark:text-red-400">
                ⚠️ Warning: These DROP statements will permanently delete tables and all their data. Use with extreme caution!
              </div>
            </div>
            <div className="relative">
              <pre className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700/50 rounded-lg p-6 overflow-x-auto text-sm text-slate-900 dark:text-slate-100 font-mono max-h-[600px] overflow-y-auto leading-relaxed shadow-inner">
                <code className="text-slate-900 dark:text-slate-100">{generateDropStatements()}</code>
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Stats Card */}
      <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/50 p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {schema.tables?.length || 0}
            </div>
            <div className="text-xs font-medium text-slate-700 dark:text-slate-400">Tables</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {schema.tables?.reduce((sum, t) => sum + t.columns.length, 0) || 0}
            </div>
            <div className="text-xs font-medium text-slate-700 dark:text-slate-400">Columns</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {schema.relationships?.length || 0}
            </div>
            <div className="text-xs font-medium text-slate-700 dark:text-slate-400">Relationships</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-green-400">
              {generateSQL.split('\n').length}
            </div>
            <div className="text-xs font-medium text-slate-700 dark:text-slate-400">Lines of SQL</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
