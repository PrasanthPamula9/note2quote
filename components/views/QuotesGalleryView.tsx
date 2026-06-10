import React from 'react';
import {
  Alert,
  ImageBackground,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  Modal,
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
import { Quote, QuoteCategory, type UserProfile } from '../../types/quotes';
import {
  getCanvasPresetAspectRatio,
  normalizeQuoteEditorConfig,
} from '../../utils/quoteConfig';
import { getQuotePreviewImageUri } from '../../database/quotesDb';
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
  userProfile: UserProfile;
  onUserProfileSave?: (profile: UserProfile) => Promise<void> | void;
};

type GalleryItem = (Quote & { kind: 'quote' }) | { id: string; kind: 'add' } | { id: string; kind: 'ad' };
type GalleryListItem = GalleryItem;

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
  userProfile,
  onUserProfileSave,
}: QuotesGalleryViewProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = getResponsiveMetrics(width, height);
  const searchInputRef = React.useRef<TextInput | null>(null);
  const [searchActive, setSearchActive] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [draftProfile, setDraftProfile] = React.useState<UserProfile>(userProfile);
  const [masonryWidth, setMasonryWidth] = React.useState(0);

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

  React.useEffect(() => {
    if (settingsVisible) {
      setDraftProfile(userProfile);
    }
  }, [settingsVisible, userProfile]);

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

  const handleOpenSettings = () => {
    setDraftProfile(userProfile);
    setSettingsVisible(true);
  };

  const handleSaveSettings = async () => {
    const resolvedProfile: UserProfile = {
      name: draftProfile.name.trim(),
      email: draftProfile.email.trim(),
      instagram_handle: draftProfile.instagram_handle.trim(),
    };

    if (!onUserProfileSave) {
      setSettingsVisible(false);
      return;
    }

    try {
      await onUserProfileSave(resolvedProfile);
      setSettingsVisible(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save settings.';
      Alert.alert('Save failed', message);
    }
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

  const addTileAspectRatio = React.useMemo(
    () => 1,
    [],
  );
  const adTileAspectRatio = React.useMemo(
    () => getCanvasPresetAspectRatio('instagram_post_portrait'),
    [],
  );
  const listData: GalleryListItem[] = React.useMemo(
    () => [
      { id: 'add-quote', kind: 'add' },
      { id: 'quotes-native-ad', kind: 'ad' },
      ...filteredQuotes.map((quote) => ({ ...quote, kind: 'quote' as const })),
    ],
    [filteredQuotes],
  );
  const masonryLayout = React.useMemo(() => {
    const columnCount = Math.max(1, layout.listColumns);
    const gap = layout.cardGap;
    const availableWidth = Math.max(
      0,
      masonryWidth > 0 ? masonryWidth : layout.contentMaxWidth,
    );
    const usableWidth = Math.max(1, availableWidth - gap * (columnCount - 1));
    const baseColumnWidth = Math.max(1, Math.floor(usableWidth / columnCount));
    const remainder = Math.max(0, usableWidth - baseColumnWidth * columnCount);
    const columnWidths = Array.from({ length: columnCount }, (_, index) =>
      baseColumnWidth + (index < remainder ? 1 : 0),
    );

    const columns = Array.from({ length: columnCount }, () => ({
      height: 0,
      items: [] as Array<{ item: GalleryListItem; aspectRatio: number }>,
    }));

    const pickShortestColumn = () => {
      let shortestIndex = 0;
      for (let i = 1; i < columns.length; i += 1) {
        if (columns[i].height < columns[shortestIndex].height) {
          shortestIndex = i;
        }
      }
      return shortestIndex;
    };

    const estimateHeight = (aspectRatio: number) => {
      return Math.max(1, baseColumnWidth / Math.max(0.5, aspectRatio));
    };

    for (const item of listData) {
      const aspectRatio =
        item.kind === 'quote'
          ? getCanvasPresetAspectRatio(normalizeQuoteEditorConfig(item.editor_config).activeCanvasKey)
          : 1;
      const targetColumn = pickShortestColumn();
      columns[targetColumn].items.push({ item, aspectRatio });
      columns[targetColumn].height += estimateHeight(aspectRatio) + gap;
    }

    return {
      columnCount,
      columnWidths,
      columns,
    };
  }, [layout.cardGap, layout.contentMaxWidth, layout.listColumns, listData, masonryWidth]);

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
              <Pressable onPress={handleOpenSettings} style={styles.iconAction}>
                <MaterialIcons name="cog" size={24} color="#222" />
              </Pressable>
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
            onPress={onAddQuote}
            onLongPress={onNewCategorySelected}
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

      <ScrollView
        key={`quotes-gallery-${refreshKey}-${layout.listColumns}`}
        showsVerticalScrollIndicator={false}
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
      >
        {selectionMode && selectedCount > 0 ? (
          <View style={styles.selectionSummary}>
            <Text style={styles.selectionSummaryText}>{selectedCount} selected</Text>
          </View>
        ) : searchActive && normalizedSearch && filteredQuotes.length === 0 ? (
          <View style={styles.searchEmptyState}>
            <Text style={styles.emptyStateTitle}>No quotes found</Text>
            <Text style={styles.emptyStateText}>Try a different search term.</Text>
          </View>
        ) : null}

        <View
          style={[
            styles.masonryGrid,
            {
              gap: layout.cardGap,
            },
          ]}
          onLayout={(event) => {
            const nextWidth = Math.round(event.nativeEvent.layout.width);
            setMasonryWidth((current) => (current === nextWidth ? current : nextWidth));
          }}
        >
          {masonryLayout.columns.map((column, columnIndex) => (
            <View
              key={`masonry-column-${columnIndex}`}
              style={[
                styles.masonryColumn,
                {
                  width: masonryLayout.columnWidths[columnIndex],
                  gap: layout.cardGap,
                },
              ]}
            >
              {column.items.map(({ item, aspectRatio }) => {
                if (item.kind === 'add') {
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.addCard,
                        {
                          borderRadius: layout.cardRadius,
                          aspectRatio: addTileAspectRatio,
                        },
                      ]}
                      onPress={onAddQuote}
                    >
                      <View style={styles.addContent}>
                        <View
                          style={[
                            styles.addIconCircle,
                            {
                              width: layout.isTablet ? 64 : 56,
                              height: layout.isTablet ? 64 : 56,
                              borderRadius: layout.isTablet ? 32 : 28,
                            },
                          ]}
                        >
                          <MaterialIcons name="plus" size={layout.isTablet ? 30 : 26} color="#433e3e" />
                        </View>
                        <Text style={[styles.addLabel, { fontSize: layout.bodySize }]}>New Quote</Text>
                      </View>
                    </Pressable>
                  );
                }

                if (item.kind === 'ad') {
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.adTile,
                        {
                          borderRadius: layout.cardRadius,
                          aspectRatio: adTileAspectRatio,
                          overflow: 'hidden',
                        },
                      ]}
                    >
                      <NativeAdTile variant="square" style={styles.adTileContent} />
                    </View>
                  );
                }

                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.card,
                      selectionMode && styles.cardSelectable,
                      selectedQuoteIds.includes(item.id) && styles.cardSelected,
                      {
                        borderRadius: layout.cardRadius,
                        aspectRatio,
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
                      previewAspectRatio={aspectRatio}
                    />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

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

      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSettingsVisible(false)}>
          <Pressable style={styles.settingsSheet} onPress={() => null}>
            <View style={styles.settingsSheetHeader}>
              <Text style={styles.settingsSheetTitle}>Profile settings</Text>
              <Pressable onPress={() => setSettingsVisible(false)} hitSlop={10}>
                <MaterialIcons name="close" size={22} color="#222" />
              </Pressable>
            </View>

            <View style={styles.settingsField}>
              <Text style={styles.settingsLabel}>Name</Text>
              <TextInput
                style={styles.settingsInput}
                value={draftProfile.name}
                onChangeText={(value) => setDraftProfile((current) => ({ ...current, name: value }))}
                placeholder="Your name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.settingsField}>
              <Text style={styles.settingsLabel}>Email</Text>
              <TextInput
                style={styles.settingsInput}
                value={draftProfile.email}
                onChangeText={(value) => setDraftProfile((current) => ({ ...current, email: value }))}
                placeholder="you@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.settingsField}>
              <Text style={styles.settingsLabel}>Instagram handle</Text>
              <TextInput
                style={styles.settingsInput}
                value={draftProfile.instagram_handle}
                onChangeText={(value) => setDraftProfile((current) => ({ ...current, instagram_handle: value }))}
                placeholder="@yourhandle"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.settingsActions}>
              <Pressable style={[styles.settingsButton, styles.settingsButtonSecondary]} onPress={() => setSettingsVisible(false)}>
                <Text style={styles.settingsButtonSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.settingsButton, styles.settingsButtonPrimary]} onPress={() => void handleSaveSettings()}>
                <Text style={styles.settingsButtonPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ImageBackground>
  );
}

