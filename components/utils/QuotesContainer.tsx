import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import QuotesGalleryView from '../views/QuotesGalleryView';
import QuotesView from '../views/QuotesView';
import { Quote } from '../../types/quotes';
import useQuotesStore from '../../hooks/useQuotes';
import {
  DEFAULT_QUOTE_CATEGORY_ID,
  generateQuoteId,
  saveQuotePreviewImage,
  getUserProfile,
  saveUserProfile,
} from '../../database/quotesDb';
import {
  DEFAULT_QUOTE_TEXT,
  DEFAULT_AUTHOR_TEXT,
  getRandomColorQuoteEditorConfig,
} from '../../utils/quoteConfig';
import type { UserProfile } from '../../types/quotes';

type QuoteDraftRequest = {
  id: number;
  text: string;
};

type QuotesContainerProps = {
  draftQuoteRequest?: QuoteDraftRequest | null;
  onDraftConsumed?: () => void;
};

export default function QuotesContainer({
  draftQuoteRequest = null,
  onDraftConsumed,
}: QuotesContainerProps) {
  const {
    quotes,
    quoteCategories,
    createQuote,
    updateQuote,
    deleteQuote,
    createQuoteCategory,
    moveQuotesToCategory,
    pinQuotes,
  } = useQuotesStore();
  const [viewState, setViewState] = useState<'gallery' | 'editor'>('gallery');
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [editorSessionKey, setEditorSessionKey] = useState<string>('new-quote');
  const [draftEditorConfig, setDraftEditorConfig] = useState<Quote['editor_config'] | null>(null);
  const [draftQuoteText, setDraftQuoteText] = useState<string>('');
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [createCategoryVisible, setCreateCategoryVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: '', email: '', instagram_handle: '' });
  const [userProfileLoaded, setUserProfileLoaded] = useState(false);
  const handledDraftId = useRef<number | null>(null);
  const enterDuration = 300;
  const exitDuration = 240;

  const resolveDefaultAuthorName = React.useCallback((profile: UserProfile) => {
    const handle = profile.instagram_handle.trim();
    if (handle) {
      const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;
      return `- ${normalizedHandle}`;
    }

    const name = profile.name.trim();
    if (name) {
      return `- ${name}`;
    }

    return DEFAULT_AUTHOR_TEXT;
  }, []);

  const visibleQuotes = useMemo(() => {
    if (activeCategoryId === 'all') {
      return quotes;
    }

    return quotes.filter((quote) => quote.quote_category_id === activeCategoryId);
  }, [activeCategoryId, quotes]);

  const selectedQuotes = useMemo(
    () => visibleQuotes.filter((quote) => selectedQuoteIds.includes(quote.id)),
    [selectedQuoteIds, visibleQuotes],
  );
  const selectedQuotesContainPinned = useMemo(
    () => selectedQuotes.some((quote) => quote.pinned),
    [selectedQuotes],
  );

  const clearSelection = React.useCallback(() => {
    setSelectionMode(false);
    setSelectedQuoteIds([]);
  }, []);

  const handleCancelSelection = React.useCallback(() => {
    setGalleryRefreshKey((current) => current + 1);
    clearSelection();
  }, [clearSelection]);

  const toggleSelection = (quoteId: string) => {
    setSelectedQuoteIds((current) => {
      if (current.includes(quoteId)) {
        return current.filter((id) => id !== quoteId);
      }

      return [...current, quoteId];
    });
    setSelectionMode(true);
  };

  const handleLongPressQuote = (quote: Quote) => {
    setSelectionMode(true);
    setSelectedQuoteIds([quote.id]);
  };

  const handleSelectAll = () => {
    if (selectedQuoteIds.length === visibleQuotes.length) {
      setSelectedQuoteIds([]);
      return;
    }

    setSelectedQuoteIds(visibleQuotes.map((quote) => quote.id));
  };

  const handleMoveSelected = () => {
    if (!selectedQuotes.length) {
      return;
    }

    setMoveModalVisible(true);
  };

  const handleConfirmMove = async (quoteCategoryId: string) => {
    await moveQuotesToCategory(selectedQuoteIds, quoteCategoryId);
    setGalleryRefreshKey((current) => current + 1);
    setMoveModalVisible(false);
    clearSelection();
  };

  const handlePinSelected = async () => {
    if (!selectedQuoteIds.length) {
      return;
    }

    await pinQuotes(selectedQuoteIds, !selectedQuotesContainPinned);
    setGalleryRefreshKey((current) => current + 1);
    clearSelection();
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      return;
    }

    const category = await createQuoteCategory(name);
    setCreateCategoryVisible(false);
    setNewCategoryName('');
    if (category?.id) {
      await handleConfirmMove(category.id);
      setGalleryRefreshKey((current) => current + 1);
    }
  };

  const handleQuotePress = (quote: Quote) => {
    if (selectionMode) {
      toggleSelection(quote.id);
      return;
    }

    setSelectedQuote(quote);
    setDraftQuoteText('');
    setEditorSessionKey(quote.id);
    setTransitionDirection('forward');
    setViewState('editor');
  };

  const handleBack = React.useCallback(() => {
    setSelectedQuote(null);
    setDraftEditorConfig(null);
    setDraftQuoteText('');
    setTransitionDirection('backward');
    setViewState('gallery');
    clearSelection();
  }, [clearSelection]);

  const handleAddQuote = () => {
    setSelectedQuote(null);
    setDraftQuoteText(DEFAULT_QUOTE_TEXT);
    setDraftEditorConfig(getRandomColorQuoteEditorConfig(DEFAULT_QUOTE_TEXT, resolveDefaultAuthorName(userProfile)));
    setEditorSessionKey(`new-${Date.now()}`);
    setTransitionDirection('forward');
    setViewState('editor');
  };

  useEffect(() => {
    let isMounted = true;

    const loadUserProfile = async () => {
      const profile = await getUserProfile();
      if (isMounted) {
        setUserProfile(profile);
        setUserProfileLoaded(true);
      }
    };

    loadUserProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userProfileLoaded) {
      return;
    }

    const draftText = draftQuoteRequest?.text.trim() ?? '';
    if (!draftQuoteRequest || !draftText || handledDraftId.current === draftQuoteRequest.id) {
      return;
    }

    handledDraftId.current = draftQuoteRequest.id;

    const openDraftQuote = async () => {
      const authorName = resolveDefaultAuthorName(userProfile);
      const editorConfigWithAuthor = getRandomColorQuoteEditorConfig(draftText, authorName);
      setSelectedQuote(null);
      setDraftEditorConfig(editorConfigWithAuthor);
      setDraftQuoteText(draftText);
      setEditorSessionKey(`draft-${draftQuoteRequest.id}`);
      setTransitionDirection('forward');
      setViewState('editor');
      onDraftConsumed?.();
    };

    openDraftQuote();
  }, [
    activeCategoryId,
    createQuote,
    draftQuoteRequest,
    onDraftConsumed,
    resolveDefaultAuthorName,
    userProfile,
    userProfileLoaded,
  ]);

  useEffect(() => {
    if (!quoteCategories.length) {
      return;
    }

    const isValidCategory =
      activeCategoryId === 'all' ||
      quoteCategories.some((category) => category.id === activeCategoryId);
    if (!isValidCategory) {
      setActiveCategoryId('all');
      clearSelection();
    }
  }, [activeCategoryId, clearSelection, quoteCategories]);

  const handleSaveQuote = async (
    config: Quote['editor_config'] & { preview_image_base64?: string | null },
  ) => {
    const {
      activeCanvasKey,
      background_image_uri,
      background_image_crop,
      background_image_source,
      unsplash_attribution,
      image_opacity,
      font_size,
      font_color,
      bg_color,
      font_family,
      font_shadow,
      font_weight,
      text_align,
      quote_text,
      text_boxes,
      text_x_percent,
      text_y_percent,
      preview_image_base64,
    } = config;
    const trimmedText = quote_text.trim();
    const resolvedQuoteText = trimmedText || selectedQuote?.quote_text || '';
    const resolvedCategoryId =
      selectedQuote?.quote_category_id ||
      (activeCategoryId === 'all' ? DEFAULT_QUOTE_CATEGORY_ID : activeCategoryId);
    const resolvedPinned = selectedQuote?.pinned ?? 0;
    const quoteId = selectedQuote?.id ?? generateQuoteId();

    if (preview_image_base64) {
      try {
        await saveQuotePreviewImage(quoteId, preview_image_base64);
      } catch (error) {
        console.warn('Preview thumbnail generation failed', error);
      }
    }

    const editorConfig: Quote['editor_config'] = {
      activeCanvasKey,
      background_image_uri,
      background_image_crop,
      background_image_source,
      unsplash_attribution,
      image_opacity,
      font_size,
      font_color,
      bg_color,
      font_family,
      font_shadow,
      font_weight,
      text_align,
      quote_text: resolvedQuoteText,
      text_boxes,
      text_x_percent,
      text_y_percent,
    };

    if (selectedQuote) {
      const savedQuote = await updateQuote({
        ...selectedQuote,
        id: quoteId,
        quote_text: resolvedQuoteText,
        background_image_uri,
        quote_category_id: resolvedCategoryId,
        pinned: resolvedPinned,
        editor_config: editorConfig,
      });
      setSelectedQuote({
        ...selectedQuote,
        ...savedQuote,
      });
      setDraftQuoteText('');
    } else {
      const savedQuote = await createQuote({
        id: quoteId,
        quote_text: resolvedQuoteText,
        background_image_uri,
        quote_category_id: resolvedCategoryId,
        pinned: 0,
        editor_config: editorConfig,
      });
      setSelectedQuote(savedQuote);
      setDraftEditorConfig(null);
      setDraftQuoteText('');
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    await deleteQuote(quoteId);
    setSelectedQuote(null);
    setTransitionDirection('backward');
    setViewState('gallery');
  };

  const handleDeleteSelected = async () => {
    if (!selectedQuoteIds.length) {
      return;
    }

    Alert.alert(
      'Delete quotes?',
      `Delete ${selectedQuoteIds.length} selected quote${selectedQuoteIds.length === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const id of selectedQuoteIds) {
              await deleteQuote(id);
            }
            setGalleryRefreshKey((current) => current + 1);
            clearSelection();
          },
        },
      ],
    );
  };

  useEffect(() => {
    const onHardwareBackPress = () => {
      if (viewState === 'editor') {
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
  }, [clearSelection, handleBack, viewState]);

  return (
    <View style={styles.container}>
      <View style={styles.pageStack}>
        {viewState === 'gallery' && (
          <Animated.View
            key="quotes-gallery"
            style={styles.page}
            entering={
              transitionDirection === 'forward'
                ? SlideInRight.duration(enterDuration)
                : SlideInLeft.duration(enterDuration)
            }
            exiting={
              transitionDirection === 'forward'
                ? SlideOutLeft.duration(exitDuration)
                : SlideOutRight.duration(exitDuration)
            }
          >
            <QuotesGalleryView
              refreshKey={galleryRefreshKey}
              quotes={visibleQuotes}
              categories={quoteCategories}
              activeCategoryId={activeCategoryId}
              userProfile={userProfile}
              onUserProfileSave={async (profile) => {
                const savedProfile = await saveUserProfile(profile);
                setUserProfile(savedProfile);
              }}
              selectionMode={selectionMode}
              selectedQuoteIds={selectedQuoteIds}
              onCategoryChange={(categoryId) => {
                setActiveCategoryId(categoryId);
                clearSelection();
              }}
              onQuotePress={handleQuotePress}
              onQuoteLongPress={handleLongPressQuote}
              onAddQuote={handleAddQuote}
              onCancelSelection={handleCancelSelection}
              onSelectAll={handleSelectAll}
              onMoveSelected={handleMoveSelected}
              onNewCategorySelected={() => setCreateCategoryVisible(true)}
              pinActionLabel={selectedQuotesContainPinned ? 'Unpin' : 'Pin'}
              onPinSelected={handlePinSelected}
              onDeleteSelected={handleDeleteSelected}
            />
          </Animated.View>
        )}

        {viewState === 'editor' && (
          <Animated.View
            key={editorSessionKey}
            style={styles.page}
            entering={
              transitionDirection === 'forward'
                ? SlideInRight.duration(enterDuration)
                : SlideInLeft.duration(enterDuration)
            }
            exiting={
              transitionDirection === 'forward'
                ? SlideOutLeft.duration(exitDuration)
                : SlideOutRight.duration(exitDuration)
            }
          >
            <QuotesView
              title={selectedQuote ? 'Edit Quote' : 'New Quote'}
              initialQuoteText={selectedQuote?.quote_text ?? draftQuoteText ?? ''}
              initialBackgroundImageUri={selectedQuote?.background_image_uri ?? null}
              initialEditorConfig={selectedQuote?.editor_config ?? draftEditorConfig}
              onBack={handleBack}
              onSave={handleSaveQuote}
              onDelete={selectedQuote ? () => handleDeleteQuote(selectedQuote.id) : undefined}
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
              <Text style={styles.moveSheetTitle}>Choose category</Text>
              <TouchableOpacity onPress={() => setCreateCategoryVisible(true)}>
                <Text style={styles.moveSheetAction}>New</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.moveList}>
              {quoteCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.moveRow}
                  onPress={() => {
                    handleConfirmMove(category.id);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.moveRowIcon}>
                    <MaterialIcons name="folder" size={16} color="#222" />
                  </View>
                  <View style={styles.moveRowTextWrap}>
                    <Text style={styles.moveRowText}>{category.name}</Text>
                  </View>
                  <Text style={styles.moveRowCount}>{category.quote_count ?? 0}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.moveSaveButton} onPress={() => setMoveModalVisible(false)}>
              <Text style={styles.moveSaveText}>Save</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={createCategoryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateCategoryVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCreateCategoryVisible(false)}>
          <Pressable style={styles.createCategorySheet} onPress={() => null}>
            <Text style={styles.createCategoryTitle}>New category</Text>
            <TextInput
              style={styles.createCategoryInput}
              placeholder="Category name"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.createCategoryActions}>
              <TouchableOpacity
                style={[styles.createCategoryButton, styles.createCategoryCancel]}
                onPress={() => setCreateCategoryVisible(false)}
              >
                <Text style={styles.createCategoryCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createCategoryButton, styles.createCategoryConfirm]}
                onPress={() => {
                  handleCreateCategory();
                }}
                disabled={!newCategoryName.trim()}
              >
                <Text style={styles.createCategoryConfirmText}>Create</Text>
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
  moveRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#ffc107',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
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
  createCategorySheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 28,
  },
  createCategoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 14,
  },
  createCategoryInput: {
    backgroundColor: '#f5f5f7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#222',
  },
  createCategoryActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  createCategoryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  createCategoryCancel: {
    backgroundColor: '#f1f1f1',
  },
  createCategoryConfirm: {
    backgroundColor: '#ffc107',
  },
  createCategoryCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  createCategoryConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
