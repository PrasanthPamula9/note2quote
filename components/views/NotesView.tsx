import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  ImageBackground,
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
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { FAB } from 'react-native-paper';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Note, Notebook } from '../../types/notes';
import { getResponsiveMetrics } from '../utils/responsive';
import NativeAdTile from '../ads/NativeAdTile';
import { htmlToPlainText } from '../../utils/noteContent';

interface NotesViewProps {
  notes?: Note[];
  notebooks?: Notebook[];
  activeNotebookId?: string;
  selectionMode?: boolean;
  selectedNoteIds?: string[];
  onNotebookChange?: (notebookId: string) => void;
  onNotePress?: (note: Note) => void;
  onNoteLongPress?: (note: Note) => void;
  onAddNote?: () => void;
  onToggleSelection?: (noteId: string) => void;
  onCancelSelection?: () => void;
  onSelectAll?: () => void;
  onMoveSelected?: () => void;
  onNewCategorySelected?: () => void;
  pinActionLabel?: string;
  onPinSelected?: () => void;
  onDeleteSelected?: () => void;
}

type NotesListItem =
  | { kind: 'note'; id: string; note: Note }
  | { kind: 'ad'; id: string };

export default function NotesView({
  notes: defaultNotes = [],
  notebooks = [],
  activeNotebookId = 'all',
  selectionMode = false,
  selectedNoteIds = [],
  onNotebookChange,
  onNotePress,
  onNoteLongPress,
  onAddNote,
  onToggleSelection,
  onCancelSelection,
  onSelectAll,
  onMoveSelected,
  onNewCategorySelected,
  pinActionLabel = 'Pin',
  onPinSelected,
  onDeleteSelected,
}: NotesViewProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
  const notebookMap = useMemo(() => {
    return new Map(notebooks.map((notebook) => [notebook.id, notebook]));
  }, [notebooks]);
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
    const notebook = notebookMap.get(item.notebook_id);
    const isSelected = selectedNoteIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.noteCard,
          selectionMode && styles.noteCardSelectable,
          isSelected && styles.noteCardSelected,
          {
            borderRadius: layout.cardRadius,
            padding: layout.sectionPadding - 4,
            marginBottom: layout.cardGap,
          },
        ]}
        onPress={() => {
          if (selectionMode) {
            onToggleSelection?.(item.id);
            return;
          }

          onNotePress?.(item);
        }}
        onLongPress={() => onNoteLongPress?.(item)}
        activeOpacity={0.7}
      >
        <View style={styles.noteBadgeRow}>
          {item.pinned ? (
            <View style={[styles.noteBadge, styles.notePinBadge]}>
              <MaterialIcons name="pin" size={14} color="#222" />
            </View>
          ) : null}
          <View style={styles.noteBadge}>
            <MaterialIcons name="folder-outline" size={14} color="#222" />
            <Text style={styles.noteBadgeText}>{notebook?.name || 'Default notebook'}</Text>
          </View>
        </View>
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
        {selectionMode ? (
          <View style={[styles.checkboxWrap, isSelected && styles.checkboxWrapSelected]}>
              <MaterialIcons
                name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
               // color={isSelected ? '#ffc107' : '#b6b6b6'}
              />
          </View>
        ) : (
          <Text style={[styles.noteDate, { fontSize: layout.smallTextSize }]}>
            {formatDate(item.updated_at)}
          </Text>
        )}
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

  const selectedCount = selectedNoteIds.length;
  const allSelected = selectionMode && selectedCount > 0 && selectedCount === listData.filter((item) => item.kind === 'note').length;

  return (
    <ImageBackground
      source={require('../../assets/app_bg.png')}
      resizeMode="cover"
      imageStyle={styles.backgroundImage}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
      <View style={[styles.topArea, { paddingHorizontal: layout.pagePadding }]}>
        <View style={{ height: insets.top }} />
        {selectionMode ? (
          <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={onCancelSelection}>
              <Text style={styles.selectionAction}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSelectAll}>
              <Text style={styles.selectionAction}>{allSelected ? 'Unselect all' : 'Select all'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text style={[styles.pageTitle, { fontSize: layout.titleSize + 4 }]}>Notes</Text>
              <Text style={[styles.noteCount, { fontSize: layout.subtitleSize }]}>
                {defaultNotes.length} notes
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleToggleSearch} style={styles.iconAction}>
                <MaterialIcons
                  name={searchActive ? 'close' : 'magnify'}
                  size={26}
                  color="#222"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!selectionMode && searchActive ? (
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
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryStrip}
        >
          <TouchableOpacity
            style={styles.categoryAddButton}
            onPress={onNewCategorySelected}
            activeOpacity={0.8}
          >
            <MaterialIcons name="plus" size={18} color="#433e3e" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.categoryChip,
              activeNotebookId === 'all' && styles.categoryChipActive,
            ]}
            onPress={() => onNotebookChange?.('all')}
          >
            <Text
              style={[
                styles.categoryChipText,
                activeNotebookId === 'all' && styles.categoryChipTextActive,
              ]}
            >
              All notes
            </Text>
          </TouchableOpacity>

          {notebooks.map((notebook) => (
            <TouchableOpacity
              key={notebook.id}
              style={[
                styles.categoryChip,
                activeNotebookId === notebook.id && styles.categoryChipActive,
              ]}
              onPress={() => onNotebookChange?.(notebook.id)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  activeNotebookId === notebook.id && styles.categoryChipTextActive,
                ]}
                numberOfLines={1}
              >
                {notebook.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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

      {selectionMode ? (
        <View style={styles.selectionBar}>
          <TouchableOpacity style={styles.selectionBarItem} onPress={onMoveSelected}>
            <MaterialIcons name="folder-move-outline" size={26} color="#222" />
            <Text style={styles.selectionBarLabel}>Move</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionBarItem} onPress={onNewCategorySelected}>
            <MaterialIcons name="folder-plus-outline" size={26} color="#222" />
            <Text style={styles.selectionBarLabel}>New category</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionBarItem} onPress={onPinSelected}>
            <MaterialIcons name="pin-outline" size={26} color="#222" />
            <Text style={styles.selectionBarLabel}>{pinActionLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionBarItem} onPress={onDeleteSelected}>
            <MaterialIcons name="delete-outline" size={26} color="#222" />
            <Text style={styles.selectionBarLabel}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FAB
          icon="plus"
          color="#433e3e"
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
      )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
  },
  backgroundImage: {
    opacity: 0.6,
  },
  topArea: {
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleBlock: {
    flex: 1,
  },
  pageTitle: {
    fontWeight: '800',
    color: '#111',
  },
  noteCount: {
    color: '#7d7d7d',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconAction: {
    padding: 4,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  selectionAction: {
    fontSize: 16,
    color: '#c79200',
    fontWeight: '700',
  },
  searchShell: {
    marginBottom: 12,
    backgroundColor: '#f4f4f4',
    borderRadius: 18,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  searchInput: {
    color: '#222',
    paddingVertical: 8,
  },
  categoryStrip: {
    gap: 10,
    paddingBottom: 6,
    alignItems: 'center',
  },
  categoryAddButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffc107',
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  categoryChip: {
    backgroundColor: '#f4f4f4',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#ececec',
  },
  categoryChipActive: {
    backgroundColor: '#dedede',
    borderColor: '#dedede',
  },
  categoryChipText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 14,
  },
  categoryChipTextActive: {
    color: '#222',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 110,
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
    position: 'relative',
  },
  noteBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#dddcda',
  },
  notePinBadge: {
    paddingHorizontal: 6,
    gap: 0,
  },
  noteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#222',
  },
  noteContent: {
    flex: 1,
    marginRight: 12,
    paddingTop: 28,
  },
  noteCardSelectable: {
    borderColor: '#efefef',
  },
  noteCardSelected: {
    // backgroundColor: '#ffc107',
    // borderColor: '#ffc107',
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
  noteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteCategory: {
    color: '#9a9a9a',
    fontWeight: '600',
  },
  noteDate: {
    color: '#ccc',
    minWidth: 70,
    textAlign: 'right',
  },
  checkboxWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
  },
  checkboxWrapSelected: {
    transform: [{ scale: 1.02 }],
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
  selectionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: 'rgba(232, 232, 232, 0.72)',
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  selectionBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    gap: 4,
  },
  selectionBarLabel: {
    fontSize: 12,
    color: '#222',
    fontWeight: '600',
  },
});
