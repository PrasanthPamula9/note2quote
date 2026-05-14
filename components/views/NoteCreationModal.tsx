import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import { Note } from '../../types/notes';
import { getResponsiveMetrics } from '../utils/responsive';

interface NoteCreationModalProps {
  visible: boolean;
  onClose?: () => void;
  onCreate?: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => void;
}

export default function NoteCreationModal({
  visible,
  onClose,
  onCreate,
}: NoteCreationModalProps) {
  const { width, height } = useWindowDimensions();
  const layout = getResponsiveMetrics(width, height);
  const [header, setHeader] = useState('');
  const [body, setBody] = useState('');

  const handleCreate = () => {
    if (header.trim() || body.trim()) {
      onCreate?.({
        header: header.trim() || 'Untitled Note',
        body: body.trim(),
      });
      setHeader('');
      setBody('');
      onClose?.();
    }
  };

  const handleClose = () => {
    setHeader('');
    setBody('');
    onClose?.();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <View style={[styles.sheet, { maxWidth: layout.modalWidth }]}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: layout.pagePadding, paddingVertical: layout.pagePadding }]}>
          <TouchableOpacity onPress={handleClose}>
            <MaterialIcons name="close" size={layout.isTablet ? 26 : 24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, !header.trim() && !body.trim() && styles.saveButtonDisabled]}
            onPress={handleCreate}
            disabled={!header.trim() && !body.trim()}
          >
            <Text style={[styles.saveButtonText, { fontSize: layout.subtitleSize }]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={[styles.content, { paddingHorizontal: layout.pagePadding, paddingTop: layout.pagePadding }]}>
          <TextInput
            style={[styles.titleInput, { fontSize: layout.titleSize }]}
            placeholder="Header"
            value={header}
            onChangeText={setHeader}
            placeholderTextColor="#ccc"
            multiline
          />
          <View style={styles.divider} />
          <TextInput
            style={[styles.contentInput, { fontSize: layout.bodySize }]}
            placeholder="Body"
            value={body}
            onChangeText={setBody}
            placeholderTextColor="#ccc"
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Bottom Toolbar */}
        {/* <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarButton}>
            <MaterialIcons name="check-box-outline-blank" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarButton}>
            <MaterialIcons name="image-outline" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarButton}>
            <MaterialIcons name="palette-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View> */}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  sheet: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#000',
    borderRadius: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#ddd',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 16,
  },
  toolbarButton: {
    padding: 8,
  },
});
