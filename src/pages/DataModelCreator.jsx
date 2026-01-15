import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Download, Upload, Sparkles, Save, FileCode, Trash2, Plus, ChevronDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import SchemaCanvas from '@/components/datamodel/SchemaCanvas';
import TableDesigner from '@/components/datamodel/TableDesigner';
import RelationshipManager from '@/components/datamodel/RelationshipManager';
import SQLGenerator from '@/components/datamodel/SQLGenerator';
import AISchemaAssistant from '@/components/datamodel/AISchemaAssistant';
import SchemaImporter from '@/components/datamodel/SchemaImporter';
import { meldraAi } from '@/api/meldraClient';
import { jsonToSchema, xmlToSchema, autoConvertToSchema } from '@/utils/schemaConverter';

export default function DataModelCreator() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [schema, setSchema] = useState({
    name: 'Untitled Schema',
    tables: [],
    relationships: []
  });
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeTab, setActiveTab] = useState('canvas');
  const [showSchemaImporter, setShowSchemaImporter] = useState(false);
  const [selectedImportType, setSelectedImportType] = useState('mysql');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await meldraAi.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Auth check failed:', error);
      // User not logged in, but allow access
      console.log('User not authenticated');
    }
  };

  const handleAddTable = () => {
    const newTable = {
      id: `table_${Date.now()}`,
      name: `Table${schema.tables.length + 1}`,
      x: 100 + (schema.tables.length * 50),
      y: 100 + (schema.tables.length * 50),
      columns: [
        {
          id: `col_${Date.now()}`,
          name: 'id',
          type: 'INTEGER',
          primaryKey: true,
          nullable: false,
          autoIncrement: true
        }
      ]
    };
    setSchema(prev => ({
      ...prev,
      tables: [...prev.tables, newTable]
    }));
    setSelectedTable(newTable.id);
    toast.success('New table added');
  };

  const handleUpdateTable = (tableId, updates) => {
    setSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId ? { ...t, ...updates } : t
      )
    }));
  };

  const handleDeleteTable = (tableId) => {
    setSchema(prev => ({
      ...prev,
      tables: prev.tables.filter(t => t.id !== tableId),
      relationships: prev.relationships.filter(
        r => r.fromTable !== tableId && r.toTable !== tableId
      )
    }));
    if (selectedTable === tableId) {
      setSelectedTable(null);
    }
    toast.success('Table deleted');
  };

  const handleAddRelationship = (relationship) => {
    setSchema(prev => ({
      ...prev,
      relationships: [...prev.relationships, {
        id: `rel_${Date.now()}`,
        ...relationship
      }]
    }));
    toast.success('Relationship added');
  };

  const handleDeleteRelationship = (relationshipId) => {
    setSchema(prev => ({
      ...prev,
      relationships: prev.relationships.filter(r => r.id !== relationshipId)
    }));
    toast.success('Relationship deleted');
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(schema, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${schema.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Schema exported as JSON');
  };

  const handleImportJSON = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileContent = e.target.result;
        const filename = file.name.toLowerCase();
        
        let importedSchema;
        
        // Check if it's a schema file (has tables array) or data file (array of objects)
        try {
          const parsed = JSON.parse(fileContent);
          
          // If it has 'tables' property, it's a schema file
          if (parsed.tables && Array.isArray(parsed.tables)) {
            // Import as schema directly
            importedSchema = {
              name: parsed.name || 'Imported Schema',
              tables: parsed.tables.map((table, index) => ({
                id: table.id || `table_${Date.now()}_${index}`,
                name: table.name || `Table${index + 1}`,
                x: table.x || (100 + (index * 200)),
                y: table.y || (100 + (index * 150)),
                columns: Array.isArray(table.columns) ? table.columns.map((col, colIndex) => ({
                  id: col.id || `col_${Date.now()}_${index}_${colIndex}`,
                  name: col.name || `column${colIndex + 1}`,
                  type: col.type || 'VARCHAR',
                  primaryKey: col.primaryKey || false,
                  nullable: col.nullable !== undefined ? col.nullable : true,
                  autoIncrement: col.autoIncrement || false,
                  defaultValue: col.defaultValue || null,
                  foreignKey: col.foreignKey || null
                })) : []
              })),
              relationships: Array.isArray(parsed.relationships) ? parsed.relationships.map((rel, relIndex) => ({
                id: rel.id || `rel_${Date.now()}_${relIndex}`,
                fromTable: rel.fromTable,
                toTable: rel.toTable,
                fromColumn: rel.fromColumn,
                toColumn: rel.toColumn,
                type: rel.type || 'one-to-many'
              })) : []
            };
          } else if (Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null)) {
            // It's data - convert to schema
            importedSchema = autoConvertToSchema(parsed, filename);
            toast.info('Data file detected. Converting to schema...');
          } else {
            throw new Error('Invalid file format');
          }
        } catch (parseError) {
          // Try XML
          if (filename.endsWith('.xml') || fileContent.trim().startsWith('<?xml')) {
            importedSchema = xmlToSchema(fileContent);
            toast.info('XML file detected. Converting to schema...');
          } else {
            throw parseError;
          }
        }

        // Set the schema
        setSchema(importedSchema);
        
        // Reset selected table
        setSelectedTable(null);
        
        // Switch to canvas tab to see the imported schema
        setActiveTab('canvas');
        
        const tableCount = importedSchema.tables.length;
        const columnCount = importedSchema.tables.reduce((sum, t) => sum + t.columns.length, 0);
        const relCount = importedSchema.relationships.length;
        
        toast.success(`Schema imported: ${tableCount} table(s), ${columnCount} columns, ${relCount} relationships`);
        
        // Reset file input so same file can be imported again
        event.target.value = '';
      } catch (error) {
        console.error('Import error:', error);
        toast.error(`Failed to import: ${error.message}`);
        event.target.value = '';
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleClearSchema = () => {
    if (confirm('Are you sure you want to clear the entire schema?')) {
      setSchema({
        name: 'Untitled Schema',
        tables: [],
        relationships: []
      });
      setSelectedTable(null);
      toast.success('Schema cleared');
    }
  };

  const handleApplyAISchema = (aiSchema) => {
    setSchema(prev => ({
      ...prev,
      ...aiSchema
    }));
    toast.success('AI-generated schema applied');
  };

  const handleImportFromSQL = (importedSchema, appendMode) => {
    if (appendMode) {
      // Append to existing schema
      setSchema(prev => ({
        ...prev,
        tables: [...prev.tables, ...importedSchema.tables],
        relationships: [...prev.relationships, ...importedSchema.relationships]
      }));
    } else {
      // Replace existing schema
      setSchema(importedSchema);
    }
    setSelectedTable(null);
    setActiveTab('canvas');
    const tableCount = importedSchema.tables.length;
    const columnCount = importedSchema.tables.reduce((sum, t) => sum + t.columns.length, 0);
    const relCount = importedSchema.relationships.length;
    toast.success(`Schema imported: ${tableCount} table(s), ${columnCount} columns, ${relCount} relationships`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Data Model Creator
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Design database schemas visually with AI-powered assistance
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleAddTable}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Table
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" type="button">
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 w-56">
                  <DropdownMenuItem onClick={() => { setSelectedImportType('mysql'); setShowSchemaImporter(true); }}>
                    <Database className="w-4 h-4 mr-2" />
                    From MySQL
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSelectedImportType('postgresql'); setShowSchemaImporter(true); }}>
                    <Database className="w-4 h-4 mr-2" />
                    From PostgreSQL
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSelectedImportType('mssql'); setShowSchemaImporter(true); }}>
                    <Database className="w-4 h-4 mr-2" />
                    From SQL Server
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSelectedImportType('snowflake'); setShowSchemaImporter(true); }}>
                    <Database className="w-4 h-4 mr-2" />
                    From Snowflake
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSelectedImportType('oracle'); setShowSchemaImporter(true); }}>
                    <Database className="w-4 h-4 mr-2" />
                    From Oracle SQL
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSelectedImportType('rails'); setShowSchemaImporter(true); }}>
                    <FileCode className="w-4 h-4 mr-2" />
                    From Rails (schema.rb)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSelectedImportType('csv'); setShowSchemaImporter(true); }}>
                    <FileText className="w-4 h-4 mr-2" />
                    From CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <label className="cursor-pointer hidden">
                <input
                  type="file"
                  accept=".json,.xml,.js"
                  onChange={handleImportJSON}
                  className="hidden"
                  id="import-json-input"
                />
              </label>

              <Button
                onClick={handleExportJSON}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              <Button
                onClick={handleClearSchema}
                variant="outline"
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>

          {/* Schema Info */}
          <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="font-semibold">{schema.tables.length} Tables</span>
            <span className="font-semibold">{schema.relationships.length} Relationships</span>
            <span className="font-semibold">
              {schema.tables.reduce((sum, t) => sum + t.columns.length, 0)} Columns
            </span>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <TabsTrigger value="canvas">
              <Database className="w-4 h-4 mr-2" />
              Visual Canvas
            </TabsTrigger>
            <TabsTrigger value="tables">
              <FileCode className="w-4 h-4 mr-2" />
              Table Designer
            </TabsTrigger>
            <TabsTrigger value="relationships">
              Relationships
            </TabsTrigger>
            <TabsTrigger value="sql">
              <FileCode className="w-4 h-4 mr-2" />
              SQL Generator
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="canvas" className="mt-4">
            <SchemaCanvas
              key={`canvas-${schema.tables.length}-${schema.relationships.length}`}
              schema={schema}
              selectedTable={selectedTable}
              onSelectTable={setSelectedTable}
              onUpdateTable={handleUpdateTable}
              onDeleteTable={handleDeleteTable}
              onAddRelationship={handleAddRelationship}
            />
          </TabsContent>

          <TabsContent value="tables" className="mt-4">
            <TableDesigner
              key={`tables-${schema.tables.length}`}
              tables={schema.tables}
              selectedTable={selectedTable}
              onSelectTable={setSelectedTable}
              onUpdateTable={handleUpdateTable}
              onDeleteTable={handleDeleteTable}
              onAddTable={handleAddTable}
            />
          </TabsContent>

          <TabsContent value="relationships" className="mt-4">
            <RelationshipManager
              tables={schema.tables}
              relationships={schema.relationships}
              onAddRelationship={handleAddRelationship}
              onDeleteRelationship={handleDeleteRelationship}
            />
          </TabsContent>

          <TabsContent value="sql" className="mt-4">
            <SQLGenerator schema={schema} />
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <AISchemaAssistant
              currentSchema={schema}
              onApplySchema={handleApplyAISchema}
              user={user}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Schema Importer Modal */}
      <SchemaImporter
        open={showSchemaImporter}
        onOpenChange={setShowSchemaImporter}
        onImport={handleImportFromSQL}
      />
    </div>
  );
}
