import { useEffect, useState, useCallback } from 'react';
import { Note as NoteModel } from '../database/models/Note';
import { getDatabase } from '../database';
import { Note } from '../types/notes';

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all notes from database
  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const database = getDatabase();
      const noteModels = await database.collections
        .get<NoteModel>('notes')
        .query()
        .fetch();

      const notesData = noteModels.map((note) => note.toObject());
      setNotes(notesData);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch notes on mount
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Create a new note
  const createNote = useCallback(
    async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const database = getDatabase();
        const notesCollection = database.collections.get<NoteModel>('notes');

        const newNote = await database.write(async () => {
          return await notesCollection.create((note) => {
            note.title = noteData.title;
            note.content = noteData.content;
            note.notebook = noteData.notebook;
            note.isHandwritten = noteData.isHandwritten ?? false;
            note.color = noteData.color;
            note.thumbnail = noteData.thumbnail;
          });
        });

        await fetchNotes();
        return newNote.toObject();
      } catch (error) {
        console.error('Error creating note:', error);
        throw error;
      }
    },
    [fetchNotes]
  );

  // Update an existing note
  const updateNote = useCallback(
    async (noteId: string, noteData: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>) => {
      try {
        const database = getDatabase();
        const notesCollection = database.collections.get<NoteModel>('notes');

        const note = await notesCollection.find(noteId);

        const updated = await database.write(async () => {
          await note.update((record) => {
            if (noteData.title !== undefined) record.title = noteData.title;
            if (noteData.content !== undefined) record.content = noteData.content;
            if (noteData.notebook !== undefined) record.notebook = noteData.notebook;
            if (noteData.isHandwritten !== undefined) record.isHandwritten = noteData.isHandwritten;
            if (noteData.color !== undefined) record.color = noteData.color;
            if (noteData.thumbnail !== undefined) record.thumbnail = noteData.thumbnail;
          });
          return note;
        });

        await fetchNotes();
        return updated.toObject();
      } catch (error) {
        console.error('Error updating note:', error);
        throw error;
      }
    },
    [fetchNotes]
  );

  // Delete a note
  const deleteNote = useCallback(
    async (noteId: string) => {
      try {
        const database = getDatabase();
        const notesCollection = database.collections.get<NoteModel>('notes');

        const note = await notesCollection.find(noteId);

        await database.write(async () => {
          await note.destroyPermanently();
        });

        await fetchNotes();
      } catch (error) {
        console.error('Error deleting note:', error);
        throw error;
      }
    },
    [fetchNotes]
  );

  // Get notes filtered by notebook
  const getNotesByNotebook = useCallback((notebook: string): Note[] => {
    return notes.filter((note) => note.notebook === notebook);
  }, [notes]);

  // Get handwritten notes
  const getHandwrittenNotes = useCallback((): Note[] => {
    return notes.filter((note) => note.isHandwritten);
  }, [notes]);

  return {
    notes,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    fetchNotes,
    getNotesByNotebook,
    getHandwrittenNotes,
  };
};
