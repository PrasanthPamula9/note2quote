const SQLite = require('react-native-sqlite-storage');
const {
  DEFAULT_EDITOR_CONFIG,
  normalizeQuoteEditorConfig,
} = require('../utils/quoteConfig');

SQLite.enablePromise(true);

const DB_NAME = 'note2quote.db';
const DB_VERSION = '1.0';
const DB_DISPLAY_NAME = 'note2quote';
const DB_SIZE = 200000;
const DEFAULT_QUOTE_CATEGORY_ID = 'all-quotes';
const INITIAL_QUOTE_CATEGORIES = [
  { id: DEFAULT_QUOTE_CATEGORY_ID, name: 'All quotes', is_default: 1 },
  { id: 'poems', name: 'Poems', is_default: 0 },
  { id: 'mini-quotes', name: 'Mini quotes', is_default: 0 },
];

let dbPromise = null;

/**
 * @typedef {{
 *   quote_text: string,
 *   background_image_uri?: string | null,
 *   quote_category_id?: string,
 *   pinned?: number,
 *   editor_config?: import('../types/quotes').QuoteEditorConfig | null,
 * }} QuoteInput
 */

function generateQuoteId() {
  return `quote-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function mapRow(row) {
  const editorConfig = parseEditorConfig(row.editor_config_json);
  const textBoxes = editorConfig.text_boxes;
  const quoteText = textBoxes
    .map((box) => String(box.text || '').trim())
    .filter(Boolean)
    .join('\n')
    || row.quote_text;

  return {
    id: row.id,
    quote_text: quoteText,
    background_image_uri: row.background_image_uri || null,
    quote_category_id: row.quote_category_id || DEFAULT_QUOTE_CATEGORY_ID,
    pinned: row.pinned || 0,
    editor_config: normalizeQuoteEditorConfig({
      ...editorConfig,
      text_boxes: textBoxes,
      quote_text: quoteText,
      background_image_uri: row.background_image_uri || editorConfig.background_image_uri || null,
    }),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeEditorConfig(config) {
  return normalizeQuoteEditorConfig({
    ...DEFAULT_EDITOR_CONFIG,
    ...(config || {}),
  });
}

function parseEditorConfig(value) {
  if (!value) {
    return DEFAULT_EDITOR_CONFIG;
  }

  try {
    const parsed = JSON.parse(value);
    return normalizeEditorConfig(parsed);
  } catch (error) {
    return DEFAULT_EDITOR_CONFIG;
  }
}

function getExecuteSqlResult(response) {
  if (!response) {
    return undefined;
  }

  if (Array.isArray(response)) {
    if (response.length === 1) {
      return response[0];
    }

    return response[1];
  }

  return response;
}

async function getDatabase() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabase(DB_NAME, DB_VERSION, DB_DISPLAY_NAME, DB_SIZE);
  }

  const db = await dbPromise;
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY NOT NULL,
      quote_text TEXT NOT NULL,
      background_image_uri TEXT,
      quote_category_id TEXT NOT NULL DEFAULT '${DEFAULT_QUOTE_CATEGORY_ID}',
      pinned INTEGER NOT NULL DEFAULT 0,
      editor_config_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS quote_categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await ensureColumnExists(db, 'quotes', 'background_image_uri', 'TEXT');
  await ensureColumnExists(db, 'quotes', 'quote_category_id', `TEXT NOT NULL DEFAULT '${DEFAULT_QUOTE_CATEGORY_ID}'`);
  await ensureColumnExists(db, 'quotes', 'pinned', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'quotes', 'editor_config_json', 'TEXT');
  await seedQuoteCategories(db);
  await db.executeSql(
    `UPDATE quotes SET quote_category_id = '${DEFAULT_QUOTE_CATEGORY_ID}' WHERE quote_category_id IS NULL OR quote_category_id = '';`,
  );
  return db;
}

async function ensureColumnExists(db, tableName, columnName, columnDefinition) {
  const result = getExecuteSqlResult(await db.executeSql(`PRAGMA table_info(${tableName});`));
  if (!result || !result.rows) {
    return;
  }

  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i);
    if (row && row.name === columnName) {
      return;
    }
  }

  await db.executeSql(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
}

async function getQuotes() {
  const db = await getDatabase();
  const result = getExecuteSqlResult(
    await db.executeSql(
      'SELECT id, quote_text, background_image_uri, quote_category_id, pinned, editor_config_json, created_at, updated_at FROM quotes ORDER BY pinned DESC, updated_at DESC;',
    ),
  );

  if (!result || !result.rows) {
    return [];
  }

  const quotes = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    quotes.push(mapRow(result.rows.item(i)));
  }

  return quotes;
}

async function getQuoteCategories() {
  const db = await getDatabase();
  const result = getExecuteSqlResult(
    await db.executeSql(
      `
        SELECT
          qc.id,
          qc.name,
          qc.is_default,
          qc.created_at,
          qc.updated_at,
          COUNT(q.id) AS quote_count
        FROM quote_categories qc
        LEFT JOIN quotes q ON q.quote_category_id = qc.id
        GROUP BY qc.id, qc.name, qc.is_default, qc.created_at, qc.updated_at
        ORDER BY CASE WHEN qc.id = ? THEN 0 ELSE 1 END, qc.created_at ASC;
      `,
      [DEFAULT_QUOTE_CATEGORY_ID],
    ),
  );

  if (!result || !result.rows) {
    return [];
  }

  const categories = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i);
    categories.push({
      id: row.id,
      name: row.name,
      is_default: row.is_default,
      created_at: row.created_at,
      updated_at: row.updated_at,
      quote_count: row.quote_count,
    });
  }

  return categories;
}

async function seedQuoteCategories(db) {
  const now = Date.now();
  for (const category of INITIAL_QUOTE_CATEGORIES) {
    await db.executeSql(
      'INSERT OR IGNORE INTO quote_categories (id, name, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
      [category.id, category.name, category.is_default, now, now],
    );
  }
}

/**
 * @param {QuoteInput} input
 */
async function createQuote(input) {
  const {
    quote_text,
    background_image_uri = null,
    quote_category_id = DEFAULT_QUOTE_CATEGORY_ID,
    pinned = 0,
    editor_config = null,
  } = input;
  const db = await getDatabase();
  const now = Date.now();
  const resolvedConfig = {
    ...DEFAULT_EDITOR_CONFIG,
    ...(editor_config || {}),
    background_image_uri,
    quote_text: quote_text.trim(),
  };
  const quote = {
    id: generateQuoteId(),
    quote_text: resolvedConfig.quote_text,
    background_image_uri,
    quote_category_id,
    pinned: pinned ? 1 : 0,
    editor_config: normalizeEditorConfig(resolvedConfig),
    created_at: now,
    updated_at: now,
  };

  await db.executeSql(
    'INSERT INTO quotes (id, quote_text, background_image_uri, quote_category_id, pinned, editor_config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
    [
      quote.id,
      quote.quote_text,
      quote.background_image_uri,
      quote.quote_category_id,
      quote.pinned,
      JSON.stringify(quote.editor_config),
      quote.created_at,
      quote.updated_at,
    ],
  );

  return quote;
}

/**
 * @param {{ id: string; quote_text: string; background_image_uri?: string | null; quote_category_id?: string; pinned?: number }} quote
 */
async function updateQuote(quote) {
  const db = await getDatabase();
  const updatedAt = Date.now();
  const resolvedConfig = {
    ...normalizeEditorConfig(quote.editor_config || {}),
    background_image_uri: quote.background_image_uri || null,
    quote_text: quote.quote_text.trim(),
  };
  const resolvedCategoryId = quote.quote_category_id || DEFAULT_QUOTE_CATEGORY_ID;
  const resolvedPinned = quote.pinned ? 1 : 0;

  await db.executeSql(
    'UPDATE quotes SET quote_text = ?, background_image_uri = ?, quote_category_id = ?, pinned = ?, editor_config_json = ?, updated_at = ? WHERE id = ?;',
    [
      resolvedConfig.quote_text,
      resolvedConfig.background_image_uri,
      resolvedCategoryId,
      resolvedPinned,
      JSON.stringify(resolvedConfig),
      updatedAt,
      quote.id,
    ],
  );

  return {
    ...quote,
    quote_text: resolvedConfig.quote_text,
    background_image_uri: resolvedConfig.background_image_uri,
    quote_category_id: resolvedCategoryId,
    pinned: resolvedPinned,
    editor_config: resolvedConfig,
    updated_at: updatedAt,
  };
}

async function deleteQuote(id) {
  const db = await getDatabase();
  await db.executeSql('DELETE FROM quotes WHERE id = ?;', [id]);
}

async function createQuoteCategory({ name }) {
  const db = await getDatabase();
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    return null;
  }

  const now = Date.now();
  const category = {
    id: `quote-category-${now}-${Math.random().toString(16).slice(2, 8)}`,
    name: trimmedName,
    is_default: 0,
    created_at: now,
    updated_at: now,
  };

  await db.executeSql(
    'INSERT INTO quote_categories (id, name, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
    [category.id, category.name, category.is_default, category.created_at, category.updated_at],
  );

  return category;
}

async function moveQuotesToCategory(quoteIds, quoteCategoryId) {
  if (!quoteIds || !quoteIds.length) {
    return;
  }

  const db = await getDatabase();
  const placeholders = quoteIds.map(() => '?').join(', ');
  await db.executeSql(
    `UPDATE quotes SET quote_category_id = ?, updated_at = ? WHERE id IN (${placeholders});`,
    [quoteCategoryId || DEFAULT_QUOTE_CATEGORY_ID, Date.now(), ...quoteIds],
  );
}

async function pinQuotes(quoteIds, pinned) {
  if (!quoteIds || !quoteIds.length) {
    return;
  }

  const db = await getDatabase();
  const placeholders = quoteIds.map(() => '?').join(', ');
  await db.executeSql(
    `UPDATE quotes SET pinned = ?, updated_at = ? WHERE id IN (${placeholders});`,
    [pinned ? 1 : 0, Date.now(), ...quoteIds],
  );
}

module.exports = {
  DEFAULT_QUOTE_CATEGORY_ID,
  getDatabase,
  getQuotes,
  getQuoteCategories,
  createQuote,
  updateQuote,
  deleteQuote,
  createQuoteCategory,
  moveQuotesToCategory,
  pinQuotes,
};
