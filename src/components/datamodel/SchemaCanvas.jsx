import { useRef, useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Key, Link2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function SchemaCanvas({
  schema,
  selectedTable,
  onSelectTable,
  onUpdateTable,
  onDeleteTable,
  onAddRelationship
}) {
  const canvasRef = useRef(null);
  const [draggingTable, setDraggingTable] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const handleTableMouseDown = (e, table) => {
    if (e.button !== 0) return; // Only left click

    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDraggingTable(table.id);
    onSelectTable(table.id);
  };

  const handleMouseMove = useCallback((e) => {
    if (!draggingTable) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = (e.clientX - canvasRect.left - dragOffset.x) / zoom;
    const newY = (e.clientY - canvasRect.top - dragOffset.y) / zoom;

    onUpdateTable(draggingTable, { x: newX, y: newY });
  }, [draggingTable, dragOffset, zoom, onUpdateTable]);

  const handleMouseUp = useCallback(() => {
    setDraggingTable(null);
  }, []);

  const handleConnectColumn = (table, column) => {
    if (!connectingFrom) {
      setConnectingFrom({ table, column });
    } else {
      if (connectingFrom.table !== table.id) {
        onAddRelationship({
          fromTable: connectingFrom.table,
          fromColumn: connectingFrom.column,
          toTable: table.id,
          toColumn: column.id,
          type: 'many-to-one'
        });
      }
      setConnectingFrom(null);
    }
  };

  const renderRelationships = () => {
    return schema.relationships.map(rel => {
      const fromTable = schema.tables.find(t => t.id === rel.fromTable);
      const toTable = schema.tables.find(t => t.id === rel.toTable);

      if (!fromTable || !toTable) return null;

      const fromX = fromTable.x + 150;
      const fromY = fromTable.y + 60;
      const toX = toTable.x;
      const toY = toTable.y + 60;

      const midX = (fromX + toX) / 2;

      return (
        <g key={rel.id}>
          <path
            d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
            stroke="#a855f7"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
          {/* Arrow head */}
          <polygon
            points={`${toX},${toY} ${toX - 8},${toY - 4} ${toX - 8},${toY + 4}`}
            fill="#a855f7"
            opacity="0.6"
          />
        </g>
      );
    });
  };

  useEffect(() => {
    if (draggingTable) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingTable, handleMouseMove, handleMouseUp]);

  return (
    <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {connectingFrom ? (
            <div className="flex items-center gap-2">
              <span className="text-purple-600 dark:text-purple-400 font-semibold">Creating Relationship:</span>
              <span>Click on a column in another table to connect</span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="font-semibold">💡 Tips:</span>
                <span>Drag tables to arrange • Click a column, then click another column in a different table to create relationship</span>
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
          >
            Zoom -
          </Button>
          <span className="text-sm text-slate-400 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
          >
            Zoom +
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          >
            Reset View
          </Button>
        </div>
      </div>

      <div
        ref={canvasRef}
        className="relative bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-slate-800 overflow-auto"
        style={{
          height: '600px',
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        {/* SVG Layer for Relationships */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            width: '100%',
            height: '100%',
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`
          }}
        >
          {renderRelationships()}
        </svg>

        {/* Tables Layer */}
        <div
          className="relative"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: '0 0',
            minWidth: '1200px',
            minHeight: '800px'
          }}
        >
          {schema.tables.map(table => (
            <div
              key={table.id}
              className={`absolute bg-white dark:bg-slate-800 border-2 rounded-lg shadow-lg cursor-move transition-all ${
                selectedTable === table.id
                  ? 'border-purple-500 shadow-purple-500/50 ring-2 ring-purple-500/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-purple-400 dark:hover:border-slate-600'
              }`}
              style={{
                left: `${table.x}px`,
                top: `${table.y}px`,
                width: '300px',
                userSelect: 'none'
              }}
              onMouseDown={(e) => handleTableMouseDown(e, table)}
            >
              {/* Table Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2 rounded-t-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-white font-semibold">{table.name}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTable(table.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {/* Columns */}
              <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto bg-slate-50 dark:bg-slate-900/30">
                {table.columns.map(column => (
                  <div
                    key={column.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-purple-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group ${
                      connectingFrom?.column === column.id
                        ? 'bg-purple-200 dark:bg-purple-600/30 border-2 border-purple-500'
                        : 'border border-transparent hover:border-purple-300 dark:hover:border-purple-600'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnectColumn(table, column);
                    }}
                    title={connectingFrom ? `Click to connect from ${schema.tables.find(t => t.id === connectingFrom.table)?.name}.${schema.tables.find(t => t.id === connectingFrom.table)?.columns.find(c => c.id === connectingFrom.column)?.name}` : `Click to start relationship from ${column.name}`}
                  >
                    {column.primaryKey && (
                      <Key className="w-3 h-3 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                    )}
                    <span className="text-slate-900 dark:text-slate-200 flex-1 truncate font-medium">
                      {column.name}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                      {column.type}
                    </span>
                    {!column.nullable && (
                      <span className="text-red-500 dark:text-red-400 text-xs font-bold" title="NOT NULL">*</span>
                    )}
                    {connectingFrom && connectingFrom.table !== table.id && (
                      <span className="text-xs text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to connect
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-3 py-1.5 bg-slate-900/50 text-xs text-slate-400 border-t border-slate-700">
                {table.columns.length} columns
              </div>
            </div>
          ))}

          {schema.tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8 bg-white dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 max-w-lg shadow-lg">
                <Database className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                <div className="text-slate-900 dark:text-slate-200 text-2xl font-bold mb-2">Start Building Your Database Schema</div>
                <div className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                  Create tables, define relationships, and generate SQL code
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-left space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm flex-shrink-0 mt-0.5">1</div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-200 mb-1">Add Your First Table</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Click "Add Table" button at the top, or go to "Table Designer" tab</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm flex-shrink-0 mt-0.5">2</div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-200 mb-1">Design Your Tables</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Add columns, set data types, and define primary keys in the "Table Designer" tab</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm flex-shrink-0 mt-0.5">3</div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-200 mb-1">Create Relationships</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Click a column in one table, then click a column in another table to connect them. Or use the "Relationships" tab.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-sm flex-shrink-0 mt-0.5">4</div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-200 mb-1">Generate SQL</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Go to "SQL Generator" tab to create database creation scripts</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {connectingFrom && (
        <div className="mt-4 p-3 bg-purple-900/30 border border-purple-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-300">
              Creating relationship from: <span className="text-purple-400 font-semibold">
                {schema.tables.find(t => t.id === connectingFrom.table)?.name}.
                {schema.tables
                  .find(t => t.id === connectingFrom.table)
                  ?.columns.find(c => c.id === connectingFrom.column)?.name}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConnectingFrom(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
