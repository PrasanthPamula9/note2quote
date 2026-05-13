const SQLite = require('react-native-sqlite-storage');

SQLite.enablePromise(true);

const DB_NAME = 'note2quote.db';
const DB_VERSION = '1.0';
const DB_DISPLAY_NAME = 'note2quote';
const DB_SIZE = 200000;
const MAX_TEXT_BOXES = 5;
const DEFAULT_TEXT_BOX_WIDTH = 0.55;
const DEFAULT_TEXT_BOX_HEIGHT = 0.22;

let dbPromise = null;

/**
 * @typedef {{
 *   quote_text: string,
 *   background_image_uri?: string | null,
 *   editor_config?: import('../types/quotes').QuoteEditorConfig | null,
 * }} QuoteInput
 */

function generateQuoteId() {
  return `quote-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function mapRow(row) {
  const editorConfig = parseEditorConfig(row.editor_config_json);
  const textBoxes = Array.isArray(editorConfig.text_boxes) && editorConfig.text_boxes.length > 0
    ? editorConfig.text_boxes
    : [
        {
          id: 'text-1',
          text: row.quote_text || editorConfig.quote_text || '',
          x_percent: 0.05,
          y_percent: 0.35,
          width_percent: DEFAULT_TEXT_BOX_WIDTH,
          height_percent: DEFAULT_TEXT_BOX_HEIGHT,
        },
      ];
  const quoteText = textBoxes
    .map((box) => String(box.text || '').trim())
    .filter(Boolean)
    .join('\n')
    || row.quote_text;

  return {
    id: row.id,
    quote_text: quoteText,
    background_image_uri: row.background_image_uri || null,
    editor_config: {
      ...editorConfig,
      text_boxes: textBoxes,
      quote_text: quoteText,
      background_image_uri: row.background_image_uri || editorConfig.background_image_uri || null,
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getDefaultEditorConfig() {
  return {
    activeCanvasKey: 'instagram_post_square',
    background_image_uri: null,
    image_opacity: 0.6,
    font_size: 14,
    font_color: 'white',
    bg_color: '#222222',
    font_family: 'serif',
    font_shadow: 0,
    font_weight: 700,
    text_align: 2,
    quote_text: '',
    text_boxes: [
      {
        id: 'text-1',
        text: '',
        x_percent: 0.05,
        y_percent: 0.35,
        width_percent: DEFAULT_TEXT_BOX_WIDTH,
        height_percent: DEFAULT_TEXT_BOX_HEIGHT,
      },
    ],
    text_x_percent: 0.05,
    text_y_percent: 0.35,
  };
}

function createDefaultTextBox(text, index) {
  return {
    id: `text-${index + 1}`,
    text: (text || '').toString(),
    x_percent: 0.05,
    y_percent: Math.min(0.85, 0.35 + index * 0.08),
    width_percent: DEFAULT_TEXT_BOX_WIDTH,
    height_percent: DEFAULT_TEXT_BOX_HEIGHT,
    font_size: undefined,
    font_color: undefined,
    font_family: undefined,
    font_shadow: undefined,
    font_weight: undefined,
    text_align: undefined,
  };
}

function normalizeTextBox(box, index, fallbackText) {
  const base = createDefaultTextBox(fallbackText, index);
  const safeBox = box && typeof box === 'object' ? box : {};
  return {
    id: String(safeBox.id || base.id),
    text: String(safeBox.text ?? base.text ?? fallbackText ?? ''),
    x_percent: clampPercent(safeBox.x_percent ?? base.x_percent),
    y_percent: clampPercent(safeBox.y_percent ?? base.y_percent),
    width_percent: clampPercent(safeBox.width_percent ?? DEFAULT_TEXT_BOX_WIDTH, 0.15, 0.85),
    height_percent: clampPercent(safeBox.height_percent ?? DEFAULT_TEXT_BOX_HEIGHT, 0.1, 1),
    ...(safeBox.font_color != null ? { font_color: String(safeBox.font_color) } : {}),
    ...(safeBox.font_size != null ? { font_size: Number(safeBox.font_size) } : {}),
    ...(safeBox.font_family != null ? { font_family: String(safeBox.font_family) } : {}),
    ...(safeBox.font_shadow != null ? { font_shadow: Number(safeBox.font_shadow) } : {}),
    ...(safeBox.font_weight != null ? { font_weight: normalizeFontWeight(safeBox.font_weight) } : {}),
    ...(safeBox.text_align != null ? { text_align: normalizeTextAlign(safeBox.text_align) } : {}),
  };
}

function normalizeTextBoxes(value, fallbackText) {
  const boxes = Array.isArray(value) ? value : [];
  const normalized = boxes.slice(0, MAX_TEXT_BOXES).map((box, index) => normalizeTextBox(box, index, fallbackText));

  if (normalized.length > 0) {
    const hasText = normalized.some((box) => String(box.text || '').trim().length > 0);
    if (!hasText && String(fallbackText || '').trim()) {
      normalized[0] = {
        ...normalized[0],
        text: String(fallbackText),
      };
    }
    return normalized;
  }

  return [createDefaultTextBox(fallbackText, 0)];
}

function clampPercent(value, min = 0, max = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return min;
  }

  return Math.min(max, Math.max(min, parsed));
}

function normalizeFontWeight(value) {
  if (typeof value === 'number') {
    return value;
  }

  const normalized = String(value || '').toLowerCase();
  switch (normalized) {
    case 'thin':
      return 100;
    case 'extralight':
    case 'extra_light':
      return 200;
    case 'light':
      return 300;
    case 'medium':
      return 500;
    case 'semibold':
    case 'semi_bold':
      return 600;
    case 'bold':
      return 700;
    case 'extrabold':
    case 'extra_bold':
      return 800;
    case 'black':
      return 900;
    case 'extrablack':
    case 'extra_black':
      return 1000;
    default:
      return 700;
  }
}

function normalizeTextAlign(value) {
  if (typeof value === 'number') {
    return value;
  }

  const normalized = String(value || '').toLowerCase();
  switch (normalized) {
    case 'left':
      return 0;
    case 'right':
      return 1;
    case 'center':
      return 2;
    case 'justify':
      return 3;
    case 'start':
      return 4;
    case 'end':
      return 5;
    default:
      return 2;
  }
}

function normalizeEditorConfig(config) {
  const base = getDefaultEditorConfig();
  const quoteText = (config?.quote_text ?? base.quote_text).toString();
  const textBoxes = normalizeTextBoxes(config?.text_boxes, quoteText);
  return {
    ...base,
    ...config,
    font_weight: normalizeFontWeight(config?.font_weight ?? base.font_weight),
    text_align: normalizeTextAlign(config?.text_align ?? base.text_align),
    background_image_uri: config?.background_image_uri ?? null,
    quote_text: textBoxes
      .map((box) => String(box.text || '').trim())
      .filter(Boolean)
      .join('\n') || quoteText,
    text_boxes: textBoxes,
  };
}

function parseEditorConfig(value) {
  if (!value) {
    return getDefaultEditorConfig();
  }

  try {
    const parsed = JSON.parse(value);
    return normalizeEditorConfig(parsed);
  } catch (error) {
    return getDefaultEditorConfig();
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
      editor_config_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await ensureColumnExists(db, 'quotes', 'background_image_uri', 'TEXT');
  await ensureColumnExists(db, 'quotes', 'editor_config_json', 'TEXT');
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
    await db.executeSql('SELECT id, quote_text, background_image_uri, editor_config_json, created_at, updated_at FROM quotes ORDER BY updated_at DESC;'),
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

/**
 * @param {QuoteInput} input
 */
async function createQuote(input) {
  const { quote_text, background_image_uri = null, editor_config = null } = input;
  const db = await getDatabase();
  const now = Date.now();
  const resolvedConfig = {
    ...getDefaultEditorConfig(),
    ...(editor_config || {}),
    background_image_uri,
    quote_text: quote_text.trim(),
  };
  const quote = {
    id: generateQuoteId(),
    quote_text: resolvedConfig.quote_text,
    background_image_uri,
    editor_config: normalizeEditorConfig(resolvedConfig),
    created_at: now,
    updated_at: now,
  };

  await db.executeSql(
    'INSERT INTO quotes (id, quote_text, background_image_uri, editor_config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);',
    [
      quote.id,
      quote.quote_text,
      quote.background_image_uri,
      JSON.stringify(quote.editor_config),
      quote.created_at,
      quote.updated_at,
    ],
  );

  return quote;
}

/**
 * @param {{ id: string; quote_text: string; background_image_uri?: string | null }} quote
 */
async function updateQuote(quote) {
  const db = await getDatabase();
  const updatedAt = Date.now();
  const resolvedConfig = {
    ...normalizeEditorConfig(quote.editor_config || {}),
    background_image_uri: quote.background_image_uri || null,
    quote_text: quote.quote_text.trim(),
  };

  await db.executeSql(
    'UPDATE quotes SET quote_text = ?, background_image_uri = ?, editor_config_json = ?, updated_at = ? WHERE id = ?;',
    [
      resolvedConfig.quote_text,
      resolvedConfig.background_image_uri,
      JSON.stringify(resolvedConfig),
      updatedAt,
      quote.id,
    ],
  );

  return {
    ...quote,
    quote_text: resolvedConfig.quote_text,
    background_image_uri: resolvedConfig.background_image_uri,
    editor_config: resolvedConfig,
    updated_at: updatedAt,
  };
}

async function deleteQuote(id) {
  const db = await getDatabase();
  await db.executeSql('DELETE FROM quotes WHERE id = ?;', [id]);
}

module.exports = {
  getDatabase,
  getQuotes,
  createQuote,
  updateQuote,
  deleteQuote,
};
