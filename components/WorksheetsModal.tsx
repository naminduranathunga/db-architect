import React, { useState } from 'react';
import { Worksheet } from '../types/database';
import { X, Plus, FolderOpen, Trash2, Copy, Edit2, Check, Clock, Database } from 'lucide-react';

interface WorksheetsModalProps {
  worksheets: Worksheet[];
  activeWorksheetId: string;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (worksheet: Worksheet) => void;
  onRename: (id: string, newName: string) => void;
}

export const WorksheetsModal: React.FC<WorksheetsModalProps> = ({
  worksheets,
  activeWorksheetId,
  onClose,
  onOpen,
  onNew,
  onDelete,
  onDuplicate,
  onRename,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const startRename = (ws: Worksheet) => {
    setEditingId(ws.id);
    setEditingName(ws.name);
  };

  const submitRename = (id: string) => {
    if (editingName.trim()) {
      onRename(id, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <h3 className="font-semibold text-lg text-white">Saved Diagrams</h3>
            <p className="text-xs text-slate-400">
              Manage your diagrams stored locally in browser IndexedDB
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            {worksheets.length} diagram{worksheets.length === 1 ? '' : 's'} available
          </span>
          <button
            type="button"
            onClick={() => {
              onNew();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition shadow-sm"
          >
            <Plus size={14} />
            <span>New Diagram</span>
          </button>
        </div>

        {/* List of worksheets */}
        <div className="p-6 overflow-y-auto grow space-y-2.5">
          {worksheets.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
              <Database className="mx-auto text-slate-600 mb-2" size={32} />
              <p className="text-sm text-slate-400">No saved diagrams yet</p>
              <button
                onClick={() => {
                  onNew();
                  onClose();
                }}
                className="mt-3 text-xs text-sky-400 hover:underline"
              >
                Create your first diagram
              </button>
            </div>
          ) : (
            worksheets.map((ws) => {
              const isActive = ws.id === activeWorksheetId;
              const isRenaming = editingId === ws.id;

              return (
                <div
                  key={ws.id}
                  className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                    isActive
                      ? 'border-sky-500/60 bg-sky-500/10 shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitRename(ws.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white font-medium focus:outline-none focus:border-sky-500"
                          />
                          <button
                            type="button"
                            onClick={() => submitRename(ws.id)}
                            className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-semibold text-white text-sm truncate">
                            {ws.name}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                              Active
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => startRename(ws)}
                            className="p-1 text-slate-500 hover:text-slate-300 rounded transition"
                            title="Rename diagram"
                          >
                            <Edit2 size={12} />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(ws.updatedAt).toLocaleDateString()} {new Date(ws.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-800 text-slate-300">
                        {ws.dialect}
                      </span>
                      <span>{ws.tables.length} tables</span>
                      <span>{ws.relations.length} relations</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpen(ws.id);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition"
                      >
                        <FolderOpen size={13} />
                        <span>Open</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDuplicate(ws)}
                      className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                      title="Duplicate diagram"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(ws.id)}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                      title="Delete diagram"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-400">
          <span>All changes in active diagram are auto-saved in real time.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

