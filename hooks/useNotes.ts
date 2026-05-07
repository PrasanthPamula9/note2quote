import { useEffect, useState } from 'react';
import { Note } from '../types/notes';
import {
  createNote as createNoteInDb,
  deleteNote as deleteNoteInDb,
  getNotes,
  updateNote as updateNoteInDb,
} from '../database/notesDb';

type NoteDraft = Omit<Note, 'id' | 'created_at' | 'updated_at'>;

export default function useNotesStore() {
  const [notes, setNotes] = useState<Note[]>([]);

  const refreshNotes = async () => {
    setNotes(await getNotes());
  };

  useEffect(() => {
    let isMounted = true;

    const loadNotes = async () => {
      const currentNotes = await getNotes();
      if (isMounted) {
        setNotes(currentNotes);
      }
    };

    loadNotes();

    return () => {
      isMounted = false;
    };
  }, []);

  const createNote = async (note: NoteDraft) => {
    await createNoteInDb({
      header: note.header,
      body: note.body,
    });
    await refreshNotes();
  };

  const updateNote = async (updatedNote: Note) => {
    const savedNote = await updateNoteInDb(updatedNote);
    await refreshNotes();
    return savedNote;
  };

  const deleteNote = async (noteId: string) => {
    await deleteNoteInDb(noteId);
    await refreshNotes();
  };

  return {
    notes,
    createNote,
    updateNote,
    deleteNote,
  };
}