function QuoteGalleryPreview({
  quote,
  cardRadius,
  categoryLabel,
  selected,
  selectionMode,
  previewAspectRatio,
}: {
  quote: Quote;
  cardRadius: number;
  categoryLabel: string;
  selected: boolean;
  selectionMode: boolean;
  previewAspectRatio: number;
}) {
  const config = normalizeQuoteEditorConfig(quote.editor_config);
  const previewImageUri = getQuotePreviewImageUri(quote.id, quote.updated_at);
  const backgroundImageUri = quote.background_image_uri || config.background_image_uri;
  const backgroundSource = backgroundImageUri ? { uri: backgroundImageUri } : null;
  const previewText = config.quote_text?.trim() || quote.quote_text || 'Quote';
  const showPinned = Boolean(quote.pinned);
  const previewTextColor = getReadableTextColor(config.bg_color, config.font_color);
  const previewBackgroundColor = config.bg_color || '#000000';
  const [previewFailed, setPreviewFailed] = React.useState(false);
  const showSnapshot = Boolean(previewImageUri) && !previewFailed;

  return (
    <View
      style={[
        styles.quoteTile,
        {
          backgroundColor: previewBackgroundColor,
          borderRadius: cardRadius,
          aspectRatio: previewAspectRatio,
        },
      ]}
    >
      {showSnapshot ? (
        <ImageBackground
          source={{ uri: previewImageUri }}
          style={styles.previewImage}
          imageStyle={[styles.previewImageMask, { borderRadius: cardRadius }]}
          resizeMode="cover"
          onError={() => setPreviewFailed(true)}
        />
      ) : (
        <>
          {backgroundSource ? (
            <ImageBackground
              source={backgroundSource}
              style={styles.heroImage}
              imageStyle={[styles.heroImageMask, { opacity: config.image_opacity }]}
            />
          ) : null}
          <View
            style={[
              styles.heroOverlay,
              { backgroundColor: previewBackgroundColor, opacity: backgroundSource ? 0.12 : 0.04 },
            ]}
          />
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
        </>
      )}

      <View style={styles.quoteBadgeRow}>
        {showPinned ? (
          <View style={[styles.quoteBadge, styles.quotePinBadge]}>
            <MaterialIcons name="pin" size={14} color="#222" />
          </View>
        ) : null}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.34)',
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 14,
  },
  settingsSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  settingsField: {
    gap: 6,
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
  },
  settingsInput: {
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 14,
    backgroundColor: '#f9f9f9',
    color: '#222',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  settingsActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  settingsButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonSecondary: {
    backgroundColor: '#f4f4f4',
  },
  settingsButtonPrimary: {
    backgroundColor: '#111',
  },
  settingsButtonSecondaryText: {
    color: '#222',
    fontSize: 15,
    fontWeight: '700',
  },
  settingsButtonPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
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
  masonryGrid: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  masonryColumn: {
    flexShrink: 0,
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
  card: {
    width: '100%',
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
    width: '100%',
  },
  adTileContent: {
    flex: 1,
  },
  quoteTile: {
    width: '100%',
    overflow: 'hidden',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  previewImageMask: {
    resizeMode: 'cover',
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
    width: '100%',
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
