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
      <Card className="bg-slate-900/50 border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-200 mb-1">
              Relationships
            </h3>
            <p className="text-sm text-slate-400">
              Define foreign key relationships between tables
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Relationship
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-slate-200">
                  Create Relationship
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Define a foreign key relationship between two tables
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* From Table */}
                <div>
                  <Label className="text-slate-300 mb-2">From Table</Label>
                  <Select
                    value={newRelationship.fromTable}
                    onValueChange={(value) =>
                      setNewRelationship(prev => ({ ...prev, fromTable: value, fromColumn: '' }))
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map(table => (
                        <SelectItem key={table.id} value={table.id}>
                          {table.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* From Column */}
                <div>
                  <Label className="text-slate-300 mb-2">From Column</Label>
                  <Select
                    value={newRelationship.fromColumn}
                    onValueChange={(value) =>
                      setNewRelationship(prev => ({ ...prev, fromColumn: value }))
                    }
                    disabled={!newRelationship.fromTable}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {fromTableColumns.map(column => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.name} ({column.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Relationship Type */}
                <div>
                  <Label className="text-slate-300 mb-2">Relationship Type</Label>
                  <Select
                    value={newRelationship.type}
                    onValueChange={(value) =>
                      setNewRelationship(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* To Table */}
                <div>
                  <Label className="text-slate-300 mb-2">To Table</Label>
                  <Select
                    value={newRelationship.toTable}
                    onValueChange={(value) =>
                      setNewRelationship(prev => ({ ...prev, toTable: value, toColumn: '' }))
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables
                        .filter(t => t.id !== newRelationship.fromTable)
                        .map(table => (
                          <SelectItem key={table.id} value={table.id}>
                            {table.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* To Column */}
                <div>
                  <Label className="text-slate-300 mb-2">To Column</Label>
                  <Select
                    value={newRelationship.toColumn}
                    onValueChange={(value) =>
                      setNewRelationship(prev => ({ ...prev, toColumn: value }))
                    }
                    disabled={!newRelationship.toTable}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {toTableColumns.map(column => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.name} ({column.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          <div className="space-y-3">
            {relationships.map(rel => (
              <Card
                key={rel.id}
                className="bg-slate-800/50 border-slate-700 p-4"
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
          <div className="text-center py-12">
            <Link2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <div className="text-slate-500 text-lg mb-2">No relationships yet</div>
            <div className="text-slate-600 text-sm mb-4">
              Create relationships to define foreign keys between tables
            </div>
          </div>
        )}
      </Card>

      {/* Information Card */}
      <Card className="bg-slate-900/50 border-slate-800 p-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">
          Relationship Types
        </h4>
        <div className="space-y-2 text-xs text-slate-400">
          <div>
            <span className="text-purple-400 font-mono">One to One (1:1)</span> -
            Each record in Table A relates to exactly one record in Table B
          </div>
          <div>
            <span className="text-purple-400 font-mono">One to Many (1:N)</span> -
            Each record in Table A can relate to multiple records in Table B
          </div>
          <div>
            <span className="text-purple-400 font-mono">Many to One (N:1)</span> -
            Multiple records in Table A relate to one record in Table B
          </div>
          <div>
            <span className="text-purple-400 font-mono">Many to Many (N:M)</span> -
            Records in both tables can have multiple relationships (requires junction table)
          </div>
        </div>
      </Card>
    </div>
  );
}
