import React from 'react';
import {
  FlatList,
  ImageBackground,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import { Quote, QuoteCategory } from '../../types/quotes';
import { normalizeQuoteEditorConfig } from '../../utils/quoteConfig';
import { getResponsiveMetrics } from '../utils/responsive';
import NativeAdTile from '../ads/NativeAdTile';
import { htmlToPlainText } from '../../utils/noteContent';

type QuotesGalleryViewProps = {
  refreshKey?: number;
  quotes: Quote[];
  categories: QuoteCategory[];
  activeCategoryId: string;
  selectionMode?: boolean;
  selectedQuoteIds?: string[];
  onCategoryChange?: (categoryId: string) => void;
  onQuotePress: (quote: Quote) => void;
  onQuoteLongPress?: (quote: Quote) => void;
  onAddQuote: () => void;
  onCancelSelection?: () => void;
  onSelectAll?: () => void;
  onMoveSelected?: () => void;
  onNewCategorySelected?: () => void;
  pinActionLabel?: string;
  onPinSelected?: () => void;
  onDeleteSelected?: () => void;
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
  refreshKey = 0,
  categories,
  activeCategoryId,
  selectionMode = false,
  selectedQuoteIds = [],
  onCategoryChange,
  onQuotePress,
  onQuoteLongPress,
  onAddQuote,
  onCancelSelection,
  onSelectAll,
  onMoveSelected,
  onNewCategorySelected,
  pinActionLabel = 'Pin',
  onPinSelected,
  onDeleteSelected,
}: QuotesGalleryViewProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
    if (!searchActive || selectionMode) {
      return;
    }

    const handle = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(handle);
  }, [searchActive, selectionMode]);

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
  const categoryLabelMap = React.useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]));
  }, [categories]);

  const filteredQuotes = React.useMemo(() => {
    if (!normalizedSearch) {
      return quotes;
    }

    return quotes.filter((quote) => {
      const config = normalizeQuoteEditorConfig(quote.editor_config);
      const previewText = (config.quote_text || quote.quote_text || '').toLowerCase();
      const bodyText = htmlToPlainText(config.quote_text || quote.quote_text || '').toLowerCase();
      return previewText.includes(normalizedSearch) || bodyText.includes(normalizedSearch);
    });
  }, [normalizedSearch, quotes]);

  const listData: GalleryListItem[] = [
    { id: 'add-quote', kind: 'add' },
    { id: 'quotes-native-ad', kind: 'ad' },
    ...filteredQuotes.map((quote) => ({ ...quote, kind: 'quote' as const })),
  ];
  const selectionExtraData = React.useMemo(
    () => `${selectionMode ? '1' : '0'}|${selectedQuoteIds.join(',')}|${activeCategoryId}|${normalizedSearch}`,
    [activeCategoryId, normalizedSearch, selectedQuoteIds, selectionMode],
  );

  const selectedCount = selectedQuoteIds.length;
  const allSelected = selectionMode && selectedCount > 0 && selectedCount === filteredQuotes.length;

  return (
    <ImageBackground
      source={require('../../assets/app_bg.png')}
      resizeMode="cover"
      imageStyle={styles.backgroundImage}
      style={styles.container}
    >
      <View style={[styles.topArea, { paddingHorizontal: layout.pagePadding, paddingTop: insets.top + 10 }]}>
        {selectionMode ? (
          <View style={styles.selectionHeader}>
            <Pressable onPress={onCancelSelection}>
              <Text style={styles.selectionAction}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onSelectAll}>
              <Text style={styles.selectionAction}>{allSelected ? 'Unselect all' : 'Select all'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text style={[styles.pageTitle, { fontSize: layout.titleSize + 4 }]}>Quotes</Text>
              <Text style={[styles.noteCount, { fontSize: layout.subtitleSize }]}>
                {quotes.length} quotes
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable onPress={handleToggleSearch} style={styles.iconAction}>
                <MaterialIcons
                  name={searchActive ? 'close' : 'magnify'}
                  size={26}
                  color="#222"
                />
              </Pressable>
            </View>
          </View>
        )}

        {!selectionMode && searchActive ? (
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
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryStrip}
        >
          <Pressable
            style={styles.categoryAddButton}
            onPress={onNewCategorySelected}
            hitSlop={8}
          >
            <MaterialIcons name="plus" size={18} color="#433e3e" />
          </Pressable>
          <Pressable
            style={[
              styles.categoryChip,
              activeCategoryId === 'all' && styles.categoryChipActive,
            ]}
            onPress={() => onCategoryChange?.('all')}
          >
            <Text
              style={[
                styles.categoryChipText,
                activeCategoryId === 'all' && styles.categoryChipTextActive,
              ]}
              numberOfLines={1}
            >
              All quotes
            </Text>
          </Pressable>

          {categories.map((category) => (
            category.is_default ? null : (
              <Pressable
                key={category.id}
                style={[
                  styles.categoryChip,
                  activeCategoryId === category.id && styles.categoryChipActive,
                ]}
                onPress={() => onCategoryChange?.(category.id)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    activeCategoryId === category.id && styles.categoryChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {category.name}
                </Text>
              </Pressable>
            )
          ))}
        </ScrollView>
      </View>

      <FlatList
        key={`quotes-list-${refreshKey}`}
        data={listData}
        numColumns={layout.listColumns}
        keyExtractor={(item) => item.id}
        extraData={`${quotes.map((quote) => `${quote.id}:${quote.pinned}:${quote.updated_at}`).join('|')}|${selectionExtraData}`}
        ListHeaderComponent={
          selectionMode && selectedCount > 0 ? (
            <View style={styles.selectionSummary}>
              <Text style={styles.selectionSummaryText}>{selectedCount} selected</Text>
            </View>
          ) : searchActive && normalizedSearch && filteredQuotes.length === 0 ? (
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
            paddingBottom: selectionMode ? layout.sectionPadding + 96 : layout.sectionPadding + 110,
          },
        ]}
        columnWrapperStyle={[styles.columnWrapper, { gap: layout.cardGap }]}
        showsVerticalScrollIndicator={false}
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
                selectionMode && styles.cardSelectable,
                selectedQuoteIds.includes(item.id) && styles.cardSelected,
                {
                  borderRadius: layout.cardRadius,
                  marginBottom: layout.cardGap,
                },
              ]}
              onPress={() => onQuotePress(item)}
              onLongPress={() => onQuoteLongPress?.(item)}
            >
              <QuoteGalleryPreview
                quote={item}
                cardRadius={layout.cardRadius}
                categoryLabel={categoryLabelMap.get(item.quote_category_id) || 'All quotes'}
                selected={selectedQuoteIds.includes(item.id)}
                selectionMode={selectionMode}
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

      {selectionMode ? (
        <View style={styles.selectionBar}>
          <Pressable style={styles.selectionBarItem} onPress={onMoveSelected}>
            <MaterialIcons name="folder-move-outline" size={26} color="#222" />
            <Text style={styles.selectionBarLabel}>Move</Text>
          </Pressable>
          <Pressable style={styles.selectionBarItem} onPress={onNewCategorySelected}>
            <MaterialIcons name="folder-plus-outline" size={26} color="#222" />
            <Text style={styles.selectionBarLabel}>New category</Text>
          </Pressable>
          <Pressable style={styles.selectionBarItem} onPress={onPinSelected}>
            <MaterialIcons name="pin-outline" size={26} color="#222" />
            <Text style={styles.selectionBarLabel}>{pinActionLabel}</Text>
          </Pressable>
          <Pressable style={styles.selectionBarItem} onPress={onDeleteSelected}>
            <MaterialIcons name="delete-outline" size={26} color="#222" />
            <Text style={styles.selectionBarLabel}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
    </ImageBackground>
  );
}

