const SQLite = require('react-native-sqlite-storage');

SQLite.enablePromise(true);

const DB_NAME = 'note2quote.db';
const DB_VERSION = '1.0';
const DB_DISPLAY_NAME = 'note2quote';
const DB_SIZE = 200000;

const DEFAULT_NOTEBOOK_ID = 'default-notebook';
const QUICK_NOTEBOOK_ID = 'quick-note';
const HANDWRITTEN_NOTEBOOK_ID = 'handwritten-notes';

const INITIAL_NOTEBOOKS = [
  {
    id: DEFAULT_NOTEBOOK_ID,
    name: 'Default notebook',
    is_default: 1,
  },
  {
    id: QUICK_NOTEBOOK_ID,
    name: 'Quick note',
    is_default: 0,
  },
  {
    id: HANDWRITTEN_NOTEBOOK_ID,
    name: 'Handwritten notes',
    is_default: 0,
  },
];

const INITIAL_NOTES = [
  {
    id: 'note-1',
    header: 'Coding Interview Patterns Guide (High ROI)',
    body:
      'This guide focuses on the most common coding patterns asked in interviews, with explanations and sample questions.',
    notebook_id: DEFAULT_NOTEBOOK_ID,
    pinned: 0,
    created_at: new Date('2026-04-12').getTime(),
    updated_at: new Date('2026-04-12').getTime(),
  },
  {
    id: 'note-2',
    header: 'ML PAPERS',
    body: 'Best Papers to Understand Machine Learning',
    notebook_id: DEFAULT_NOTEBOOK_ID,
    pinned: 0,
    created_at: new Date('2026-03-22').getTime(),
    updated_at: new Date('2026-03-22').getTime(),
  },
  {
    id: 'note-3',
    header: 'React Native Quote Editor Architecture',
    body: 'This document describes a scalable architecture for a quote editor application.',
    notebook_id: DEFAULT_NOTEBOOK_ID,
    pinned: 0,
    created_at: new Date('2026-03-14').getTime(),
    updated_at: new Date('2026-03-14').getTime(),
  },
  {
    id: 'note-4',
    header: '1.anna2.pedhamma 3',
    body: '',
    notebook_id: DEFAULT_NOTEBOOK_ID,
    pinned: 0,
    created_at: new Date('2026-02-25').getTime(),
    updated_at: new Date('2026-02-25').getTime(),
  },
  {
    id: 'note-5',
    header: 'Sri devi-89194 18328',
    body: '',
    notebook_id: DEFAULT_NOTEBOOK_ID,
    pinned: 0,
    created_at: new Date('2026-02-20').getTime(),
    updated_at: new Date('2026-02-20').getTime(),
  },
];

const INITIAL_NOTE_IDS = INITIAL_NOTES.map((note) => note.id);

let dbPromise = null;

