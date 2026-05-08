import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import QuotesGalleryView from '../views/QuotesGalleryView';
import QuotesView from '../views/QuotesView';
import { CanvasPresetKey, Quote } from '../../types/quotes';
import useQuotesStore from '../../hooks/useQuotes';

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
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const handledDraftId = useRef<number | null>(null);

  const handleAddQuote = () => {
    setSelectedQuote(null);
    setViewState('editor');
  };

  useEffect(() => {
    const draftText = draftQuoteRequest?.text.trim() ?? '';
    if (!draftQuoteRequest || !draftText || handledDraftId.current === draftQuoteRequest.id) {
      return;
    }

    handledDraftId.current = draftQuoteRequest.id;

    const openDraftQuote = async () => {
      const savedQuote = await createQuote({
        quote_text: draftText,
        background_image_uri: null,
      });
      setSelectedQuote(savedQuote);
      setViewState('editor');
      onDraftConsumed?.();
    };

    openDraftQuote();
  }, [createQuote, draftQuoteRequest, onDraftConsumed]);

  const handleQuotePress = (quote: Quote) => {
    setSelectedQuote(quote);
    setViewState('editor');
  };

  const handleBack = () => {
    setSelectedQuote(null);
    setViewState('gallery');
  };

  const handleSaveQuote = async (config: {
    activeCanvasKey: CanvasPresetKey;
    background_image_uri: string | null;
    image_opacity: number;
    font_size: number;
    font_color: string;
    bg_color: string;
    font_family: string;
    font_shadow: number;
    font_weight: Quote['editor_config']['font_weight'];
    text_align: Quote['editor_config']['text_align'];
    quote_text: string;
    text_x_percent: number;
    text_y_percent: number;
  }) => {
    const {
      activeCanvasKey,
      background_image_uri,
      image_opacity,
      font_size,
      font_color,
      bg_color,
      font_family,
      font_shadow,
      font_weight,
      text_align,
      quote_text,
      text_x_percent,
      text_y_percent,
    } = config;
    const trimmedText = quote_text.trim();
    if (!trimmedText) {
      return;
    }

    const editorConfig: Quote['editor_config'] = {
      activeCanvasKey,
      background_image_uri,
      image_opacity,
      font_size,
      font_color,
      bg_color,
      font_family,
      font_shadow,
      font_weight,
      text_align,
      quote_text: trimmedText,
      text_x_percent,
      text_y_percent,
    };

    if (selectedQuote) {
      const savedQuote = await updateQuote({
        ...selectedQuote,
        quote_text: trimmedText,
        background_image_uri,
        editor_config: editorConfig,
      });
      setSelectedQuote({
        ...selectedQuote,
        ...savedQuote,
      });
    } else {
      await createQuote({
        quote_text: trimmedText,
        background_image_uri,
        editor_config: editorConfig,
      });
    }

    setSelectedQuote(null);
    setViewState('gallery');
  };

  const handleDeleteQuote = async (quoteId: string) => {
    await deleteQuote(quoteId);
    setSelectedQuote(null);
    setViewState('gallery');
  };

  return (
    <View style={styles.container}>
      {viewState === 'gallery' && (
        <QuotesGalleryView
          quotes={quotes}
          onAddQuote={handleAddQuote}
          onQuotePress={handleQuotePress}
        />
      )}

      {viewState === 'editor' && (
        <QuotesView
          key={selectedQuote?.id ?? 'new-quote'}
          title={selectedQuote ? 'Edit Quote' : 'New Quote'}
          initialQuoteText={selectedQuote?.quote_text ?? ''}
          initialBackgroundImageUri={selectedQuote?.background_image_uri ?? null}
          initialEditorConfig={selectedQuote?.editor_config ?? null}
          onBack={handleBack}
          onSave={handleSaveQuote}
          onDelete={selectedQuote ? () => handleDeleteQuote(selectedQuote.id) : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
