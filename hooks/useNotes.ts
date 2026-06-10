import { useEffect, useState } from 'react';
import { Note } from '../types/notes';
import {
  createNote as createNoteInDb,
  createNotebook as createNotebookInDb,
  deleteNote as deleteNoteInDb,
  getNotes,
  getNotebooks,
  moveNotesToNotebook as moveNotesToNotebookInDb,
  pinNotes as pinNotesInDb,
  updateNote as updateNoteInDb,
} from '../database/notesDb';
import { Notebook } from '../types/notes';

type NoteDraft = Omit<Note, 'id' | 'created_at' | 'updated_at'>;

export default function useNotesStore() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);

  const refreshNotes = async () => {
    setNotes(await getNotes());
  };

  const refreshNotebooks = async () => {
    setNotebooks(await getNotebooks());
  };

  useEffect(() => {
    let isMounted = true;

    const loadNotes = async () => {
      const [currentNotes, currentNotebooks] = await Promise.all([getNotes(), getNotebooks()]);
      if (isMounted) {
        setNotes(currentNotes);
        setNotebooks(currentNotebooks);
      }
    };

    loadNotes();

    return () => {
      isMounted = false;
    };
  }, []);

  const createNote = async (note: NoteDraft) => {
    const createdNote = await createNoteInDb({
      header: note.header,
      body: note.body,
      notebook_id: note.notebook_id,
      pinned: note.pinned,
    });
    await refreshNotes();
    return createdNote;
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

  const createNotebook = async (name: string) => {
    const notebook = await createNotebookInDb({ name });
    await refreshNotebooks();
    return notebook;
  };

  const moveNotesToNotebook = async (noteIds: string[], notebookId: string) => {
    await moveNotesToNotebookInDb(noteIds, notebookId);
    await refreshNotes();
  };

  const pinNotes = async (noteIds: string[], pinned = true) => {
    await pinNotesInDb(noteIds, pinned);
    await refreshNotes();
  };

  return {
    notes,
    notebooks,
    createNote,
    updateNote,
    deleteNote,
    createNotebook,
    moveNotesToNotebook,
    pinNotes,
  };
}
