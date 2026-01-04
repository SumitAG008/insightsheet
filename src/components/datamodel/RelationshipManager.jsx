import React, { useState } from 'react';
import { Plus, Trash2, Link2, ArrowRight } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const RELATIONSHIP_TYPES = [
  { value: 'one-to-one', label: 'One to One (1:1)', icon: '1:1' },
  { value: 'one-to-many', label: 'One to Many (1:N)', icon: '1:N' },
  { value: 'many-to-one', label: 'Many to One (N:1)', icon: 'N:1' },
  { value: 'many-to-many', label: 'Many to Many (N:M)', icon: 'N:M' }
];

export default function RelationshipManager({
  tables,
  relationships,
  onAddRelationship,
  onDeleteRelationship
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRelationship, setNewRelationship] = useState({
    fromTable: '',
    fromColumn: '',
    toTable: '',
    toColumn: '',
    type: 'many-to-one'
  });

  const handleCreateRelationship = () => {
    if (!newRelationship.fromTable || !newRelationship.fromColumn ||
        !newRelationship.toTable || !newRelationship.toColumn) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newRelationship.fromTable === newRelationship.toTable) {
      toast.error('Cannot create relationship to the same table');
      return;
    }

    onAddRelationship(newRelationship);
    setIsDialogOpen(false);
    setNewRelationship({
      fromTable: '',
      fromColumn: '',
      toTable: '',
      toColumn: '',
      type: 'many-to-one'
    });
  };

  const getTableName = (tableId) => {
    return tables.find(t => t.id === tableId)?.name || 'Unknown';
  };

  const getColumnName = (tableId, columnId) => {
    const table = tables.find(t => t.id === tableId);
    return table?.columns.find(c => c.id === columnId)?.name || 'Unknown';
  };

  const getRelationshipTypeLabel = (type) => {
    return RELATIONSHIP_TYPES.find(t => t.value === type)?.label || type;
  };

  const fromTableColumns = tables.find(t => t.id === newRelationship.fromTable)?.columns || [];
  const toTableColumns = tables.find(t => t.id === newRelationship.toTable)?.columns || [];

  return (
    <div className="space-y-4">
      {/* Instructions Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          How to Create Relationships
        </h3>
        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-300">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold flex-shrink-0 mt-0.5">1</div>
            <div>
              <div className="font-semibold mb-1">Method 1: Visual Canvas (Easiest)</div>
              <div>Go to "Visual Canvas" tab → Click a column in one table → Click a column in another table → Relationship created!</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold flex-shrink-0 mt-0.5">2</div>
            <div>
              <div className="font-semibold mb-1">Method 2: Relationship Manager (This Tab)</div>
              <div>Click "Add Relationship" → Select "From Table" and "From Column" → Select "To Table" and "To Column" → Choose relationship type → Create!</div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200 mb-1">
              Relationships
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Define foreign key relationships between tables. A relationship connects a column in one table to a column in another table.
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Relationship
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-slate-200">
                  Create Relationship
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400">
                  Connect two tables by linking a column from one table to a column in another table. This creates a foreign key relationship.
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs">
                    <strong>Example:</strong> Connect "Orders.user_id" to "Users.id" to link each order to a user.
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* From Table */}
                <div>
                  <Label className="text-slate-700 dark:text-slate-300 mb-2">
                    From Table (Source)
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">The table containing the foreign key</span>
                  </Label>
                  <Select
                    value={newRelationship.fromTable}
                    onValueChange={(value) =>
                      setNewRelationship(prev => ({ ...prev, fromTable: value, fromColumn: '' }))
                    }
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                      <SelectValue placeholder="Select source table" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map(table => (
                        <SelectItem key={table.id} value={table.id}>
                          {table.name} ({table.columns.length} columns)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* From Column */}
                <div>
                  <Label className="text-slate-700 dark:text-slate-300 mb-2">
                    From Column (Foreign Key)
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">The column that references another table</span>
                  </Label>
                  <Select
                    value={newRelationship.fromColumn}
                    onValueChange={(value) =>
                      setNewRelationship(prev => ({ ...prev, fromColumn: value }))
                    }
                    disabled={!newRelationship.fromTable}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                      <SelectValue placeholder={newRelationship.fromTable ? "Select foreign key column" : "Select table first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {fromTableColumns.map(column => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.name} ({column.type}) {column.primaryKey && '🔑'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!newRelationship.fromTable && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please select a table first</p>
                  )}
                </div>

                {/* Relationship Type */}
                <div>
                  <Label className="text-slate-700 dark:text-slate-300 mb-2">
                    Relationship Type
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">How records relate to each other</span>
                  </Label>
                  <Select
                    value={newRelationship.type}
                    onValueChange={(value) =>
                      setNewRelationship(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex flex-col">
                            <span>{type.label}</span>
                            <span className="text-xs text-slate-500">
                              {type.value === 'one-to-one' && '1 user → 1 profile'}
                              {type.value === 'one-to-many' && '1 user → many orders'}
                              {type.value === 'many-to-one' && 'many orders → 1 user'}
                              {type.value === 'many-to-many' && 'many students ↔ many courses'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* To Table */}
                <div>
                  <Label className="text-slate-700 dark:text-slate-300 mb-2">
                    To Table (Target)
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">The table being referenced (usually has primary key)</span>
                  </Label>
                  <Select
                    value={newRelationship.toTable}
                    onValueChange={(value) =>
                      setNewRelationship(prev => ({ ...prev, toTable: value, toColumn: '' }))
                    }
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                      <SelectValue placeholder="Select target table" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables
                        .filter(t => t.id !== newRelationship.fromTable)
                        .map(table => (
                          <SelectItem key={table.id} value={table.id}>
                            {table.name} ({table.columns.length} columns)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* To Column */}
                <div>
                  <Label className="text-slate-700 dark:text-slate-300 mb-2">
                    To Column (Primary Key)
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">The column being referenced (usually a primary key)</span>
                  </Label>
                  <Select
                    value={newRelationship.toColumn}
                    onValueChange={(value) =>
                      setNewRelationship(prev => ({ ...prev, toColumn: value }))
                    }
                    disabled={!newRelationship.toTable}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                      <SelectValue placeholder={newRelationship.toTable ? "Select primary key column" : "Select table first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {toTableColumns.map(column => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.name} ({column.type}) {column.primaryKey && '🔑 Primary Key'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!newRelationship.toTable && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please select a table first</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRelationship}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  Create Relationship
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Relationships List */}
        {relationships.length > 0 ? (
          <div className="space-y-3 mt-6">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-3">
              Existing Relationships ({relationships.length})
            </h4>
            {relationships.map(rel => (
              <Card
                key={rel.id}
                className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* From */}
                    <div className="flex-1">
                      <div className="text-xs text-slate-400 mb-1">From</div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-purple-400">
                          {getTableName(rel.fromTable)}
                        </div>
                        <div className="text-xs text-slate-500">.</div>
                        <div className="text-sm text-slate-300">
                          {getColumnName(rel.fromTable, rel.fromColumn)}
                        </div>
                      </div>
                    </div>

                    {/* Relationship Type */}
                    <div className="flex flex-col items-center px-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {RELATIONSHIP_TYPES.find(t => t.value === rel.type)?.icon || rel.type}
                      </div>
                    </div>

                    {/* To */}
                    <div className="flex-1">
                      <div className="text-xs text-slate-400 mb-1">To</div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-pink-400">
                          {getTableName(rel.toTable)}
                        </div>
                        <div className="text-xs text-slate-500">.</div>
                        <div className="text-sm text-slate-300">
                          {getColumnName(rel.toTable, rel.toColumn)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={() => onDeleteRelationship(rel.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Type Badge */}
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <div className="text-xs text-slate-400">
                    Type: <span className="text-slate-300">{getRelationshipTypeLabel(rel.type)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
            <Link2 className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <div className="text-slate-700 dark:text-slate-400 text-lg font-semibold mb-2">No relationships yet</div>
            <div className="text-slate-600 dark:text-slate-500 text-sm mb-4 max-w-md mx-auto">
              Create relationships to link tables together. For example, connect "Orders.user_id" to "Users.id" to link orders to users.
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-600">
              💡 Tip: Use the "Visual Canvas" tab for the easiest way to create relationships - just click two columns!
            </div>
          </div>
        )}
      </Card>

      {/* Information Card */}
      <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Understanding Relationship Types
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="font-semibold text-purple-600 dark:text-purple-400 mb-2">One to One (1:1)</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Each record in Table A relates to exactly one record in Table B.
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">Example: User → UserProfile (1 user has 1 profile)</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="font-semibold text-purple-600 dark:text-purple-400 mb-2">One to Many (1:N)</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Each record in Table A can relate to multiple records in Table B.
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">Example: User → Orders (1 user has many orders)</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="font-semibold text-purple-600 dark:text-purple-400 mb-2">Many to One (N:1)</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Multiple records in Table A relate to one record in Table B.
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">Example: Orders → User (many orders belong to 1 user)</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="font-semibold text-purple-600 dark:text-purple-400 mb-2">Many to Many (N:M)</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Records in both tables can have multiple relationships.
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">Example: Students ↔ Courses (requires junction table)</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
