import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { FAB, Appbar } from 'react-native-paper';
import { Note } from '../../types/notes';
import { getResponsiveMetrics } from '../utils/responsive';

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
  const { width, height } = useWindowDimensions();
  const layout = getResponsiveMetrics(width, height);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const month = String(d.getDate()).padStart(2, '0');
    const day = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const renderNoteCard = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={[
        styles.noteCard,
        {
          borderRadius: layout.cardRadius,
          padding: layout.sectionPadding - 4,
          marginBottom: layout.cardGap,
        },
      ]}
      onPress={() => onNotePress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.noteContent}>
        <Text style={[styles.noteTitle, { fontSize: layout.bodySize }]} numberOfLines={2}>
          {item.header}
        </Text>
        {item.body ? (
          <Text style={[styles.notePreview, { fontSize: layout.subtitleSize }]} numberOfLines={1}>
            {item.body}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.noteDate, { fontSize: layout.smallTextSize }]}>{formatDate(item.updated_at)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={{ backgroundColor: 'transparent', elevation: 0 }}>
        <Appbar.Content
          color="#433e3e"
          titleStyle={{ fontSize: layout.titleSize, fontWeight: '800', marginTop: 8 }}
          title="Notes"
        />
      </Appbar.Header>

      <FlatList
        data={defaultNotes}
        renderItem={renderNoteCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            maxWidth: layout.contentMaxWidth,
            paddingHorizontal: layout.pagePadding,
            paddingBottom: layout.sectionPadding,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { fontSize: layout.bodySize + 2 }]}>No notes yet</Text>
            <Text style={[styles.emptyText, { fontSize: layout.subtitleSize }]}>
              Tap the plus button to create your first note.
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[
          styles.fab,
          {
            margin: layout.sectionPadding,
            transform: [{ scale: layout.isTablet ? 1.05 : 1 }],
          },
        ]}
        onPress={onAddNote}
        size={layout.isTablet ? 'large' : 'medium'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingTop: 8,
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
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
    lineHeight: 22,
  },
  notePreview: {
    color: '#999',
    marginBottom: 8,
    lineHeight: 18,
  },
  noteDate: {
    color: '#ccc',
    minWidth: 70,
    textAlign: 'right',
  },
  fab: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#ffc107',
  },
});
