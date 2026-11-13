import React, { useState, useEffect } from 'react';
import { SqlDialect, Worksheet, ThemeMode } from '../types/database';
import {
  Plus,
  Save,
  Download,
  FolderOpen,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Database,
  HelpCircle,
  CheckCircle2,
  Loader2,
  Edit2,
  Check,
  Sun,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Undo2,
  Redo2,
  FileUp,
} from 'lucide-react';

interface ToolbarProps {
  worksheet: Worksheet;
  theme: ThemeMode;
  onToggleTheme: () => void;
  showPropertyBar: boolean;
  onTogglePropertyBar: () => void;
  onRenameWorksheet: (newName: string) => void;
  onDialectChange: (dialect: SqlDialect) => void;
  onAddTable: () => void;
  onManualSave: () => void;
  onOpenWorksheetsModal: () => void;
  onOpenExportModal: () => void;
  onOpenFileImport?: () => void;
  isSaving: boolean;
  lastSavedAt: number | null;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToScreen: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  worksheet,
  theme,
  onToggleTheme,
  showPropertyBar,
  onTogglePropertyBar,
  onRenameWorksheet,
  onDialectChange,
  onAddTable,
  onManualSave,
  onOpenWorksheetsModal,
  onOpenExportModal,
  onOpenFileImport,
  isSaving,
  lastSavedAt,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToScreen,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const isDark = theme === 'dark';
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(worksheet.name);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setTitleInput(worksheet.name);
  }, [worksheet.name]);

  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      onRenameWorksheet(titleInput.trim());
    } else {
      setTitleInput(worksheet.name);
    }
  };

  const barBgClass = isDark
    ? 'bg-slate-900/95 border-slate-800 text-slate-100'
    : 'bg-white/95 border-slate-200 text-slate-800 shadow-xs';

  const btnBgClass = isDark
    ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/80'
    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200';

  return (
    <header
      className={`h-14 border-b px-4 flex items-center justify-between z-30 select-none shrink-0 backdrop-blur-md transition-colors ${barBgClass}`}
    >
      {/* Left: App Brand, Title, Engine Toggle */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex items-center gap-2 pr-3 border-r ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Database size={18} />
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:inline">
            DB Architect
          </span>
        </div>

        {/* Worksheet Title */}
        <div className="flex items-center gap-1.5 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setTitleInput(worksheet.name);
                    setIsEditingTitle(false);
                  }
                }}
                className={`px-2 py-0.5 rounded text-sm font-semibold focus:outline-none border ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
              >
                <Check size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md group transition text-left ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              title="Click to rename diagram"
            >
              <span className="font-semibold text-sm truncate max-w-[150px] sm:max-w-[200px]">
                {worksheet.name}
              </span>
              <Edit2 size={12} className="opacity-50 group-hover:opacity-100 transition" />
            </button>
          )}

          {/* Worksheets list button */}
          <button
            type="button"
            onClick={onOpenWorksheetsModal}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition ${btnBgClass}`}
            title="Open saved diagrams or import a file"
          >
            <FolderOpen size={13} />
            <span className="hidden md:inline">Diagrams</span>
          </button>

          {/* Open portable file shortcut */}
          {onOpenFileImport && (
            <button
              type="button"
              onClick={onOpenFileImport}
              className={`hidden lg:flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition ${btnBgClass}`}
              title="Open a portable .sqldiagram file from your computer"
            >
              <FileUp size={13} className="text-sky-400" />
              <span>Open File</span>
            </button>
          )}
        </div>

        {/* Undo and Redo buttons */}
        <div className="flex items-center gap-1 pl-1">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className={`p-1.5 rounded-md border transition disabled:opacity-30 disabled:pointer-events-none ${btnBgClass}`}
            title="Undo (Ctrl + Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            className={`p-1.5 rounded-md border transition disabled:opacity-30 disabled:pointer-events-none ${btnBgClass}`}
            title="Redo (Ctrl + Y)"
          >
            <Redo2 size={14} />
          </button>
        </div>

        {/* Dialect Toggle */}
        <div
          className={`hidden sm:flex items-center p-0.5 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
        >
          <button
            type="button"
            onClick={() => onDialectChange('pgsql')}
            className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition ${worksheet.dialect === 'pgsql'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'opacity-70 hover:opacity-100'
              }`}
          >
            PostgreSQL
          </button>
          <button
            type="button"
            onClick={() => onDialectChange('mysql')}
            className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition ${worksheet.dialect === 'mysql'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'opacity-70 hover:opacity-100'
              }`}
          >
            MySQL
          </button>
        </div>
      </div>

      {/* Right Tools & Actions */}
      <div className="flex items-center gap-2">
        {/* Auto-save Status */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs opacity-75 px-2">
          {isSaving ? (
            <>
              <Loader2 size={13} className="animate-spin text-sky-500" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>Saved</span>
            </>
          )}
        </div>

        {/* Add Table Button */}
        <button
          type="button"
          onClick={onAddTable}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition shadow-sm active:scale-95"
        >
          <Plus size={14} />
          <span>Add Table</span>
        </button>

        {/* Manual Save Button */}
        <button
          type="button"
          onClick={onManualSave}
          title="Save diagram (Ctrl+S)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${btnBgClass}`}
        >
          <Save size={13} />
          <span className="hidden md:inline">Save</span>
        </button>

        {/* Export Button */}
        <button
          type="button"
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-medium transition shadow-sm active:scale-95"
        >
          <Download size={14} />
          <span>Export</span>
        </button>

        <div className={`h-5 w-px mx-1 hidden sm:block ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

        {/* Zoom Controls */}
        <div
          className={`hidden sm:flex items-center p-0.5 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
        >
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1.5 opacity-70 hover:opacity-100 rounded"
            title="Zoom out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            className="px-1.5 text-[11px] font-mono"
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1.5 opacity-70 hover:opacity-100 rounded"
            title="Zoom in"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            onClick={onFitToScreen}
            className="p-1.5 opacity-70 hover:opacity-100 rounded"
            title="Fit to view"
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {/* Theme Switcher Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          className={`p-1.5 rounded-lg border transition ${btnBgClass}`}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        >
          {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-600" />}
        </button>

        {/* Toggle Right Property Bar */}
        <button
          type="button"
          onClick={onTogglePropertyBar}
          className={`p-1.5 rounded-lg border transition ${showPropertyBar ? 'bg-sky-600 text-white border-sky-600' : btnBgClass
            }`}
          title="Toggle Property Bar"
        >
          {showPropertyBar ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
        </button>

        {/* Help Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className={`p-1.5 rounded-lg border transition ${btnBgClass}`}
            title="Shortcuts & Tips"
          >
            <HelpCircle size={15} />
          </button>

          {showHelp && (
            <div onClick={() => setShowHelp(false)} className="fixed inset-0 z-40">
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute right-4 top-14 w-80 rounded-xl p-4 shadow-2xl text-xs space-y-3 z-50 animate-in fade-in zoom-in-95 duration-100 border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                  }`}
              >
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="font-semibold">Visual DB Diagrammer</span>
                  <button onClick={() => setShowHelp(false)} className="opacity-60 hover:opacity-100">
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="opacity-75">Connect Columns:</span>
                    <span>Click or drag from port to destination</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-75">Delete Column:</span>
                    <span>Select column and press <kbd className="px-1 rounded bg-slate-800 text-[10px] text-sky-400">Del</kbd></span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-75">Undo / Redo:</span>
                    <span className="space-x-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-sky-400">Ctrl+Z</kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-sky-400">Ctrl+Y</kbd>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-75">Adjust 90° Bend:</span>
                    <span>Drag circle handle on line</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-75">Duplicate Item:</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-sky-400">Ctrl + D</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-75">Save Diagram:</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-sky-400">Ctrl + S</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
