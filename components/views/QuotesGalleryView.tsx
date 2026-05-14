import React from 'react';
import { FlatList, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import { Quote } from '../../types/quotes';

const QUOTE_BG = require('../../assets/test.jpg');

type QuotesGalleryViewProps = {
  quotes: Quote[];
  onAddQuote: () => void;
  onQuotePress: (quote: Quote) => void;
};

type GalleryItem = (Quote & { kind: 'quote' }) | { id: string; kind: 'add' };

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

export default function QuotesGalleryView({
  quotes,
  onAddQuote,
  onQuotePress,
}: QuotesGalleryViewProps) {
  const getPreviewTextColor = (quote: Quote) =>
    quote.editor_config.text_boxes?.[0]?.font_color ?? quote.editor_config.font_color;

  const getBackgroundSource = (quote: Quote) =>
    quote.editor_config.background_image_uri
      ? { uri: quote.editor_config.background_image_uri }
      : QUOTE_BG;

  const data: GalleryItem[] = [
    { id: 'add-quote', kind: 'add' },
    ...quotes.map((quote) => ({ ...quote, kind: 'quote' as const })),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quotes</Text>
        <Text style={styles.subtitle}>Tap a card to edit or use the plus tile to start a new quote.</Text>
      </View>

      <FlatList
        data={data}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => {
          if (item.kind === 'add') {
            return (
              <Pressable style={styles.addCard} onPress={onAddQuote}>
                <View style={styles.addContent}>
                  <View style={styles.addIconCircle}>
                    <MaterialIcons name="plus" size={36} color="#433e3e" />
                  </View>
                  <Text style={styles.addLabel}>New Quote</Text>
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable style={styles.card} onPress={() => onQuotePress(item)}>
              <View style={[styles.quoteTile, { backgroundColor: item.editor_config.bg_color }]}>
                <ImageBackground
                  source={getBackgroundSource(item)}
                  style={styles.heroImage}
                  imageStyle={[styles.heroImageMask, { opacity: item.editor_config.image_opacity }]}
                >
                  <View style={[styles.heroOverlay, { backgroundColor: item.editor_config.bg_color }]} />
                </ImageBackground>
                <View style={styles.quoteBody}>
                  <Text style={[styles.quoteMark, { color: getPreviewTextColor(item) }]}>{'"'}</Text>
                  <Text style={[styles.quoteText, { color: getPreviewTextColor(item) }]} numberOfLines={4}>
                    {item.quote_text}
                  </Text>
                  <Text style={[styles.dateText, { color: getPreviewTextColor(item) }]}>
                    {formatDate(item.updated_at)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No quotes yet</Text>
            <Text style={styles.emptyStateText}>Create your first quote with the plus tile.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefefe',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#433e3e',
    marginTop:30       
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#5f5f5f',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    marginTop: 8,
  },
  columnWrapper: {
    gap: 12,
  },
  card: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    overflow: 'hidden',
  },
  quoteTile: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  addCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
  },
  heroImageMask: {
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  quoteBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  addContent: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffc107',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  addLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#433e3e',
  },
  quoteMark: {
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '700',
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    flex: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
