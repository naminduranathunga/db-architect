import React from 'react';
import {
  Worksheet,
  Table,
  Column,
  Relation,
  Cardinality,
  ReferentialAction,
  IndexType,
  TableIndex,
  CustomType,
  TABLE_COLORS,
  RELATION_COLORS,
  MYSQL_DATA_TYPES,
  PGSQL_DATA_TYPES,
  ThemeMode,
  LineRouting,
} from '../types/database';
import {
  X,
  Trash2,
  Copy,
  Key,
  ShieldCheck,
  Link2,
  FileText,
  CornerDownRight,
  Bookmark,
  Plus,
  GitBranch,
  Sliders,
  Database,
  ArrowRight,
  ListFilter,
  Check,
} from 'lucide-react';

export type SelectionTarget =
  | { type: 'column'; tableId: string; columnId: string }
  | { type: 'table'; tableId: string }
  | { type: 'relation'; relationId: string }
  | null;

interface PropertyBarProps {
  worksheet: Worksheet;
  selection: SelectionTarget;
  theme: ThemeMode;
  onClose: () => void;
  onUpdateWorksheet: (updater: Worksheet | ((prev: Worksheet) => Worksheet)) => void;
  onDeleteTable: (tableId: string) => void;
  onDuplicateTable: (tableId: string) => void;
  onDeleteColumn: (tableId: string, columnId: string) => void;
  onDuplicateColumn: (tableId: string, col: Column) => void;
  onDeleteRelation: (relationId: string) => void;
}

