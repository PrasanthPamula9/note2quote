const SQLite = require('react-native-sqlite-storage');

SQLite.enablePromise(true);

const DB_NAME = 'note2quote.db';
const DB_VERSION = '1.0';
const DB_DISPLAY_NAME = 'note2quote';
const DB_SIZE = 200000;

const INITIAL_NOTES = [
  {
    id: 'note-1',
    header: 'Coding Interview Patterns Guide (High ROI)',
    body:
      'This guide focuses on the most common coding patterns asked in interviews, with explanations and sample questions.',
    created_at: new Date('2026-04-12').getTime(),
    updated_at: new Date('2026-04-12').getTime(),
  },
  {
    id: 'note-2',
    header: 'ML PAPERS',
    body: 'Best Papers to Understand Machine Learning',
    created_at: new Date('2026-03-22').getTime(),
    updated_at: new Date('2026-03-22').getTime(),
  },
  {
    id: 'note-3',
    header: 'React Native Quote Editor Architecture',
    body: 'This document describes a scalable architecture for a quote editor application.',
    created_at: new Date('2026-03-14').getTime(),
    updated_at: new Date('2026-03-14').getTime(),
  },
  {
    id: 'note-4',
    header: '1.anna2.pedhamma 3',
    body: '',
    created_at: new Date('2026-02-25').getTime(),
    updated_at: new Date('2026-02-25').getTime(),
  },
  {
    id: 'note-5',
    header: 'Sri devi-89194 18328',
    body: '',
    created_at: new Date('2026-02-20').getTime(),
    updated_at: new Date('2026-02-20').getTime(),
  },
];

let dbPromise = null;

function generateNoteId() {
  return `note-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function mapRow(row) {
  return {
    id: row.id,
    header: row.header,
    body: row.body,
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
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  return db;
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
  const count = await getRowCount(db);
  if (count > 0) {
    return;
  }

  for (const note of INITIAL_NOTES) {
    await db.executeSql(
      'INSERT INTO notes (id, header, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
      [note.id, note.header, note.body, note.created_at, note.updated_at],
    );
  }
}

async function getNotes() {
  const db = await getDatabase();
  await seedNotesIfNeeded(db);
  const result = getExecuteSqlResult(await db.executeSql(
    'SELECT id, header, body, created_at, updated_at FROM notes ORDER BY updated_at DESC;',
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

async function createNote({ header, body }) {
  const db = await getDatabase();
  const now = Date.now();
  const note = {
    id: generateNoteId(),
    header: header.trim() || 'Untitled Note',
    body: body.trim(),
    created_at: now,
    updated_at: now,
  };

  await db.executeSql(
    'INSERT INTO notes (id, header, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
    [note.id, note.header, note.body, note.created_at, note.updated_at],
  );

  return note;
}

async function updateNote(note) {
  const db = await getDatabase();
  const updatedAt = Date.now();

  await db.executeSql(
    'UPDATE notes SET header = ?, body = ?, updated_at = ? WHERE id = ?;',
    [note.header.trim() || 'Untitled Note', note.body.trim(), updatedAt, note.id],
  );

  return {
    ...note,
    updated_at: updatedAt,
  };
}

async function deleteNote(id) {
  const db = await getDatabase();
  await db.executeSql('DELETE FROM notes WHERE id = ?;', [id]);
}

module.exports = {
  getDatabase,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
};
