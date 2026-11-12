import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Table,
  Column,
  Relation,
  Worksheet,
  ThemeMode,
  Point,
} from '../types/database';
import { TableCard } from './TableCard';
import { SelectionTarget } from './PropertyBar';
import {
  generateDefaultOrthogonalPoints,
  cleanAndMergeWaypoints,
  moveOrthogonalSegment,
  moveWaypoint,
  pointsToSvgPath,
  isNear,
  MIN_STUB,
} from '../lib/orthogonalRouter';

interface CanvasProps {
  worksheet: Worksheet;
  theme: ThemeMode;
  selection: SelectionTarget;
  onSelectTarget: (target: SelectionTarget) => void;
  onUpdateWorksheet: (updater: Worksheet | ((prev: Worksheet) => Worksheet)) => void;
  pan: { x: number; y: number };
  zoom: number;
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onSnapshot: (ws: Worksheet) => void;
}

const TABLE_WIDTH = 260;
const HEADER_HEIGHT = 38;
const ROW_HEIGHT = 28;

export const Canvas: React.FC<CanvasProps> = ({
  worksheet,
  theme,
  selection,
  onSelectTarget,
  onUpdateWorksheet,
  pan,
  zoom,
  onPanChange,
  onZoomChange,
  onSnapshot,
}) => {
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredRelationId, setHoveredRelationId] = useState<string | null>(null);

  // Line drawing state
  const [connectingSource, setConnectingSource] = useState<{
    tableId: string;
    columnId: string;
    startX: number;
    startY: number;
    mouseMoved?: boolean;
  } | null>(null);

  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs for tracking active gestures without stale closure
  const panRef = useRef(pan);
  panRef.current = pan;

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const worksheetRef = useRef(worksheet);
  worksheetRef.current = worksheet;

  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });

  // Table dragging state
  const draggedTableRef = useRef<{
    tableId: string;
    startX: number;
    startY: number;
    startMouseX: number;
    startMouseY: number;
  } | null>(null);

  // Bend dragging state (legacy corridor slider)
  const draggingBendRef = useRef<{
    relationId: string;
    initialBend: number;
    startMouseX: number;
  } | null>(null);

  // Draw.io Orthogonal Segment / Waypoint dragging state
  const draggingSegmentRef = useRef<{
    relationId: string;
    segmentIndex: number;
    initialPoints: Point[];
    isVertical: boolean;
    startMouseX: number;
    startMouseY: number;
    sSide: 'left' | 'right';
    tSide: 'left' | 'right';
  } | null>(null);

  const draggingWaypointRef = useRef<{
    relationId: string;
    waypointIndex: number;
    initialPoints: Point[];
    startMouseX: number;
    startMouseY: number;
    sSide: 'left' | 'right';
    tSide: 'left' | 'right';
  } | null>(null);

  const rafRef = useRef<number | null>(null);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;
    const x = (clientX - rect.left - currentPan.x) / currentZoom;
    const y = (clientY - rect.top - currentPan.y) / currentZoom;
    return { x, y };
  }, []);

  // Calculate coordinates for column connector port
  const getPortPosition = useCallback(
    (tableId: string, colId: string, side: 'left' | 'right') => {
      const table = worksheet.tables.find((t) => t.id === tableId);
      if (!table) return { x: 0, y: 0 };
      const colIndex = table.columns.findIndex((c) => c.id === colId);
      const idx = colIndex >= 0 ? colIndex : 0;
      const y = table.y + HEADER_HEIGHT + idx * ROW_HEIGHT + ROW_HEIGHT / 2 + 3;
      const x = side === 'left' ? table.x : table.x + TABLE_WIDTH;
      return { x, y };
    },
    [worksheet.tables]
  );

  // Complete relationship creation
  const handleEndConnecting = useCallback(
    (targetTableId: string, targetColId: string) => {
      if (!connectingSource) return;

      const srcTableId = connectingSource.tableId;
      const srcColId = connectingSource.columnId;

      // Prevent connecting to the exact same column
      if (srcTableId === targetTableId && srcColId === targetColId) {
        setConnectingSource(null);
        return;
      }

      const currentWs = worksheetRef.current;
      const exists = currentWs.relations.some(
        (r) =>
          r.sourceTableId === srcTableId &&
          r.sourceColumnId === srcColId &&
          r.targetTableId === targetTableId &&
          r.targetColumnId === targetColId
      );

      if (!exists) {
        const newRelation: Relation = {
          id: `rel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          sourceTableId: srcTableId,
          sourceColumnId: srcColId,
          targetTableId: targetTableId,
          targetColumnId: targetColId,
          cardinality: 'one-to-many',
          routing: 'orthogonal', // Straight lines with 90° bends
          bendOffset: 0,
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          color: isDark ? '#38bdf8' : '#2563eb',
        };

        const updatedTables = currentWs.tables.map((t) => {
          if (t.id === targetTableId) {
            return {
              ...t,
              columns: t.columns.map((c) =>
                c.id === targetColId ? { ...c, isForeignKey: true } : c
              ),
            };
          }
          return t;
        });

        const newWs: Worksheet = {
          ...currentWs,
          tables: updatedTables,
          relations: [...currentWs.relations, newRelation],
        };

        onSnapshot(newWs);
        onUpdateWorksheet(newWs);
        onSelectTarget({ type: 'relation', relationId: newRelation.id });
      }

      setConnectingSource(null);
    },
    [connectingSource, isDark, onSnapshot, onUpdateWorksheet, onSelectTarget]
  );

  // Real-time Window-level mouse listeners
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      // 1. Real-time Table Dragging
      if (draggedTableRef.current) {
        const { tableId, startX, startY, startMouseX, startMouseY } = draggedTableRef.current;
        const currentZoom = zoomRef.current;
        const dx = (e.clientX - startMouseX) / currentZoom;
        const dy = (e.clientY - startMouseY) / currentZoom;
        const newX = Math.round(startX + dx);
        const newY = Math.round(startY + dy);

        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
          onUpdateWorksheet((prev) => ({
            ...prev,
            tables: prev.tables.map((t) => (t.id === tableId ? { ...t, x: newX, y: newY } : t)),
          }));
        });
      }

      // 2. Real-time Bend Distance Dragging
      if (draggingBendRef.current) {
        const { relationId, initialBend, startMouseX } = draggingBendRef.current;
        const currentZoom = zoomRef.current;
        const deltaX = (e.clientX - startMouseX) / currentZoom;
        const newBend = Math.round(initialBend + deltaX);

        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
          onUpdateWorksheet((prev) => ({
            ...prev,
            relations: prev.relations.map((r) =>
              r.id === relationId ? { ...r, bendOffset: newBend } : r
            ),
          }));
        });
      }

      // 2b. Real-time Orthogonal Segment Dragging (draw.io style)
      if (draggingSegmentRef.current) {
        const {
          relationId,
          segmentIndex,
          initialPoints,
          isVertical,
          startMouseX,
          startMouseY,
          sSide,
          tSide,
        } = draggingSegmentRef.current;
        const currentZoom = zoomRef.current;

        const currentP1 = initialPoints[segmentIndex];
        const newCoord = isVertical
          ? currentP1.x + (e.clientX - startMouseX) / currentZoom
          : currentP1.y + (e.clientY - startMouseY) / currentZoom;

        const updatedPoints = moveOrthogonalSegment(
          initialPoints,
          segmentIndex,
          newCoord,
          sSide,
          tSide
        );

        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
          onUpdateWorksheet((prev) => ({
            ...prev,
            relations: prev.relations.map((r) =>
              r.id === relationId ? { ...r, waypoints: updatedPoints } : r
            ),
          }));
        });
      }

      // 2c. Real-time Waypoint Vertex Dragging
      if (draggingWaypointRef.current) {
        const {
          relationId,
          waypointIndex,
          initialPoints,
          startMouseX,
          startMouseY,
          sSide,
          tSide,
        } = draggingWaypointRef.current;
        const currentZoom = zoomRef.current;
        const initPt = initialPoints[waypointIndex];
        const newX = initPt.x + (e.clientX - startMouseX) / currentZoom;
        const newY = initPt.y + (e.clientY - startMouseY) / currentZoom;

        const updatedPoints = moveWaypoint(
          initialPoints,
          waypointIndex,
          newX,
          newY,
          sSide,
          tSide
        );

        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
          onUpdateWorksheet((prev) => ({
            ...prev,
            relations: prev.relations.map((r) =>
              r.id === relationId ? { ...r, waypoints: updatedPoints } : r
            ),
          }));
        });
      }

      // 3. Canvas Panning
      if (isPanningRef.current) {
        const dx = e.clientX - lastPanPosRef.current.x;
        const dy = e.clientY - lastPanPosRef.current.y;
        lastPanPosRef.current = { x: e.clientX, y: e.clientY };
        const currentPan = panRef.current;
        onPanChange({ x: currentPan.x + dx, y: currentPan.y + dy });
      }

      // 4. Drawing Line
      if (connectingSource) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setMouseCanvasPos(canvasPos);
        if (!connectingSource.mouseMoved) {
          connectingSource.mouseMoved = true;
        }
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (draggedTableRef.current) {
        onSnapshot(worksheetRef.current);
        draggedTableRef.current = null;
      }
      if (draggingBendRef.current) {
        onSnapshot(worksheetRef.current);
        draggingBendRef.current = null;
      }
      if (draggingSegmentRef.current) {
        const { relationId, sSide, tSide } = draggingSegmentRef.current;
        const currentRel = worksheetRef.current.relations.find((r) => r.id === relationId);
        if (currentRel?.waypoints) {
          const finalCleaned = cleanAndMergeWaypoints(currentRel.waypoints, sSide, tSide);
          onUpdateWorksheet((prev) => ({
            ...prev,
            relations: prev.relations.map((r) =>
              r.id === relationId ? { ...r, waypoints: finalCleaned } : r
            ),
          }));
        }
        onSnapshot(worksheetRef.current);
        draggingSegmentRef.current = null;
      }
      if (draggingWaypointRef.current) {
        const { relationId, sSide, tSide } = draggingWaypointRef.current;
        const currentRel = worksheetRef.current.relations.find((r) => r.id === relationId);
        if (currentRel?.waypoints) {
          const finalCleaned = cleanAndMergeWaypoints(currentRel.waypoints, sSide, tSide);
          onUpdateWorksheet((prev) => ({
            ...prev,
            relations: prev.relations.map((r) =>
              r.id === relationId ? { ...r, waypoints: finalCleaned } : r
            ),
          }));
        }
        onSnapshot(worksheetRef.current);
        draggingWaypointRef.current = null;
      }
      if (isPanningRef.current) {
        isPanningRef.current = false;
      }

      // If user was dragging a line and released mouse:
      if (connectingSource && connectingSource.mouseMoved) {
        const elem = document.elementFromPoint(e.clientX, e.clientY);
        const anchor =
          elem?.closest('[data-anchor-port="true"]') || elem?.closest('[data-col-row="true"]');
        if (anchor) {
          const targetTableId = anchor.getAttribute('data-table-id');
          const targetColId = anchor.getAttribute('data-col-id');
          if (targetTableId && targetColId) {
            handleEndConnecting(targetTableId, targetColId);
            return;
          }
        }
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [connectingSource, screenToCanvas, onPanChange, onUpdateWorksheet, onSnapshot, handleEndConnecting]);

  // Keyboard shortcuts (Delete, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Delete or Backspace: Priority is COLUMN -> RELATION -> TABLE
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection?.type === 'column') {
          e.preventDefault();
          deleteColumn(selection.tableId, selection.columnId);
        } else if (selection?.type === 'relation') {
          e.preventDefault();
          deleteRelation(selection.relationId);
        } else if (selection?.type === 'table') {
          e.preventDefault();
          deleteTable(selection.tableId);
        }
      }

      // Escape: Deselect or cancel connecting
      if (e.key === 'Escape') {
        setConnectingSource(null);
        onSelectTarget(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, worksheet, onSelectTarget]);

  // Canvas Mouse Down: Canvas Panning or Deselect
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    if (
      target.closest('[data-table-card="true"]') ||
      target.closest('button, input, select, textarea, aside')
    ) {
      return;
    }

    if (connectingSource) {
      setConnectingSource(null);
    }

    if (e.button === 0 || e.button === 1) {
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      onSelectTarget(null);
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.25), 2.5);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const newPanX = mouseX - (mouseX - currentPan.x) * (newZoom / currentZoom);
      const newPanY = mouseY - (mouseY - currentPan.y) * (newZoom / currentZoom);

      onPanChange({ x: newPanX, y: newPanY });
      onZoomChange(newZoom);
    }
  };

  // Start dragging a table
  const handleStartDragTable = (e: React.MouseEvent, tableId: string) => {
    const table = worksheet.tables.find((t) => t.id === tableId);
    if (!table) return;

    draggedTableRef.current = {
      tableId,
      startX: table.x,
      startY: table.y,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
    };
  };

  // Start dragging a line's bend handle (draw.io style)
  const handleStartDragBend = (e: React.MouseEvent, relation: Relation) => {
    e.stopPropagation();
    e.preventDefault();
    draggingBendRef.current = {
      relationId: relation.id,
      initialBend: relation.bendOffset || 0,
      startMouseX: e.clientX,
    };
  };

  // Start dragging an orthogonal segment (draw.io style interactive line adjustments)
  const handleStartDragSegment = (
    e: React.MouseEvent,
    relationId: string,
    segmentIndex: number,
    points: Point[],
    isVertical: boolean,
    sSide: 'left' | 'right',
    tSide: 'left' | 'right'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    draggingSegmentRef.current = {
      relationId,
      segmentIndex,
      initialPoints: points,
      isVertical,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      sSide,
      tSide,
    };
  };

  // Start dragging a waypoint vertex
  const handleStartDragWaypoint = (
    e: React.MouseEvent,
    relationId: string,
    waypointIndex: number,
    points: Point[],
    sSide: 'left' | 'right',
    tSide: 'left' | 'right'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    draggingWaypointRef.current = {
      relationId,
      waypointIndex,
      initialPoints: points,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      sSide,
      tSide,
    };
  };

  // Table operations
  const updateTable = (updatedTable: Table) => {
    const nextWs = {
      ...worksheet,
      tables: worksheet.tables.map((t) => (t.id === updatedTable.id ? updatedTable : t)),
    };
    onSnapshot(nextWs);
    onUpdateWorksheet(nextWs);
  };

  const deleteTable = (tableId: string) => {
    const nextWs = {
      ...worksheet,
      tables: worksheet.tables.filter((t) => t.id !== tableId),
      relations: worksheet.relations.filter(
        (r) => r.sourceTableId !== tableId && r.targetTableId !== tableId
      ),
    };
    onSnapshot(nextWs);
    onUpdateWorksheet(nextWs);
    if (selection?.type === 'table' && selection.tableId === tableId) {
      onSelectTarget(null);
    }
  };

  const duplicateTable = (tableId: string) => {
    const srcTable = worksheet.tables.find((t) => t.id === tableId);
    if (!srcTable) return;

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
      ...worksheet,
      tables: [...worksheet.tables, clonedTable],
    };
    onSnapshot(nextWs);
    onUpdateWorksheet(nextWs);
    onSelectTarget({ type: 'table', tableId: newTableId });
  };

  const duplicateColumn = (tableId: string, col: Column) => {
    const table = worksheet.tables.find((t) => t.id === tableId);
    if (!table) return;

    const colIndex = table.columns.findIndex((c) => c.id === col.id);
    const newCol: Column = {
      ...col,
      id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: col.name, // Keep original name unchanged
      isPrimaryKey: false,
    };

    const newColumns = [...table.columns];
    const insertIdx = colIndex >= 0 ? colIndex + 1 : newColumns.length;
    newColumns.splice(insertIdx, 0, newCol); // Insert immediately next to original column

    const nextWs = {
      ...worksheet,
      tables: worksheet.tables.map((t) =>
        t.id === tableId ? { ...t, columns: newColumns } : t
      ),
    };
    onSnapshot(nextWs);
    onUpdateWorksheet(nextWs);
    onSelectTarget({ type: 'column', tableId, columnId: newCol.id });
  };

  const deleteColumn = (tableId: string, columnId: string) => {
    const nextWs = {
      ...worksheet,
      tables: worksheet.tables.map((t) =>
        t.id === tableId ? { ...t, columns: t.columns.filter((c) => c.id !== columnId) } : t
      ),
      relations: worksheet.relations.filter(
        (r) =>
          !(
            (r.sourceTableId === tableId && r.sourceColumnId === columnId) ||
            (r.targetTableId === tableId && r.targetColumnId === columnId)
          )
      ),
    };
    onSnapshot(nextWs);
    onUpdateWorksheet(nextWs);
    if (selection?.type === 'column' && selection.columnId === columnId) {
      onSelectTarget(null);
    }
  };

  const deleteRelation = (relationId: string) => {
    const nextWs = {
      ...worksheet,
      relations: worksheet.relations.filter((r) => r.id !== relationId),
    };
    onSnapshot(nextWs);
    onUpdateWorksheet(nextWs);
    if (selection?.type === 'relation' && selection.relationId === relationId) {
      onSelectTarget(null);
    }
  };

  const handleColumnReorder = (tableId: string, fromIndex: number, toIndex: number) => {
    const table = worksheet.tables.find((t) => t.id === tableId);
    if (!table) return;

    const newCols = [...table.columns];
    const [moved] = newCols.splice(fromIndex, 1);
    newCols.splice(toIndex, 0, moved);

    const nextWs = {
      ...worksheet,
      tables: worksheet.tables.map((t) => (t.id === tableId ? { ...t, columns: newCols } : t)),
    };
    onSnapshot(nextWs);
    onUpdateWorksheet(nextWs);
  };

  // Start connecting: recorded for both drag and click
  const handleStartConnecting = (
    tableId: string,
    columnId: string,
    startXScreen: number,
    startYScreen: number
  ) => {
    const canvasPos = screenToCanvas(startXScreen, startYScreen);
    setConnectingSource({
      tableId,
      columnId,
      startX: canvasPos.x,
      startY: canvasPos.y,
      mouseMoved: false,
    });
    setMouseCanvasPos(canvasPos);
  };

  // Background style
  const canvasBgStyle = isDark
    ? {
      backgroundColor: '#0b1120',
      backgroundImage: `radial-gradient(circle, #334155 1px, transparent 1px)`,
      backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
      backgroundPosition: `${pan.x}px ${pan.y}px`,
    }
    : {
      backgroundColor: '#ffffff',
      backgroundImage: `linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)`,
      backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
      backgroundPosition: `${pan.x}px ${pan.y}px`,
    };

  const selectedRelId = selection?.type === 'relation' ? selection.relationId : null;
  const selectedTableId = selection?.type === 'table' ? selection.tableId : null;
  const selectedColId = selection?.type === 'column' ? selection.columnId : null;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheel}
      className="relative w-full h-full overflow-hidden select-none cursor-default transition-colors duration-150"
      style={canvasBgStyle}
    >
      {/* Scaled & Panned Canvas Layer */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {/* SVG Overlay for Relationship Lines */}
        <svg
          className="absolute inset-0 overflow-visible"
          style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <defs>
            <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render Existing Relations (NO ARROWS) */}
          {worksheet.relations.map((rel) => {
            const isSelf = rel.sourceTableId === rel.targetTableId;
            const sTable = worksheet.tables.find((t) => t.id === rel.sourceTableId);
            const tTable = worksheet.tables.find((t) => t.id === rel.targetTableId);
            if (!sTable || !tTable) return null;

            let sSide: 'left' | 'right' = 'right';
            let tSide: 'left' | 'right' = 'left';

            if (isSelf) {
              sSide = 'right';
              tSide = 'right';
            } else if (sTable.x > tTable.x + TABLE_WIDTH) {
              sSide = 'left';
              tSide = 'right';
            } else if (sTable.x + TABLE_WIDTH < tTable.x) {
              sSide = 'right';
              tSide = 'left';
            } else {
              sSide = 'right';
              tSide = 'right';
            }

            const p1 = getPortPosition(rel.sourceTableId, rel.sourceColumnId, sSide);
            const p2 = getPortPosition(rel.targetTableId, rel.targetColumnId, tSide);

            const bend = rel.bendOffset || 0;
            const routing = rel.routing || 'orthogonal';

            let pathD = '';
            let handlePos = { x: 0, y: 0 };
            let cardPos = { x: 0, y: 0 };
            let activePoints: Point[] = [];

            if (routing === 'bezier') {
              if (isSelf) {
                const loopOffset = 60 + bend;
                pathD = `M ${p1.x} ${p1.y} C ${p1.x + loopOffset} ${p1.y - 40}, ${p2.x + loopOffset} ${p2.y + 40}, ${p2.x} ${p2.y}`;
                cardPos = { x: Math.max(p1.x, p2.x) + loopOffset * 0.7, y: (p1.y + p2.y) / 2 };
                handlePos = cardPos;
              } else {
                const dx = Math.abs(p2.x - p1.x);
                const curvature = Math.max(dx * 0.5 + bend, 40);
                const c1x = sSide === 'right' ? p1.x + curvature : p1.x - curvature;
                const c2x = tSide === 'left' ? p2.x - curvature : p2.x + curvature;
                pathD = `M ${p1.x} ${p1.y} C ${c1x} ${p1.y}, ${c2x} ${p2.y}, ${p2.x} ${p2.y}`;
                cardPos = { x: (p1.x + p2.x) / 2 + bend, y: (p1.y + p2.y) / 2 };
                handlePos = cardPos;
              }
            } else {
              // Draw.io style orthogonal lines with interactive segment dragging & waypoint generation
              if (rel.waypoints && rel.waypoints.length >= 2) {
                // If tables moved, adapt the start and end points to anchor coordinates and maintain 90-degree angles
                const pts = [...rel.waypoints];
                pts[0] = { x: p1.x, y: p1.y };
                if (pts.length >= 2) {
                  // Keep first segment orthogonal
                  pts[1] = { x: pts[1].x, y: p1.y };
                }
                pts[pts.length - 1] = { x: p2.x, y: p2.y };
                if (pts.length >= 3) {
                  // Keep last segment orthogonal
                  pts[pts.length - 2] = { x: pts[pts.length - 2].x, y: p2.y };
                }
                activePoints = cleanAndMergeWaypoints(pts, sSide, tSide);
              } else {
                activePoints = generateDefaultOrthogonalPoints(p1, sSide, p2, tSide, bend, isSelf);
              }

              pathD = pointsToSvgPath(activePoints);
              const midIdx = Math.floor(activePoints.length / 2);
              cardPos = activePoints[midIdx] || { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
            }

            const lineColor = rel.color || (isDark ? '#38bdf8' : '#2563eb');
            const isHovered = hoveredRelationId === rel.id;
            const isSelectedRel = selectedRelId === rel.id;
            const cardText =
              rel.cardinality === 'one-to-one' ? '1:1' : rel.cardinality === 'many-to-many' ? 'N:M' : '1:N';

            return (
              <g key={rel.id} className="cursor-pointer" style={{ pointerEvents: 'auto' }}>
                {/* Thick hit area */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="18"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTarget({ type: 'relation', relationId: rel.id });
                  }}
                  onMouseEnter={() => setHoveredRelationId(rel.id)}
                  onMouseLeave={() => setHoveredRelationId(null)}
                />

                {/* Visible orthogonal / bezier path (NO ARROW) */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={isSelectedRel ? '3.5' : isHovered ? '2.8' : '2'}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={isSelectedRel || isHovered ? 1 : 0.9}
                  filter={isSelectedRel || isHovered ? 'url(#line-glow)' : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTarget({ type: 'relation', relationId: rel.id });
                  }}
                  onMouseEnter={() => setHoveredRelationId(rel.id)}
                  onMouseLeave={() => setHoveredRelationId(null)}
                />

                {/* Bezier bend handle */}
                {routing === 'bezier' && (isHovered || isSelectedRel) && (
                  <g
                    transform={`translate(${handlePos.x}, ${handlePos.y})`}
                    onMouseDown={(e) => handleStartDragBend(e, rel)}
                    className="cursor-ew-resize select-none"
                  >
                    <title>Drag to adjust curve</title>
                    <circle
                      r="6"
                      fill="#0284c7"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="shadow hover:scale-125 transition-transform"
                    />
                  </g>
                )}

                {/* Draw.io Orthogonal Segment Midpoint Drag Handles (Generate new waypoints on drag) */}
                {routing === 'orthogonal' && (isHovered || isSelectedRel) && activePoints.length >= 2 && (
                  <g className="orthogonal-segment-handles">
                    {activePoints.slice(0, -1).map((ptA, segIdx) => {
                      const ptB = activePoints[segIdx + 1];
                      const isVertical = isNear(ptA.x, ptB.x, 4);
                      const midSegX = (ptA.x + ptB.x) / 2;
                      const midSegY = (ptA.y + ptB.y) / 2;

                      return (
                        <g
                          key={`seg_${segIdx}`}
                          transform={`translate(${midSegX}, ${midSegY})`}
                          onMouseDown={(e) =>
                            handleStartDragSegment(
                              e,
                              rel.id,
                              segIdx,
                              activePoints,
                              isVertical,
                              sSide,
                              tSide
                            )
                          }
                          className={`${
                            isVertical ? 'cursor-ew-resize' : 'cursor-ns-resize'
                          } select-none group`}
                        >
                          <title>
                            {isVertical
                              ? 'Drag vertical segment horizontally (draw.io style)'
                              : 'Drag horizontal segment vertically (draw.io style)'}
                          </title>
                          {/* Segment handle bar */}
                          {isVertical ? (
                            <rect
                              x="-4"
                              y="-8"
                              width="8"
                              height="16"
                              rx="3"
                              fill={isDark ? '#0284c7' : '#0284c7'}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                              className="shadow-md hover:scale-125 transition-transform"
                            />
                          ) : (
                            <rect
                              x="-8"
                              y="-4"
                              width="16"
                              height="8"
                              rx="3"
                              fill={isDark ? '#0284c7' : '#0284c7'}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                              className="shadow-md hover:scale-125 transition-transform"
                            />
                          )}
                        </g>
                      );
                    })}

                    {/* Waypoint Vertices (Drag to adjust corner position) */}
                    {activePoints.slice(1, -1).map((pt, wpIdx) => (
                      <g
                        key={`wp_${wpIdx}`}
                        transform={`translate(${pt.x}, ${pt.y})`}
                        onMouseDown={(e) =>
                          handleStartDragWaypoint(
                            e,
                            rel.id,
                            wpIdx + 1,
                            activePoints,
                            sSide,
                            tSide
                          )
                        }
                        className="cursor-move select-none"
                      >
                        <title>Drag corner waypoint</title>
                        <circle
                          r="5.5"
                          fill="#ffffff"
                          stroke={isDark ? '#0284c7' : '#0284c7'}
                          strokeWidth="2"
                          className="shadow hover:scale-125 transition-transform"
                        />
                      </g>
                    ))}
                  </g>
                )}

                {/* Cardinality badge on line */}
                <g
                  transform={`translate(${cardPos.x}, ${cardPos.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTarget({ type: 'relation', relationId: rel.id });
                  }}
                  onMouseEnter={() => setHoveredRelationId(rel.id)}
                  onMouseLeave={() => setHoveredRelationId(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x="-18"
                    y="-9"
                    width="36"
                    height="18"
                    rx="4"
                    fill={isDark ? '#0f172a' : '#ffffff'}
                    stroke={lineColor}
                    strokeWidth={isSelectedRel ? '2' : '1.2'}
                    className="shadow-sm"
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill={isDark ? '#e2e8f0' : '#1e293b'}
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {cardText}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Interactive drawing line preview (NO ARROW) */}
          {connectingSource && (
            <path
              d={`M ${connectingSource.startX} ${connectingSource.startY} L ${(connectingSource.startX + mouseCanvasPos.x) / 2
                } ${connectingSource.startY} L ${(connectingSource.startX + mouseCanvasPos.x) / 2
                } ${mouseCanvasPos.y} L ${mouseCanvasPos.x} ${mouseCanvasPos.y}`}
              fill="none"
              stroke={isDark ? '#38bdf8' : '#0284c7'}
              strokeWidth="2.5"
              strokeDasharray="5,4"
              className="animate-pulse"
            />
          )}
        </svg>

        {/* Tables Container */}
        <div style={{ pointerEvents: 'auto' }}>
          {worksheet.tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              dialect={worksheet.dialect}
              theme={theme}
              isSelected={selectedTableId === table.id && selectedColId === null}
              selectedColumnId={selectedColId}
              zoom={zoom}
              onSelect={() => onSelectTarget({ type: 'table', tableId: table.id })}
              onSelectColumn={(col) =>
                onSelectTarget({ type: 'column', tableId: table.id, columnId: col.id })
              }
              onUpdate={updateTable}
              onDelete={() => deleteTable(table.id)}
              onDuplicate={() => duplicateTable(table.id)}
              onStartConnecting={handleStartConnecting}
              onEndConnecting={handleEndConnecting}
              isConnecting={connectingSource !== null}
              connectingSourceColId={connectingSource?.columnId || null}
              onDuplicateColumn={(col) => duplicateColumn(table.id, col)}
              onStartDrag={handleStartDragTable}
              onColumnReorder={handleColumnReorder}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
