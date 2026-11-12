import React, { useState } from 'react';
import { Table, TableIndex, IndexType } from '../types/database';
import { X, Plus, Trash2, FileText, Bookmark } from 'lucide-react';

interface TableNotesModalProps {
  table: Table | null;
  onClose: () => void;
  onUpdate: (updated: Table) => void;
}

export const TableNotesModal: React.FC<TableNotesModalProps> = ({
  table,
  onClose,
  onUpdate,
}) => {
  if (!table) return null;

  const [activeTab, setActiveTab] = useState<'notes' | 'indexes'>('notes');
  const [notes, setNotes] = useState(table.notes || '');
  const [indexes, setIndexes] = useState<TableIndex[]>(table.indexes || []);

  const handleSave = () => {
    onUpdate({
      ...table,
      notes,
      indexes,
    });
    onClose();
  };

  const addIndex = () => {
    const firstCol = table.columns[0]?.name || 'id';
    const newIdx: TableIndex = {
      id: `idx_${Date.now()}`,
      name: `idx_${table.name}_${firstCol}`,
      type: 'INDEX',
      columns: [firstCol],
    };
    setIndexes([...indexes, newIdx]);
  };

  const updateIndex = (idxId: string, updates: Partial<TableIndex>) => {
    setIndexes(indexes.map((i) => (i.id === idxId ? { ...i, ...updates } : i)));
  };

  const removeIndex = (idxId: string) => {
    setIndexes(indexes.filter((i) => i.id !== idxId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-xl shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: table.color }}
            />
            <h3 className="font-semibold text-lg text-white">
              Table Settings: <span className="text-sky-400 font-mono">{table.name}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-4 shrink-0">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'notes'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText size={16} />
            Notes & Documentation
          </button>
          <button
            onClick={() => setActiveTab('indexes')}
            className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'indexes'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark size={16} />
            Indexes ({indexes.length})
          </button>
        </div>

        {/* Tab content */}
        <div className="p-6 overflow-y-auto grow">
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Table Description / Schema Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Document the purpose of this table, partitioning strategy, lifecycle, or business logic..."
                rows={8}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none font-sans"
              />
              <p className="text-xs text-slate-500">
                These notes will be embedded as SQL comments and included in Markdown and Mermaid documentation exports.
              </p>
            </div>
          )}

          {activeTab === 'indexes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Custom Table Indexes
                </span>
                <button
                  type="button"
                  onClick={addIndex}
                  className="flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1.5 rounded-lg border border-sky-500/30 transition"
                >
                  <Plus size={14} />
                  Add Index
                </button>
              </div>

              {indexes.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg">
                  <p className="text-sm text-slate-500">No custom indexes defined for this table</p>
                  <button
                    onClick={addIndex}
                    className="mt-2 text-xs text-sky-400 hover:underline"
                  >
                    Create index on column
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {indexes.map((idx) => (
                    <div
                      key={idx.id}
                      className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg flex flex-col gap-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={idx.name}
                          onChange={(e) => updateIndex(idx.id, { name: e.target.value })}
                          placeholder="Index name"
                          className="grow px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                        />
                        <select
                          value={idx.type}
                          onChange={(e) => updateIndex(idx.id, { type: e.target.value as IndexType })}
                          className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                        >
                          <option value="INDEX">INDEX</option>
                          <option value="UNIQUE">UNIQUE</option>
                          <option value="FULLTEXT">FULLTEXT</option>
                          <option value="SPATIAL">SPATIAL</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeIndex(idx.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Columns selection */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-400">Columns:</span>
                        {table.columns.map((col) => {
                          const isSelected = idx.columns.includes(col.name);
                          return (
                            <button
                              key={col.id}
                              type="button"
                              onClick={() => {
                                const newCols = isSelected
                                  ? idx.columns.filter((c) => c !== col.name)
                                  : [...idx.columns, col.name];
                                updateIndex(idx.id, { columns: newCols.length > 0 ? newCols : [col.name] });
                              }}
                              className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
                                isSelected
                                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-semibold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              {col.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-900 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

