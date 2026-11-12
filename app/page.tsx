'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Worksheet,
  Table,
  Column,
  Relation,
  SqlDialect,
  ThemeMode,
  TABLE_COLORS,
} from '../types/database';
import {
  openDB,
  saveWorksheet,
  getWorksheet,
  listWorksheets,
  deleteWorksheet,
  getNextWorksheetIndex,
  createSampleWorksheet,
} from '../lib/storage';
import { Canvas } from '../components/Canvas';
import { Toolbar } from '../components/Toolbar';
import { PropertyBar, SelectionTarget } from '../components/PropertyBar';
import { WorksheetsModal } from '../components/WorksheetsModal';
import { ExportModal } from '../components/ExportModal';

export default function Home() {
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [worksheetsList, setWorksheetsList] = useState<Worksheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<Worksheet[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUndoRedoActionRef = useRef(false);

  // Theme: 'dark' | 'light'
  const [theme, setTheme] = useState<ThemeMode>('dark');

  // Sidebar selection target
  const [selection, setSelection] = useState<SelectionTarget>(null);
  const [showPropertyBar, setShowPropertyBar] = useState(true);

  // Tracks if a table or column was clicked and user hasn't clicked anywhere else since
  const freshSelectionRef = useRef<
    | { type: 'column'; tableId: string; columnId: string }
    | { type: 'table'; tableId: string }
    | null
  >(null);

  // Canvas Pan & Zoom
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [zoom, setZoom] = useState(1);

  // Modals for Worksheets and Export
  const [showWorksheetsModal, setShowWorksheetsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Debounced auto-save ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Push new snapshot to undo/redo history
  const pushSnapshot = useCallback(
    (newWs: Worksheet) => {
      if (isUndoRedoActionRef.current) return;
      setHistory((prevHistory) => {
        const sliced = prevHistory.slice(0, historyIndex + 1);
        const next = [...sliced, newWs];
        if (next.length > 50) next.shift();
        return next;
      });
      setHistoryIndex((prevIndex) => Math.min(prevIndex + 1, 49));
    },
    [historyIndex]
  );

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoActionRef.current = true;
      const targetIndex = historyIndex - 1;
      const targetState = history[targetIndex];
      setHistoryIndex(targetIndex);
      setWorksheet(targetState);
      setTimeout(() => {
        isUndoRedoActionRef.current = false;
      }, 50);
    }
  }, [historyIndex, history]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoActionRef.current = true;
      const targetIndex = historyIndex + 1;
      const targetState = history[targetIndex];
      setHistoryIndex(targetIndex);
      setWorksheet(targetState);
      setTimeout(() => {
        isUndoRedoActionRef.current = false;
      }, 50);
    }
  }, [historyIndex, history]);

  // Load theme preference from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('db_theme') as ThemeMode;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('db_theme', nextTheme);
    } catch {
      // ignore
    }
  };

  // Initialize DB and load last worksheet
  useEffect(() => {
    async function init() {
      try {
        await openDB();
        const storedList = await listWorksheets();
        setWorksheetsList(storedList);

        let initialWs: Worksheet;
        if (storedList.length > 0) {
          initialWs = storedList[0];
          setWorksheet(initialWs);
          if (initialWs.zoom) setZoom(initialWs.zoom);
          if (initialWs.panX !== undefined && initialWs.panY !== undefined) {
            setPan({ x: initialWs.panX, y: initialWs.panY });
          }
        } else {
          initialWs = createSampleWorksheet('unnamed_1', 'pgsql');
          await saveWorksheet(initialWs);
          setWorksheet(initialWs);
          setWorksheetsList([initialWs]);
        }
        setHistory([initialWs]);
        setHistoryIndex(0);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        const sample = createSampleWorksheet('unnamed_1', 'pgsql');
        setWorksheet(sample);
        setHistory([sample]);
        setHistoryIndex(0);
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 500);
      }
    }

    init();
  }, []);

  // Optimized real-time auto-save
  useEffect(() => {
    if (!worksheet || isInitialLoadRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const toSave: Worksheet = {
          ...worksheet,
          zoom,
          panX: pan.x,
          panY: pan.y,
          updatedAt: Date.now(),
        };
        await saveWorksheet(toSave);
        setLastSavedAt(Date.now());
        const updatedList = await listWorksheets();
        setWorksheetsList(updatedList);
      } catch (err) {
        console.error('Auto-save error:', err);
      } finally {
        setIsSaving(false);
      }
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [worksheet, zoom, pan]);

  // Global manual save handler (Ctrl + S)
  const handleManualSave = useCallback(async () => {
    if (!worksheet) return;
    setIsSaving(true);
    try {
      const toSave: Worksheet = {
        ...worksheet,
        zoom,
        panX: pan.x,
        panY: pan.y,
        updatedAt: Date.now(),
      };
      await saveWorksheet(toSave);
      setLastSavedAt(Date.now());
      const updatedList = await listWorksheets();
      setWorksheetsList(updatedList);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [worksheet, zoom, pan]);

  // Column / Table / Relation deletion
  const handleDeleteTable = useCallback((tableId: string) => {
    setWorksheet((prev) => {
      if (!prev) return prev;
      const nextWs = {
        ...prev,
        tables: prev.tables.filter((t) => t.id !== tableId),
        relations: prev.relations.filter(
          (r) => r.sourceTableId !== tableId && r.targetTableId !== tableId
        ),
      };
      pushSnapshot(nextWs);
      return nextWs;
    });
    setSelection(null);
  }, [pushSnapshot]);

  const handleDuplicateTable = useCallback((tableId: string) => {
    setWorksheet((prev) => {
      if (!prev) return prev;
      const srcTable = prev.tables.find((t) => t.id === tableId);
      if (!srcTable) return prev;

      const newTableId = `tbl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const clonedColumns = srcTable.columns.map((c) => ({
        ...c,
        id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      }));

      const clonedTable: Table = {
        ...srcTable,
        id: newTableId,
        name: `${srcTable.name}_copy`,
        x: srcTable.x + 35,
        y: srcTable.y + 35,
        columns: clonedColumns,
        indexes: srcTable.indexes.map((idx) => ({
          ...idx,
          id: `idx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: `${idx.name}_copy`,
        })),
      };

      const nextWs = {
        ...prev,
        tables: [...prev.tables, clonedTable],
      };
      pushSnapshot(nextWs);
      setSelection({ type: 'table', tableId: newTableId });
      return nextWs;
    });
  }, [pushSnapshot]);

  // ONLY deletes the column!
  const handleDeleteColumn = useCallback((tableId: string, columnId: string) => {
    setWorksheet((prev) => {
      if (!prev) return prev;
      const nextWs = {
        ...prev,
        tables: prev.tables.map((t) =>
          t.id === tableId ? { ...t, columns: t.columns.filter((c) => c.id !== columnId) } : t
        ),
        relations: prev.relations.filter(
          (r) =>
            !(
              (r.sourceTableId === tableId && r.sourceColumnId === columnId) ||
              (r.targetTableId === tableId && r.targetColumnId === columnId)
            )
        ),
      };
      pushSnapshot(nextWs);
      return nextWs;
    });
    setSelection(null);
  }, [pushSnapshot]);

  // Inserts immediately adjacent without renaming!
  const handleDuplicateColumn = useCallback((tableId: string, col: Column) => {
    setWorksheet((prev) => {
      if (!prev) return prev;
      const table = prev.tables.find((t) => t.id === tableId);
      if (!table) return prev;

      const colIndex = table.columns.findIndex((c) => c.id === col.id);
      const newCol: Column = {
        ...col,
        id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: col.name, // Keep exact name
        isPrimaryKey: false,
      };

      const newColumns = [...table.columns];
      const insertIdx = colIndex >= 0 ? colIndex + 1 : newColumns.length;
      newColumns.splice(insertIdx, 0, newCol); // Insert adjacent

      const nextWs = {
        ...prev,
        tables: prev.tables.map((t) =>
          t.id === tableId ? { ...t, columns: newColumns } : t
        ),
      };
      pushSnapshot(nextWs);
      setSelection({ type: 'column', tableId, columnId: newCol.id });
      return nextWs;
    });
  }, [pushSnapshot]);

  const handleDeleteRelation = useCallback((relationId: string) => {
    setWorksheet((prev) => {
      if (!prev) return prev;
      const nextWs = {
        ...prev,
        relations: prev.relations.filter((r) => r.id !== relationId),
      };
      pushSnapshot(nextWs);
      return nextWs;
    });
    setSelection(null);
  }, [pushSnapshot]);

  // Track if user clicked outside the freshly selected table or column
  useEffect(() => {
    const handleGlobalPointerDown = (e: MouseEvent) => {
      if (!freshSelectionRef.current) return;
      const target = e.target as HTMLElement;

      // 1. Column Guard
      if (freshSelectionRef.current.type === 'column') {
        const colRow = target.closest('[data-col-row="true"]');
        if (colRow) {
          const colId = colRow.getAttribute('data-col-id');
          const tblId = colRow.getAttribute('data-table-id');
          if (
            colId === freshSelectionRef.current.columnId &&
            tblId === freshSelectionRef.current.tableId
          ) {
            return;
          }
        }
        if (target.closest('#sidebar-column-name-input')) {
          return;
        }
      }

      // 2. Table Guard
      if (freshSelectionRef.current.type === 'table') {
        const tableCard = target.closest('[data-table-card="true"]');
        // If clicking on the selected table's header or background (and not a column row), keep it
        if (tableCard && !target.closest('[data-col-row="true"]')) {
          const tblId = tableCard.getAttribute('data-table-id');
          if (tblId === freshSelectionRef.current.tableId) {
            return;
          }
        }
        if (target.closest('#sidebar-table-name-input')) {
          return;
        }
      }

      // User clicked somewhere else: cancel direct typing
      freshSelectionRef.current = null;
    };

    window.addEventListener('mousedown', handleGlobalPointerDown, { capture: true });
    return () => window.removeEventListener('mousedown', handleGlobalPointerDown, { capture: true });
  }, []);

  // Global Capture-Phase Shortcuts (Ctrl+D to duplicate, Ctrl+S, Ctrl+Z, Ctrl+Y, Delete, Direct Rename on Type)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Intercept Ctrl + D / Cmd + D to duplicate selected item and prevent browser bookmark
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D' || e.code === 'KeyD')) {
        e.preventDefault();
        e.stopPropagation();

        if (
          ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) ||
          (e.target as HTMLElement).isContentEditable
        ) {
          return;
        }

        if (selection?.type === 'column') {
          const t = worksheet?.tables.find((tbl) => tbl.id === selection.tableId);
          const c = t?.columns.find((col) => col.id === selection.columnId);
          if (t && c) {
            handleDuplicateColumn(t.id, c);
          }
        } else if (selection?.type === 'table') {
          handleDuplicateTable(selection.tableId);
        }
        return;
      }

      // Ignore standard shortcut inputs if user is typing
      if (
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // 2. Direct Rename on Type (Tables or Columns) when freshly selected without clicking elsewhere
      if (freshSelectionRef.current) {
        const isPrintableChar = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

        if (isPrintableChar) {
          // A. Table Direct Rename
          if (
            freshSelectionRef.current.type === 'table' &&
            selection?.type === 'table' &&
            selection.tableId === freshSelectionRef.current.tableId
          ) {
            e.preventDefault();
            e.stopPropagation();

            const { tableId } = freshSelectionRef.current;
            freshSelectionRef.current = null; // Clear so subsequent keystrokes type directly into input

            const typedChar = e.key.replace(/\s+/g, '_');
            setWorksheet((prev) => {
              if (!prev) return prev;
              const nextWs = {
                ...prev,
                tables: prev.tables.map((t) =>
                  t.id === tableId ? { ...t, name: typedChar } : t
                ),
              };
              pushSnapshot(nextWs);
              return nextWs;
            });

            setTimeout(() => {
              const input = document.getElementById('sidebar-table-name-input') as HTMLInputElement | null;
              if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
              }
            }, 10);

            return;
          }

          // B. Column Direct Rename
          if (
            freshSelectionRef.current.type === 'column' &&
            selection?.type === 'column' &&
            selection.columnId === freshSelectionRef.current.columnId &&
            selection.tableId === freshSelectionRef.current.tableId
          ) {
            e.preventDefault();
            e.stopPropagation();

            const { tableId, columnId } = freshSelectionRef.current;
            freshSelectionRef.current = null;

            const typedChar = e.key.replace(/\s+/g, '_');
            setWorksheet((prev) => {
              if (!prev) return prev;
              const nextWs = {
                ...prev,
                tables: prev.tables.map((t) =>
                  t.id === tableId
                    ? {
                        ...t,
                        columns: t.columns.map((c) =>
                          c.id === columnId ? { ...c, name: typedChar } : c
                        ),
                      }
                    : t
                ),
              };
              pushSnapshot(nextWs);
              return nextWs;
            });

            setTimeout(() => {
              const input = document.getElementById('sidebar-column-name-input') as HTMLInputElement | null;
              if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
              }
            }, 10);

            return;
          }
        }
      }

      // Save: Ctrl + S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        handleManualSave();
        return;
      }

      // Undo: Ctrl + Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleUndo();
        return;
      }

      // Redo: Ctrl + Y or Ctrl + Shift + Z
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
        return;
      }

      // Delete or Backspace: Priority COLUMN -> RELATION -> TABLE
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection?.type === 'column') {
          e.preventDefault();
          e.stopPropagation();
          handleDeleteColumn(selection.tableId, selection.columnId);
        } else if (selection?.type === 'relation') {
          e.preventDefault();
          e.stopPropagation();
          handleDeleteRelation(selection.relationId);
        } else if (selection?.type === 'table') {
          e.preventDefault();
          e.stopPropagation();
          handleDeleteTable(selection.tableId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [
    selection,
    worksheet,
    handleManualSave,
    handleUndo,
    handleRedo,
    handleDuplicateColumn,
    handleDuplicateTable,
    handleDeleteColumn,
    handleDeleteRelation,
    handleDeleteTable,
    pushSnapshot,
  ]);

  const handleUpdateWorksheet = useCallback(
    (updater: Worksheet | ((prev: Worksheet) => Worksheet)) => {
      setWorksheet((prev) => {
        if (!prev) return prev;
        if (typeof updater === 'function') {
          return updater(prev);
        }
        return updater;
      });
    },
    []
  );

  // Selection handler: Automatically tracks fresh selection for both tables and columns
  const handleSelectTarget = (target: SelectionTarget) => {
    setSelection(target);
    if (target) {
      setShowPropertyBar(true);
      if (target.type === 'column') {
        freshSelectionRef.current = { type: 'column', tableId: target.tableId, columnId: target.columnId };
      } else if (target.type === 'table') {
        freshSelectionRef.current = { type: 'table', tableId: target.tableId };
      } else {
        freshSelectionRef.current = null;
      }
    } else {
      freshSelectionRef.current = null;
    }
  };

  // Worksheet operations
  const handleRenameWorksheet = (newName: string) => {
    if (!worksheet) return;
    const nextWs = { ...worksheet, name: newName };
    pushSnapshot(nextWs);
    setWorksheet(nextWs);
  };

  const handleDialectChange = (dialect: SqlDialect) => {
    if (!worksheet) return;
    const nextWs = { ...worksheet, dialect };
    pushSnapshot(nextWs);
    setWorksheet(nextWs);
  };

  const handleAddTable = () => {
    if (!worksheet) return;

    const viewportCenterX = Math.round(-pan.x / zoom + 350);
    const viewportCenterY = Math.round(-pan.y / zoom + 200);

    const tableIndex = worksheet.tables.length + 1;
    const colorIndex = (tableIndex - 1) % TABLE_COLORS.length;
    const isPg = worksheet.dialect === 'pgsql';

    const newTable: Table = {
      id: `tbl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `table_${tableIndex}`,
      x: viewportCenterX,
      y: viewportCenterY,
      color: TABLE_COLORS[colorIndex].bg,
      indexes: [],
      notes: '',
      columns: [
        {
          id: `col_${Date.now()}_1`,
          name: 'id',
          type: isPg ? 'BIGSERIAL' : 'BIGINT',
          isPrimaryKey: true,
          isForeignKey: false,
          isUnique: true,
          isNullable: false,
          isAutoIncrement: true,
        },
        {
          id: `col_${Date.now()}_2`,
          name: 'created_at',
          type: isPg ? 'TIMESTAMPTZ' : 'DATETIME',
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isNullable: false,
          isAutoIncrement: false,
          defaultValue: 'CURRENT_TIMESTAMP',
        },
      ],
    };

    const nextWs = {
      ...worksheet,
      tables: [...worksheet.tables, newTable],
    };
    pushSnapshot(nextWs);
    setWorksheet(nextWs);
    handleSelectTarget({ type: 'table', tableId: newTable.id });
  };

  const handleNewWorksheet = async () => {
    try {
      const nextIdx = await getNextWorksheetIndex();
      const newWs = createSampleWorksheet(`unnamed_${nextIdx}`, worksheet?.dialect || 'pgsql');
      newWs.tables = [];
      newWs.relations = [];
      newWs.panX = 60;
      newWs.panY = 60;
      newWs.zoom = 1;

      await saveWorksheet(newWs);
      setWorksheet(newWs);
      setHistory([newWs]);
      setHistoryIndex(0);
      setPan({ x: 60, y: 60 });
      setZoom(1);
      setSelection(null);

      const list = await listWorksheets();
      setWorksheetsList(list);
    } catch (err) {
      console.error('Error creating new diagram:', err);
    }
  };

  const handleOpenWorksheet = async (id: string) => {
    try {
      const ws = await getWorksheet(id);
      if (ws) {
        setWorksheet(ws);
        setHistory([ws]);
        setHistoryIndex(0);
        setZoom(ws.zoom || 1);
        setPan({ x: ws.panX ?? 40, y: ws.panY ?? 40 });
        setSelection(null);
      }
    } catch (err) {
      console.error('Error opening diagram:', err);
    }
  };

  const handleDeleteWorksheet = async (id: string) => {
    try {
      await deleteWorksheet(id);
      const remaining = await listWorksheets();
      setWorksheetsList(remaining);

      if (worksheet?.id === id) {
        if (remaining.length > 0) {
          handleOpenWorksheet(remaining[0].id);
        } else {
          const nextIdx = await getNextWorksheetIndex();
          const newWs = createSampleWorksheet(`unnamed_${nextIdx}`, 'pgsql');
          await saveWorksheet(newWs);
          setWorksheet(newWs);
          setHistory([newWs]);
          setHistoryIndex(0);
          setWorksheetsList([newWs]);
          setSelection(null);
        }
      }
    } catch (err) {
      console.error('Error deleting diagram:', err);
    }
  };

  const handleDuplicateWorksheet = async (wsToDuplicate: Worksheet) => {
    try {
      const nextIdx = await getNextWorksheetIndex();
      const duplicated: Worksheet = {
        ...wsToDuplicate,
        id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: `${wsToDuplicate.name}_copy`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveWorksheet(duplicated);
      const list = await listWorksheets();
      setWorksheetsList(list);
      setWorksheet(duplicated);
      setHistory([duplicated]);
      setHistoryIndex(0);
      setZoom(duplicated.zoom || 1);
      setPan({ x: duplicated.panX ?? 40, y: duplicated.panY ?? 40 });
      setSelection(null);
    } catch (err) {
      console.error('Error duplicating diagram:', err);
    }
  };

  const handleRenameSavedWorksheet = async (id: string, newName: string) => {
    try {
      const target = worksheetsList.find((w) => w.id === id);
      if (target) {
        const updated = { ...target, name: newName, updatedAt: Date.now() };
        await saveWorksheet(updated);
        const list = await listWorksheets();
        setWorksheetsList(list);
        if (worksheet?.id === id) {
          setWorksheet(updated);
          pushSnapshot(updated);
        }
      }
    } catch (err) {
      console.error('Error renaming diagram:', err);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(+(z + 0.15).toFixed(2), 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(+(z - 0.15).toFixed(2), 0.3));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 50, y: 50 });
  };

  const handleFitToScreen = () => {
    if (!worksheet || worksheet.tables.length === 0) {
      handleZoomReset();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    worksheet.tables.forEach((t) => {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + 280);
      maxY = Math.max(maxY, t.y + 44 + t.columns.length * 30 + 40);
    });

    const padding = 80;
    const boundsW = maxX - minX + padding * 2;
    const boundsH = maxY - minY + padding * 2;

    const viewportW = window.innerWidth - (showPropertyBar ? 320 : 0);
    const viewportH = window.innerHeight - 56;

    const calculatedZoom = Math.min(
      Math.max(Math.min(viewportW / boundsW, viewportH / boundsH), 0.35),
      1.5
    );

    const centerCanvasX = (viewportW - boundsW * calculatedZoom) / 2;
    const centerCanvasY = (viewportH - boundsH * calculatedZoom) / 2;

    setZoom(+calculatedZoom.toFixed(2));
    setPan({
      x: Math.round(centerCanvasX - minX * calculatedZoom + padding * calculatedZoom),
      y: Math.round(centerCanvasY - minY * calculatedZoom + padding * calculatedZoom),
    });
  };

  if (isLoading || !worksheet) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0b1120] text-slate-300">
        <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading Database Diagrammer...</p>
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden font-sans transition-colors ${
        isDark ? 'bg-[#0b1120] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* Top Toolbar */}
      <Toolbar
        worksheet={worksheet}
        theme={theme}
        onToggleTheme={toggleTheme}
        showPropertyBar={showPropertyBar}
        onTogglePropertyBar={() => setShowPropertyBar(!showPropertyBar)}
        onRenameWorksheet={handleRenameWorksheet}
        onDialectChange={handleDialectChange}
        onAddTable={handleAddTable}
        onManualSave={handleManualSave}
        onOpenWorksheetsModal={() => setShowWorksheetsModal(true)}
        onOpenExportModal={() => setShowExportModal(true)}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onFitToScreen={handleFitToScreen}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Main Diagram Canvas + Right Property Bar */}
      <div className="grow flex relative overflow-hidden">
        <main className="grow relative overflow-hidden h-full">
          <Canvas
            worksheet={worksheet}
            theme={theme}
            selection={selection}
            onSelectTarget={handleSelectTarget}
            onUpdateWorksheet={handleUpdateWorksheet}
            pan={pan}
            zoom={zoom}
            onPanChange={setPan}
            onZoomChange={setZoom}
            onSnapshot={pushSnapshot}
          />
        </main>

        {/* Right Sidebar Property Bar (No popups) */}
        {showPropertyBar && (
          <PropertyBar
            worksheet={worksheet}
            selection={selection}
            theme={theme}
            onClose={() => setShowPropertyBar(false)}
            onUpdateWorksheet={handleUpdateWorksheet}
            onDeleteTable={handleDeleteTable}
            onDuplicateTable={handleDuplicateTable}
            onDeleteColumn={handleDeleteColumn}
            onDuplicateColumn={handleDuplicateColumn}
            onDeleteRelation={handleDeleteRelation}
          />
        )}
      </div>

      {/* Worksheets / Diagrams Browser Modal */}
      {showWorksheetsModal && (
        <WorksheetsModal
          worksheets={worksheetsList}
          activeWorksheetId={worksheet.id}
          onClose={() => setShowWorksheetsModal(false)}
          onOpen={handleOpenWorksheet}
          onNew={handleNewWorksheet}
          onDelete={handleDeleteWorksheet}
          onDuplicate={handleDuplicateWorksheet}
          onRename={handleRenameSavedWorksheet}
        />
      )}

      {/* Export Options Modal (SVG, Markdown, Mermaid, SQL) */}
      {showExportModal && (
        <ExportModal
          worksheet={worksheet}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
