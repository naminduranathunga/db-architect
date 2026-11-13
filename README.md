# DB Architect — Visual Database Schema Diagrammer

A visual database diagramming web application built with **Next.js 16 (App Router)**, **TypeScript**, and **Tailwind CSS**. Design, visualize, and document relational database schemas for **PostgreSQL** and **MySQL** directly in your browser.

---

## Features

### Database Engines & Types
- **PostgreSQL & MySQL Support**: Switch dialects on the fly with engine-specific data types and DDL generation.
- **Data Types**: Comprehensive built-in types including `DECIMAL`, `NUMERIC`, `INTEGER`, `BIGSERIAL`, `VARCHAR`, `TIMESTAMPTZ`, `JSONB`, `UUID`, and more.
- **PostgreSQL ENUMs & Custom Types**: Define custom ENUM types (e.g. `CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'delivered');`) directly from the Property Bar with live syntax preview.

### Visual Canvas & Table Cards
- **Interactive Drag & Drop**: Drag table cards across the canvas in real time with hardware-accelerated rendering.
- **Column Reordering**: Drag columns to reorder within a table.
- **Direct Typing Rename**: Click any table header or column and immediately type to rename it in place.
- **Constraint Badges**: Visual badges for Primary Key (`PK`), Foreign Key (`FK`), Unique (`UQ`), and Non-Null (`NN`).
- **Table Accent Colors**: Customize table header colors for quick visual categorization.

### 📏 Draw.io-Style Orthogonal Lines (90° Bends)
- **Strict 90-Degree Angles**: All relationship paths maintain strictly orthogonal 90° bends with zero diagonal vectors.
- **Interactive Segment Dragging**: Midpoint handles on every horizontal or vertical line segment allow real-time repositioning.
- **Collinear Merging**: When line segments align on the same axis, intermediate segments collapse and merge automatically.
- **Minimum Stub Lead-Out**: Enforces a minimum perpendicular stub (`MIN_STUB = 24px`) from table ports to prevent clipping.
- **Active Line Elevation**: Selecting or hovering over a relationship brings it to the top layer above overlapping lines and table cards.
- **Cardinality Badges**: Displays `1:1`, `1:N`, or `N:M` on lines, with configurable `ON DELETE` / `ON UPDATE` referential actions.

### Multi-Element Selection & Manipulation
- **Marquee Box Selection**: Click and drag on empty canvas space to draw a selection square enclosing multiple tables.
- **Group Dragging**: Move all selected tables together preserving their relative spacing.
- **Group Duplication (<kbd>Ctrl + D</kbd>)**: Duplicate all selected tables at once with automatic column and ID remapping.
- **Group Deletion (<kbd>Delete</kbd> / <kbd>Backspace</kbd>)**: Batch delete selected tables and connected relations.

### Local Storage & Portability
- **Browser IndexedDB**: Worksheets are saved locally in the browser with periodic debounced auto-save and manual `Ctrl + S`.
- **Worksheet Management**: Create, rename (`unnamed_<index>`), duplicate, and delete multiple diagram sheets.
- **Portable File Format (`.sqldiagram`)**:
  - Export self-contained `.sqldiagram` JSON files.
  - Open portable diagram files across different browsers, machines, or sessions using **"Open File..."**.

### Comprehensive Export Options
- **SVG Vector Diagram**: Standalone vector graphics with embedded styling and orthogonal paths.
- **Markdown Documentation**: Formatted Markdown documentation complete with table columns, constraints, notes, indexes, custom ENUMs, and relationship tables.
- **Mermaid ER Diagram**: Compatible with GitHub, Notion, Obsidian, and Mermaid renderers.
- **Production SQL DDL**: Dialect-accurate `CREATE TABLE`, `CREATE TYPE ... AS ENUM`, constraints, and foreign key definitions.

### Themes & Shortcuts
- **Light & Dark Mode**: Persistent theme toggle.
- **Property Bar**: Dedicated right-side inspector panel (no popup modals) for editing column constraints, indexes, custom ENUMs, notes, and relationship properties.
- **Keyboard Shortcuts**:
  - <kbd>Ctrl + D</kbd> / <kbd>Cmd + D</kbd>: Duplicate selected column, table, or group.
  - <kbd>Ctrl + S</kbd> / <kbd>Cmd + S</kbd>: Save diagram.
  - <kbd>Ctrl + Z</kbd>: Global Undo.
  - <kbd>Ctrl + Y</kbd> / <kbd>Ctrl + Shift + Z</kbd>: Global Redo.
  - <kbd>Delete</kbd> / <kbd>Backspace</kbd>: Delete selected column, relation, or table(s).
  - <kbd>Shift + Drag</kbd> / Middle Mouse: Pan canvas.
  - <kbd>Mouse Wheel</kbd>: Zoom canvas in and out.

---

## Getting Started

### Prerequisites
- **Node.js** 18.17+ or later
- **npm**, **pnpm**, or **yarn**

### Installation

1. Clone or extract the repository:
   ```bash
   cd sql_editor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
├── app/
│   ├── page.tsx               # Main application controller, state, and shortcuts
│   ├── layout.tsx             # Root HTML layout and metadata
│   └── globals.css            # Global CSS styles and Tailwind imports
├── components/
│   ├── Canvas.tsx             # Infinite zoom/pan canvas, orthogonal SVG renderer, selection square
│   ├── TableCard.tsx          # Draggable table card, column list, connector ports, inline rename
│   ├── PropertyBar.tsx        # Right-side inspector for tables, columns, relations, and custom ENUMs
│   ├── Toolbar.tsx            # Header toolbar with engine toggles, actions, zoom, undo/redo
│   ├── WorksheetsModal.tsx    # Saved diagrams manager and portable file importer
│   └── ExportModal.tsx        # Exporter preview modal (SVG, Markdown, Mermaid, SQL, .sqldiagram)
├── lib/
│   ├── orthogonalRouter.ts    # 90° orthogonal line routing, segment dragging, collinear merging
│   ├── portableFile.ts        # .sqldiagram serialization and validation
│   ├── storage.ts             # Native IndexedDB wrapper (save, list, delete, sample generation)
│   └── exporters.ts           # Generators for SQL DDL, Markdown docs, Mermaid ER, and SVG
└── types/
    └── database.ts            # Core TypeScript interfaces (Worksheet, Table, Column, Relation, etc.)
```

---

## Building for Production

To create an optimized production build:

```bash
npm run build
npm run start
```
