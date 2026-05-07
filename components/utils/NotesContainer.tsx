import React, { useState } from 'react';
import { View } from 'react-native';
import NotesView from '../views/NotesView';
import NoteDetailView from '../views/NoteDetailView';
import NoteCreationModal from '../views/NoteCreationModal';
import { Note } from '../../types/notes';
import useNotesStore from '../../hooks/useNotes';

type ViewState = 'list' | 'detail' | 'creating';

export default function NotesContainer() {
  const { notes, createNote, updateNote, deleteNote } = useNotesStore();
  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showCreationModal, setShowCreationModal] = useState(false);

  const handleNotePress = (note: Note) => {
    setSelectedNote(note);
    setViewState('detail');
  };

  const handleBack = () => {
    setViewState('list');
    setSelectedNote(null);
  };

  const handleAddNote = () => {
    setShowCreationModal(true);
  };

  const handleCreateNote = async (
    noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    await createNote(noteData);
    setShowCreationModal(false);
  };

  const handleSaveNote = async (updatedNote: Note) => {
    await updateNote({
      ...updatedNote,
      updatedAt: new Date(),
    });
    setSelectedNote(updatedNote);
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId);
    setViewState('list');
    setSelectedNote(null);
  };

  return (
    <View style={{ flex: 1 }}>
      {viewState === 'list' && (
        <NotesView notes={notes} onNotePress={handleNotePress} onAddNote={handleAddNote} />
      )}

      {viewState === 'detail' && selectedNote && (
        <NoteDetailView
          note={selectedNote}
          onBack={handleBack}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
        />
      )}

      <NoteCreationModal
        visible={showCreationModal}
        onClose={() => setShowCreationModal(false)}
        onCreate={handleCreateNote}
      />
    </View>
  );
}
