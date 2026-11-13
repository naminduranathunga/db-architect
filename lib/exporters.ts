import { Worksheet, Table, Relation, SqlDialect, TABLE_COLORS, Point } from '../types/database';
import { generateDefaultOrthogonalPoints, pointsToSvgPath } from './orthogonalRouter';

export function generateSQL(worksheet: Worksheet): string {
  const { dialect, tables, relations } = worksheet;
  const isPg = dialect === 'pgsql';
  const q = isPg ? '"' : '`';
  const lines: string[] = [];

  lines.push(`-- ========================================================`);
  lines.push(`-- Generated Database Schema for ${worksheet.name}`);
  lines.push(`-- Dialect: ${isPg ? 'PostgreSQL' : 'MySQL'}`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- ========================================================\n`);

  if (isPg) {
    lines.push(`-- Enable UUID extension if needed`);
    lines.push(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`);

    // Define PostgreSQL ENUMs / Custom Types
    if (worksheet.customTypes && worksheet.customTypes.length > 0) {
      lines.push(`-- --------------------------------------------------------`);
      lines.push(`-- Custom Types and Enums`);
      lines.push(`-- --------------------------------------------------------`);
      for (const ct of worksheet.customTypes) {
        if (ct.kind === 'ENUM') {
          const formattedVals = ct.values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');
          lines.push(`CREATE TYPE ${q}${ct.name}${q} AS ENUM (${formattedVals});`);
        }
      }
      lines.push('');
    }
  }

  // Create tables
  for (const table of tables) {
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`-- Table structure: ${table.name}`);
    if (table.notes) {
      lines.push(`-- Description: ${table.notes.replace(/\n/g, ' ')}`);
    }
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`CREATE TABLE ${q}${table.name}${q} (`);

    const colDefs: string[] = [];
    const pkCols: string[] = [];

    for (const col of table.columns) {
      let def = `  ${q}${col.name}${q} ${col.type}`;

      if (col.isPrimaryKey) {
        pkCols.push(`${q}${col.name}${q}`);
      }

      if (!col.isNullable) {
        def += ` NOT NULL`;
      }

      if (col.isAutoIncrement) {
        if (!isPg) {
          def += ` AUTO_INCREMENT`;
        }
      }

      if (col.defaultValue !== undefined && col.defaultValue.trim() !== '') {
        def += ` DEFAULT ${col.defaultValue}`;
      }

      if (col.isUnique && !col.isPrimaryKey) {
        def += ` UNIQUE`;
      }

      if (!isPg && col.comment) {
        def += ` COMMENT '${col.comment.replace(/'/g, "\\'")}'`;
      }

      colDefs.push(def);
    }

    if (pkCols.length > 0) {
      colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
    }

    lines.push(colDefs.join(',\n'));
    lines.push(`);\n`);

    // PostgreSQL Comments
    if (isPg) {
      if (table.notes) {
        lines.push(`COMMENT ON TABLE ${q}${table.name}${q} IS '${table.notes.replace(/'/g, "''")}';`);
      }
      for (const col of table.columns) {
        if (col.comment) {
          lines.push(`COMMENT ON COLUMN ${q}${table.name}${q}.${q}${col.name}${q} IS '${col.comment.replace(/'/g, "''")}';`);
        }
      }
      lines.push('');
    }

    // Indexes
    if (table.indexes && table.indexes.length > 0) {
      for (const idx of table.indexes) {
        const idxCols = idx.columns.map((c) => `${q}${c}${q}`).join(', ');
        if (idx.type === 'UNIQUE') {
          lines.push(`CREATE UNIQUE INDEX ${q}${idx.name}${q} ON ${q}${table.name}${q} (${idxCols});`);
        } else {
          lines.push(`CREATE INDEX ${q}${idx.name}${q} ON ${q}${table.name}${q} (${idxCols});`);
        }
      }
      lines.push('');
    }
  }

  // Foreign keys
  if (relations.length > 0) {
    lines.push(`-- --------------------------------------------------------`);
    lines.push(`-- Foreign Key Relationships`);
    lines.push(`-- --------------------------------------------------------`);

    for (const rel of relations) {
      const srcTable = tables.find((t) => t.id === rel.sourceTableId);
      const srcCol = srcTable?.columns.find((c) => c.id === rel.sourceColumnId);
      const tgtTable = tables.find((t) => t.id === rel.targetTableId);
      const tgtCol = tgtTable?.columns.find((c) => c.id === rel.targetColumnId);

      if (srcTable && srcCol && tgtTable && tgtCol) {
        const fkName = rel.name || `fk_${tgtTable.name}_${tgtCol.name}`;
        const onDelete = rel.onDelete ? ` ON DELETE ${rel.onDelete}` : '';
        const onUpdate = rel.onUpdate ? ` ON UPDATE ${rel.onUpdate}` : '';

        lines.push(
          `ALTER TABLE ${q}${tgtTable.name}${q} ADD CONSTRAINT ${q}${fkName}${q} ` +
          `FOREIGN KEY (${q}${tgtCol.name}${q}) REFERENCES ${q}${srcTable.name}${q} (${q}${srcCol.name}${q})` +
          `${onDelete}${onUpdate};`
        );
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function exportToMarkdown(worksheet: Worksheet): string {
  const { name, dialect, tables, relations } = worksheet;
  const isPg = dialect === 'pgsql';
  const md: string[] = [];

  md.push(`# Database Schema: ${name}\n`);
  md.push(`- **Dialect:** ${isPg ? 'PostgreSQL' : 'MySQL'}`);
  md.push(`- **Tables:** ${tables.length}`);
  md.push(`- **Relationships:** ${relations.length}`);
  if (isPg && worksheet.customTypes && worksheet.customTypes.length > 0) {
    md.push(`- **Custom Types / Enums:** ${worksheet.customTypes.length}`);
  }
  md.push(`- **Generated At:** ${new Date().toLocaleString()}\n`);

  if (isPg && worksheet.customTypes && worksheet.customTypes.length > 0) {
    md.push(`## Custom Types & ENUMs\n`);
    md.push(`| Type Name | Kind | Allowed Values |`);
    md.push(`| :--- | :--- | :--- |`);
    for (const ct of worksheet.customTypes) {
      md.push(`| \`${ct.name}\` | **${ct.kind}** | \`${ct.values.join('`, `')}\` |`);
    }
    md.push('');
  }

  md.push(`## Tables Summary\n`);
  for (const table of tables) {
    md.push(`### \`${table.name}\`\n`);
    if (table.notes) {
      md.push(`> **Notes:** ${table.notes}\n`);
    }

    md.push(`| Column | Type | Constraints | Default | Notes |`);
    md.push(`| :--- | :--- | :--- | :--- | :--- |`);

    for (const col of table.columns) {
      const tags: string[] = [];
      if (col.isPrimaryKey) tags.push('**PK**');
      if (col.isForeignKey) tags.push('**FK**');
      if (col.isUnique) tags.push('UNIQUE');
      if (!col.isNullable) tags.push('NOT NULL');
      if (col.isAutoIncrement) tags.push('AUTO');

      const defVal = col.defaultValue ? `\`${col.defaultValue}\`` : '-';
      const comment = col.comment || '-';
      md.push(`| \`${col.name}\` | \`${col.type}\` | ${tags.join(', ') || '-'} | ${defVal} | ${comment} |`);
    }
    md.push('');

    if (table.indexes && table.indexes.length > 0) {
      md.push(`**Indexes:**\n`);
      for (const idx of table.indexes) {
        md.push(`- \`${idx.name}\` (${idx.type}): \`${idx.columns.join(', ')}\``);
      }
      md.push('');
    }
  }

  if (relations.length > 0) {
    md.push(`## Relationships\n`);
    md.push(`| Source Table | Source Column | Relation | Target Table | Target Column | On Delete | On Update |`);
    md.push(`| :--- | :--- | :---: | :--- | :--- | :--- | :--- |`);

    for (const rel of relations) {
      const srcT = tables.find((t) => t.id === rel.sourceTableId);
      const srcC = srcT?.columns.find((c) => c.id === rel.sourceColumnId);
      const tgtT = tables.find((t) => t.id === rel.targetTableId);
      const tgtC = tgtT?.columns.find((c) => c.id === rel.targetColumnId);

      const cardSymbol =
        rel.cardinality === 'one-to-one' ? '1 : 1' : rel.cardinality === 'many-to-many' ? 'N : M' : '1 : N';

      md.push(
        `| \`${srcT?.name || '?'}\` | \`${srcC?.name || '?'}\` | **${cardSymbol}** | \`${tgtT?.name || '?'}\` | \`${tgtC?.name || '?'}\` | ${rel.onDelete || '-'} | ${rel.onUpdate || '-'} |`
      );
    }
    md.push('');
  }

  md.push(`## Complete SQL DDL\n`);
  md.push('```sql');
  md.push(generateSQL(worksheet));
  md.push('```\n');

  return md.join('\n');
}

export function exportToMermaid(worksheet: Worksheet): string {
  const { tables, relations } = worksheet;
  const lines: string[] = ['erDiagram'];

  for (const table of tables) {
    const tableName = table.name.replace(/\s+/g, '_');
    lines.push(`    ${tableName} {`);
    for (const col of table.columns) {
      // Mermaid type sanitization (no spaces, e.g. VARCHAR(255) -> varchar_255)
      const cleanType = col.type.replace(/[\(\),\s]/g, '_').toLowerCase();
      const cleanName = col.name.replace(/\s+/g, '_');
      const keys: string[] = [];
      if (col.isPrimaryKey) keys.push('PK');
      if (col.isForeignKey) keys.push('FK');
      const keyStr = keys.length > 0 ? keys.join(',') : '';
      const commentStr = col.comment ? `"${col.comment.replace(/"/g, "'")}"` : '';
      lines.push(`        ${cleanType} ${cleanName} ${keyStr} ${commentStr}`.trimEnd());
    }
    lines.push('    }');
  }

  for (const rel of relations) {
    const srcT = tables.find((t) => t.id === rel.sourceTableId);
    const tgtT = tables.find((t) => t.id === rel.targetTableId);
    if (!srcT || !tgtT) continue;

    const sName = srcT.name.replace(/\s+/g, '_');
    const tName = tgtT.name.replace(/\s+/g, '_');

    // Mermaid ER symbols:
    // exactly one: ||
    // zero or one: |o
    // zero or many: }o
    // one or many: }|
    let connector = '||--o{';
    if (rel.cardinality === 'one-to-one') {
      connector = '||--||';
    } else if (rel.cardinality === 'many-to-many') {
      connector = '}o--o{';
    } else {
      connector = '||--o{';
    }

    const label = rel.name ? `"${rel.name}"` : `"relates"`;
    lines.push(`    ${sName} ${connector} ${tName} : ${label}`);
  }

  return lines.join('\n');
}

export function exportToSvg(worksheet: Worksheet): string {
  const { tables, relations } = worksheet;

  const tableWidth = 260;
  const headerHeight = 44;
  const rowHeight = 30;
  const footerPadding = 12;

  // Compute table bounds
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  if (tables.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
      <text x="200" y="100" text-anchor="middle" fill="#64748b" font-family="sans-serif">Empty Worksheet</text>
    </svg>`;
  }

  tables.forEach((t) => {
    const h = headerHeight + t.columns.length * rowHeight + footerPadding;
    minX = Math.min(minX, t.x);
    minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + tableWidth);
    maxY = Math.max(maxY, t.y + h);
  });

  const pad = 60;
  const viewBoxX = Math.floor(minX - pad);
  const viewBoxY = Math.floor(minY - pad);
  const viewBoxW = Math.ceil(maxX - minX + pad * 2);
  const viewBoxH = Math.ceil(maxY - minY + pad * 2);

  const getColCenter = (tableId: string, colId: string, side: 'left' | 'right') => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return { x: 0, y: 0 };
    const colIdx = table.columns.findIndex((c) => c.id === colId);
    const y = table.y + headerHeight + (colIdx >= 0 ? colIdx : 0) * rowHeight + rowHeight / 2;
    const x = side === 'left' ? table.x : table.x + tableWidth;
    return { x, y };
  };

  const svgParts: string[] = [];

  svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBoxW}" height="${viewBoxH}" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}">`
  );

  // Styles & defs
  svgParts.push(`
  <defs>
    <style>
      .tb-card { fill: #1e293b; stroke: #334155; stroke-width: 1.5; rx: 8px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }
      .tb-header-title { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; font-weight: 700; fill: #ffffff; }
      .tb-col-name { font-family: ui-monospace, monospace; font-size: 12px; font-weight: 600; fill: #e2e8f0; }
      .tb-col-type { font-family: ui-monospace, monospace; font-size: 11px; fill: #94a3b8; }
      .badge-pk { fill: #f59e0b; font-size: 9px; font-weight: bold; font-family: sans-serif; }
      .badge-fk { fill: #38bdf8; font-size: 9px; font-weight: bold; font-family: sans-serif; }
      .badge-uq { fill: #c084fc; font-size: 9px; font-weight: bold; font-family: sans-serif; }
      .badge-nn { fill: #34d399; font-size: 9px; font-weight: bold; font-family: sans-serif; }
      .rel-line { fill: none; stroke-width: 2.5; stroke-linecap: round; }
      .rel-cardinality { font-family: sans-serif; font-size: 11px; font-weight: 700; fill: #cbd5e1; }
      .rel-card-bg { fill: #0f172a; stroke: #475569; stroke-width: 1; rx: 4px; }
      .notes-text { font-family: sans-serif; font-size: 10px; fill: #cbd5e1; font-style: italic; }
    </style>
    <marker id="dot-source" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6">
      <circle cx="5" cy="5" r="4" fill="#3b82f6" />
    </marker>
    <marker id="arrow-target" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 9 5 L 0 9 z" fill="#3b82f6" />
    </marker>
  </defs>
  `);

  // Background
  svgParts.push(`<rect x="${viewBoxX}" y="${viewBoxY}" width="${viewBoxW}" height="${viewBoxH}" fill="#0b1120" />`);

  // Draw relationship lines first so they sit below tables
  for (const rel of relations) {
    const sTable = tables.find((t) => t.id === rel.sourceTableId);
    const tTable = tables.find((t) => t.id === rel.targetTableId);
    if (!sTable || !tTable) continue;

    // determine optimal side
    const isSelf = rel.sourceTableId === rel.targetTableId;
    let sSide: 'left' | 'right' = 'right';
    let tSide: 'left' | 'right' = 'left';

    if (isSelf) {
      sSide = 'right';
      tSide = 'right';
    } else if (sTable.x > tTable.x + tableWidth) {
      sSide = 'left';
      tSide = 'right';
    } else if (sTable.x + tableWidth < tTable.x) {
      sSide = 'right';
      tSide = 'left';
    } else {
      sSide = 'right';
      tSide = 'right';
    }

    const p1 = getColCenter(rel.sourceTableId, rel.sourceColumnId, sSide);
    const p2 = getColCenter(rel.targetTableId, rel.targetColumnId, tSide);
    const lineColor = rel.color || '#2563eb';
    const bend = rel.bendOffset || 0;
    const routing = rel.routing || 'orthogonal';

    let pathD = '';
    let midX = (p1.x + p2.x) / 2;
    let midY = (p1.y + p2.y) / 2;

    if (routing === 'bezier') {
      if (isSelf) {
        const loopOffset = 50 + bend;
        pathD = `M ${p1.x} ${p1.y} C ${p1.x + loopOffset} ${p1.y - 30}, ${p2.x + loopOffset} ${p2.y + 30}, ${p2.x} ${p2.y}`;
        midX = Math.max(p1.x, p2.x) + loopOffset * 0.7;
      } else {
        const dx = Math.abs(p2.x - p1.x);
        const curvature = Math.max(dx * 0.5 + bend, 40);
        const c1x = sSide === 'right' ? p1.x + curvature : p1.x - curvature;
        const c2x = tSide === 'left' ? p2.x - curvature : p2.x + curvature;
        pathD = `M ${p1.x} ${p1.y} C ${c1x} ${p1.y}, ${c2x} ${p2.y}, ${p2.x} ${p2.y}`;
      }
    } else {
      // Orthogonal 90° bends (draw.io style)
      if (rel.waypoints && rel.waypoints.length >= 2) {
        pathD = pointsToSvgPath(rel.waypoints);
        const midPt = rel.waypoints[Math.floor(rel.waypoints.length / 2)];
        midX = midPt.x;
        midY = midPt.y;
      } else {
        const pts = generateDefaultOrthogonalPoints(p1, sSide, p2, tSide, bend, isSelf);
        pathD = pointsToSvgPath(pts);
        const midPt = pts[Math.floor(pts.length / 2)];
        midX = midPt.x;
        midY = midPt.y;
      }
    }

    svgParts.push(`<path d="${pathD}" stroke="${lineColor}" class="rel-line" opacity="0.9" />`);

    // Cardinality badge in middle of curve
    const cardText = rel.cardinality === 'one-to-one' ? '1:1' : rel.cardinality === 'many-to-many' ? 'N:M' : '1:N';

    svgParts.push(`
      <g transform="translate(${midX - 16}, ${midY - 10})">
        <rect width="32" height="20" class="rel-card-bg" stroke="${lineColor}" />
        <text x="16" y="14" text-anchor="middle" class="rel-cardinality">${cardText}</text>
      </g>
    `);
  }

  // Draw tables
  for (const table of tables) {
    const totalH = headerHeight + table.columns.length * rowHeight + footerPadding;
    const headerColor = table.color || '#0284c7';

    svgParts.push(`<g transform="translate(${table.x}, ${table.y})">`);
    // Card background
    svgParts.push(
      `<rect width="${tableWidth}" height="${totalH}" rx="8" class="tb-card" />`
    );

    // Header rect with rounded top
    svgParts.push(`
      <path d="M 0 8 Q 0 0 8 0 L ${tableWidth - 8} 0 Q ${tableWidth} 0 ${tableWidth} 8 L ${tableWidth} ${headerHeight} L 0 ${headerHeight} Z" fill="${headerColor}" />
      <text x="14" y="27" class="tb-header-title">${table.name}</text>
    `);

    // Column rows
    table.columns.forEach((col, idx) => {
      const rowY = headerHeight + idx * rowHeight;
      const isEven = idx % 2 === 0;

      // Subtle row striping
      if (isEven) {
        svgParts.push(`<rect x="1" y="${rowY}" width="${tableWidth - 2}" height="${rowHeight}" fill="#1e293b" opacity="0.4" />`);
      } else {
        svgParts.push(`<rect x="1" y="${rowY}" width="${tableWidth - 2}" height="${rowHeight}" fill="#0f172a" opacity="0.2" />`);
      }

      // Divider line
      svgParts.push(`<line x1="8" y1="${rowY + rowHeight}" x2="${tableWidth - 8}" y2="${rowY + rowHeight}" stroke="#334155" stroke-dasharray="2,2" opacity="0.3" />`);

      // Column name & type
      svgParts.push(`<text x="14" y="${rowY + 19}" class="tb-col-name">${col.name}</text>`);
      svgParts.push(`<text x="${tableWidth - 14}" y="${rowY + 19}" text-anchor="end" class="tb-col-type">${col.type}</text>`);

      // Badges (PK, FK, UQ, NN)
      let badgeX = 14 + col.name.length * 7.5 + 8;
      if (col.isPrimaryKey) {
        svgParts.push(`<rect x="${badgeX}" y="${rowY + 7}" width="20" height="15" rx="3" fill="#f59e0b" opacity="0.2" stroke="#f59e0b" stroke-width="0.8" />`);
        svgParts.push(`<text x="${badgeX + 10}" y="${rowY + 18}" text-anchor="middle" class="badge-pk">PK</text>`);
        badgeX += 24;
      }
      if (col.isForeignKey) {
        svgParts.push(`<rect x="${badgeX}" y="${rowY + 7}" width="20" height="15" rx="3" fill="#38bdf8" opacity="0.2" stroke="#38bdf8" stroke-width="0.8" />`);
        svgParts.push(`<text x="${badgeX + 10}" y="${rowY + 18}" text-anchor="middle" class="badge-fk">FK</text>`);
        badgeX += 24;
      }
      if (col.isUnique && !col.isPrimaryKey) {
        svgParts.push(`<rect x="${badgeX}" y="${rowY + 7}" width="20" height="15" rx="3" fill="#c084fc" opacity="0.2" stroke="#c084fc" stroke-width="0.8" />`);
        svgParts.push(`<text x="${badgeX + 10}" y="${rowY + 18}" text-anchor="middle" class="badge-uq">UQ</text>`);
        badgeX += 24;
      }
    });

    // Notes indicator if present
    if (table.notes) {
      const notesY = headerHeight + table.columns.length * rowHeight + 10;
      const truncatedNotes = table.notes.length > 36 ? table.notes.slice(0, 33) + '...' : table.notes;
      svgParts.push(`<text x="14" y="${notesY}" class="notes-text">📝 ${truncatedNotes}</text>`);
    }

    svgParts.push(`</g>`);
  }

  svgParts.push(`</svg>`);
  return svgParts.join('\n');
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

