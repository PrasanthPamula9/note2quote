import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Chip } from 'react-native-paper';
import { FAB } from 'react-native-paper';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import { Note, NotebookFilter } from '../../types/notes';
import { Appbar, Icon } from 'react-native-paper'

interface NotesViewProps {
  notes?: Note[];
  onNotePress?: (note: Note) => void;
  onAddNote?: () => void;
}

export default function NotesView({ 
  notes: defaultNotes = [],
  onNotePress, 
  onAddNote 
}: NotesViewProps) {
  const [filter, setFilter] = useState<NotebookFilter>('all');
  const [notes] = useState<Note[]>(defaultNotes);

  const filteredNotes = notes.filter((note) => {
    if (filter === 'handwritten') {
      return note.isHandwritten;
    }
    if (filter === 'default') {
      return note.notebook === 'Default notebook';
    }
    return true;
  });

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const month = String(d.getDate()).padStart(2, '0');
    const day = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const renderNoteCard = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={styles.noteCard}
      onPress={() => onNotePress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.noteContent}>
        <Text style={styles.noteTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.content && (
          <Text style={styles.notePreview} numberOfLines={1}>
            {item.content}
          </Text>
        )}
        {item.isHandwritten && (
          <View style={styles.handwrittenTag}>
            <MaterialIcons name="pencil" size={14} color="#999" />
            <Text style={styles.handwrittenText}>Handwritten notes</Text>
          </View>
        )}
      </View>
      <Text style={styles.noteDate}>{formatDate(item.createdAt)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <Appbar.Header>
        <Appbar.Content title="Notes" />
      </Appbar.Header>
      {/* <View style={styles.header}>
        <Text style={styles.title}>Notes</Text>
        <Text style={styles.noteCount}>{filteredNotes.length} notes</Text>
      </View> */}

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            style={[
              styles.chip,
              filter === 'all' && styles.chipSelected,
            ]}
            textStyle={[
              styles.chipText,
              filter === 'all' && styles.chipTextSelected,
            ]}
            icon={filter === 'all' ? 'check' : undefined}
          >
            All notes
          </Chip>
          <Chip
            selected={filter === 'handwritten'}
            onPress={() => setFilter('handwritten')}
            style={[
              styles.chip,
              filter === 'handwritten' && styles.chipSelected,
            ]}
            textStyle={[
              styles.chipText,
              filter === 'handwritten' && styles.chipTextSelected,
            ]}
          >
            Handwritten notes
          </Chip>
          <Chip
            selected={filter === 'default'}
            onPress={() => setFilter('default')}
            style={[
              styles.chip,
              filter === 'default' && styles.chipSelected,
            ]}
            textStyle={[
              styles.chipText,
              filter === 'default' && styles.chipTextSelected,
            ]}
          >
            Default notebook
          </Chip>
        </ScrollView>
      </View>

      {/* Notes List */}
      <FlatList
        data={filteredNotes}
        renderItem={renderNoteCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={onAddNote}
        size="medium"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#000',
    marginBottom: 4,
  },
  noteCount: {
    fontSize: 14,
    color: '#999',
  },
  filterContainer: {
    paddingVertical: 12,
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: '#f0f0f0',
    borderWidth: 0,
  },
  chipSelected: {
    backgroundColor: '#000',
  },
  chipText: {
    color: '#000',
    fontSize: 13,
  },
  chipTextSelected: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 20,
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  noteContent: {
    flex: 1,
    marginRight: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  notePreview: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  handwrittenTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  handwrittenText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  noteDate: {
    fontSize: 12,
    color: '#ccc',
    minWidth: 70,
    textAlign: 'right',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffc107',
  },
});
