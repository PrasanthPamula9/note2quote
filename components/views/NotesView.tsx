import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  useWindowDimensions,
} from 'react-native';
import { FAB, Appbar } from 'react-native-paper';
import { Note } from '../../types/notes';
import { getResponsiveMetrics } from '../utils/responsive';
import NativeAdTile from '../ads/NativeAdTile';
import { htmlToPlainText } from '../../utils/noteContent';

interface NotesViewProps {
  notes?: Note[];
  onNotePress?: (note: Note) => void;
  onAddNote?: () => void;
}

type NotesListItem =
  | { kind: 'note'; id: string; note: Note }
  | { kind: 'ad'; id: string };

export default function NotesView({
  notes: defaultNotes = [],
  onNotePress,
  onAddNote,
}: NotesViewProps) {
  const { width, height } = useWindowDimensions();
  const layout = getResponsiveMetrics(width, height);
  const searchInputRef = useRef<TextInput | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (!searchActive) {
      return;
    }

    const handle = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(handle);
  }, [searchActive]);

  const handleToggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (searchActive) {
      Keyboard.dismiss();
      setSearchActive(false);
      setSearchText('');
      return;
    }

    setSearchActive(true);
  };

  const normalizedSearch = searchText.trim().toLowerCase();
  const listData = useMemo<NotesListItem[]>(() => {
    const items: NotesListItem[] = [];
    const filteredNotes = defaultNotes.filter((note) => {
      if (!normalizedSearch) {
        return true;
      }

      const header = note.header.toLowerCase();
      const body = htmlToPlainText(note.body).toLowerCase();
      return header.includes(normalizedSearch) || body.includes(normalizedSearch);
    });

    filteredNotes.forEach((note, index) => {
      items.push({ kind: 'note', id: note.id, note });

      if ((index + 1) % 5 === 0) {
        items.push({ kind: 'ad', id: `notes-native-ad-${index + 1}` });
      }
    });

    return items;
  }, [defaultNotes, normalizedSearch]);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const month = String(d.getDate()).padStart(2, '0');
    const day = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const renderNoteCard = ({ item }: { item: Note }) => {
    const previewText = htmlToPlainText(item.body);

    return (
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
          {previewText ? (
            <Text style={[styles.notePreview, { fontSize: layout.subtitleSize }]} numberOfLines={1}>
              {previewText}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.noteDate, { fontSize: layout.smallTextSize }]}>
          {formatDate(item.updated_at)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderListItem = ({ item }: { item: NotesListItem }) => {
    if (item.kind === 'ad') {
      return (
        <NativeAdTile
          variant="feed"
          style={[
            styles.nativeAdTile,
            {
              marginBottom: layout.cardGap,
              borderRadius: layout.cardRadius,
            },
          ]}
        />
      );
    }

    return renderNoteCard({ item: item.note });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={[styles.header, { paddingHorizontal: layout.pagePadding }]}>
        <View style={styles.headerRow}>
          {searchActive ? (
            <View style={styles.searchShell}>
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { fontSize: layout.bodySize }]}
                placeholder="Search notes"
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
                selectionColor="#433e3e"
              />
            </View>
          ) : (
            <Appbar.Content
              color="#433e3e"
              titleStyle={{ fontSize: layout.titleSize, fontWeight: '800', marginTop: 8 }}
              title="Notes"
            />
          )}
          <Appbar.Action
            icon={searchActive ? 'close' : 'magnify'}
            onPress={handleToggleSearch}
          />
        </View>
      </Appbar.Header>

      <FlatList
        data={listData}
        renderItem={renderListItem}
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
            <Text style={[styles.emptyTitle, { fontSize: layout.bodySize + 2 }]}>
              {normalizedSearch ? 'No notes found' : 'No notes yet'}
            </Text>
            <Text style={[styles.emptyText, { fontSize: layout.subtitleSize }]}>
              {normalizedSearch
                ? 'Try a different search term.'
                : 'Tap the plus button to create your first note.'}
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
  header: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchShell: {
    flex: 1,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#f4f4f4',
    borderRadius: 18,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  searchInput: {
    color: '#222',
    paddingVertical: 8,
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
  nativeAdTile: {
    width: '100%',
  },
  fab: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#ffc107',
  },
});
