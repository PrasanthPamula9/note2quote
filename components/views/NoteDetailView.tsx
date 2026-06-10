import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Appbar, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import MlkitOcr from 'react-native-mlkit-ocr';
import {
  EnrichedTextInput,
  type EnrichedTextInputInstance,
  type HtmlStyle,
  type OnChangeStateEvent,
} from 'react-native-enriched';
import { Note } from '../../types/notes';
import { getResponsiveMetrics } from '../utils/responsive';
import {
  appendTextToEditorHtml,
  formatBodyForEditor,
  getQuoteTextFromHtml,
} from '../../utils/noteContent';

interface NoteDetailViewProps {
  note: Note;
  isNew?: boolean;
  notebookLabel?: string;
  onBack?: () => void;
  onCreate?: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => Promise<Note | void> | Note | void;
  onSave?: (note: Note) => Promise<Note | void> | Note | void;
  onDelete?: (noteId: string) => void;
  onCreateQuote?: (quoteText: string) => void;
}

const EMPTY_STYLE_STATE: OnChangeStateEvent = {
  bold: { isActive: false, isConflicting: false, isBlocking: false },
  italic: { isActive: false, isConflicting: false, isBlocking: false },
  underline: { isActive: false, isConflicting: false, isBlocking: false },
  strikeThrough: { isActive: false, isConflicting: false, isBlocking: false },
  inlineCode: { isActive: false, isConflicting: false, isBlocking: false },
  h1: { isActive: false, isConflicting: false, isBlocking: false },
  h2: { isActive: false, isConflicting: false, isBlocking: false },
  h3: { isActive: false, isConflicting: false, isBlocking: false },
  h4: { isActive: false, isConflicting: false, isBlocking: false },
  h5: { isActive: false, isConflicting: false, isBlocking: false },
  h6: { isActive: false, isConflicting: false, isBlocking: false },
  codeBlock: { isActive: false, isConflicting: false, isBlocking: false },
  blockQuote: { isActive: false, isConflicting: false, isBlocking: false },
  orderedList: { isActive: false, isConflicting: false, isBlocking: false },
  unorderedList: { isActive: false, isConflicting: false, isBlocking: false },
  link: { isActive: false, isConflicting: false, isBlocking: false },
  image: { isActive: false, isConflicting: false, isBlocking: false },
  mention: { isActive: false, isConflicting: false, isBlocking: false },
  checkboxList: { isActive: false, isConflicting: false, isBlocking: false },
};

const EMPTY_HTML_STYLE: HtmlStyle = {
  h1: { fontSize: 28, bold: true },
  h2: { fontSize: 24, bold: true },
  h3: { fontSize: 20, bold: true },
  blockquote: {
    borderColor: '#d8d8d8',
    borderWidth: 3,
    gapWidth: 12,
    color: '#4a4a4a',
  },
  codeblock: {
    color: '#24201d',
    borderRadius: 12,
    backgroundColor: '#f4f4f4',
  },
  code: {
    color: '#24201d',
    backgroundColor: '#f4f4f4',
  },
  a: {
    color: '#2b6cb0',
    textDecorationLine: 'underline',
  },
  ol: {
    gapWidth: 10,
    marginLeft: 20,
    markerColor: '#222',
    markerFontWeight: '600',
  },
  ul: {
    bulletColor: '#222',
    bulletSize: 7,
    marginLeft: 20,
    gapWidth: 10,
  },
};

