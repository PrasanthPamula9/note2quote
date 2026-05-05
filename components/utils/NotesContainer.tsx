import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import NotesView from '../views/NotesView';
import NoteDetailView from '../views/NoteDetailView';
import NoteCreationModal from '../views/NoteCreationModal';
import { Note } from '../../types/notes';
import { useNotes } from '../../hooks/useNotes';

type ViewState = 'list' | 'detail' | 'creating';

export default function NotesContainer() {
  const { notes, isLoading, createNote, updateNote, deleteNote } = useNotes();
  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleCreateNote = async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null);
      await createNote(noteData);
      setShowCreationModal(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
      setError(errorMessage);
      console.error('Error creating note:', err);
    }
  };

  const handleSaveNote = async (updatedNote: Note) => {
    try {
      setError(null);
      const { id, createdAt, updatedAt, ...noteData } = updatedNote;
      await updateNote(id, noteData);
      setSelectedNote(updatedNote);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save note';
      setError(errorMessage);
      console.error('Error saving note:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      setError(null);
      await deleteNote(noteId);
      setViewState('list');
      setSelectedNote(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
      setError(errorMessage);
      console.error('Error deleting note:', err);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading notes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>Error: {error}</Text>
      </View>
    );
  }

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
