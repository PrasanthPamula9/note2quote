import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { FAB, Appbar } from 'react-native-paper';
import { Note } from '../../types/notes';

interface NotesViewProps {
  notes?: Note[];
  onNotePress?: (note: Note) => void;
  onAddNote?: () => void;
}

export default function NotesView({
  notes: defaultNotes = [],
  onNotePress,
  onAddNote,
}: NotesViewProps) {
  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
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
          {item.header}
        </Text>
        {item.body ? (
          <Text style={styles.notePreview} numberOfLines={1}>
            {item.body}
          </Text>
        ) : null}
      </View>
      <Text style={styles.noteDate}>{formatDate(item.updated_at)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={{ backgroundColor: 'transparent', elevation: 0 }}>
        <Appbar.Content  color="#433e3e" titleStyle={{ fontSize:28 , fontWeight: '800'}} title="Notes" />
      </Appbar.Header>

      <FlatList
        data={defaultNotes}
        renderItem={renderNoteCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptyText}>Tap the plus button to create your first note.</Text>
          </View>
        }
      />

      <FAB icon="plus" style={styles.fab} onPress={onAddNote} size="medium" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 20,
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
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
