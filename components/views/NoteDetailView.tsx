import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Appbar, Menu, Portal } from 'react-native-paper';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import { Note } from '../../types/notes';
import SelectableNoteBodyView from '../native/SelectableNoteBodyView';

interface NoteDetailViewProps {
  note: Note;
  onBack?: () => void;
  onSave?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
  onCreateQuote?: (quoteText: string) => void;
}

export default function NoteDetailView({
  note: initialNote,
  onBack,
  onSave,
  onDelete,
  onCreateQuote,
}: NoteDetailViewProps) {
  const [note, setNote] = useState<Note>(initialNote);
  const [isEditing, setIsEditing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const handleSave = () => {
    const nextNote = {
      ...note,
      updated_at: Date.now(),
    };
    setNote(nextNote);
    onSave?.(nextNote);
    setIsEditing(false);
  };

  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    onDelete?.(note.id);
    setDeleteModalVisible(false);
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Intl.DateTimeFormat('en-US', options).format(d);
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  };

  const wordCount = getWordCount(note.body);

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={onBack} />
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="share-outline" size={24} color="#000" />
          </TouchableOpacity>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                style={styles.iconButton}
              >
                <MaterialIcons name="dots-vertical" size={24} color="#000" />
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                setIsEditing(!isEditing);
              }}
              title={isEditing ? 'Cancel' : 'Edit'}
              leadingIcon={isEditing ? 'close' : 'pencil'}
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                handleDelete();
              }}
              title="Delete"
              leadingIcon="trash-can-outline"
            />
          </Menu>
        </View>
      </Appbar.Header>

      <View style={styles.metadata}>
        <Text style={styles.metadataText}>
          {formatDate(note.updated_at)} | {wordCount}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {isEditing ? (
          <>
            <TextInput
              style={styles.titleInput}
              placeholder="Header"
              value={note.header}
              onChangeText={(text) =>
                setNote({ ...note, header: text })
              }
              placeholderTextColor="#ccc"
            />
            <TextInput
              style={styles.contentInput}
              placeholder="Body"
              value={note.body}
              onChangeText={(text) =>
                setNote({ ...note, body: text })
              }
              placeholderTextColor="#ccc"
              multiline
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>{note.header}</Text>
            <SelectableNoteBodyView
              style={styles.noteBodyNative}
              text={note.body}
              onCreateQuote={(event) => {
                onCreateQuote?.(event.nativeEvent.text);
              }}
            />
          </>
        )}
      </ScrollView>

      {!isEditing && note.body.trim() ? (
        <TouchableOpacity
          style={styles.createQuoteButton}
          onPress={() => onCreateQuote?.(note.body.trim())}
          activeOpacity={0.8}
        >
          <Text style={styles.createQuoteButtonText}>Create Quote</Text>
        </TouchableOpacity>
      ) : null}

      {isEditing && (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Save Note</Text>
        </TouchableOpacity>
      )}

      <Portal>
        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setDeleteModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Delete note?</Text>
              <Text style={styles.modalMessage}>
                This note will be permanently deleted.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={confirmDelete}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    paddingRight: 12,
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  metadata: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metadataText: {
    fontSize: 12,
    color: '#999',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    lineHeight: 32,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 12,
  },
  noteBody: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  noteBodyNative: {
    minHeight: 180,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginTop: 2,
  },
  createQuoteButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#ffc107',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  createQuoteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#433e3e',
  },
  contentInput: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    minHeight: 200,
    padding: 0,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#ffc107',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#433e3e',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