function QuoteGalleryPreview({
  quote,
  cardRadius,
  categoryLabel,
  selected,
  selectionMode,
}: {
  quote: Quote;
  cardRadius: number;
  categoryLabel: string;
  selected: boolean;
  selectionMode: boolean;
}) {
  const config = normalizeQuoteEditorConfig(quote.editor_config);
  const backgroundSource = config.background_image_uri ? { uri: config.background_image_uri } : null;
  const previewText = config.quote_text?.trim() || quote.quote_text || 'Quote';
  const showPinned = Boolean(quote.pinned);
  const previewTextColor = getReadableTextColor(config.bg_color, config.font_color);
  const previewBackgroundColor = getPreviewBackgroundColor(config.bg_color);

  return (
    <View style={[styles.quoteTile, { backgroundColor: previewBackgroundColor, borderRadius: cardRadius }]}>
      {backgroundSource ? (
        <ImageBackground
          source={backgroundSource}
          style={styles.heroImage}
          imageStyle={[styles.heroImageMask, { opacity: config.image_opacity }]}
        />
      ) : null}
      <View style={[styles.heroOverlay, { backgroundColor: previewBackgroundColor, opacity: backgroundSource ? 0.12 : 0.04 }]} />

      <View style={styles.quoteBadgeRow}>
        {showPinned ? (
          <View style={[styles.quoteBadge, styles.quotePinBadge]}>
            <MaterialIcons name="pin" size={14} color="#222" />
          </View>
        ) : null}
        <View style={styles.quoteBadge}>
          <MaterialIcons name="folder-outline" size={14} color="#222" />
          <Text style={styles.quoteBadgeText}>{categoryLabel}</Text>
        </View>
      </View>

      {selectionMode ? (
        <View style={[styles.checkboxWrap, selected && styles.checkboxWrapSelected]}>
          <MaterialIcons
            name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            // color={selected ? '#ffc107' : '#b6b6b6'}
          />
        </View>
      ) : null}

      <View style={styles.quoteBody}>
        <Text style={[styles.quoteMark, { color: previewTextColor }]}>{"\""}</Text>
        <Text
          style={[
            styles.quoteText,
            { color: previewTextColor },
          ]}
          numberOfLines={4}
        >
          {previewText}
        </Text>
        <Text style={[styles.dateText, { color: previewTextColor }]}>{formatDate(quote.updated_at)}</Text>
      </View>
    </View>
  );
}

