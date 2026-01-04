import React, { useState } from 'react';
import { Plus, Trash2, Key, Edit2, Check, X, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const DATA_TYPES = [
  'INTEGER',
  'BIGINT',
  'SMALLINT',
  'DECIMAL',
  'NUMERIC',
  'REAL',
  'DOUBLE PRECISION',
  'VARCHAR',
  'CHAR',
  'TEXT',
  'DATE',
  'TIME',
  'TIMESTAMP',
  'BOOLEAN',
  'JSON',
  'JSONB',
  'UUID',
  'BLOB',
  'BYTEA'
];

export default function TableDesigner({
  tables,
  selectedTable,
  onSelectTable,
  onUpdateTable,
  onDeleteTable,
  onAddTable
}) {
  const [editingColumn, setEditingColumn] = useState(null);
  const [editingTableName, setEditingTableName] = useState(null);

  const currentTable = tables.find(t => t.id === selectedTable);

  const handleAddColumn = () => {
    if (!currentTable) {
      toast.error('Please select a table first');
      return;
    }

    const newColumn = {
      id: `col_${Date.now()}`,
      name: `column${currentTable.columns.length + 1}`,
      type: 'VARCHAR',
      nullable: true,
      primaryKey: false,
      unique: false,
      autoIncrement: false,
      defaultValue: ''
    };

    onUpdateTable(currentTable.id, {
      columns: [...currentTable.columns, newColumn]
    });
    toast.success('Column added');
  };

  const handleUpdateColumn = (columnId, updates) => {
    if (!currentTable) return;

    onUpdateTable(currentTable.id, {
      columns: currentTable.columns.map(col =>
        col.id === columnId ? { ...col, ...updates } : col
      )
    });
  };

  const handleDeleteColumn = (columnId) => {
    if (!currentTable) return;

    if (currentTable.columns.length === 1) {
      toast.error('Cannot delete the last column');
      return;
    }

    onUpdateTable(currentTable.id, {
      columns: currentTable.columns.filter(col => col.id !== columnId)
    });
    toast.success('Column deleted');
  };

  const handleSaveTableName = () => {
    if (editingTableName && currentTable) {
      onUpdateTable(currentTable.id, { name: editingTableName });
      setEditingTableName(null);
      toast.success('Table name updated');
    }
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">📝 How to Design Tables</h3>
        <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <div>1. <strong>Add a Table:</strong> Click the "+" button to create a new table</div>
          <div>2. <strong>Name Your Table:</strong> Click "Rename" to give it a meaningful name (e.g., "Users", "Orders")</div>
          <div>3. <strong>Add Columns:</strong> Click "Add Column" and set the column name, data type, and constraints</div>
          <div>4. <strong>Set Primary Key:</strong> Check "Primary Key" for the unique identifier column (usually "id")</div>
          <div>5. <strong>Create Relationships:</strong> Go to "Relationships" tab or use "Visual Canvas" to connect tables</div>
        </div>
      </Card>

    <div className="grid grid-cols-12 gap-4">
      {/* Tables List */}
      <div className="col-span-3">
        <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Tables</h3>
            <Button
              size="sm"
              onClick={onAddTable}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
              title="Add a new table"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {tables.map(table => (
              <div
                key={table.id}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedTable === table.id
                    ? 'bg-purple-100 dark:bg-purple-600/30 border-2 border-purple-500 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent hover:border-purple-300 dark:hover:border-slate-700'
                }`}
                onClick={() => onSelectTable(table.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-900 dark:text-slate-200 font-medium">{table.name}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {table.columns.length} column{table.columns.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTable(table.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {tables.length === 0 && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                <div className="mb-2">No tables yet</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">Click the + button above to create your first table</div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Column Editor */}
      <div className="col-span-9">
        {currentTable ? (
          <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
            {/* Table Name Editor */}
            <div className="mb-6">
              <Label className="text-slate-700 dark:text-slate-300 mb-2">
                Table Name
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">Give your table a meaningful name (e.g., "Users", "Products", "Orders")</span>
              </Label>
              <div className="flex items-center gap-2">
                {editingTableName !== null ? (
                  <>
                    <Input
                      value={editingTableName}
                      onChange={(e) => setEditingTableName(e.target.value)}
                      className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                      placeholder="e.g., Users, Orders, Products"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTableName();
                        if (e.key === 'Escape') setEditingTableName(null);
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveTableName}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTableName(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-200 flex-1">
                      {currentTable.name}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTableName(currentTable.name)}
                      className="border-slate-300 dark:border-slate-700"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Rename
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Columns Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Columns</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Define the fields (columns) for this table. Each column has a name, data type, and optional constraints.
                </p>
              </div>
              <Button
                onClick={handleAddColumn}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </Button>
            </div>

            {/* Columns List */}
            <div className="space-y-3">
              {currentTable.columns.map(column => (
                <Card
                  key={column.id}
                  className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                >
                  <div className="grid grid-cols-12 gap-4 items-start">
                    {/* Column Name */}
                    <div className="col-span-3">
                      <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Column Name
                        <span className="text-xs text-slate-500 dark:text-slate-500 ml-1">(e.g., id, email, name)</span>
                      </Label>
                      <Input
                        value={column.name}
                        onChange={(e) =>
                          handleUpdateColumn(column.id, { name: e.target.value })
                        }
                        className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        placeholder="column_name"
                      />
                    </div>

                    {/* Data Type */}
                    <div className="col-span-3">
                      <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Data Type
                        <span className="text-xs text-slate-500 dark:text-slate-500 ml-1">(INTEGER, VARCHAR, DATE, etc.)</span>
                      </Label>
                      <Select
                        value={column.type}
                        onValueChange={(value) =>
                          handleUpdateColumn(column.id, { type: value })
                        }
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATA_TYPES.map(type => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Default Value */}
                    <div className="col-span-3">
                      <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Default Value
                        <span className="text-xs text-slate-500 dark:text-slate-500 ml-1">(optional)</span>
                      </Label>
                      <Input
                        value={column.defaultValue || ''}
                        onChange={(e) =>
                          handleUpdateColumn(column.id, { defaultValue: e.target.value })
                        }
                        className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        placeholder="NULL or specific value"
                      />
                    </div>

                    {/* Constraints */}
                    <div className="col-span-2">
                      <Label className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        Constraints
                        <span className="text-xs text-slate-500 dark:text-slate-500 ml-1 block mt-1">Rules for this column</span>
                      </Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`pk-${column.id}`}
                            checked={column.primaryKey}
                            onCheckedChange={(checked) =>
                              handleUpdateColumn(column.id, { primaryKey: checked })
                            }
                          />
                          <Label
                            htmlFor={`pk-${column.id}`}
                            className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                            title="Unique identifier for each row (usually 'id')"
                          >
                            Primary Key 🔑
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`null-${column.id}`}
                            checked={!column.nullable}
                            onCheckedChange={(checked) =>
                              handleUpdateColumn(column.id, { nullable: !checked })
                            }
                          />
                          <Label
                            htmlFor={`null-${column.id}`}
                            className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                            title="Column cannot be empty"
                          >
                            NOT NULL
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`unique-${column.id}`}
                            checked={column.unique}
                            onCheckedChange={(checked) =>
                              handleUpdateColumn(column.id, { unique: checked })
                            }
                          />
                          <Label
                            htmlFor={`unique-${column.id}`}
                            className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                            title="Each value must be unique"
                          >
                            Unique
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`auto-${column.id}`}
                            checked={column.autoIncrement}
                            onCheckedChange={(checked) =>
                              handleUpdateColumn(column.id, { autoIncrement: checked })
                            }
                          />
                          <Label
                            htmlFor={`auto-${column.id}`}
                            className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                            title="Automatically increases (1, 2, 3, ...)"
                          >
                            Auto Increment
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <div className="col-span-1 flex items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={() => handleDeleteColumn(column.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {currentTable.columns.length === 0 && (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/30 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                  <div className="text-slate-600 dark:text-slate-400 text-sm mb-2">No columns yet</div>
                  <div className="text-slate-500 dark:text-slate-500 text-xs mb-4">
                    Add columns to define the structure of your table
                  </div>
                  <Button
                    onClick={handleAddColumn}
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Column
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-12">
            <div className="text-center">
              <Database className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
              <div className="text-slate-700 dark:text-slate-400 text-lg font-semibold mb-2">No table selected</div>
              <div className="text-slate-600 dark:text-slate-500 text-sm mb-6">
                Select a table from the list on the left, or create a new one to get started
              </div>
              <Button
                onClick={onAddTable}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Table
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
    </div>
  );
}
