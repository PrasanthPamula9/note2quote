import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
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
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const enterDuration = 300;
  const exitDuration = 240;

  const handleNotePress = (note: Note) => {
    setSelectedNote(note);
    setTransitionDirection('forward');
    setViewState('detail');
  };

  const handleBack = () => {
    setTransitionDirection('backward');
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
    return savedNote;
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId);
    setTransitionDirection('backward');
    setViewState('list');
    setSelectedNote(null);
  };

  useEffect(() => {
    const onHardwareBackPress = () => {
      if (viewState === 'detail') {
        handleBack();
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBackPress,
    );

    return () => subscription.remove();
  }, [viewState, handleBack]);

  return (
    <View style={styles.container}>
      <View style={styles.pageStack}>
        {viewState === 'list' && (
          <Animated.View
            key="notes-list"
            style={styles.page}
            entering={
              transitionDirection === 'forward'
                ? SlideInRight.duration(enterDuration)
                : SlideInLeft.duration(enterDuration)
            }
            exiting={
              transitionDirection === 'forward'
                ? SlideOutLeft.duration(exitDuration)
                : SlideOutRight.duration(exitDuration)
            }
          >
            <NotesView notes={notes} onNotePress={handleNotePress} onAddNote={handleAddNote} />
          </Animated.View>
        )}

        {viewState === 'detail' && selectedNote && (
          <Animated.View
            key="notes-detail"
            style={styles.page}
            entering={
              transitionDirection === 'forward'
                ? SlideInRight.duration(enterDuration)
                : SlideInLeft.duration(enterDuration)
            }
            exiting={
              transitionDirection === 'forward'
                ? SlideOutLeft.duration(exitDuration)
                : SlideOutRight.duration(exitDuration)
            }
          >
            <NoteDetailView
              note={selectedNote}
              onBack={handleBack}
              onSave={handleSaveNote}
              onDelete={handleDeleteNote}
              onCreateQuote={onCreateQuote}
            />
          </Animated.View>
        )}
      </View>

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
  pageStack: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  page: {
    ...StyleSheet.absoluteFillObject,
  },
});
