import { Worksheet } from '../types/database';

export const PORTABLE_FILE_VERSION = '1.0';
export const PORTABLE_FILE_EXTENSION = '.sqldiagram';

export interface PortableDiagramFile {
  format: 'sql-diagrammer';
  version: string;
  exportedAt: string;
  worksheet: Worksheet;
}

/**
 * Serializes a worksheet into a portable JSON string.
 */
export function exportToPortableJSON(worksheet: Worksheet): string {
  const fileData: PortableDiagramFile = {
    format: 'sql-diagrammer',
    version: PORTABLE_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    worksheet: {
      ...worksheet,
      updatedAt: Date.now(),
    },
  };
  return JSON.stringify(fileData, null, 2);
}

/**
 * Validates and imports a portable file JSON text or object.
 * Returns the parsed Worksheet or throws a descriptive error.
 */
export function parsePortableFile(jsonText: string): Worksheet {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error('Invalid JSON format: Failed to parse diagram file.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid diagram file: File content is empty or malformed.');
  }

  const obj = parsed as Record<string, unknown>;

  // Check if format is wrapped PortableDiagramFile or raw Worksheet
  let rawWs: unknown = obj;
  if (obj.format === 'sql-diagrammer' && obj.worksheet) {
    rawWs = obj.worksheet;
  }

  const ws = rawWs as Partial<Worksheet>;

  if (!ws || typeof ws !== 'object') {
    throw new Error('Diagram file does not contain a valid worksheet.');
  }

  if (!ws.name || typeof ws.name !== 'string') {
    throw new Error('Diagram file missing a valid name.');
  }

  if (!Array.isArray(ws.tables)) {
    throw new Error('Diagram file is missing table definitions.');
  }

  if (!Array.isArray(ws.relations)) {
    throw new Error('Diagram file is missing relationship definitions.');
  }

  const dialect = ws.dialect === 'mysql' ? 'mysql' : 'pgsql';

  // Generate fresh unique ID so importing doesn't accidentally overwrite an unrelated local diagram
  const newId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const importedWorksheet: Worksheet = {
    id: newId,
    name: ws.name,
    dialect,
    tables: ws.tables.map((tbl) => ({
      ...tbl,
      id: tbl.id || `tbl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: tbl.name || 'unnamed_table',
      x: typeof tbl.x === 'number' ? tbl.x : 100,
      y: typeof tbl.y === 'number' ? tbl.y : 100,
      color: tbl.color || '#0284c7',
      columns: Array.isArray(tbl.columns)
        ? tbl.columns.map((col) => ({
            ...col,
            id: col.id || `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: col.name || 'column',
            type: col.type || 'VARCHAR(255)',
            isPrimaryKey: !!col.isPrimaryKey,
            isForeignKey: !!col.isForeignKey,
            isUnique: !!col.isUnique,
            isNullable: col.isNullable !== false,
            isAutoIncrement: !!col.isAutoIncrement,
          }))
        : [],
      indexes: Array.isArray(tbl.indexes) ? tbl.indexes : [],
      notes: typeof tbl.notes === 'string' ? tbl.notes : '',
    })),
    relations: ws.relations.map((rel) => ({
      ...rel,
      id: rel.id || `rel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cardinality: rel.cardinality || 'one-to-many',
      routing: rel.routing || 'orthogonal',
      bendOffset: typeof rel.bendOffset === 'number' ? rel.bendOffset : 0,
      waypoints: Array.isArray(rel.waypoints) ? rel.waypoints : undefined,
    })),
    customTypes: Array.isArray(ws.customTypes) ? ws.customTypes : [],
    createdAt: typeof ws.createdAt === 'number' ? ws.createdAt : Date.now(),
    updatedAt: Date.now(),
    zoom: typeof ws.zoom === 'number' ? ws.zoom : 1,
    panX: typeof ws.panX === 'number' ? ws.panX : 40,
    panY: typeof ws.panY === 'number' ? ws.panY : 40,
  };

  return importedWorksheet;
}

