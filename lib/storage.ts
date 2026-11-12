import { Worksheet, SqlDialect, Table, Relation } from '../types/database';

const DB_NAME = 'sql_diagrammer_db';
const DB_VERSION = 1;
const STORE_NAME = 'worksheets';

let dbInstance: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only accessible in client browser environment');
  }

  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function saveWorksheet(worksheet: Worksheet): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const updated = {
      ...worksheet,
      updatedAt: Date.now(),
    };
    const req = store.put(updated);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getWorksheet(id: string): Promise<Worksheet | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function listWorksheets(): Promise<Worksheet[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const results: Worksheet[] = req.result || [];
      // Sort by updatedAt descending
      results.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteWorksheet(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getNextWorksheetIndex(): Promise<number> {
  const worksheets = await listWorksheets();
  let maxIdx = 0;
  const regex = /^unnamed_(\d+)$/;
  for (const ws of worksheets) {
    const match = ws.name.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxIdx) {
        maxIdx = num;
      }
    }
  }
  return maxIdx + 1;
}

export function createSampleWorksheet(name: string = 'unnamed_1', dialect: SqlDialect = 'pgsql'): Worksheet {
  const now = Date.now();
  const tables: Table[] = [
    {
      id: 'tbl_users',
      name: 'users',
      x: 100,
      y: 120,
      color: '#0284c7', // Sky Blue
      notes: 'Registered application users and auth profiles',
      indexes: [
        { id: 'idx_u_email', name: 'idx_users_email', type: 'UNIQUE', columns: ['email'] },
      ],
      columns: [
        {
          id: 'col_u_id',
          name: 'id',
          type: dialect === 'pgsql' ? 'BIGSERIAL' : 'BIGINT',
          isPrimaryKey: true,
          isForeignKey: false,
          isUnique: true,
          isNullable: false,
          isAutoIncrement: true,
          comment: 'Primary identity',
        },
        {
          id: 'col_u_email',
          name: 'email',
          type: 'VARCHAR(255)',
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: true,
          isNullable: false,
          isAutoIncrement: false,
          comment: 'Unique email address',
        },
        {
          id: 'col_u_name',
          name: 'full_name',
          type: 'VARCHAR(100)',
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isNullable: false,
          isAutoIncrement: false,
        },
        {
          id: 'col_u_created',
          name: 'created_at',
          type: dialect === 'pgsql' ? 'TIMESTAMPTZ' : 'DATETIME',
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isNullable: false,
          isAutoIncrement: false,
          defaultValue: 'CURRENT_TIMESTAMP',
        },
      ],
    },
    {
      id: 'tbl_orders',
      name: 'orders',
      x: 520,
      y: 120,
      color: '#059669', // Emerald
      notes: 'Customer sales orders and delivery status',
      indexes: [
        { id: 'idx_ord_user', name: 'idx_orders_user_id', type: 'INDEX', columns: ['user_id'] },
      ],
      columns: [
        {
          id: 'col_ord_id',
          name: 'id',
          type: dialect === 'pgsql' ? 'BIGSERIAL' : 'BIGINT',
          isPrimaryKey: true,
          isForeignKey: false,
          isUnique: true,
          isNullable: false,
          isAutoIncrement: true,
        },
        {
          id: 'col_ord_user_id',
          name: 'user_id',
          type: 'BIGINT',
          isPrimaryKey: false,
          isForeignKey: true,
          isUnique: false,
          isNullable: false,
          isAutoIncrement: false,
          comment: 'References users(id)',
        },
        {
          id: 'col_ord_total',
          name: 'total_amount',
          type: dialect === 'pgsql' ? 'NUMERIC(10,2)' : 'DECIMAL(10,2)',
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isNullable: false,
          isAutoIncrement: false,
          defaultValue: '0.00',
        },
        {
          id: 'col_ord_status',
          name: 'status',
          type: 'VARCHAR(50)',
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isNullable: false,
          isAutoIncrement: false,
          defaultValue: "'PENDING'",
        },
      ],
    },
    {
      id: 'tbl_order_items',
      name: 'order_items',
      x: 520,
      y: 450,
      color: '#7c3aed', // Violet
      notes: 'Line items belonging to an order',
      indexes: [],
      columns: [
        {
          id: 'col_oi_id',
          name: 'id',
          type: dialect === 'pgsql' ? 'BIGSERIAL' : 'BIGINT',
          isPrimaryKey: true,
          isForeignKey: false,
          isUnique: true,
          isNullable: false,
          isAutoIncrement: true,
        },
        {
          id: 'col_oi_order_id',
          name: 'order_id',
          type: 'BIGINT',
          isPrimaryKey: false,
          isForeignKey: true,
          isUnique: false,
          isNullable: false,
          isAutoIncrement: false,
        },
        {
          id: 'col_oi_product_id',
          name: 'product_id',
          type: 'BIGINT',
          isPrimaryKey: false,
          isForeignKey: true,
          isUnique: false,
          isNullable: false,
          isAutoIncrement: false,
        },
        {
          id: 'col_oi_quantity',
          name: 'quantity',
          type: 'INTEGER',
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isNullable: false,
          isAutoIncrement: false,
          defaultValue: '1',
        },
      ],
    },
    {
      id: 'tbl_products',
      name: 'products',
      x: 100,
      y: 450,
      color: '#d97706', // Amber
      notes: 'Product inventory catalog',
      indexes: [],
      columns: [
        {
          id: 'col_p_id',
          name: 'id',
          type: dialect === 'pgsql' ? 'BIGSERIAL' : 'BIGINT',
          isPrimaryKey: true,
          isForeignKey: false,
          isUnique: true,
          isNullable: false,
          isAutoIncrement: true,
        },
        {
          id: 'col_p_sku',
          name: 'sku',
          type: 'VARCHAR(50)',
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: true,
          isNullable: false,
          isAutoIncrement: false,
        },
        {
          id: 'col_p_title',
          name: 'title',
          type: 'VARCHAR(255)',
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isNullable: false,
          isAutoIncrement: false,
        },
        {
          id: 'col_p_price',
          name: 'price',
          type: dialect === 'pgsql' ? 'NUMERIC(10,2)' : 'DECIMAL(10,2)',
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isNullable: false,
          isAutoIncrement: false,
        },
      ],
    },
  ];

  const relations: Relation[] = [
    {
      id: 'rel_user_orders',
      sourceTableId: 'tbl_users',
      sourceColumnId: 'col_u_id',
      targetTableId: 'tbl_orders',
      targetColumnId: 'col_ord_user_id',
      cardinality: 'one-to-many',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      color: '#3b82f6',
    },
    {
      id: 'rel_order_items_order',
      sourceTableId: 'tbl_orders',
      sourceColumnId: 'col_ord_id',
      targetTableId: 'tbl_order_items',
      targetColumnId: 'col_oi_order_id',
      cardinality: 'one-to-many',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      color: '#10b981',
    },
    {
      id: 'rel_product_order_items',
      sourceTableId: 'tbl_products',
      sourceColumnId: 'col_p_id',
      targetTableId: 'tbl_order_items',
      targetColumnId: 'col_oi_product_id',
      cardinality: 'one-to-many',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      color: '#d97706',
    },
  ];

  return {
    id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    dialect,
    tables,
    relations,
    createdAt: now,
    updatedAt: now,
    zoom: 1,
    panX: 40,
    panY: 40,
  };
}

