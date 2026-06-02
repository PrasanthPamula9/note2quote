import React from 'react';
import {
  FlatList,
  ImageBackground,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
  useWindowDimensions,
} from 'react-native';
import { Appbar } from 'react-native-paper';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import { Quote } from '../../types/quotes';
import { normalizeQuoteEditorConfig } from '../../utils/quoteConfig';
import { getResponsiveMetrics } from '../utils/responsive';
import NativeAdTile from '../ads/NativeAdTile';
import { htmlToPlainText } from '../../utils/noteContent';

type QuotesGalleryViewProps = {
  quotes: Quote[];
  onAddQuote: () => void;
  onQuotePress: (quote: Quote) => void;
};

type GalleryItem = (Quote & { kind: 'quote' }) | { id: string; kind: 'add' };
type GalleryAdItem = { id: string; kind: 'ad' };
type GalleryListItem = GalleryItem | GalleryAdItem;

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
  const searchInputRef = React.useRef<TextInput | null>(null);
  const [searchActive, setSearchActive] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');

  React.useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  React.useEffect(() => {
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
  const filteredQuotes = React.useMemo(() => {
    if (!normalizedSearch) {
      return quotes;
    }

    return quotes.filter((quote) => {
      const config = normalizeQuoteEditorConfig(quote.editor_config);
      const previewText = (config.quote_text || quote.quote_text || '').toLowerCase();
      const bodyText = htmlToPlainText(config.quote_text || quote.quote_text || '').toLowerCase();
      return (
        previewText.includes(normalizedSearch) ||
        bodyText.includes(normalizedSearch)
      );
    });
  }, [normalizedSearch, quotes]);

  const data: GalleryListItem[] = [
    { id: 'add-quote', kind: 'add' },
    { id: 'quotes-native-ad', kind: 'ad' },
    ...filteredQuotes.map((quote) => ({ ...quote, kind: 'quote' as const })),
  ];

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <View style={styles.headerRow}>
          {searchActive ? (
            <View style={styles.searchShell}>
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { fontSize: layout.bodySize }]}
                placeholder="Search quotes"
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
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { fontSize: layout.titleSize }]}>Quotes</Text>
            </View>
          )}
          <Appbar.Action
            icon={searchActive ? 'close' : 'magnify'}
            onPress={handleToggleSearch}
          />
        </View>
      </Appbar.Header>

      <FlatList
        data={data}
        numColumns={layout.listColumns}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          searchActive && normalizedSearch && filteredQuotes.length === 0 ? (
            <View style={styles.searchEmptyState}>
              <Text style={styles.emptyStateTitle}>No quotes found</Text>
              <Text style={styles.emptyStateText}>Try a different search term.</Text>
            </View>
          ) : null
        }
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

          if (item.kind === 'ad') {
            return (
              <NativeAdTile
                variant="grid"
                style={[
                  styles.adTile,
                  {
                    borderRadius: layout.cardRadius,
                    marginBottom: layout.cardGap,
                  },
                ]}
              />
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
            <Text style={styles.emptyStateTitle}>
              {normalizedSearch ? 'No quotes found' : 'No quotes yet'}
            </Text>
            <Text style={styles.emptyStateText}>
              {normalizedSearch
                ? 'Try a different search term.'
                : 'Create your first quote with the plus tile.'}
            </Text>
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
    backgroundColor: 'transparent',
    elevation: 0,
    paddingHorizontal: 8,
  },
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleBlock: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    fontWeight: '800',
    color: '#433e3e',
  },
  subtitle: {
    marginTop: 6,
    lineHeight: 20,
    color: '#5f5f5f',
  },
  searchShell: {
    flex: 1,
    marginLeft: 12,
    marginVertical: 8,
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
    marginTop: 8,
  },
  searchEmptyState: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
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
  adTile: {
    flex: 1,
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
