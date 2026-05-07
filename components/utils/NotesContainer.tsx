import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import NotesView from '../views/NotesView';
import NoteDetailView from '../views/NoteDetailView';
import NoteCreationModal from '../views/NoteCreationModal';
import { Note } from '../../types/notes';
import useNotesStore from '../../hooks/useNotes';

type NotesContainerProps = {
  onCreateQuote?: (quoteText: string) => void;
};

export default function NotesContainer({ onCreateQuote }: NotesContainerProps) {
  const { notes, createNote, updateNote, deleteNote } = useNotesStore();
  const [viewState, setViewState] = useState<'list' | 'detail' | 'creating'>('list');
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
    noteData: Omit<Note, 'id' | 'created_at' | 'updated_at'>,
  ) => {
    await createNote(noteData);
    setShowCreationModal(false);
  };

  const handleSaveNote = async (updatedNote: Note) => {
    const savedNote = await updateNote(updatedNote);
    setSelectedNote(savedNote);
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId);
    setViewState('list');
    setSelectedNote(null);
  };

  return (
    <View style={styles.container}>
      {viewState === 'list' && (
        <NotesView notes={notes} onNotePress={handleNotePress} onAddNote={handleAddNote} />
      )}

      {viewState === 'detail' && selectedNote && (
        <NoteDetailView
          note={selectedNote}
          onBack={handleBack}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
          onCreateQuote={onCreateQuote}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
