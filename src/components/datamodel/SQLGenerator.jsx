import React, { useState, useMemo } from 'react';
import { Copy, Download, Database, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

export default function SQLGenerator({ schema }) {
  const [dialect, setDialect] = useState('postgresql');
  const [copied, setCopied] = useState(false);

  const generateSQL = useMemo(() => {
    if (!schema.tables || schema.tables.length === 0) {
      return '-- No tables to generate SQL';
    }

    let sql = `-- Database Schema: ${schema.name}\n`;
    sql += `-- Generated on: ${new Date().toLocaleString()}\n`;
    sql += `-- Dialect: ${SQL_DIALECTS.find(d => d.value === dialect)?.label}\n\n`;

    // Generate CREATE TABLE statements
    schema.tables.forEach((table, index) => {
      if (index > 0) sql += '\n';
      sql += generateCreateTable(table, dialect);
    });

    // Generate ALTER TABLE statements for foreign keys
    if (schema.relationships && schema.relationships.length > 0) {
      sql += '\n-- Foreign Key Constraints\n\n';
      schema.relationships.forEach(rel => {
        sql += generateForeignKey(rel, schema.tables, dialect);
      });
    }

    return sql;
  }, [schema, dialect]);

  const generateCreateTable = (table, dialect) => {
    let sql = `CREATE TABLE ${table.name} (\n`;

    const columnDefs = table.columns.map(col => {
      let def = `  ${col.name} ${col.type}`;

      // Primary Key
      if (col.primaryKey) {
        def += ' PRIMARY KEY';
      }

      // Auto Increment
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

      // NOT NULL
      if (!col.nullable && !col.primaryKey) {
        def += ' NOT NULL';
      }

      // UNIQUE
      if (col.unique) {
        def += ' UNIQUE';
      }

      // DEFAULT
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
  };

  const generateForeignKey = (rel, tables, dialect) => {
    const fromTable = tables.find(t => t.id === rel.fromTable);
    const toTable = tables.find(t => t.id === rel.toTable);
    const fromColumn = fromTable?.columns.find(c => c.id === rel.fromColumn);
    const toColumn = toTable?.columns.find(c => c.id === rel.toColumn);

    if (!fromTable || !toTable || !fromColumn || !toColumn) {
      return '-- Invalid relationship\n';
    }

    const constraintName = `fk_${fromTable.name}_${toTable.name}_${fromColumn.name}`;

    return `ALTER TABLE ${fromTable.name}\n  ADD CONSTRAINT ${constraintName}\n  FOREIGN KEY (${fromColumn.name})\n  REFERENCES ${toTable.name}(${toColumn.name});\n\n`;
  };

  const generateInsertStatements = () => {
    if (!schema.tables || schema.tables.length === 0) {
      return '-- No tables to generate INSERT statements';
    }

    let sql = `-- Sample INSERT statements\n\n`;

    schema.tables.forEach((table, index) => {
      if (index > 0) sql += '\n';

      const columns = table.columns
        .filter(col => !col.autoIncrement)
        .map(col => col.name)
        .join(', ');

      const values = table.columns
        .filter(col => !col.autoIncrement)
        .map(col => {
          if (col.type.includes('CHAR') || col.type.includes('TEXT')) {
            return "'sample_value'";
          } else if (col.type.includes('INT') || col.type.includes('NUMERIC') || col.type.includes('DECIMAL')) {
            return '1';
          } else if (col.type.includes('BOOL')) {
            return 'true';
          } else if (col.type.includes('DATE') || col.type.includes('TIME')) {
            return "'2024-01-01'";
          } else {
            return 'NULL';
          }
        })
        .join(', ');

      sql += `INSERT INTO ${table.name} (${columns})\nVALUES (${values});\n`;
    });

    return sql;
  };

  const generateDropStatements = () => {
    if (!schema.tables || schema.tables.length === 0) {
      return '-- No tables to drop';
    }

    let sql = `-- DROP statements (use with caution!)\n\n`;

    // Drop in reverse order to handle foreign keys
    const reversedTables = [...schema.tables].reverse();
    reversedTables.forEach(table => {
      sql += `DROP TABLE IF EXISTS ${table.name};\n`;
    });

    return sql;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateSQL);
    setCopied(true);
    toast.success('SQL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
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
      <Card className="bg-slate-900/50 border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-200 mb-1">
              SQL Generator
            </h3>
            <p className="text-sm text-slate-400">
              Generate SQL DDL statements for your schema
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-48">
              <Select value={dialect} onValueChange={setDialect}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SQL_DIALECTS.map(d => (
                    <SelectItem key={d.value} value={d.value}>
                      <div className="flex items-center gap-2">
                        <Database className="w-3 h-3" />
                        {d.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={handleCopy}
              className={copied ? 'bg-green-600/20 border-green-600' : ''}
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
              onClick={handleDownload}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Download SQL
            </Button>
          </div>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="create">CREATE Tables</TabsTrigger>
            <TabsTrigger value="insert">INSERT Samples</TabsTrigger>
            <TabsTrigger value="drop">DROP Tables</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4">
            <div className="relative">
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 font-mono max-h-[600px] overflow-y-auto">
                {generateSQL}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="insert" className="mt-4">
            <div className="relative">
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 font-mono max-h-[600px] overflow-y-auto">
                {generateInsertStatements()}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="drop" className="mt-4">
            <div className="mb-3 p-3 bg-red-900/20 border border-red-700 rounded-lg">
              <div className="text-sm text-red-400">
                ⚠️ Warning: These DROP statements will permanently delete tables and all their data. Use with extreme caution!
              </div>
            </div>
            <div className="relative">
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 font-mono max-h-[600px] overflow-y-auto">
                {generateDropStatements()}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Stats Card */}
      <Card className="bg-slate-900/50 border-slate-800 p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {schema.tables?.length || 0}
            </div>
            <div className="text-xs text-slate-400">Tables</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-pink-400">
              {schema.tables?.reduce((sum, t) => sum + t.columns.length, 0) || 0}
            </div>
            <div className="text-xs text-slate-400">Columns</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">
              {schema.relationships?.length || 0}
            </div>
            <div className="text-xs text-slate-400">Relationships</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">
              {generateSQL.split('\n').length}
            </div>
            <div className="text-xs text-slate-400">Lines of SQL</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
