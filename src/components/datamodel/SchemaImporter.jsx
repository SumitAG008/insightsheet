// components/datamodel/SchemaImporter.jsx - Import database schemas from SQL dumps
import React, { useState, useEffect } from 'react';
import { 
  Upload, Database, FileText, CheckCircle, AlertCircle, 
  ChevronDown, Copy, Download, FileCode, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const DB_IMPORT_TYPES = {
  mysql: {
    name: 'MySQL',
    icon: Database,
    command: 'mysqldump -h <host> -u <username> -P <port> -p --no-data <database_name> > <output_path>',
    example: 'mysqldump -h localhost -u root -P 3306 -p --no-data ecommerce > C:\\mysql_schema.sql',
    instructions: [
      'Install mysqldump.',
      'In your terminal, run the following command (On Linux, you might need to add `sudo` before it):',
      'Copy the dumped SQL content and paste it into this modal.'
    ]
  },
  postgresql: {
    name: 'PostgreSQL',
    icon: Database,
    command: 'pg_dump -h <host> -U <username> -p <port> -d <database_name> --schema-only > <output_path>',
    example: 'pg_dump -h localhost -U postgres -p 5432 -d mydb --schema-only > C:\\postgres_schema.sql',
    instructions: [
      'Install pg_dump (comes with PostgreSQL).',
      'In your terminal, run the following command:',
      'Copy the dumped SQL content and paste it into this modal.'
    ]
  },
  mssql: {
    name: 'SQL Server',
    icon: Database,
    command: 'sqlcmd -S <server> -U <username> -P <password> -d <database> -Q "SELECT * FROM INFORMATION_SCHEMA.TABLES" -o <output_path>',
    example: 'sqlcmd -S localhost -U sa -P password -d MyDB -Q "SELECT * FROM INFORMATION_SCHEMA.TABLES" -o C:\\mssql_schema.sql',
    instructions: [
      'Install sqlcmd (SQL Server Command Line Utilities).',
      'In your terminal, run the following command:',
      'Copy the dumped SQL content and paste it into this modal.'
    ]
  },
  oracle: {
    name: 'Oracle SQL',
    icon: Database,
    command: 'expdp <username>/<password>@<host>:<port>/<service> schemas=<schema_name> directory=<directory> dumpfile=<output_file> content=metadata_only',
    example: 'expdp system/password@localhost:1521/ORCL schemas=HR directory=DATA_PUMP_DIR dumpfile=hr_schema.dmp content=metadata_only',
    instructions: [
      'Use Oracle Data Pump (expdp) or SQL*Plus.',
      'In your terminal, run the following command:',
      'Copy the dumped SQL content and paste it into this modal.'
    ]
  },
  snowflake: {
    name: 'Snowflake',
    icon: Database,
    command: 'SHOW TABLES IN SCHEMA <schema_name>;',
    example: 'SHOW TABLES IN SCHEMA PUBLIC;',
    instructions: [
      'Connect to Snowflake using SnowSQL or web interface.',
      'Run the following command to get table definitions:',
      'Copy the SQL output and paste it into this modal.'
    ]
  },
  rails: {
    name: 'Rails (schema.rb)',
    icon: FileCode,
    command: 'Copy schema.rb file from your Rails app (db/schema.rb)',
    example: 'db/schema.rb',
    instructions: [
      'Locate the schema.rb file in your Rails application (usually in db/schema.rb).',
      'Open the file and copy its entire content.',
      'Paste the content into this modal.'
    ]
  },
  csv: {
    name: 'CSV',
    icon: FileText,
    command: 'Upload a CSV file with table definitions',
    example: 'table_name,column_name,data_type,nullable',
    instructions: [
      'Create a CSV file with columns: table_name, column_name, data_type, nullable, primary_key.',
      'Each row represents a column in a table.',
      'Upload the CSV file or paste CSV content here.'
    ]
  }
};

export default function SchemaImporter({ onImport, open, onOpenChange, defaultDbType = 'mysql' }) {
  const [selectedDbType, setSelectedDbType] = useState(defaultDbType);
  const [sqlContent, setSqlContent] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [appendMode, setAppendMode] = useState(false);

  // Update selectedDbType when defaultDbType changes (when modal opens with different type)
  useEffect(() => {
    if (open && defaultDbType) {
      setSelectedDbType(defaultDbType);
    }
  }, [open, defaultDbType]);

  const selectedConfig = DB_IMPORT_TYPES[selectedDbType];

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setSqlContent(e.target.result);
      toast.success('File loaded successfully');
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  const copyCommand = (command) => {
    navigator.clipboard.writeText(command);
    toast.success('Command copied to clipboard');
  };

  const handleImport = async () => {
    if (!sqlContent.trim()) {
      toast.error('Please paste SQL content or upload a file');
      return;
    }

    setIsProcessing(true);
    try {
      // Parse SQL and convert to schema format
      const schema = await parseSQLToSchema(sqlContent, selectedDbType);
      
      if (schema && schema.tables && schema.tables.length > 0) {
        onImport(schema, appendMode);
        toast.success(`Successfully imported ${schema.tables.length} table(s)`);
        setSqlContent('');
        onOpenChange(false);
      } else {
        toast.error('No tables found in the SQL content');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseSQLToSchema = async (sql, dbType) => {
    // This is a simplified parser - in production, you'd want a more robust SQL parser
    const tables = [];
    const relationships = [];
    let currentTable = null;
    let tableId = 1;

    const lines = sql.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments and empty lines
      if (!line || line.startsWith('--') || line.startsWith('/*') || line.startsWith('*')) {
        continue;
      }

      // CREATE TABLE statement
      if (line.match(/CREATE\s+TABLE/i)) {
        const match = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|")?(\w+)(?:`|")?/i);
        if (match) {
          currentTable = {
            id: `table_${tableId++}`,
            name: match[1],
            x: 100 + (tables.length * 250),
            y: 100 + (tables.length * 200),
            columns: []
          };
        }
      }
      // Column definition
      else if (currentTable && line.match(/^\w+/)) {
        const colMatch = line.match(/^(`|")?(\w+)(`|")?\s+(\w+)/i);
        if (colMatch) {
          const colName = colMatch[2];
          const colType = colMatch[4].toUpperCase();
          
          const isPrimaryKey = line.includes('PRIMARY KEY') || line.includes('primary key');
          const isNotNull = line.includes('NOT NULL') || line.includes('not null');
          const isAutoIncrement = line.includes('AUTO_INCREMENT') || line.includes('auto_increment') || 
                                  line.includes('SERIAL') || line.includes('serial');
          
          currentTable.columns.push({
            id: `col_${Date.now()}_${currentTable.columns.length}`,
            name: colName,
            type: colType,
            primaryKey: isPrimaryKey,
            nullable: !isNotNull,
            autoIncrement: isAutoIncrement,
            defaultValue: null
          });
        }
      }
      // End of table definition
      else if (currentTable && (line.includes(');') || line.includes(') ENGINE'))) {
        // Add primary key if not already set
        if (currentTable.columns.length > 0 && !currentTable.columns.some(c => c.primaryKey)) {
          // Look for first 'id' column or first column
          const idCol = currentTable.columns.find(c => c.name.toLowerCase() === 'id');
          if (idCol) {
            idCol.primaryKey = true;
            idCol.autoIncrement = true;
          }
        }
        
        tables.push(currentTable);
        currentTable = null;
      }
      // Foreign key constraints
      else if (line.match(/FOREIGN\s+KEY|REFERENCES/i)) {
        const fkMatch = line.match(/FOREIGN\s+KEY\s+\((`|")?(\w+)(`|")?\)\s+REFERENCES\s+(`|")?(\w+)(`|")?\s+\((`|")?(\w+)(`|")?\)/i);
        if (fkMatch && currentTable) {
          relationships.push({
            id: `rel_${Date.now()}_${relationships.length}`,
            fromTable: currentTable.name,
            fromColumn: fkMatch[2],
            toTable: fkMatch[5],
            toColumn: fkMatch[8],
            type: 'many-to-one'
          });
        }
      }
    }

    return {
      name: `Imported from ${selectedConfig.name}`,
      tables,
      relationships
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <Upload className="w-6 h-6" />
              Import Database Schema
            </DialogTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="instructions-toggle" className="text-sm text-slate-300">Instructions</Label>
                <Switch
                  id="instructions-toggle"
                  checked={showInstructions}
                  onCheckedChange={setShowInstructions}
                />
              </div>
            </div>
          </div>
          <DialogDescription className="text-slate-400">
            Import database schema from SQL dumps or schema files
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Left Panel - Instructions */}
          {showInstructions && (
            <div className="space-y-4">
              <div>
                <Label className="text-white mb-2 block font-semibold">Select Database Type</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between bg-slate-800 border-slate-700 text-slate-200">
                      <div className="flex items-center gap-2">
                        <selectedConfig.icon className="w-4 h-4" />
                        {selectedConfig.name}
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-800 border-slate-700">
                    {Object.entries(DB_IMPORT_TYPES).map(([key, config]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => setSelectedDbType(key)}
                        className="text-slate-200 hover:bg-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <config.icon className="w-4 h-4" />
                          {config.name}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white">{selectedConfig.name}</h3>
                {selectedConfig.instructions.map((instruction, idx) => (
                  <div key={idx} className="space-y-2">
                    <p className="text-sm text-slate-300">{idx + 1}. {instruction}</p>
                    {idx === 1 && (
                      <div className="space-y-2">
                        <div className="bg-slate-900 rounded p-3 font-mono text-xs text-slate-300">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-400">Command:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyCommand(selectedConfig.command)}
                              className="h-6 px-2 text-xs"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <code className="text-emerald-300">{selectedConfig.command}</code>
                        </div>
                        {selectedConfig.example && (
                          <div className="bg-slate-900 rounded p-3 font-mono text-xs">
                            <div className="text-slate-400 mb-1">Example:</div>
                            <code className="text-blue-300">{selectedConfig.example}</code>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Right Panel - Input Area */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white font-semibold">Paste SQL Content</Label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".sql,.txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="sql-file-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('sql-file-upload').click()}
                    className="bg-slate-800 border-slate-700 text-slate-200"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload .sql
                  </Button>
                </div>
              </div>
              <Textarea
                value={sqlContent}
                onChange={(e) => setSqlContent(e.target.value)}
                placeholder="Paste your SQL dump content here..."
                className="bg-slate-800 border-slate-700 text-slate-200 font-mono text-sm min-h-[400px]"
              />
            </div>

            <Alert className="bg-blue-500/10 border-blue-500/30">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-200 text-sm">
                The SQL parser will extract table definitions, columns, and relationships from your dump file.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="append-mode"
              checked={appendMode}
              onChange={(e) => setAppendMode(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="append-mode" className="text-sm text-slate-300 cursor-pointer">
              Append converted schema to the end
            </Label>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-slate-800 border-slate-700 text-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!sqlContent.trim() || isProcessing}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
