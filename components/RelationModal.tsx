import React from 'react';
import { Relation, Table, Cardinality, ReferentialAction, RELATION_COLORS } from '../types/database';
import { X, Trash2, ArrowRight } from 'lucide-react';

interface RelationModalProps {
  relation: Relation | null;
  tables: Table[];
  onClose: () => void;
  onUpdate: (updated: Relation) => void;
  onDelete: (id: string) => void;
}

export const RelationModal: React.FC<RelationModalProps> = ({
  relation,
  tables,
  onClose,
  onUpdate,
  onDelete,
}) => {
  if (!relation) return null;

  const sourceTable = tables.find((t) => t.id === relation.sourceTableId);
  const sourceCol = sourceTable?.columns.find((c) => c.id === relation.sourceColumnId);
  const targetTable = tables.find((t) => t.id === relation.targetTableId);
  const targetCol = targetTable?.columns.find((c) => c.id === relation.targetColumnId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <h3 className="font-semibold text-lg text-white">Edit Relationship</h3>
            <p className="text-xs text-slate-400">Configure cardinality and referential rules</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Connection Preview */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Source (Parent)</span>
            <span className="font-mono text-sm text-sky-400 font-medium">
              {sourceTable?.name}.{sourceCol?.name}
            </span>
          </div>
          <div className="flex flex-col items-center px-4">
            <ArrowRight className="text-slate-500" size={18} />
            <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase">
              {relation.cardinality}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target (Child)</span>
            <span className="font-mono text-sm text-emerald-400 font-medium">
              {targetTable?.name}.{targetCol?.name}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {/* Cardinality */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Cardinality
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: 'one-to-many', label: '1 : N', desc: 'One to Many' },
                  { value: 'one-to-one', label: '1 : 1', desc: 'One to One' },
                  { value: 'many-to-many', label: 'N : M', desc: 'Many to Many' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdate({ ...relation, cardinality: opt.value as Cardinality })}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-sm transition ${
                    relation.cardinality === opt.value
                      ? 'border-sky-500 bg-sky-500/10 text-sky-300 font-medium ring-1 ring-sky-500'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="font-bold text-base font-mono">{opt.label}</span>
                  <span className="text-[11px] mt-0.5 opacity-80">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Relation Label / Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Constraint Name (Optional)
            </label>
            <input
              type="text"
              value={relation.name || ''}
              onChange={(e) => onUpdate({ ...relation, name: e.target.value })}
              placeholder={`fk_${targetTable?.name}_${targetCol?.name}`}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Line Color */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Relationship Color
            </label>
            <div className="flex items-center gap-2">
              {RELATION_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onUpdate({ ...relation, color: c })}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    (relation.color || '#3b82f6') === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110 opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Referential Rules */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                ON DELETE
              </label>
              <select
                value={relation.onDelete || 'CASCADE'}
                onChange={(e) => onUpdate({ ...relation, onDelete: e.target.value as ReferentialAction })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="CASCADE">CASCADE</option>
                <option value="RESTRICT">RESTRICT</option>
                <option value="SET NULL">SET NULL</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                ON UPDATE
              </label>
              <select
                value={relation.onUpdate || 'CASCADE'}
                onChange={(e) => onUpdate({ ...relation, onUpdate: e.target.value as ReferentialAction })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="CASCADE">CASCADE</option>
                <option value="RESTRICT">RESTRICT</option>
                <option value="SET NULL">SET NULL</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              onDelete(relation.id);
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 px-3 py-2 rounded-lg hover:bg-rose-500/10 transition"
          >
            <Trash2 size={15} />
            Delete Relation
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