export const PropertyBar: React.FC<PropertyBarProps> = ({
  worksheet,
  selection,
  theme,
  onClose,
  onUpdateWorksheet,
  onDeleteTable,
  onDuplicateTable,
  onDeleteColumn,
  onDuplicateColumn,
  onDeleteRelation,
}) => {
  const isDark = theme === 'dark';
  // Combine built-in data types with custom defined types (e.g. pgsql ENUMs)
  const customTypeNames = worksheet.customTypes?.map((ct) => ct.name) || [];
  const baseTypeSuggestions = worksheet.dialect === 'pgsql' ? PGSQL_DATA_TYPES : MYSQL_DATA_TYPES;
  const typeSuggestions = [...customTypeNames, ...baseTypeSuggestions];

  // Selected item references
  let selectedTable: Table | null = null;
  let selectedColumn: Column | null = null;
  let selectedRelation: Relation | null = null;

  if (selection?.type === 'table') {
    selectedTable = worksheet.tables.find((t) => t.id === selection.tableId) || null;
  } else if (selection?.type === 'column') {
    selectedTable = worksheet.tables.find((t) => t.id === selection.tableId) || null;
    selectedColumn = selectedTable?.columns.find((c) => c.id === selection.columnId) || null;
  } else if (selection?.type === 'relation') {
    selectedRelation = worksheet.relations.find((r) => r.id === selection.relationId) || null;
  }

  // Custom Type Operations (for pgsql ENUMs)
  const handleAddCustomType = () => {
    const existing = worksheet.customTypes || [];
    const newTypeName = `custom_type_${existing.length + 1}`;
    const newType: CustomType = {
      id: `type_${Date.now()}`,
      name: newTypeName,
      kind: 'ENUM',
      values: ['value1', 'value2', 'value3'],
    };
    onUpdateWorksheet((prev) => ({
      ...prev,
      customTypes: [...(prev.customTypes || []), newType],
    }));
  };

  const handleUpdateCustomType = (typeId: string, updates: Partial<CustomType>) => {
    onUpdateWorksheet((prev) => ({
      ...prev,
      customTypes: (prev.customTypes || []).map((ct) =>
        ct.id === typeId ? { ...ct, ...updates } : ct
      ),
    }));
  };

  const handleDeleteCustomType = (typeId: string) => {
    onUpdateWorksheet((prev) => ({
      ...prev,
      customTypes: (prev.customTypes || []).filter((ct) => ct.id !== typeId),
    }));
  };

  // Update Column
  const handleUpdateColumn = (updates: Partial<Column>) => {
    if (!selectedTable || !selectedColumn) return;
    const colId = selectedColumn.id;
    const tableId = selectedTable.id;

    onUpdateWorksheet((prev) => ({
      ...prev,
      tables: prev.tables.map((t) =>
        t.id === tableId
          ? {
            ...t,
            columns: t.columns.map((c) => (c.id === colId ? { ...c, ...updates } : c)),
          }
          : t
      ),
    }));
  };

  // Update Table
  const handleUpdateTable = (updates: Partial<Table>) => {
    if (!selectedTable) return;
    const tableId = selectedTable.id;

    onUpdateWorksheet((prev) => ({
      ...prev,
      tables: prev.tables.map((t) => (t.id === tableId ? { ...t, ...updates } : t)),
    }));
  };

  // Update Relation
  const handleUpdateRelation = (updates: Partial<Relation>) => {
    if (!selectedRelation) return;
    const relId = selectedRelation.id;

    onUpdateWorksheet((prev) => ({
      ...prev,
      relations: prev.relations.map((r) => (r.id === relId ? { ...r, ...updates } : r)),
    }));
  };

  // Index operations for table
  const handleAddIndex = () => {
    if (!selectedTable) return;
    const firstCol = selectedTable.columns[0]?.name || 'id';
    const newIdx: TableIndex = {
      id: `idx_${Date.now()}`,
      name: `idx_${selectedTable.name}_${firstCol}`,
      type: 'INDEX',
      columns: [firstCol],
    };
    handleUpdateTable({
      indexes: [...selectedTable.indexes, newIdx],
    });
  };

  const handleUpdateIndex = (idxId: string, updates: Partial<TableIndex>) => {
    if (!selectedTable) return;
    handleUpdateTable({
      indexes: selectedTable.indexes.map((i) => (i.id === idxId ? { ...i, ...updates } : i)),
    });
  };

  const handleRemoveIndex = (idxId: string) => {
    if (!selectedTable) return;
    handleUpdateTable({
      indexes: selectedTable.indexes.filter((i) => i.id !== idxId),
    });
  };

  const bgClass = isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800';
  const subBgClass = isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200';
  const inputClass = isDark
    ? 'bg-slate-950 border-slate-700 text-white focus:border-sky-500'
    : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500';
  const labelClass = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <aside
      className={`w-80 md:w-88 border-l flex flex-col h-full shrink-0 select-none shadow-xl z-20 transition-colors ${bgClass}`}
    >
      {/* 1. COLUMN PROPERTIES */}
      {selection?.type === 'column' && selectedColumn && selectedTable && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-500">
                Column Properties
              </span>
              <h3 className="font-mono font-bold text-sm truncate">
                {selectedTable.name}.<span className="text-sky-500">{selectedColumn.name}</span>
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Close panel"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4 overflow-y-auto grow text-xs">
            {/* Column Name */}
            <div>
              <label className={`block font-semibold uppercase tracking-wider mb-1 ${labelClass}`}>
                Name
              </label>
              <input
                id="sidebar-column-name-input"
                type="text"
                value={selectedColumn.name}
                onChange={(e) => handleUpdateColumn({ name: e.target.value.replace(/\s+/g, '_') })}
                className={`w-full px-2.5 py-1.5 rounded-md border font-mono text-xs focus:outline-none ${inputClass}`}
              />
            </div>

            {/* Data Type */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`block font-semibold uppercase tracking-wider ${labelClass}`}>
                  Data Type ({worksheet.dialect.toUpperCase()})
                </label>
              </div>
              <input
                type="text"
                list="sidebar-data-types"
                value={selectedColumn.type}
                onChange={(e) => handleUpdateColumn({ type: e.target.value })}
                className={`w-full px-2.5 py-1.5 rounded-md border font-mono text-xs uppercase focus:outline-none ${inputClass}`}
              />
              <datalist id="sidebar-data-types">
                {typeSuggestions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>

              {/* Quick Type Pills */}
              <div className="flex flex-wrap gap-1 mt-2">
                {(worksheet.dialect === 'pgsql'
                  ? ['INTEGER', 'BIGSERIAL', 'VARCHAR(255)', 'DECIMAL', 'NUMERIC(10,2)', 'BOOLEAN', 'TIMESTAMPTZ', ...customTypeNames]
                  : ['INT', 'BIGINT', 'VARCHAR(255)', 'DECIMAL', 'DECIMAL(10,2)', 'BOOLEAN', 'DATETIME']
                ).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleUpdateColumn({ type: t })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition ${selectedColumn.type.toUpperCase() === t.toUpperCase()
                      ? 'bg-sky-500/20 border-sky-500 text-sky-400 font-bold'
                      : 'border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-400'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Constraints */}
            <div>
              <label className={`block font-semibold uppercase tracking-wider mb-2 ${labelClass}`}>
                Constraints & Keys
              </label>
              <div className="space-y-1.5">
                {/* Primary Key */}
                <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${subBgClass}`}>
                  <input
                    type="checkbox"
                    checked={selectedColumn.isPrimaryKey}
                    onChange={(e) =>
                      handleUpdateColumn({
                        isPrimaryKey: e.target.checked,
                        isNullable: e.target.checked ? false : selectedColumn.isNullable,
                        isUnique: e.target.checked ? true : selectedColumn.isUnique,
                      })
                    }
                    className="rounded text-amber-500 focus:ring-amber-500/20"
                  />
                  <div className="flex items-center gap-1.5 font-medium text-amber-500">
                    <Key size={13} />
                    <span>Primary Key (PK)</span>
                  </div>
                </label>

                {/* Foreign Key */}
                <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${subBgClass}`}>
                  <input
                    type="checkbox"
                    checked={selectedColumn.isForeignKey}
                    onChange={(e) => handleUpdateColumn({ isForeignKey: e.target.checked })}
                    className="rounded text-sky-500 focus:ring-sky-500/20"
                  />
                  <div className="flex items-center gap-1.5 font-medium text-sky-500">
                    <Link2 size={13} />
                    <span>Foreign Key (FK)</span>
                  </div>
                </label>

                {/* Unique */}
                <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${subBgClass}`}>
                  <input
                    type="checkbox"
                    checked={selectedColumn.isUnique}
                    onChange={(e) => handleUpdateColumn({ isUnique: e.target.checked })}
                    className="rounded text-purple-500 focus:ring-purple-500/20"
                  />
                  <div className="flex items-center gap-1.5 font-medium text-purple-500">
                    <ShieldCheck size={13} />
                    <span>Unique Constraint (UQ)</span>
                  </div>
                </label>

                {/* Nullable */}
                <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${subBgClass}`}>
                  <input
                    type="checkbox"
                    checked={selectedColumn.isNullable}
                    disabled={selectedColumn.isPrimaryKey}
                    onChange={(e) => handleUpdateColumn({ isNullable: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-emerald-500/20 disabled:opacity-40"
                  />
                  <span className="font-medium text-slate-600 dark:text-slate-200">
                    Nullable (Can be NULL)
                  </span>
                </label>

                {/* Auto Increment */}
                <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${subBgClass}`}>
                  <input
                    type="checkbox"
                    checked={selectedColumn.isAutoIncrement}
                    onChange={(e) => handleUpdateColumn({ isAutoIncrement: e.target.checked })}
                    className="rounded text-cyan-500 focus:ring-cyan-500/20"
                  />
                  <span className="font-medium text-cyan-500">
                    Auto Increment / Serial
                  </span>
                </label>
              </div>
            </div>

            {/* Default Value */}
            <div>
              <label className={`block font-semibold uppercase tracking-wider mb-1 ${labelClass}`}>
                Default Value
              </label>
              <input
                type="text"
                value={selectedColumn.defaultValue || ''}
                onChange={(e) => handleUpdateColumn({ defaultValue: e.target.value })}
                placeholder="e.g. CURRENT_TIMESTAMP, 'PENDING', 0"
                className={`w-full px-2.5 py-1.5 rounded-md border font-mono text-xs focus:outline-none ${inputClass}`}
              />
            </div>

            {/* Comment */}
            <div>
              <label className={`block font-semibold uppercase tracking-wider mb-1 ${labelClass}`}>
                Comment / Description
              </label>
              <textarea
                rows={3}
                value={selectedColumn.comment || ''}
                onChange={(e) => handleUpdateColumn({ comment: e.target.value })}
                placeholder="Optional documentation notes..."
                className={`w-full px-2.5 py-1.5 rounded-md border text-xs focus:outline-none resize-none ${inputClass}`}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t flex items-center justify-between">
            <button
              type="button"
              onClick={() => onDeleteColumn(selectedTable.id, selectedColumn.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-rose-500 hover:bg-rose-500/10 text-xs font-semibold transition"
            >
              <Trash2 size={13} />
              <span>Delete Column</span>
            </button>
            <button
              type="button"
              onClick={() => onDuplicateColumn(selectedTable.id, selectedColumn)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Copy size={13} />
              <span>Duplicate</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. TABLE PROPERTIES */}
      {selection?.type === 'table' && selectedTable && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-500">
                Table Properties
              </span>
              <h3 className="font-mono font-bold text-sm truncate flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: selectedTable.color }}
                />
                {selectedTable.name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Close panel"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4 overflow-y-auto grow text-xs">
            {/* Table Name */}
            <div>
              <label className={`block font-semibold uppercase tracking-wider mb-1 ${labelClass}`}>
                Table Name
              </label>
              <input
                id="sidebar-table-name-input"
                type="text"
                value={selectedTable.name}
                onChange={(e) => handleUpdateTable({ name: e.target.value.replace(/\s+/g, '_') })}
                className={`w-full px-2.5 py-1.5 rounded-md border font-mono text-xs focus:outline-none ${inputClass}`}
              />
            </div>

            {/* Accent Color */}
            <div>
              <label className={`block font-semibold uppercase tracking-wider mb-1.5 ${labelClass}`}>
                Header Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TABLE_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleUpdateTable({ color: c.bg })}
                    className={`h-7 rounded-lg transition-transform flex items-center justify-center ${selectedTable.color === c.bg ? 'scale-110 ring-2 ring-sky-500 ring-offset-2' : 'hover:scale-105'
                      }`}
                    style={{ backgroundColor: c.bg }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Table Notes / Documentation */}
            <div>
              <label className={`block font-semibold uppercase tracking-wider mb-1 ${labelClass}`}>
                Documentation / Notes
              </label>
              <textarea
                rows={5}
                value={selectedTable.notes || ''}
                onChange={(e) => handleUpdateTable({ notes: e.target.value })}
                placeholder="Explain the purpose of this table, partitioning, lifecycle..."
                className={`w-full px-2.5 py-1.5 rounded-md border text-xs focus:outline-none resize-none ${inputClass}`}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Embedded in Markdown, Mermaid, and SQL DDL exports.
              </p>
            </div>

            {/* Table Indexes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`block font-semibold uppercase tracking-wider ${labelClass}`}>
                  Indexes ({selectedTable.indexes?.length || 0})
                </label>
                <button
                  type="button"
                  onClick={handleAddIndex}
                  className="flex items-center gap-1 text-[11px] text-sky-500 hover:underline"
                >
                  <Plus size={12} />
                  Add Index
                </button>
              </div>

              {selectedTable.indexes?.length === 0 ? (
                <div className={`p-3 rounded-lg border text-center text-slate-400 text-[11px] ${subBgClass}`}>
                  No custom indexes defined
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTable.indexes.map((idx) => (
                    <div key={idx.id} className={`p-2.5 rounded-lg border space-y-1.5 ${subBgClass}`}>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={idx.name}
                          onChange={(e) => handleUpdateIndex(idx.id, { name: e.target.value })}
                          className={`grow px-1.5 py-1 rounded border font-mono text-[10px] ${inputClass}`}
                        />
                        <select
                          value={idx.type}
                          onChange={(e) => handleUpdateIndex(idx.id, { type: e.target.value as IndexType })}
                          className={`px-1.5 py-1 rounded border text-[10px] ${inputClass}`}
                        >
                          <option value="INDEX">INDEX</option>
                          <option value="UNIQUE">UNIQUE</option>
                          <option value="FULLTEXT">FULLTEXT</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveIndex(idx.id)}
                          className="p-1 text-rose-400 hover:text-rose-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Columns in index */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedTable.columns.map((c) => {
                          const active = idx.columns.includes(c.name);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                const newCols = active
                                  ? idx.columns.filter((colName) => colName !== c.name)
                                  : [...idx.columns, c.name];
                                handleUpdateIndex(idx.id, { columns: newCols.length > 0 ? newCols : [c.name] });
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition ${active
                                ? 'bg-sky-500/20 border-sky-500 text-sky-400 font-bold'
                                : 'border-slate-700 text-slate-400'
                                }`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t flex items-center justify-between">
            <button
              type="button"
              onClick={() => onDeleteTable(selectedTable.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-rose-500 hover:bg-rose-500/10 text-xs font-semibold transition"
            >
              <Trash2 size={13} />
              <span>Delete Table</span>
            </button>
            <button
              type="button"
              onClick={() => onDuplicateTable(selectedTable.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Copy size={13} />
              <span>Duplicate Table</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. RELATION PROPERTIES */}
      {selection?.type === 'relation' && selectedRelation && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-500">
                Relationship Properties
              </span>
              <h3 className="font-bold text-sm">Line & Constraints</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Close panel"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4 overflow-y-auto grow text-xs">
            {/* Endpoints mapping */}
            <div className={`p-3 rounded-lg border flex items-center justify-between ${subBgClass}`}>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">SOURCE</span>
                <span className="font-mono text-xs text-sky-400 font-bold">
                  {worksheet.tables.find((t) => t.id === selectedRelation?.sourceTableId)?.name}.
                  {worksheet.tables.find((t) => t.id === selectedRelation?.sourceTableId)?.columns.find((c) => c.id === selectedRelation?.sourceColumnId)?.name}
                </span>
              </div>
              <ArrowRight size={14} className="text-slate-400" />
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-semibold">TARGET</span>
                <span className="font-mono text-xs text-emerald-400 font-bold">
                  {worksheet.tables.find((t) => t.id === selectedRelation?.targetTableId)?.name}.
                  {worksheet.tables.find((t) => t.id === selectedRelation?.targetTableId)?.columns.find((c) => c.id === selectedRelation?.targetColumnId)?.name}
                </span>
              </div>
            </div>

            {/* Line Routing Style: Orthogonal vs Bezier */}
            <div>
              <label className={`block font-semibold uppercase tracking-wider mb-2 ${labelClass}`}>
                Line Routing Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateRelation({ routing: 'orthogonal' })}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition ${(selectedRelation.routing || 'orthogonal') === 'orthogonal'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400 ring-1 ring-sky-500'
                    : 'border-slate-300 dark:border-slate-800 opacity-70 hover:opacity-100'
                    }`}
                >
                  <GitBranch size={16} className="mb-1" />
                  <span>Orthogonal (90°)</span>
                  <span className="text-[10px] opacity-75">draw.io style</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateRelation({ routing: 'bezier' })}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition ${selectedRelation.routing === 'bezier'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400 ring-1 ring-sky-500'
                    : 'border-slate-300 dark:border-slate-800 opacity-70 hover:opacity-100'
                    }`}
                >
                  <Sliders size={16} className="mb-1" />
                  <span>Smooth Curve</span>
                  <span className="text-[10px] opacity-75">Bézier spline</span>
                </button>
              </div>
            </div>

            {/* Custom Orthogonal Waypoints Reset */}
            {(selectedRelation.routing || 'orthogonal') === 'orthogonal' && selectedRelation.waypoints && selectedRelation.waypoints.length > 0 && (
              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${subBgClass}`}>
                <div>
                  <span className="font-semibold block text-[11px]">Custom Waypoints</span>
                  <span className="text-[10px] text-slate-400">
                    {selectedRelation.waypoints.length} points active
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateRelation({ waypoints: undefined, bendOffset: 0 })}
                  className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-[11px] font-semibold transition"
                >
                  Reset Path
                </button>
              </div>
            )}

            {/* Bend Corridor Distance (draw.io style) */}
            {(selectedRelation.routing || 'orthogonal') === 'orthogonal' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`block font-semibold uppercase tracking-wider ${labelClass}`}>
                    Corridor Distance (Offset)
                  </label>
                  <span className="font-mono text-[11px] text-sky-400">
                    {selectedRelation.bendOffset || 0}px
                  </span>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  step="5"
                  value={selectedRelation.bendOffset || 0}
                  onChange={(e) => handleUpdateRelation({ bendOffset: parseInt(e.target.value, 10), waypoints: undefined })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>-150px (Left)</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateRelation({ bendOffset: 0, waypoints: undefined })}
                    className="hover:underline text-sky-500"
                  >
                    Reset
                  </button>
                  <span>+150px (Right)</span>
                </div>
              </div>
            )}

            {/* Cardinality */}
            <div>
              <label className={`block font-semibold uppercase tracking-wider mb-2 ${labelClass}`}>
                Cardinality
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { value: 'one-to-many', label: '1 : N' },
                    { value: 'one-to-one', label: '1 : 1' },
                    { value: 'many-to-many', label: 'N : M' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleUpdateRelation({ cardinality: c.value as Cardinality })}
                    className={`py-2 rounded-lg border text-center font-mono font-bold text-xs transition ${selectedRelation.cardinality === c.value
                      ? 'border-sky-500 bg-sky-500/10 text-sky-400 ring-1 ring-sky-500'
                      : 'border-slate-300 dark:border-slate-800 opacity-70 hover:opacity-100'
                      }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Color */}
            <div>
              <label className={`block font-semibold uppercase tracking-wider mb-1.5 ${labelClass}`}>
                Line Color
              </label>
              <div className="flex items-center gap-2">
                {RELATION_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleUpdateRelation({ color: c })}
                    className={`w-6 h-6 rounded-full transition-transform ${(selectedRelation.color || '#2563eb') === c
                      ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                      : 'hover:scale-110 opacity-70 hover:opacity-100'
                      }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Referential Actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className={`block font-semibold uppercase tracking-wider mb-1 ${labelClass}`}>
                  ON DELETE
                </label>
                <select
                  value={selectedRelation.onDelete || 'CASCADE'}
                  onChange={(e) => handleUpdateRelation({ onDelete: e.target.value as ReferentialAction })}
                  className={`w-full px-2 py-1.5 rounded border text-xs ${inputClass}`}
                >
                  <option value="CASCADE">CASCADE</option>
                  <option value="RESTRICT">RESTRICT</option>
                  <option value="SET NULL">SET NULL</option>
                  <option value="NO ACTION">NO ACTION</option>
                </select>
              </div>
              <div>
                <label className={`block font-semibold uppercase tracking-wider mb-1 ${labelClass}`}>
                  ON UPDATE
                </label>
                <select
                  value={selectedRelation.onUpdate || 'CASCADE'}
                  onChange={(e) => handleUpdateRelation({ onUpdate: e.target.value as ReferentialAction })}
                  className={`w-full px-2 py-1.5 rounded border text-xs ${inputClass}`}
                >
                  <option value="CASCADE">CASCADE</option>
                  <option value="RESTRICT">RESTRICT</option>
                  <option value="SET NULL">SET NULL</option>
                  <option value="NO ACTION">NO ACTION</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t flex items-center justify-between">
            <button
              type="button"
              onClick={() => onDeleteRelation(selectedRelation.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-rose-500 hover:bg-rose-500/10 text-xs font-semibold transition"
            >
              <Trash2 size={13} />
              <span>Delete Relation</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. OVERVIEW (NO SELECTION) */}
      {!selection && (
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-500">
              Inspector & Properties
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Close panel"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto grow text-xs">
            <div className={`p-3 rounded-xl border ${subBgClass}`}>
              <div className="flex items-center gap-2 mb-2 font-bold">
                <Database size={15} className="text-sky-500" />
                <span>{worksheet.name}</span>
              </div>
              <div className="space-y-1 text-slate-600 text-[11px]">
                <div className="flex justify-between">
                  <span>Engine:</span>
                  <span className="font-mono text-slate-600 uppercase">{worksheet.dialect}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tables:</span>
                  <span className="font-mono text-slate-600">{worksheet.tables.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Relationships:</span>
                  <span className="font-mono text-slate-600">{worksheet.relations.length}</span>
                </div>
                {worksheet.dialect === 'pgsql' && (
                  <div className="flex justify-between">
                    <span>Custom ENUMs:</span>
                    <span className="font-mono text-sky-600 font-semibold">{worksheet.customTypes?.length || 0}</span>
                  </div>
                )}
              </div>
            </div>

            {/* PostgreSQL Custom Data Types & ENUMs Section */}
            {worksheet.dialect === 'pgsql' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <ListFilter size={14} className="text-sky-500" />
                    <label className={`font-semibold uppercase tracking-wider ${labelClass}`}>
                      ENUMs & Types ({worksheet.customTypes?.length || 0})
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomType}
                    className="flex items-center gap-1 text-[11px] text-sky-500 hover:underline font-semibold"
                  >
                    <Plus size={12} />
                    New Type
                  </button>
                </div>

                {!worksheet.customTypes || worksheet.customTypes.length === 0 ? (
                  <div className={`p-3 rounded-lg border text-center text-slate-400 text-[11px] ${subBgClass}`}>
                    <p className="mb-1">No custom types defined yet.</p>
                    <p className="text-[10px] text-slate-500">
                      e.g. <code>CREATE TYPE order_status AS ENUM (...)</code>
                    </p>
                    <button
                      type="button"
                      onClick={handleAddCustomType}
                      className="mt-2 px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 font-medium transition"
                    >
                      + Create First ENUM
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {worksheet.customTypes.map((ct) => (
                      <div key={ct.id} className={`p-3 rounded-lg border space-y-2 ${subBgClass}`}>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                            ENUM
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomType(ct.id)}
                            className="p-1 text-rose-400 hover:text-rose-500 transition"
                            title="Delete this custom type"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div>
                          <label className={`block text-[10px] font-semibold mb-0.5 ${labelClass}`}>
                            Type Name
                          </label>
                          <input
                            type="text"
                            value={ct.name}
                            onChange={(e) =>
                              handleUpdateCustomType(ct.id, {
                                name: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                              })
                            }
                            placeholder="e.g. order_status"
                            className={`w-full px-2 py-1 rounded border font-mono text-xs ${inputClass}`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[10px] font-semibold mb-0.5 ${labelClass}`}>
                            Allowed Values (comma separated)
                          </label>
                          <input
                            type="text"
                            value={ct.values.join(', ')}
                            onChange={(e) => {
                              const vals = e.target.value
                                .split(',')
                                .map((v) => v.trim())
                                .filter(Boolean);
                              handleUpdateCustomType(ct.id, { values: vals });
                            }}
                            placeholder="pending, shipped, delivered"
                            className={`w-full px-2 py-1 rounded border font-mono text-xs ${inputClass}`}
                          />
                        </div>

                        {/* Preview of Generated DDL */}
                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto">
                          <code>
                            CREATE TYPE {ct.name} AS ENUM ({ct.values.map((v) => `'${v}'`).join(', ')});
                          </code>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </aside>
  );
};

