import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, View, StyleSheet } from 'react-native';
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import QuotesGalleryView from '../views/QuotesGalleryView';
import QuotesView from '../views/QuotesView';
import { Quote } from '../../types/quotes';
import useQuotesStore from '../../hooks/useQuotes';
import {
  DEFAULT_QUOTE_TEXT,
  getRandomColorQuoteEditorConfig,
} from '../../utils/quoteConfig';

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
  const { quotes, createQuote, updateQuote, deleteQuote } = useQuotesStore();
  const [viewState, setViewState] = useState<'gallery' | 'editor'>('gallery');
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [editorSessionKey, setEditorSessionKey] = useState<string>('new-quote');
  const [draftEditorConfig, setDraftEditorConfig] = useState<Quote['editor_config'] | null>(null);
  const handledDraftId = useRef<number | null>(null);
  const enterDuration = 300;
  const exitDuration = 240;

  const handleAddQuote = () => {
    setSelectedQuote(null);
    setDraftEditorConfig(getRandomColorQuoteEditorConfig(DEFAULT_QUOTE_TEXT));
    setEditorSessionKey(`new-${Date.now()}`);
    setTransitionDirection('forward');
    setViewState('editor');
  };

  useEffect(() => {
    const draftText = draftQuoteRequest?.text.trim() ?? '';
    if (!draftQuoteRequest || !draftText || handledDraftId.current === draftQuoteRequest.id) {
      return;
    }

    handledDraftId.current = draftQuoteRequest.id;

    const openDraftQuote = async () => {
      const editorConfig = getRandomColorQuoteEditorConfig(draftText);
      const savedQuote = await createQuote({
        quote_text: draftText,
        background_image_uri: null,
        editor_config: editorConfig,
      });
      setSelectedQuote(savedQuote);
      setDraftEditorConfig(null);
      setEditorSessionKey(savedQuote.id);
      setTransitionDirection('forward');
      setViewState('editor');
      onDraftConsumed?.();
    };

    openDraftQuote();
  }, [createQuote, draftQuoteRequest, onDraftConsumed]);

  const handleQuotePress = (quote: Quote) => {
    setSelectedQuote(quote);
    setEditorSessionKey(quote.id);
    setTransitionDirection('forward');
    setViewState('editor');
  };

  const handleBack = () => {
    setSelectedQuote(null);
    setDraftEditorConfig(null);
    setTransitionDirection('backward');
    setViewState('gallery');
  };

  const handleSaveQuote = async (config: Quote['editor_config']) => {
    const {
      activeCanvasKey,
      background_image_uri,
      background_image_crop,
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
    } = config;
    const trimmedText = quote_text.trim();
    const resolvedQuoteText = trimmedText || selectedQuote?.quote_text || '';

    const editorConfig: Quote['editor_config'] = {
      activeCanvasKey,
      background_image_uri,
      background_image_crop,
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
        quote_text: resolvedQuoteText,
        background_image_uri,
        editor_config: editorConfig,
      });
      setSelectedQuote({
        ...selectedQuote,
        ...savedQuote,
      });
    } else {
      const savedQuote = await createQuote({
        quote_text: resolvedQuoteText,
        background_image_uri,
        editor_config: editorConfig,
      });
      setSelectedQuote(savedQuote);
      setDraftEditorConfig(null);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    await deleteQuote(quoteId);
    setSelectedQuote(null);
    setTransitionDirection('backward');
    setViewState('gallery');
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
  }, [viewState, handleBack]);

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
              quotes={quotes}
              onAddQuote={handleAddQuote}
              onQuotePress={handleQuotePress}
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
              initialQuoteText={selectedQuote?.quote_text ?? ''}
              initialBackgroundImageUri={selectedQuote?.background_image_uri ?? null}
              initialEditorConfig={selectedQuote?.editor_config ?? draftEditorConfig}
              onBack={handleBack}
              onSave={handleSaveQuote}
              onDelete={selectedQuote ? () => handleDeleteQuote(selectedQuote.id) : undefined}
            />
          </Animated.View>
        )}
      </View>
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
});
