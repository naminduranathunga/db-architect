import React, { useState, useEffect } from 'react';
import { Table, Column, TABLE_COLORS, SqlDialect, ThemeMode } from '../types/database';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  FileText,
  Key,
  ShieldCheck,
  Link2,
} from 'lucide-react';

interface TableCardProps {
  table: Table;
  dialect: SqlDialect;
  theme: ThemeMode;
  isSelected: boolean;
  selectedColumnId: string | null;
  zoom: number;
  onSelect: () => void;
  onSelectColumn: (col: Column) => void;
  onUpdate: (updated: Table) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStartConnecting: (tableId: string, columnId: string, startX: number, startY: number) => void;
  onEndConnecting: (tableId: string, columnId: string) => void;
  isConnecting: boolean;
  connectingSourceColId: string | null;
  onDuplicateColumn: (col: Column) => void;
  onStartDrag: (e: React.MouseEvent, tableId: string) => void;
  onColumnReorder: (tableId: string, fromIndex: number, toIndex: number) => void;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  dialect,
  theme,
  isSelected,
  selectedColumnId,
  zoom,
  onSelect,
  onSelectColumn,
  onUpdate,
  onDelete,
  onDuplicate,
  onStartConnecting,
  onEndConnecting,
  isConnecting,
  connectingSourceColId,
  onDuplicateColumn,
  onStartDrag,
  onColumnReorder,
}) => {
  const isDark = theme === 'dark';
  const [isEditingName, setIsEditingName] = useState(false);
  const [tableNameInput, setTableNameInput] = useState(table.name);
  const [dragOverColIndex, setDragOverColIndex] = useState<number | null>(null);

  useEffect(() => {
    setTableNameInput(table.name);
  }, [table.name]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, select')) return;

    e.preventDefault();
    e.stopPropagation();
    onSelect();
    onStartDrag(e, table.id);
  };

  const handleSaveName = () => {
    setIsEditingName(false);
    const cleaned = tableNameInput.trim().replace(/\s+/g, '_') || table.name;
    onUpdate({ ...table, name: cleaned });
  };

  const handleQuickAddColumn = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultType = dialect === 'pgsql' ? 'VARCHAR(255)' : 'VARCHAR(255)';
    const newCol: Column = {
      id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `col_${table.columns.length + 1}`,
      type: defaultType,
      isPrimaryKey: false,
      isForeignKey: false,
      isUnique: false,
      isNullable: true,
      isAutoIncrement: false,
    };
    onUpdate({
      ...table,
      columns: [...table.columns, newCol],
    });
    onSelectColumn(newCol);
  };

  const handleDeleteColumn = (e: React.MouseEvent, colId: string) => {
    e.stopPropagation();
    onUpdate({
      ...table,
      columns: table.columns.filter((c) => c.id !== colId),
    });
  };

  const currentColor = TABLE_COLORS.find((c) => c.bg === table.color) || TABLE_COLORS[0];

  return (
    <div
      id={`table-card-${table.id}`}
      data-table-card="true"
      data-table-id={table.id}
      style={{
        transform: `translate(${table.x}px, ${table.y}px)`,
        position: 'absolute',
        width: '260px',
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`rounded-lg shadow-lg border transition-shadow select-none group/card ${
        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
      } ${
        isSelected
          ? 'border-sky-500 ring-2 ring-sky-500/40 shadow-sky-500/20'
          : isDark
          ? 'hover:border-slate-600'
          : 'hover:border-slate-400'
      }`}
    >
      {/* Table Header */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className="px-3 py-2 rounded-t-lg cursor-grab active:cursor-grabbing flex items-center justify-between text-white relative transition-colors shadow-xs"
        style={{ backgroundColor: table.color || currentColor.bg }}
      >
        <div className="flex items-center gap-1.5 min-w-0 grow">
          <GripVertical size={13} className="opacity-70 shrink-0 pointer-events-none" />
          {isEditingName ? (
            <input
              type="text"
              autoFocus
              value={tableNameInput}
              onChange={(e) => setTableNameInput(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setTableNameInput(table.name);
                  setIsEditingName(false);
                }
              }}
              className="bg-black/30 border border-white/30 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-white w-full focus:outline-none"
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditingName(true)}
              className="font-bold text-xs font-mono tracking-tight truncate cursor-text"
              title="Double click to rename, or drag header to move"
            >
              {table.name}
            </span>
          )}
        </div>

        {/* Header Tools */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover/card:opacity-100 transition-opacity">
          {table.notes && (
            <span className="p-1 text-amber-200" title="Table has notes">
              <FileText size={12} />
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 rounded hover:bg-black/20 text-white transition"
            title="Duplicate table (Ctrl+D)"
          >
            <Copy size={12} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded hover:bg-rose-500/30 text-rose-100 hover:text-white transition"
            title="Delete table"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Columns List */}
      <div className="p-1 space-y-0.5">
        {table.columns.map((col, index) => {
          const isSelectedCol = selectedColumnId === col.id;
          const isSourceCol = connectingSourceColId === col.id;

          return (
            <div
              key={col.id}
              id={`col-row-${table.id}-${col.id}`}
              data-col-row="true"
              data-table-id={table.id}
              data-col-id={col.id}
              draggable
              onDragStart={(e) => {
                // If dragging initiated on relationship connector or button, abort HTML5 row drag
                if ((e.target as HTMLElement).closest('[data-anchor-port="true"], button')) {
                  e.preventDefault();
                  return;
                }
                e.stopPropagation();
                e.dataTransfer.setData('text/plain', `${table.id}:${index}`);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isConnecting) {
                  onEndConnecting(table.id, col.id);
                } else {
                  onSelectColumn(col);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColIndex(index);
              }}
              onDragLeave={() => {
                setDragOverColIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColIndex(null);
                const data = e.dataTransfer.getData('text/plain');
                if (data) {
                  const [fromTblId, fromIdxStr] = data.split(':');
                  const fromIdx = parseInt(fromIdxStr, 10);
                  if (fromTblId === table.id && !isNaN(fromIdx) && fromIdx !== index) {
                    onColumnReorder(table.id, fromIdx, index);
                  }
                }
              }}
              className={`relative flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-grab active:cursor-grabbing group/row transition ${
                dragOverColIndex === index ? 'border-t-2 border-sky-400' : ''
              } ${
                isSelectedCol
                  ? isDark
                    ? 'bg-sky-500/25 text-sky-200 ring-2 ring-sky-400 font-semibold shadow-xs'
                    : 'bg-sky-100 text-sky-950 ring-2 ring-sky-500 font-semibold shadow-xs'
                  : isDark
                  ? 'hover:bg-slate-800 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              {/* Left Connector Anchor Port */}
              <div
                id={`anchor-left-${table.id}-${col.id}`}
                data-anchor-port="true"
                data-table-id={table.id}
                data-col-id={col.id}
                draggable={false}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onStartConnecting(table.id, col.id, rect.left + rect.width / 2, rect.top + rect.height / 2);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isConnecting) {
                    onEndConnecting(table.id, col.id);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onStartConnecting(table.id, col.id, rect.left + rect.width / 2, rect.top + rect.height / 2);
                  }
                }}
                className={`absolute -left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 cursor-crosshair z-30 flex items-center justify-center transition-all ${
                  isSourceCol
                    ? 'bg-amber-400 border-white scale-125 ring-2 ring-amber-300 animate-pulse'
                    : isConnecting
                    ? 'bg-sky-500 border-white hover:scale-135 ring-2 ring-sky-300'
                    : isDark
                    ? 'bg-slate-700 border-slate-400 group-hover/row:border-sky-400 group-hover/row:bg-sky-500 hover:scale-125'
                    : 'bg-slate-100 border-slate-400 group-hover/row:border-sky-500 group-hover/row:bg-sky-500 hover:scale-125'
                }`}
                title="Click or drag to connect relation"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white pointer-events-none" />
              </div>

              {/* Column Content: Grip, Name & Badges (Draggable from anywhere) */}
              <div className="flex items-center gap-1.5 min-w-0 grow mr-1 pointer-events-none">
                <GripVertical
                  size={11}
                  className="opacity-40 group-hover/row:opacity-100 shrink-0 pointer-events-none"
                />

                <span
                  className="font-mono font-medium truncate pointer-events-none"
                  title={col.comment || col.name}
                >
                  {col.name}
                </span>

                {/* Constraint Badges */}
                <div className="flex items-center gap-0.5 shrink-0 pointer-events-none">
                  {col.isPrimaryKey && (
                    <span
                      className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center gap-0.5"
                      title="Primary Key"
                    >
                      <Key size={9} />
                      PK
                    </span>
                  )}
                  {col.isForeignKey && (
                    <span
                      className="px-1 py-0.2 rounded text-[9px] font-bold bg-sky-500/20 text-sky-500 border border-sky-500/40 flex items-center gap-0.5"
                      title="Foreign Key"
                    >
                      <Link2 size={9} />
                      FK
                    </span>
                  )}
                  {col.isUnique && !col.isPrimaryKey && (
                    <span
                      className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-500 border border-purple-500/40 flex items-center gap-0.5"
                      title="Unique"
                    >
                      <ShieldCheck size={9} />
                      UQ
                    </span>
                  )}
                  {!col.isNullable && !col.isPrimaryKey && (
                    <span
                      className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/40"
                      title="Not Null"
                    >
                      NN
                    </span>
                  )}
                </div>
              </div>

              {/* Column Type & Quick Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={`text-[10px] font-mono uppercase max-w-[75px] truncate pointer-events-none ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                  title={col.type}
                >
                  {col.type}
                </span>

                <div className="hidden group-hover/row:flex items-center gap-0.5 pl-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateColumn(col);
                    }}
                    className={`p-0.5 rounded ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-600'}`}
                    title="Duplicate column next to this (Ctrl+D)"
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteColumn(e, col.id)}
                    className="p-0.5 text-rose-500 hover:bg-rose-500/20 rounded"
                    title="Delete column"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              {/* Right Connector Anchor Port */}
              <div
                id={`anchor-right-${table.id}-${col.id}`}
                data-anchor-port="true"
                data-table-id={table.id}
                data-col-id={col.id}
                draggable={false}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onStartConnecting(table.id, col.id, rect.left + rect.width / 2, rect.top + rect.height / 2);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isConnecting) {
                    onEndConnecting(table.id, col.id);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onStartConnecting(table.id, col.id, rect.left + rect.width / 2, rect.top + rect.height / 2);
                  }
                }}
                className={`absolute -right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 cursor-crosshair z-30 flex items-center justify-center transition-all ${
                  isSourceCol
                    ? 'bg-amber-400 border-white scale-125 ring-2 ring-amber-300 animate-pulse'
                    : isConnecting
                    ? 'bg-sky-500 border-white hover:scale-135 ring-2 ring-sky-300'
                    : isDark
                    ? 'bg-slate-700 border-slate-400 group-hover/row:border-sky-400 group-hover/row:bg-sky-500 hover:scale-125'
                    : 'bg-slate-100 border-slate-400 group-hover/row:border-sky-500 group-hover/row:bg-sky-500 hover:scale-125'
                }`}
                title="Click or drag to connect relation"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white pointer-events-none" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add Column Footer */}
      <div className={`p-1.5 pt-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          type="button"
          onClick={handleQuickAddColumn}
          className={`w-full flex items-center justify-center gap-1 py-1 px-2 rounded border border-dashed text-[11px] font-medium transition ${
            isDark
              ? 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-800/40'
              : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Plus size={12} />
          <span>Add Column</span>
        </button>
      </div>

      {/* Table Notes preview pill if exists */}
      {table.notes && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`px-2.5 py-1 border-t rounded-b-lg text-[10px] truncate cursor-pointer flex items-center gap-1 ${
            isDark ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
          title={table.notes}
        >
          <span className="text-amber-500">📝</span>
          <span className="truncate">{table.notes}</span>
        </div>
      )}
    </div>
  );
};
