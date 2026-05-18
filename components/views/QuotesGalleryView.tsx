import React from 'react';
import {
  FlatList,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import { Quote } from '../../types/quotes';
import { normalizeQuoteEditorConfig } from '../../utils/quoteConfig';
import { getResponsiveMetrics } from '../utils/responsive';

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
  const { width, height } = useWindowDimensions();
  const layout = getResponsiveMetrics(width, height);

  const data: GalleryItem[] = [
    { id: 'add-quote', kind: 'add' },
    ...quotes.map((quote) => ({ ...quote, kind: 'quote' as const })),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: layout.titleSize }]}>Quotes</Text>
        <Text style={[styles.subtitle, { fontSize: layout.subtitleSize }]}>
          Tap a card to edit or use the plus tile to start a new quote.
        </Text>
      </View>

      <FlatList
        data={data}
        numColumns={layout.listColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: layout.pagePadding,
            paddingBottom: layout.sectionPadding,
          },
        ]}
        columnWrapperStyle={[styles.columnWrapper, { gap: layout.cardGap }]}
        renderItem={({ item }) => {
          if (item.kind === 'add') {
            return (
              <Pressable
                style={[
                  styles.addCard,
                  {
                    borderRadius: layout.cardRadius,
                    marginBottom: layout.cardGap,
                  },
                ]}
                onPress={onAddQuote}
              >
                <View style={styles.addContent}>
                  <View
                    style={[
                      styles.addIconCircle,
                      {
                        width: layout.isTablet ? 84 : 72,
                        height: layout.isTablet ? 84 : 72,
                        borderRadius: layout.isTablet ? 42 : 36,
                      },
                    ]}
                  >
                    <MaterialIcons name="plus" size={layout.isTablet ? 40 : 36} color="#433e3e" />
                  </View>
                  <Text style={[styles.addLabel, { fontSize: layout.bodySize }]}>New Quote</Text>
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable
              style={[
                styles.card,
                {
                  borderRadius: layout.cardRadius,
                  marginBottom: layout.cardGap,
                },
              ]}
              onPress={() => onQuotePress(item)}
            >
              <QuoteGalleryPreview
                quote={item}
                cardRadius={layout.cardRadius}
              />
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

function QuoteGalleryPreview({
  quote,
  cardRadius,
}: {
  quote: Quote;
  cardRadius: number;
}) {
  const config = normalizeQuoteEditorConfig(quote.editor_config);
  const backgroundSource = config.background_image_uri ? { uri: config.background_image_uri } : null;
  const previewText = config.quote_text?.trim() || quote.quote_text || 'Quote';

  return (
    <View style={[styles.quoteTile, { backgroundColor: config.bg_color, borderRadius: cardRadius }]}>
      {backgroundSource ? (
        <ImageBackground
          source={backgroundSource}
          style={styles.heroImage}
          imageStyle={[styles.heroImageMask, { opacity: config.image_opacity }]}
        />
      ) : null}
      <View style={[styles.heroOverlay, { backgroundColor: config.bg_color, opacity: backgroundSource ? 0.12 : 0.04 }]} />
      <View style={styles.quoteBody}>
        <Text style={[styles.quoteMark, { color: config.font_color }]}>{"\""}</Text>
        <Text
          style={[
            styles.quoteText,
            { color: config.font_color },
          ]}
          numberOfLines={4}
        >
          {previewText}
        </Text>
        <Text style={[styles.dateText, { color: config.font_color }]}>{formatDate(quote.updated_at)}</Text>
      </View>
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
    fontWeight: '800',
    color: '#433e3e',
    marginTop: 30,
  },
  subtitle: {
    marginTop: 6,
    lineHeight: 20,
    color: '#5f5f5f',
  },
  listContent: {
    marginTop: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    aspectRatio: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    overflow: 'hidden',
  },
  quoteTile: {
    flex: 1,
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  heroImageMask: {
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  quoteBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  quoteMark: {
    fontWeight: '700',
  },
  quoteText: {
    lineHeight: 22,
    fontWeight: '600',
    flex: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  dateText: {
    opacity: 0.7,
  },
  addCard: {
    flex: 1,
    aspectRatio: 1,
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
  addContent: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconCircle: {
    backgroundColor: '#ffc107',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  addLabel: {
    fontWeight: '700',
    color: '#433e3e',
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
