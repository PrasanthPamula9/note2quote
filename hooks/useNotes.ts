import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/react';
import type Collection from '@nozbe/watermelondb/Collection';
import NoteRecord from '../model/notes';
import { Note } from '../types/notes';

const NOTE_COLUMNS = [
  'title',
  'body',
  'content',
  'notebook',
  'is_handwritten',
  'created_at',
  'updated_at',
];

const SEED_NOTES: Note[] = [
  {
    id: '1',
    title: 'Coding Interview Patterns Guide (High ROI)',
    content:
      'This guide focuses on the most common coding patterns asked in interviews, with explanations and sample questions.',
    createdAt: new Date('2026-04-12'),
    updatedAt: new Date('2026-04-12'),
    notebook: 'Default notebook',
    isHandwritten: false,
  },
  {
    id: '2',
    title: 'ML PAPERS',
    content: 'Best Papers to Understand Machine Learning',
    createdAt: new Date('2026-03-22'),
    updatedAt: new Date('2026-03-22'),
    notebook: 'Default notebook',
    isHandwritten: false,
  },
  {
    id: '3',
    title: 'React Native Quote Editor Architecture',
    content: 'This document describes a scalable architecture for a quote editor application.',
    createdAt: new Date('2026-03-14'),
    updatedAt: new Date('2026-03-14'),
    notebook: 'Default notebook',
    isHandwritten: true,
  },
  {
    id: '4',
    title: '1.anna2.pedhamma 3',
    content: '',
    createdAt: new Date('2026-02-25'),
    updatedAt: new Date('2026-02-25'),
    notebook: 'Default notebook',
    isHandwritten: false,
  },
  {
    id: '5',
    title: 'Sri devi-89194 18328',
    content: '',
    createdAt: new Date('2026-02-20'),
    updatedAt: new Date('2026-02-20'),
    notebook: 'Default notebook',
    isHandwritten: false,
  },
];

type NoteDraft = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;

const mapRecordToNote = (record: NoteRecord): Note => ({
  id: record.id,
  title: record.title || 'Untitled Note',
  content: record.content || record.body || '',
  createdAt: record.createdAt || new Date(0),
  updatedAt: record.updatedAt || record.createdAt || new Date(0),
  notebook: record.notebook || 'Default notebook',
  isHandwritten: Boolean(record.isHandwritten),
  color: undefined,
  thumbnail: undefined,
});

const seedNoteRecord = async (collection: Collection<NoteRecord>) => {
  for (const note of SEED_NOTES) {
    await collection.create((record: NoteRecord) => {
      record.title = note.title;
      record.body = note.content;
      record.content = note.content;
      record.notebook = note.notebook;
      record.isHandwritten = note.isHandwritten ?? false;
      record.createdAt = note.createdAt;
      record.updatedAt = note.updatedAt;
    });
  }
};

export default function useNotesStore() {
  const database = useDatabase();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    let isActive = true;
    let subscription: { unsubscribe: () => void } | null = null;
    const collection = database.get<NoteRecord>('notes');
    const query = collection.query(Q.sortBy('updated_at', Q.desc));

    const loadNotes = async () => {
      const existingNotes = await query.fetch();

      if (!existingNotes.length) {
        await database.write(async () => {
          await seedNoteRecord(collection);
        });
      }

      const currentNotes = await query.fetch();
      if (isActive) {
        setNotes(currentNotes.map(mapRecordToNote));
        subscription = query.observeWithColumns(NOTE_COLUMNS).subscribe((records) => {
          if (isActive) {
            setNotes(records.map(mapRecordToNote));
          }
        });
      }
    };

    loadNotes();

    return () => {
      isActive = false;
      subscription?.unsubscribe();
    };
  }, [database]);

  const createNote = async (note: NoteDraft) => {
    const collection = database.get<NoteRecord>('notes');

    await database.write(async () => {
      await collection.create((record: NoteRecord) => {
        const now = new Date();
        record.title = note.title.trim() || 'Untitled Note';
        record.body = note.content.trim();
        record.content = note.content.trim();
        record.notebook = note.notebook || 'Default notebook';
        record.isHandwritten = note.isHandwritten ?? false;
        record.createdAt = now;
        record.updatedAt = now;
      });
    });
  };

  const updateNote = async (updatedNote: Note) => {
    const collection = database.get<NoteRecord>('notes');

    await database.write(async () => {
      const record = await collection.find(updatedNote.id);
      await record.update((currentRecord: NoteRecord) => {
        currentRecord.title = updatedNote.title.trim() || 'Untitled Note';
        currentRecord.body = updatedNote.content.trim();
        currentRecord.content = updatedNote.content.trim();
        currentRecord.notebook = updatedNote.notebook || 'Default notebook';
        currentRecord.isHandwritten = updatedNote.isHandwritten ?? false;
        currentRecord.updatedAt = updatedNote.updatedAt || new Date();
      });
    });
  };

  const deleteNote = async (noteId: string) => {
    const collection = database.get<NoteRecord>('notes');

    await database.write(async () => {
      const record = await collection.find(noteId);
      await record.destroyPermanently();
    });
  };

  return {
    notes,
    createNote,
    updateNote,
    deleteNote,
  };
}
