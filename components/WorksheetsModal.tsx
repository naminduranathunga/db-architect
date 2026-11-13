import React, { useState, useRef } from 'react';
import { Worksheet } from '../types/database';
import { parsePortableFile, exportToPortableJSON, PORTABLE_FILE_EXTENSION } from '../lib/portableFile';
import { downloadFile } from '../lib/exporters';
import {
  X,
  Plus,
  FolderOpen,
  Trash2,
  Copy,
  Edit2,
  Check,
  Clock,
  Database,
  Download,
  FileUp,
} from 'lucide-react';

interface WorksheetsModalProps {
  worksheets: Worksheet[];
  activeWorksheetId: string;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (worksheet: Worksheet) => void;
  onRename: (id: string, newName: string) => void;
  onImportWorksheet?: (worksheet: Worksheet) => void;
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
  onImportWorksheet,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportPortable = (ws: Worksheet, e: React.MouseEvent) => {
    e.stopPropagation();
    const jsonStr = exportToPortableJSON(ws);
    downloadFile(`${ws.name}${PORTABLE_FILE_EXTENSION}`, jsonStr, 'application/json');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = parsePortableFile(text);
        if (onImportWorksheet) {
          onImportWorksheet(imported);
          onClose();
        }
      } catch (err: unknown) {
        setImportError(err instanceof Error ? err.message : 'Failed to import diagram file.');
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read selected file.');
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      {/* Hidden file input for portable file import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".sqldiagram,.json"
        className="hidden"
      />

      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <h3 className="font-semibold text-lg text-white">Saved Diagrams</h3>
            <p className="text-xs text-slate-400">
              Manage local diagrams or import/export portable files across computers
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
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-slate-400 font-medium">
            {worksheets.length} diagram{worksheets.length === 1 ? '' : 's'} available
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
              title="Open diagram from .sqldiagram file"
            >
              <FileUp size={14} className="text-sky-400" />
              <span>Open File...</span>
            </button>
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
        </div>

        {/* Error message */}
        {importError && (
          <div className="px-6 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <span>⚠️ {importError}</span>
            <button
              onClick={() => setImportError(null)}
              className="text-rose-400 hover:text-rose-200 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* List of worksheets */}
        <div className="p-6 overflow-y-auto grow space-y-2.5">
          {worksheets.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
              <Database className="mx-auto text-slate-600 mb-2" size={32} />
              <p className="text-sm text-slate-400">No saved diagrams yet</p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    onNew();
                    onClose();
                  }}
                  className="text-xs text-sky-400 hover:underline"
                >
                  Create new diagram
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Open portable file (.sqldiagram)
                </button>
              </div>
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
                      onClick={(e) => handleExportPortable(ws, e)}
                      className="p-2 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-lg transition"
                      title="Download portable file (.sqldiagram) to open on any device"
                    >
                      <Download size={15} />
                    </button>
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
          <span>Tip: Click the download icon on any diagram to save a portable <code>.sqldiagram</code> file.</span>
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