function getReadableTextColor(backgroundColor: string, preferredColor: string) {
  if (!backgroundColor) {
    return isLightText(preferredColor) ? '#222222' : preferredColor;
  }

  const bg = backgroundColor.trim().toLowerCase();
  if (bg === 'transparent' || bg === 'none') {
    return '#222222';
  }

  if (bg.startsWith('#')) {
    const hex = bg.slice(1);
    const normalizedHex = hex.length === 3
      ? hex.split('').map((part) => part + part).join('')
      : hex.length === 4
        ? hex
          .slice(0, 3)
          .split('')
          .map((part) => part + part)
          .join('')
      : hex.length === 6
        ? hex
        : hex.length === 8
          ? hex.slice(0, 6)
        : '';

    if (!normalizedHex) {
      return isLightText(preferredColor) ? '#222222' : preferredColor;
    }

    const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
    const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
    const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);
    if ([red, green, blue].some((value) => Number.isNaN(value))) {
      return isLightText(preferredColor) ? '#222222' : preferredColor;
    }

    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    return luminance > 0.68 ? '#222222' : preferredColor;
  }

  const rgbMatch = bg.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (rgbMatch) {
    const red = Number.parseInt(rgbMatch[1], 10);
    const green = Number.parseInt(rgbMatch[2], 10);
    const blue = Number.parseInt(rgbMatch[3], 10);
    const alpha = rgbMatch[4] != null ? Number.parseFloat(rgbMatch[4]) : 1;
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    if (alpha < 0.4) {
      return '#222222';
    }
    return luminance > 0.68 ? '#222222' : preferredColor;
  }

  return isLightText(preferredColor) ? '#222222' : preferredColor;
}

function getPreviewBackgroundColor(backgroundColor: string) {
  const bg = String(backgroundColor || '').trim().toLowerCase();
  if (!bg || bg === 'transparent' || bg === 'none') {
    return '#f5f5f5';
  }

  if (bg.startsWith('#')) {
    const hex = bg.slice(1);
    if (hex.length === 8) {
      const alpha = Number.parseInt(hex.slice(6, 8), 16);
      if (!Number.isNaN(alpha) && alpha < 32) {
        return '#f5f5f5';
      }
    }

    return backgroundColor;
  }

  const rgbaMatch = bg.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (rgbaMatch) {
    const alpha = rgbaMatch[4] != null ? Number.parseFloat(rgbaMatch[4]) : 1;
    if (Number.isFinite(alpha) && alpha < 0.15) {
      return '#f5f5f5';
    }
    return backgroundColor;
  }

  return backgroundColor;
}

function isLightText(color: string) {
  const normalized = color.trim().toLowerCase();
  return normalized === '#fff' || normalized === '#ffffff' || normalized === 'white';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backgroundImage: {
    opacity: 0.6,
  },
  topArea: {
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
    marginTop: 8,
  },
  selectionSummary: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 8,
  },
  selectionSummaryText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111',
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
  cardSelectable: {
    borderWidth: 1,
    borderColor: '#ececec',
  },
  cardSelected: {
    // borderColor: '#ffc107',
    // backgroundColor: '#ffc107',
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
  quoteBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f1d77c',
  },
  quotePinBadge: {
    paddingHorizontal: 6,
    gap: 0,
  },
  quoteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#222',
  },
  checkboxWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 3,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 999,
    padding: 2,
  },
  checkboxWrapSelected: {
    transform: [{ scale: 1.02 }],
  },
  quoteBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 44,
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
  selectionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
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
