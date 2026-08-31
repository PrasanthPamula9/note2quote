import React, { useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  SlideInLeft,
  SlideInRight,
} from 'react-native-reanimated';
import NotesView from '../views/NotesView';
import NoteDetailView from '../views/NoteDetailView';
import { Note } from '../../types/notes';
import useNotesStore from '../../hooks/useNotes';
import { DEFAULT_NOTEBOOK_ID } from '../../database/notesDb';

type NotesContainerProps = {
  onCreateQuote?: (quoteText: string) => void;
};

export default function NotesContainer({ onCreateQuote }: NotesContainerProps) {
  const {
    notes,
    notebooks,
    createNote,
    updateNote,
    deleteNote,
    createNotebook,
    moveNotesToNotebook,
    pinNotes,
  } = useNotesStore();
  const [viewState, setViewState] = useState<'list' | 'detail'>('list');
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteMode, setNoteMode] = useState<'create' | 'edit' | null>(null);
  const [activeNotebookId, setActiveNotebookId] = useState('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [createNotebookVisible, setCreateNotebookVisible] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const enterDuration = 300;

  const visibleNotes = useMemo(() => {
    if (activeNotebookId === 'all') {
      return notes;
    }

    return notes.filter((note) => note.notebook_id === activeNotebookId);
  }, [activeNotebookId, notes]);

  const selectedNotes = useMemo(
    () => visibleNotes.filter((note) => selectedNoteIds.includes(note.id)),
    [selectedNoteIds, visibleNotes],
  );
  const selectedNotesContainPinned = useMemo(
    () => selectedNotes.some((note) => note.pinned),
    [selectedNotes],
  );

  const notebookLabelMap = useMemo(() => {
    return new Map(notebooks.map((notebook) => [notebook.id, notebook.name]));
  }, [notebooks]);

  const selectedNoteNotebookLabel = useMemo(() => {
    const notebookId = selectedNote?.notebook_id;
    if (!notebookId) {
      return 'Default notebook';
    }

    return notebookLabelMap.get(notebookId) || 'Default notebook';
  }, [notebookLabelMap, selectedNote?.notebook_id]);

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedNoteIds([]);
  };

  const toggleSelection = (noteId: string) => {
    setSelectedNoteIds((current) => {
      if (current.includes(noteId)) {
        return current.filter((id) => id !== noteId);
      }

      return [...current, noteId];
    });
    setSelectionMode(true);
  };

  const handleLongPressNote = (note: Note) => {
    setSelectionMode(true);
    setSelectedNoteIds([note.id]);
  };

  const handleSelectAll = () => {
    if (selectedNoteIds.length === visibleNotes.length) {
      setSelectedNoteIds([]);
      return;
    }

    setSelectedNoteIds(visibleNotes.map((note) => note.id));
  };

  const handleMoveSelected = () => {
    if (!selectedNotes.length) {
      return;
    }

    setMoveModalVisible(true);
  };

  const handleConfirmMove = async (notebookId: string) => {
    await moveNotesToNotebook(selectedNoteIds, notebookId);
    setMoveModalVisible(false);
    clearSelection();
  };

  const handlePinSelected = async () => {
    if (!selectedNoteIds.length) {
      return;
    }

    await pinNotes(selectedNoteIds, !selectedNotesContainPinned);
    clearSelection();
  };

  const handleCreateNotebook = async () => {
    const name = newNotebookName.trim();
    if (!name) {
      return;
    }

    const notebook = await createNotebook(name);
    setCreateNotebookVisible(false);
    setNewNotebookName('');
    if (notebook?.id) {
      await handleConfirmMove(notebook.id);
    }
  };

  const handleNotePress = (note: Note) => {
    if (selectionMode) {
      toggleSelection(note.id);
      return;
    }

    setSelectedNote(note);
    setNoteMode('edit');
    setTransitionDirection('forward');
    setViewState('detail');
  };

  const handleBack = () => {
    setTransitionDirection('backward');
    setViewState('list');
    setSelectedNote(null);
    setNoteMode(null);
    clearSelection();
  };

  const handleAddNote = () => {
    const now = Date.now();
    const notebookId = activeNotebookId === 'all' ? DEFAULT_NOTEBOOK_ID : activeNotebookId;
    setSelectedNote({
      id: `draft-${now}`,
      header: '',
      body: '',
      notebook_id: notebookId,
      pinned: 0,
      created_at: now,
      updated_at: now,
    });
    setNoteMode('create');
    setTransitionDirection('forward');
    setViewState('detail');
  };

  const handleCreateNote = async (noteData: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => {
    const createdNote = await createNote({
      ...noteData,
      notebook_id: noteData.notebook_id || (activeNotebookId === 'all' ? DEFAULT_NOTEBOOK_ID : activeNotebookId),
    });
    if (createdNote) {
      setSelectedNote(createdNote);
      setNoteMode('edit');
    }
    return createdNote;
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

  const handleDeleteSelected = async () => {
    if (!selectedNoteIds.length) {
      return;
    }

    Alert.alert(
      'Delete notes?',
      `Delete ${selectedNoteIds.length} selected note${selectedNoteIds.length === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const id of selectedNoteIds) {
              await deleteNote(id);
            }
            clearSelection();
          },
        },
      ],
    );
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
          >
            <NotesView
              notes={visibleNotes}
              notebooks={notebooks}
              activeNotebookId={activeNotebookId}
              selectionMode={selectionMode}
              selectedNoteIds={selectedNoteIds}
              onNotebookChange={(notebookId) => {
                setActiveNotebookId(notebookId);
                clearSelection();
              }}
              onNotePress={handleNotePress}
              onNoteLongPress={handleLongPressNote}
              onAddNote={handleAddNote}
              onToggleSelection={toggleSelection}
              onCancelSelection={clearSelection}
              onSelectAll={handleSelectAll}
              onMoveSelected={handleMoveSelected}
              onNewCategorySelected={() => setCreateNotebookVisible(true)}
              pinActionLabel={selectedNotesContainPinned ? 'Unpin' : 'Pin'}
              onPinSelected={handlePinSelected}
              onDeleteSelected={handleDeleteSelected}
            />
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
          >
            <NoteDetailView
              note={selectedNote}
              isNew={noteMode === 'create'}
              notebookLabel={selectedNoteNotebookLabel}
              onBack={handleBack}
              onCreate={handleCreateNote}
              onSave={handleSaveNote}
              onDelete={handleDeleteNote}
              onCreateQuote={onCreateQuote}
            />
          </Animated.View>
        )}
      </View>

      <Modal
        visible={moveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMoveModalVisible(false)}>
          <Pressable style={styles.moveSheet} onPress={() => null}>
            <View style={styles.moveSheetHeader}>
              <TouchableOpacity onPress={() => setMoveModalVisible(false)}>
                <Text style={styles.moveSheetAction}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.moveSheetTitle}>Choose notebook</Text>
            <TouchableOpacity onPress={() => setCreateNotebookVisible(true)}>
              <Text style={styles.moveSheetAction}>New</Text>
            </TouchableOpacity>
          </View>

            <View style={styles.moveList}>
              {notebooks.map((notebook) => {
                  return (
                    <TouchableOpacity
                      key={notebook.id}
                    style={styles.moveRow}
                    onPress={() => void handleConfirmMove(notebook.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.moveRowIcon}>
                      <Text style={styles.moveRowIconText}>◫</Text>
                    </View>
                    <View style={styles.moveRowTextWrap}>
                      <Text style={styles.moveRowText}>{notebook.name}</Text>
                    </View>
                    <Text style={styles.moveRowCount}>{notebook.note_count ?? 0}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.moveSaveButton} onPress={() => setMoveModalVisible(false)}>
              <Text style={styles.moveSaveText}>Save</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={createNotebookVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateNotebookVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCreateNotebookVisible(false)}>
          <Pressable style={styles.createNotebookSheet} onPress={() => null}>
            <Text style={styles.createNotebookTitle}>New category</Text>
            <TextInput
              style={styles.createNotebookInput}
              placeholder="Category name"
              value={newNotebookName}
              onChangeText={setNewNotebookName}
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.createNotebookActions}>
              <TouchableOpacity
                style={[styles.createNotebookButton, styles.createNotebookCancel]}
                onPress={() => setCreateNotebookVisible(false)}
              >
                <Text style={styles.createNotebookCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createNotebookButton, styles.createNotebookConfirm]}
                onPress={() => void handleCreateNotebook()}
                disabled={!newNotebookName.trim()}
              >
                <Text style={styles.createNotebookConfirmText}>Create</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
  },
  moveSheet: {
    backgroundColor: '#f5f5f7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  moveSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  moveSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  moveSheetAction: {
    fontSize: 16,
    color: '#c79200',
    fontWeight: '600',
  },
  moveList: {
    gap: 12,
  },
  moveRow: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moveRowSelected: {
    backgroundColor: '#ffc107',
  },
  moveRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#ffc107',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  moveRowIconText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '700',
  },
  moveRowTextWrap: {
    flex: 1,
  },
  moveRowText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '600',
  },
  moveRowCount: {
    fontSize: 14,
    color: '#999',
  },
  moveSaveButton: {
    marginTop: 18,
    backgroundColor: '#ffc107',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  moveSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  createNotebookSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 28,
  },
  createNotebookTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 14,
  },
  createNotebookInput: {
    backgroundColor: '#f5f5f7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#222',
  },
  createNotebookActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  createNotebookButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  createNotebookCancel: {
    backgroundColor: '#f1f1f1',
  },
  createNotebookConfirm: {
    backgroundColor: '#ffc107',
  },
  createNotebookCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  createNotebookConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
