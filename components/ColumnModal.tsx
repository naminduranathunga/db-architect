import React, { useState } from 'react';
import { Column, SqlDialect, MYSQL_DATA_TYPES, PGSQL_DATA_TYPES } from '../types/database';
import { X, Key, ShieldCheck, Link2 } from 'lucide-react';

interface ColumnModalProps {
  column: Column | null;
  dialect: SqlDialect;
  onClose: () => void;
  onSave: (updated: Column) => void;
}

export const ColumnModal: React.FC<ColumnModalProps> = ({
  column,
  dialect,
  onClose,
  onSave,
}) => {
  if (!column) return null;

  const [formData, setFormData] = useState<Column>({ ...column });
  const typeSuggestions = dialect === 'pgsql' ? PGSQL_DATA_TYPES : MYSQL_DATA_TYPES;

  const handlePkToggle = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isPrimaryKey: checked,
      isNullable: checked ? false : prev.isNullable,
      isUnique: checked ? true : prev.isUnique,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave({
      ...formData,
      name: formData.name.trim().replace(/\s+/g, '_'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <h3 className="font-semibold text-lg text-white">Configure Column</h3>
            <p className="text-xs text-slate-400">Data type, constraints and attributes</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Column Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Column Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. user_id, email, status"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Data Type */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Data Type ({dialect === 'pgsql' ? 'PostgreSQL' : 'MySQL'})
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                list="type-suggestions"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="e.g. VARCHAR(255), BIGINT"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-sky-500 uppercase"
              />
              <datalist id="type-suggestions">
                {typeSuggestions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Constraints Grid */}
          <div className="pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Keys & Constraints
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Primary Key */}
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPrimaryKey}
                  onChange={(e) => handlePkToggle(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20 bg-slate-900"
                />
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                  <Key size={13} />
                  <span>Primary Key (PK)</span>
                </div>
              </label>

              {/* Foreign Key */}
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isForeignKey}
                  onChange={(e) => setFormData({ ...formData, isForeignKey: e.target.checked })}
                  className="rounded border-slate-700 text-sky-500 focus:ring-sky-500/20 bg-slate-900"
                />
                <div className="flex items-center gap-1.5 text-xs font-medium text-sky-400">
                  <Link2 size={13} />
                  <span>Foreign Key (FK)</span>
                </div>
              </label>

              {/* Unique */}
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isUnique}
                  onChange={(e) => setFormData({ ...formData, isUnique: e.target.checked })}
                  className="rounded border-slate-700 text-purple-500 focus:ring-purple-500/20 bg-slate-900"
                />
                <div className="flex items-center gap-1.5 text-xs font-medium text-purple-400">
                  <ShieldCheck size={13} />
                  <span>Unique (UQ)</span>
                </div>
              </label>

              {/* Nullable */}
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isNullable}
                  disabled={formData.isPrimaryKey}
                  onChange={(e) => setFormData({ ...formData, isNullable: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 bg-slate-900 disabled:opacity-50"
                />
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <span>Nullable</span>
                </div>
              </label>

              {/* Auto Increment / Identity */}
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 cursor-pointer col-span-2">
                <input
                  type="checkbox"
                  checked={formData.isAutoIncrement}
                  onChange={(e) => setFormData({ ...formData, isAutoIncrement: e.target.checked })}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/20 bg-slate-900"
                />
                <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-400">
                  <span>Auto Increment / Sequence</span>
                </div>
              </label>
            </div>
          </div>

          {/* Default Value & Comment */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Default Value
              </label>
              <input
                type="text"
                value={formData.defaultValue || ''}
                onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                placeholder="e.g. NULL, 'ACTIVE', 0"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Comment
              </label>
              <input
                type="text"
                value={formData.comment || ''}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Optional description"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
            >
              Save Column
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

