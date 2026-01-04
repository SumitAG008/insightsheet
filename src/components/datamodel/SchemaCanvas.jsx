import React, { useRef, useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Key, Link2 } from 'lucide-react';
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

  const handleMouseMove = (e) => {
    if (!draggingTable) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = (e.clientX - canvasRect.left - dragOffset.x) / zoom;
    const newY = (e.clientY - canvasRect.top - dragOffset.y) / zoom;

    onUpdateTable(draggingTable, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDraggingTable(null);
  };

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
  }, [draggingTable, dragOffset, zoom]);

  return (
    <Card className="bg-slate-900/50 border-slate-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-400">
          {connectingFrom
            ? 'Click on a column in another table to create relationship'
            : 'Drag tables to arrange • Click columns to create relationships'}
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
        className="relative bg-slate-950/50 rounded-lg border border-slate-800 overflow-auto"
        style={{
          height: '600px',
          backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
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
              className={`absolute bg-slate-800 border-2 rounded-lg shadow-lg cursor-move transition-all ${
                selectedTable === table.id
                  ? 'border-purple-500 shadow-purple-500/50'
                  : 'border-slate-700 hover:border-slate-600'
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
              <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                {table.columns.map(column => (
                  <div
                    key={column.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-700/50 cursor-pointer ${
                      connectingFrom?.column === column.id
                        ? 'bg-purple-600/30 border border-purple-500'
                        : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnectColumn(table, column);
                    }}
                  >
                    {column.primaryKey && (
                      <Key className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    )}
                    <span className="text-slate-200 flex-1 truncate">
                      {column.name}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {column.type}
                    </span>
                    {!column.nullable && (
                      <span className="text-red-400 text-xs">*</span>
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
              <div className="text-center p-8 bg-slate-800/50 rounded-lg border border-slate-700 max-w-md">
                <div className="text-slate-300 text-xl font-semibold mb-3">No tables yet</div>
                <div className="text-slate-400 text-sm mb-4">
                  Get started by adding your first table or importing a schema
                </div>
                <div className="flex flex-col gap-2 text-xs text-slate-500">
                  <div>• Click "Add Table" button above</div>
                  <div>• Or import JSON/XML data file</div>
                  <div>• Or use AI Assistant to generate schema</div>
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
