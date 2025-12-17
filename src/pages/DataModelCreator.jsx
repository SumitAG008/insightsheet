import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Download, Upload, Sparkles, Save, FileCode, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import SchemaCanvas from '@/components/datamodel/SchemaCanvas';
import TableDesigner from '@/components/datamodel/TableDesigner';
import RelationshipManager from '@/components/datamodel/RelationshipManager';
import SQLGenerator from '@/components/datamodel/SQLGenerator';
import AISchemaAssistant from '@/components/datamodel/AISchemaAssistant';
import { meldraAi } from '@/api/meldraClient';

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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await meldraAi.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Auth check failed:', error);
      navigate('/Login');
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
        const imported = JSON.parse(e.target.result);
        if (imported.tables && Array.isArray(imported.tables)) {
          setSchema(imported);
          toast.success('Schema imported successfully');
        } else {
          toast.error('Invalid schema file format');
        }
      } catch (error) {
        toast.error('Failed to parse JSON file');
      }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Data Model Creator
                </h1>
                <p className="text-slate-400 text-sm">
                  Design database schemas visually with AI-powered assistance
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleAddTable}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Table
              </Button>

              <label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </span>
                </Button>
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
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <span>{schema.tables.length} Tables</span>
            <span>{schema.relationships.length} Relationships</span>
            <span>
              {schema.tables.reduce((sum, t) => sum + t.columns.length, 0)} Columns
            </span>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-900/50 border border-slate-800">
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
    </div>
  );
}