export default function NoteDetailView({
  note: initialNote,
  isNew = false,
  notebookLabel = 'Default notebook',
  onBack,
  onCreate,
  onSave,
  onDelete,
  onCreateQuote,
}: NoteDetailViewProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = getResponsiveMetrics(width, height);
  const editorRef = useRef<EnrichedTextInputInstance | null>(null);
  const initialEditorBody = formatBodyForEditor(initialNote.body);
  const initialBodyText = getQuoteTextFromHtml(initialNote.body);
  const [note, setNote] = useState<Note>({
    ...initialNote,
    body: initialEditorBody,
  });
  const [bodyText, setBodyText] = useState(initialBodyText);
  const [, setBodyHasContent] = useState(Boolean(initialBodyText.trim()));
  const [bodyWordCount, setBodyWordCount] = useState(
    initialBodyText.trim() ? initialBodyText.trim().split(/\s+/).filter(Boolean).length : 0,
  );
  const [styleState, setStyleState] = useState<OnChangeStateEvent>(EMPTY_STYLE_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [formatSheetVisible, setFormatSheetVisible] = useState(false);
  const [scannerMenuVisible, setScannerMenuVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isMountedRef = useRef(true);
  const isNewNoteRef = useRef(isNew);
  const awaitingCreateSyncRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const hasPendingChangesRef = useRef(false);
  const selectedTextRef = useRef('');
  const latestNoteRef = useRef<Note>({
    ...initialNote,
    body: initialEditorBody,
  });
  const lastSavedKeyRef = useRef(`${initialNote.id}:${initialNote.header}:${initialEditorBody}`);
  const bodyHtmlRef = useRef(initialEditorBody);
  const isDraftNote = isNewNoteRef.current;

  const getDraftKey = (draft: Note) => `${draft.id}:${draft.header}:${draft.body}`;

  const persistNote = async (draft: Note) => {
    if (saveInFlightRef.current) {
      return;
    }

    const currentHtml = (await editorRef.current?.getHTML()) ?? bodyHtmlRef.current;
    const nextNote = {
      ...draft,
      body: currentHtml,
      updated_at: Date.now(),
    };

    if (!onSave && !onCreate) {
      return;
    }

    saveInFlightRef.current = true;
    if (isMountedRef.current) {
      setIsSaving(true);
    }

    try {
      const savedNote = isNewNoteRef.current
        ? await onCreate?.({
            header: nextNote.header,
            body: nextNote.body,
            notebook_id: nextNote.notebook_id,
            pinned: nextNote.pinned,
          })
        : await onSave?.(nextNote);

      if (!isMountedRef.current) {
        return;
      }

      const resolvedNote = (savedNote as Note | void) || nextNote;
      bodyHtmlRef.current = resolvedNote.body;
      const resolvedBodyText = getQuoteTextFromHtml(resolvedNote.body);
      setBodyText(resolvedBodyText);
      setBodyHasContent(Boolean(resolvedBodyText.trim()));
      setBodyWordCount(
        resolvedBodyText.trim() ? resolvedBodyText.trim().split(/\s+/).filter(Boolean).length : 0,
      );
      lastSavedKeyRef.current = getDraftKey(resolvedNote);
      hasPendingChangesRef.current = false;
      latestNoteRef.current = resolvedNote;
      if (isNewNoteRef.current) {
        awaitingCreateSyncRef.current = true;
      }
      setNote(resolvedNote);
      isNewNoteRef.current = false;
    } finally {
      saveInFlightRef.current = false;
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      const pendingNote = latestNoteRef.current;
      if (hasPendingChangesRef.current) {
        void persistNote(pendingNote);
      }
    };
  }, []);

  useEffect(() => {
    const onKeyboardShow = (event: { endCoordinates?: { height?: number } }) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    };

    const onKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener('keyboardDidShow', onKeyboardShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    isNewNoteRef.current = isNew;
  }, [isNew]);

  useEffect(() => {
    if (awaitingCreateSyncRef.current && initialNote.id !== note.id) {
      return;
    }

    if (initialNote.id !== note.id) {
      const nextEditorBody = formatBodyForEditor(initialNote.body);
      const nextBodyText = getQuoteTextFromHtml(initialNote.body);
      const nextNote = {
        ...initialNote,
        body: nextEditorBody,
      };
      setNote(nextNote);
      setBodyText(nextBodyText);
      setBodyHasContent(Boolean(nextBodyText.trim()));
      setBodyWordCount(nextBodyText.trim() ? nextBodyText.trim().split(/\s+/).filter(Boolean).length : 0);
      latestNoteRef.current = nextNote;
      bodyHtmlRef.current = nextEditorBody;
      lastSavedKeyRef.current = getDraftKey(nextNote);
      hasPendingChangesRef.current = false;
      isNewNoteRef.current = isNew;
      awaitingCreateSyncRef.current = false;
      setStyleState(EMPTY_STYLE_STATE);
      return;
    }

    if (awaitingCreateSyncRef.current && initialNote.id === note.id) {
      awaitingCreateSyncRef.current = false;
    }
  }, [initialNote, isNew, note.id]);

  const flushAndClose = async () => {
    if (hasPendingChangesRef.current) {
      await persistNote(latestNoteRef.current);
    }

    onBack?.();
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

  const insertTextAtEnd = (text: string) => {
    const nextBody = appendTextToEditorHtml(bodyHtmlRef.current, text);
    bodyHtmlRef.current = nextBody;
    editorRef.current?.setValue(nextBody);
    const plainText = getQuoteTextFromHtml(nextBody);
    setBodyText(plainText);
    setBodyHasContent(Boolean(plainText.trim()));
    setBodyWordCount(plainText.trim() ? plainText.trim().split(/\s+/).filter(Boolean).length : 0);
    hasPendingChangesRef.current = true;
  };

  const scanImageForText = async (source: 'camera' | 'library') => {
    setScannerMenuVisible(false);

    const result =
      source === 'camera'
        ? await launchCamera({
            mediaType: 'photo',
            saveToPhotos: false,
            quality: 0.9,
          })
        : await launchImageLibrary({
            mediaType: 'photo',
            selectionLimit: 1,
            quality: 0.9,
          });

    if (result.didCancel || result.errorCode || !result.assets?.[0]?.uri) {
      if (result.errorMessage) {
        Alert.alert('Scanner error', result.errorMessage);
      }
      return;
    }

    const asset = result.assets[0];
    const uri = asset.uri;
    if (!uri) {
      return;
    }

    try {
      const blocks = await MlkitOcr.detectFromUri(uri);
      const extractedText = blocks
        .map((block) => block.text)
        .map((blockText) => blockText.trim())
        .filter(Boolean)
        .join('\n');

      if (!extractedText) {
        Alert.alert('No text found', 'We could not detect any text in that image.');
        return;
      }

      insertTextAtEnd(extractedText);
    } catch (error) {
      Alert.alert('Scanner error', 'Could not extract text from the selected image.');
    }
  };

  const wordCount = bodyWordCount;
  const toolbarColor = '#433e3e';
  const quoteText = bodyText.trim();
  const keyboardSpacer = keyboardHeight > 0 ? keyboardHeight + 24 : 0;
  const editorMinHeight = Math.max(
    layout.isTablet ? 360 : 280,
    Math.round((height - keyboardHeight) * (layout.isTablet ? 0.42 : 0.34)),
  );
  const getQuoteSourceText = () => {
    const selectedText = selectedTextRef.current.trim();
    return selectedText || quoteText;
  };

  const applyFormat = (action: () => void) => {
    action();
    hasPendingChangesRef.current = true;
    setFormatSheetVisible(false);
  };

  return (
    <ImageBackground
      source={require('../../assets/app_bg.png')}
      resizeMode="cover"
      imageStyle={styles.backgroundImage}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.frame, { maxWidth: layout.contentMaxWidth }]}>
          <Appbar.Header style={styles.header}>
            <Appbar.BackAction onPress={() => void flushAndClose()} />
            <View style={styles.headerActions}>
              {!isDraftNote ? (
                <TouchableOpacity style={styles.topIconButton} onPress={handleDelete}>
                  <MaterialIcons name="trash-can-outline" size={24} color="#222" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.checkButton} onPress={() => void flushAndClose()}>
                <MaterialIcons name="check" size={26} color="#222" />
              </TouchableOpacity>
            </View>
          </Appbar.Header>

        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.editorShell}
            contentContainerStyle={[
              styles.editorShellContent,
              {
                flexGrow: 1,
                paddingHorizontal: layout.pagePadding,
                paddingTop: 14,
                paddingBottom: layout.sectionPadding + insets.bottom + keyboardSpacer,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            <Text style={[styles.metadataLine, { fontSize: layout.smallTextSize }]}>
              {formatDate(note.updated_at)}  |  {wordCount}  |  {notebookLabel}
            </Text>

              <TextInput
                style={[styles.titleInput, { fontSize: layout.titleSize }]}
                placeholder="Header"
                value={note.header}
              onChangeText={(text) => {
                latestNoteRef.current = {
                  ...latestNoteRef.current,
                  header: text,
                };
                setNote((currentNote) => ({
                  ...currentNote,
                  header: text,
                }));
                hasPendingChangesRef.current = true;
              }}
              placeholderTextColor="#a9a09a"
              editable
              autoCapitalize="sentences"
              selectionColor={toolbarColor}
            />

            <View style={styles.editorBody}>
              <View style={[styles.editorViewport, { minHeight: editorMinHeight }]}>
                <EnrichedTextInput
                  key={note.id}
                  ref={editorRef}
                  defaultValue={formatBodyForEditor(note.body)}
                  placeholder="Start writing your note..."
                  placeholderTextColor="#b5aca3"
                  cursorColor={toolbarColor}
                  selectionColor={toolbarColor}
                  scrollEnabled={false}
                  style={StyleSheet.flatten([
                    styles.richEditor,
                    {
                      fontSize: layout.bodySize,
                      lineHeight: Math.round(layout.bodySize * 1.55),
                      minHeight: editorMinHeight,
                    },
                  ])}
                  htmlStyle={EMPTY_HTML_STYLE}
                  submitBehavior="newline"
                  useHtmlNormalizer
                  onChangeText={(event) => {
                    const nextBodyText = event.nativeEvent.value;
                    setBodyText(nextBodyText);
                    setBodyHasContent(Boolean(nextBodyText.trim()));
                    setBodyWordCount(
                      nextBodyText.trim()
                        ? nextBodyText.trim().split(/\s+/).filter(Boolean).length
                        : 0,
                    );
                    hasPendingChangesRef.current = true;
                  }}
                  onChangeHtml={(event) => {
                    bodyHtmlRef.current = event.nativeEvent.value;
                    hasPendingChangesRef.current = true;
                  }}
                  onChangeSelection={(event) => {
                    selectedTextRef.current = event.nativeEvent.text || '';
                  }}
                  onChangeState={(event) => setStyleState(event.nativeEvent)}
                  androidExperimentalSynchronousEvents
                />
              </View>
            </View>
          </ScrollView>

            <View style={styles.bottomActionBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bottomActionContent}
                keyboardShouldPersistTaps="handled"
              >
                <ToolbarPill
                  label="Aa"
                  onPress={() => setFormatSheetVisible(true)}
                  active={formatSheetVisible}
                  wide
                />
                <ToolbarPill
                  label="Create quote"
                  icon="format-quote-open"
                  onPress={() => {
                    const sourceText = getQuoteSourceText();
                    if (sourceText) {
                      onCreateQuote?.(sourceText);
                    }
                  }}
                  disabled={!getQuoteSourceText()}
                />
                <ToolbarPill
                  label="Scan"
                  icon="scanner"
                  onPress={() => setScannerMenuVisible(true)}
                />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>

          <Portal>
          <Modal
            visible={formatSheetVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setFormatSheetVisible(false)}
          >
            <Pressable
              style={styles.sheetOverlay}
              onPress={() => setFormatSheetVisible(false)}
            >
              <Pressable style={styles.formatSheet} onPress={() => null}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Format</Text>
                  <TouchableOpacity onPress={() => setFormatSheetVisible(false)}>
                    <MaterialIcons name="close" size={24} color="#222" />
                  </TouchableOpacity>
                </View>

                <View style={styles.presetRow}>
                  <PresetChip label="Title" onPress={() => applyFormat(() => editorRef.current?.toggleH1())} />
                  <PresetChip label="Subtitle" onPress={() => applyFormat(() => editorRef.current?.toggleH2())} />
                  <PresetChip label="Heading" onPress={() => applyFormat(() => editorRef.current?.toggleH3())} />
                  <PresetChip label="Body" onPress={() => setFormatSheetVisible(false)} active />
                  <PresetChip label="Note" onPress={() => applyFormat(() => editorRef.current?.toggleBlockQuote())} />
                </View>

                <View style={styles.formatGrid}>
                  <FormatButton
                    icon="format-bold"
                    onPress={() => applyFormat(() => editorRef.current?.toggleBold())}
                    active={styleState.bold.isActive}
                  />
                  <FormatButton
                    icon="format-italic"
                    onPress={() => applyFormat(() => editorRef.current?.toggleItalic())}
                    active={styleState.italic.isActive}
                  />
                  <FormatButton
                    icon="format-underline"
                    onPress={() => applyFormat(() => editorRef.current?.toggleUnderline())}
                    active={styleState.underline.isActive}
                  />
                  <FormatButton
                    icon="format-strikethrough-variant"
                    onPress={() => applyFormat(() => editorRef.current?.toggleStrikeThrough())}
                    active={styleState.strikeThrough.isActive}
                  />
                  <FormatButton
                    icon="format-list-bulleted"
                    onPress={() => applyFormat(() => editorRef.current?.toggleUnorderedList())}
                    active={styleState.unorderedList.isActive}
                  />
                  <FormatButton
                    icon="format-list-numbered"
                    onPress={() => applyFormat(() => editorRef.current?.toggleOrderedList())}
                    active={styleState.orderedList.isActive}
                  />
                  <FormatButton
                    icon="format-quote-open"
                    onPress={() => applyFormat(() => editorRef.current?.toggleBlockQuote())}
                    active={styleState.blockQuote.isActive}
                  />
                  <FormatButton
                    icon="code-tags"
                    onPress={() => applyFormat(() => editorRef.current?.toggleInlineCode())}
                    active={styleState.inlineCode.isActive}
                  />
                </View>
              </Pressable>
            </Pressable>
          </Modal>

          <Modal
            visible={scannerMenuVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setScannerMenuVisible(false)}
          >
            <Pressable
              style={styles.sheetOverlay}
              onPress={() => setScannerMenuVisible(false)}
            >
                <View style={styles.actionMenu}>
                  <Text style={styles.actionMenuTitle}>Scan document</Text>
                  <TouchableOpacity
                    style={styles.actionMenuItem}
                    onPress={() => void scanImageForText('camera')}
                  >
                  <MaterialIcons name="camera-outline" size={22} color="#222" />
                  <Text style={styles.actionMenuItemText}>Take photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionMenuItem}
                    onPress={() => void scanImageForText('library')}
                  >
                  <MaterialIcons name="image-outline" size={22} color="#222" />
                  <Text style={styles.actionMenuItemText}>Choose image</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>

          <Modal
            visible={deleteModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setDeleteModalVisible(false)}
          >
            <Pressable
              style={styles.sheetOverlay}
              onPress={() => setDeleteModalVisible(false)}
            >
              <View style={[styles.deleteCard, { width: layout.modalWidth }]}>
                <Text style={styles.deleteTitle}>Delete note?</Text>
                <Text style={styles.deleteMessage}>This note will be permanently deleted.</Text>
                <View style={styles.deleteButtons}>
                  <TouchableOpacity
                    style={[styles.deleteButton, styles.deleteCancel]}
                    onPress={() => setDeleteModalVisible(false)}
                  >
                    <Text style={styles.deleteCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, styles.deleteConfirm]}
                    onPress={confirmDelete}
                  >
                    <Text style={styles.deleteConfirmText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </Modal>
          </Portal>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );

  function handleDelete() {
    setDeleteModalVisible(true);
  }

  function confirmDelete() {
    onDelete?.(note.id);
    setDeleteModalVisible(false);
  }
}

function ToolbarPill({
  label,
  icon,
  onPress,
  active = false,
  disabled = false,
  wide = false,
}: {
  label: string;
  icon?: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.toolbarPill,
        wide && styles.toolbarPillWide,
        active && styles.toolbarPillActive,
        disabled && styles.toolbarPillDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {icon ? (
        <MaterialIcons
          name={icon as never}
          size={18}
          color={active ? '#fff' : disabled ? '#b3b3b3' : '#222'}
        />
      ) : null}
      <Text
        style={[
          styles.toolbarPillText,
          active && styles.toolbarPillTextActive,
          disabled && styles.toolbarPillTextDisabled,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PresetChip({
  label,
  onPress,
  active = false,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.presetChip, active && styles.presetChipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FormatButton({
  icon,
  onPress,
  active = false,
}: {
  icon: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.formatButton, active && styles.formatButtonActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <MaterialIcons name={icon as never} size={22} color={active ? '#fff' : '#222'} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    opacity: 0.6,
  },
  safeArea: {
    flex: 1,
  },
  frame: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240, 240, 240, 0.72)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    paddingRight: 10,
  },
  topIconButton: {
    padding: 8,
    marginLeft: 6,
  },
  checkButton: {
    padding: 8,
    marginLeft: 6,
  },
  keyboardContainer: {
    flex: 1,
  },
  editorShell: {
    flex: 1,
  },
  editorShellContent: {
    flexGrow: 1,
    minHeight: 0,
  },
  editorBody: {
    flex: 1,
    minHeight: 0,
  },
  metadataLine: {
    color: '#8e8e8e',
    marginBottom: 12,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f1b17',
    padding: 0,
    marginBottom: 18,
  },
  editorViewport: {
    width: '100%',
    overflow: 'hidden',
    flex: 1,
    minHeight: 0,
  },
  richEditor: {
    color: '#27211d',
    padding: 0,
    flex: 1,
  },
  bottomActionBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(240, 240, 240, 0.72)',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bottomActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    gap: 10,
  },
  toolbarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#ececec',
  },
  toolbarPillWide: {
    paddingHorizontal: 16,
  },
  toolbarPillActive: {
    backgroundColor: '#222',
    borderColor: '#222',
  },
  toolbarPillDisabled: {
    opacity: 0.5,
  },
  toolbarPillText: {
    color: '#222',
    fontWeight: '700',
    fontSize: 13,
  },
  toolbarPillTextActive: {
    color: '#fff',
  },
  toolbarPillTextDisabled: {
    color: '#999',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
  },
  formatSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  presetChip: {
    backgroundColor: '#f7f7f7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ececec',
  },
  presetChipActive: {
    backgroundColor: '#ffc107',
    borderColor: '#ffc107',
  },
  presetChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  presetChipTextActive: {
    color: '#fff',
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  formatButton: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f7f7',
    borderWidth: 1,
    borderColor: '#ececec',
  },
  formatButtonActive: {
    backgroundColor: '#222',
    borderColor: '#222',
  },
  actionMenu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
  },
  actionMenuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  actionMenuItemText: {
    fontSize: 15,
    color: '#222',
    fontWeight: '600',
  },
  deleteCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    marginHorizontal: 20,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancel: {
    backgroundColor: '#f2f2f2',
  },
  deleteConfirm: {
    backgroundColor: '#ff3b30',
  },
  deleteCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  deleteConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
