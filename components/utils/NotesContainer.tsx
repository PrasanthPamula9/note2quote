import React, { useState } from 'react';
import { View } from 'react-native';
import NotesView from '../views/NotesView';
import NoteDetailView from '../views/NoteDetailView';
import NoteCreationModal from '../views/NoteCreationModal';
import { Note } from '../../types/notes';

const DUMMY_NOTES: Note[] = [
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

type ViewState = 'list' | 'detail' | 'creating';

export default function NotesContainer() {
  const [notes, setNotes] = useState<Note[]>(DUMMY_NOTES);
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

  const handleCreateNote = (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newNote: Note = {
      ...noteData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setNotes([newNote, ...notes]);
    setShowCreationModal(false);
  };

  const handleSaveNote = (updatedNote: Note) => {
    setNotes(notes.map((note) =>
      note.id === updatedNote.id
        ? { ...updatedNote, updatedAt: new Date() }
        : note
    ));
    setSelectedNote(updatedNote);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter((note) => note.id !== noteId));
    setViewState('list');
    setSelectedNote(null);
  };

  return (
    <View style={{ flex: 1 }}>
      {viewState === 'list' && (
        <NotesView onNotePress={handleNotePress} onAddNote={handleAddNote} />
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