function generateNoteId() {
  return `note-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function mapRow(row) {
  return {
    id: row.id,
    header: row.header,
    body: row.body,
    notebook_id: row.notebook_id || DEFAULT_NOTEBOOK_ID,
    pinned: row.pinned || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
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
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      header TEXT NOT NULL,
      body TEXT NOT NULL,
      notebook_id TEXT NOT NULL DEFAULT '${DEFAULT_NOTEBOOK_ID}',
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  const columnResult = getExecuteSqlResult(await db.executeSql("PRAGMA table_info(notes);"));
  let hasNotebookColumn = false;
  let hasPinnedColumn = false;
  if (columnResult && columnResult.rows) {
    for (let i = 0; i < columnResult.rows.length; i += 1) {
      const row = columnResult.rows.item(i);
      if (row && row.name === 'notebook_id') {
        hasNotebookColumn = true;
      }
      if (row && row.name === 'pinned') {
        hasPinnedColumn = true;
      }
    }
  }
  if (!hasNotebookColumn) {
    await db.executeSql(`ALTER TABLE notes ADD COLUMN notebook_id TEXT NOT NULL DEFAULT '${DEFAULT_NOTEBOOK_ID}';`);
  }
  if (!hasPinnedColumn) {
    await db.executeSql('ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;');
  }
  return db;
}

async function seedNotebooksIfNeeded(db) {
  const now = Date.now();
  for (const notebook of INITIAL_NOTEBOOKS) {
    await db.executeSql(
      'INSERT OR IGNORE INTO notebooks (id, name, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
      [notebook.id, notebook.name, notebook.is_default, now, now],
    );
  }
}

async function getRowCount(db) {
  const result = getExecuteSqlResult(await db.executeSql('SELECT COUNT(*) AS count FROM notes;'));
  if (!result || !result.rows) {
    return 0;
  }
  const row = result.rows.item(0);
  return row ? row.count : 0;
}

async function seedNotesIfNeeded(db) {
  if (!__DEV__) {
    return;
  }

  const count = await getRowCount(db);
  if (count > 0) {
    return;
  }

  for (const note of INITIAL_NOTES) {
    await db.executeSql(
      'INSERT INTO notes (id, header, body, notebook_id, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [note.id, note.header, note.body, note.notebook_id, note.pinned, note.created_at, note.updated_at],
    );
  }
}

async function removeLegacySeedNotesIfNeeded(db) {
  if (__DEV__ || INITIAL_NOTE_IDS.length === 0) {
    return;
  }

  const placeholders = INITIAL_NOTE_IDS.map(() => '?').join(', ');
  await db.executeSql(`DELETE FROM notes WHERE id IN (${placeholders});`, INITIAL_NOTE_IDS);
}

async function getNotes() {
  const db = await getDatabase();
  await seedNotebooksIfNeeded(db);
  await removeLegacySeedNotesIfNeeded(db);
  await seedNotesIfNeeded(db);
  const result = getExecuteSqlResult(await db.executeSql(
    'SELECT id, header, body, notebook_id, pinned, created_at, updated_at FROM notes ORDER BY pinned DESC, updated_at DESC;',
  ));

  if (!result || !result.rows) {
    return [];
  }

  const notes = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    notes.push(mapRow(result.rows.item(i)));
  }

  return notes;
}

async function createNote({ header, body, notebook_id, pinned }) {
  const db = await getDatabase();
  await seedNotebooksIfNeeded(db);
  const now = Date.now();
  const note = {
    id: generateNoteId(),
    header: header.trim() || 'Untitled Note',
    body: body.trim(),
    notebook_id: notebook_id || DEFAULT_NOTEBOOK_ID,
    pinned: pinned || 0,
    created_at: now,
    updated_at: now,
  };

  await db.executeSql(
    'INSERT INTO notes (id, header, body, notebook_id, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
    [note.id, note.header, note.body, note.notebook_id, note.pinned, note.created_at, note.updated_at],
  );

  return note;
}

async function updateNote(note) {
  const db = await getDatabase();
  await seedNotebooksIfNeeded(db);
  const updatedAt = Date.now();

  await db.executeSql(
    'UPDATE notes SET header = ?, body = ?, notebook_id = ?, pinned = ?, updated_at = ? WHERE id = ?;',
    [
      note.header.trim() || 'Untitled Note',
      note.body.trim(),
      note.notebook_id || DEFAULT_NOTEBOOK_ID,
      note.pinned || 0,
      updatedAt,
      note.id,
    ],
  );

  return {
    ...note,
    notebook_id: note.notebook_id || DEFAULT_NOTEBOOK_ID,
    pinned: note.pinned || 0,
    updated_at: updatedAt,
  };
}

async function deleteNote(id) {
  const db = await getDatabase();
  await db.executeSql('DELETE FROM notes WHERE id = ?;', [id]);
}

async function getNotebooks() {
  const db = await getDatabase();
  await seedNotebooksIfNeeded(db);
  const result = getExecuteSqlResult(await db.executeSql(`
    SELECT
      nb.id,
      nb.name,
      nb.is_default,
      nb.created_at,
      nb.updated_at,
      COUNT(n.id) AS note_count
    FROM notebooks nb
    LEFT JOIN notes n ON n.notebook_id = nb.id
    GROUP BY nb.id, nb.name, nb.is_default, nb.created_at, nb.updated_at
    ORDER BY nb.is_default DESC, nb.name ASC;
  `));

  if (!result || !result.rows) {
    return [];
  }

  const notebooks = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i);
    notebooks.push({
      id: row.id,
      name: row.name,
      is_default: row.is_default,
      created_at: row.created_at,
      updated_at: row.updated_at,
      note_count: row.note_count,
    });
  }

  return notebooks;
}

async function createNotebook({ name }) {
  const db = await getDatabase();
  const now = Date.now();
  const notebook = {
    id: `notebook-${now}-${Math.random().toString(16).slice(2, 8)}`,
    name: name.trim(),
    is_default: 0,
    created_at: now,
    updated_at: now,
  };

  await db.executeSql(
    'INSERT INTO notebooks (id, name, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
    [notebook.id, notebook.name, notebook.is_default, notebook.created_at, notebook.updated_at],
  );

  return notebook;
}

async function moveNotesToNotebook(noteIds, notebookId) {
  const db = await getDatabase();
  if (!Array.isArray(noteIds) || noteIds.length === 0) {
    return;
  }

  const placeholders = noteIds.map(() => '?').join(', ');
  await db.executeSql(
    `UPDATE notes SET notebook_id = ?, updated_at = ? WHERE id IN (${placeholders});`,
    [notebookId, Date.now(), ...noteIds],
  );
}

async function pinNotes(noteIds, pinned) {
  const db = await getDatabase();
  if (!Array.isArray(noteIds) || noteIds.length === 0) {
    return;
  }

  const placeholders = noteIds.map(() => '?').join(', ');
  await db.executeSql(
    `UPDATE notes SET pinned = ?, updated_at = ? WHERE id IN (${placeholders});`,
    [pinned ? 1 : 0, Date.now(), ...noteIds],
  );
}

module.exports = {
  getDatabase,
  getNotes,
  getNotebooks,
  createNote,
  createNotebook,
  updateNote,
  deleteNote,
  moveNotesToNotebook,
  pinNotes,
  DEFAULT_NOTEBOOK_ID,
};
