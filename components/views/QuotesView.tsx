import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Modal, FlatList, Pressable, ScrollView, Alert, TextInput, Platform, PermissionsAndroid } from 'react-native';
import { Canvas, Rect, Path, Image as SkiaImage, useImage, Paragraph, Skia, TextAlign, FontWeight, FontSlant, useCanvasRef, ImageFormat, StrokeCap } from '@shopify/react-native-skia';
import { Appbar, Icon } from 'react-native-paper'
import {listFontFamilies} from "@shopify/react-native-skia";
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import Slider from '@react-native-community/slider';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import ColorPickerComponent, { HueSlider, Panel1 } from 'reanimated-color-picker';
import { QuoteEditorConfig, CanvasPresetKey, QuoteTextBox } from '../../types/quotes';
const INLINE_EDITOR_YELLOW = '#ffc107';
const INLINE_EDITOR_DARK = '#433e3e';
// ─── Canvas size presets ─────────────────────────────────────────────────────
type CanvasPreset = {
  label: string;
  nativeWidth: number;
  nativeHeight: number;
  aspectRatio: number; // width / height
};

type ExportFormat = 'png' | 'jpeg' | 'jpg';

const CANVAS_PRESETS: Record<CanvasPresetKey, CanvasPreset> = {
  // Instagram Feed – square  (1:1)
  instagram_post_square: {
    label: 'Instagram Post – Square',
    nativeWidth: 1080,
    nativeHeight: 1080,
    aspectRatio: 1080 / 1080, // 1.00
  },
  // Instagram Feed – portrait  (4:5)  recommended by Meta for best reach
  instagram_post_portrait: {
    label: 'Instagram Post – Portrait',
    nativeWidth: 1080,
    nativeHeight: 1350,
    aspectRatio: 1080 / 1350, // 0.80
  },
  // Instagram Feed – landscape  (1.91:1)
  instagram_post_landscape: {
    label: 'Instagram Post – Landscape',
    nativeWidth: 1080,
    nativeHeight: 566,
    aspectRatio: 1080 / 566, // 1.91
  },
  // Instagram Story  (9:16)
  instagram_story: {
    label: 'Instagram Story',
    nativeWidth: 1080,
    nativeHeight: 1920,
    aspectRatio: 1080 / 1920, // 0.5625
  },
  // WhatsApp Status  (9:16) – identical canvas to Instagram Story
  whatsapp_status: {
    label: 'WhatsApp Status',
    nativeWidth: 1080,
    nativeHeight: 1920,
    aspectRatio: 1080 / 1920, // 0.5625
  },
};

const DEFAULT_QUOTE_TEXT = 'Go and build something amazing with React Native Skia!';
const MAX_TEXT_BOXES = 5;
const DEFAULT_TEXT_BOX_WIDTH = 0.55;
const DEFAULT_TEXT_BOX_HEIGHT = 0.22;
const DEFAULT_TEXT_BOX_VERTICAL_GAP = 0.04;
const TEXT_BOX_HORIZONTAL_PADDING = 12;
const TEXT_BOX_VERTICAL_PADDING = 10;

const DEFAULT_EDITOR_CONFIG: QuoteEditorConfig = {
  activeCanvasKey: 'instagram_post_square',
  background_image_uri: null,
  image_opacity: 0.6,
  font_size: 14,
  font_color: 'white',
  bg_color: '#222222',
  font_family: 'serif',
  font_shadow: 0,
  font_weight: FontWeight.Bold,
  text_align: TextAlign.Center,
  quote_text: DEFAULT_QUOTE_TEXT,
  text_boxes: [
    {
      id: 'text-1',
      text: DEFAULT_QUOTE_TEXT,
      x_percent: 0.05,
      y_percent: 0.35,
      width_percent: DEFAULT_TEXT_BOX_WIDTH,
      height_percent: DEFAULT_TEXT_BOX_HEIGHT,
    },
  ],
  text_x_percent: 0.05,
  text_y_percent: 0.35,
};

const clampPercentValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const clampDeltaValue = (value: number, minDelta: number, maxDelta: number) =>
  Math.min(maxDelta, Math.max(minDelta, value));

const createTextBox = (text = '', index = 0): QuoteTextBox => ({
  id: `text-${Date.now()}-${index}-${Math.random().toString(16).slice(2, 6)}`,
  text,
  x_percent: 0.05,
  y_percent: Math.min(0.85, 0.35 + index * DEFAULT_TEXT_BOX_VERTICAL_GAP),
  width_percent: DEFAULT_TEXT_BOX_WIDTH,
  height_percent: DEFAULT_TEXT_BOX_HEIGHT,
  font_color: undefined,
  font_size: undefined,
  font_family: undefined,
  font_shadow: undefined,
  font_weight: undefined,
  text_align: undefined,
});

const normalizeTextBoxes = (boxes?: QuoteTextBox[] | null, fallbackText = DEFAULT_QUOTE_TEXT) => {
  const source = Array.isArray(boxes) && boxes.length > 0 ? boxes.slice(0, MAX_TEXT_BOXES) : [createTextBox(fallbackText, 0)];

  const normalized = source.map((box, index) => ({
    id: box.id || `text-${index + 1}`,
    text: box.text ?? '',
    x_percent: typeof box.x_percent === 'number' ? box.x_percent : 0.05,
    y_percent: typeof box.y_percent === 'number' ? box.y_percent : Math.min(0.85, 0.35 + index * DEFAULT_TEXT_BOX_VERTICAL_GAP),
    width_percent: typeof box.width_percent === 'number'
      ? clampPercentValue(box.width_percent, 0.15, 0.8)
      : DEFAULT_TEXT_BOX_WIDTH,
    height_percent: typeof box.height_percent === 'number'
      ? clampPercentValue(box.height_percent, 0.1, 1)
      : DEFAULT_TEXT_BOX_HEIGHT,
    ...(box.font_color != null ? { font_color: String(box.font_color) } : {}),
    ...(box.font_size != null ? { font_size: Number(box.font_size) } : {}),
    ...(box.font_family != null ? { font_family: String(box.font_family) } : {}),
    ...(box.font_shadow != null ? { font_shadow: Number(box.font_shadow) } : {}),
    ...(box.font_weight != null ? { font_weight: box.font_weight } : {}),
    ...(box.text_align != null ? { text_align: box.text_align } : {}),
  }));

  const hasText = normalized.some((box) => String(box.text || '').trim().length > 0);
  if (!hasText && String(fallbackText || '').trim()) {
    normalized[0] = {
      ...normalized[0],
      text: String(fallbackText),
    };
  }

  return normalized;
};

type InlineFeatureKey =
  | 'BackgroundImage'
  | 'BackgroundColor'
  | 'FontColor'
  | 'ImageOpacity'
  | 'FontSize'
  | 'FontFamily'
  | 'CanvasSize'
  | 'FontShadow'
  | 'FontWeight'
  | 'BoxWidth'
  | 'TextPosition';

type InlineFeaturePanelProps = {
  feature: InlineFeatureKey;
  activeCanvasKey: CanvasPresetKey;
  availableFonts: string[];
  backgroundImageUri: string | null;
  bgColor: string;
  fontColor: string;
  fontFamily: string;
  fontShadow: number;
  fontSize: number;
  fontWeight: FontWeight;
  boxWidth: number;
  imageOpacity: number;
  inlinePickerHeight: number;
  nativeCanvasHeight: number;
  nativeCanvasWidth: number;
  globalPositionX: number;
  globalPositionXMax: number;
  globalPositionY: number;
  globalPositionYMax: number;
  resolvedTextColor: string;
  resolvedTextFamily: string;
  resolvedTextShadow: number;
  resolvedTextSize: number;
  resolvedTextWeight: FontWeight;
  onBackgroundImageChange: (uri: string | null) => void;
  onBgColorChange: (color: string) => void;
  onCanvasKeyChange: (key: CanvasPresetKey) => void;
  onClose: () => void;
  onFontColorChange: (color: string) => void;
  onFontFamilyChange: (family: string) => void;
  onFontShadowChange: (value: number) => void;
  onFontSizeChange: (value: number) => void;
  onFontWeightChange: (value: FontWeight) => void;
  onBoxWidthChange: (value: number) => void;
  onImageOpacityChange: (value: number) => void;
  onTextPositionXChange: (value: number) => void;
  onTextPositionYChange: (value: number) => void;
};

const InlineFeatureShell = React.memo(function InlineFeatureShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <View style={styles.featurePanel}>
      <View style={styles.featurePanelHeader}>
        <View style={styles.featurePanelActions}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.inlineFeatureDoneButton}>
            <MaterialIcons name="check" size={22} color={INLINE_EDITOR_DARK} />
          </Pressable>
        </View>
      </View>
      <View style={styles.featurePanelBody}>{children}</View>
    </View>
  );
});

const InlineFeaturePanel = React.memo(function InlineFeaturePanel({
  feature,
  activeCanvasKey,
  availableFonts,
  backgroundImageUri,
  bgColor,
  fontColor,
  fontFamily,
  fontShadow,
  fontSize,
  fontWeight,
  boxWidth,
  imageOpacity,
  inlinePickerHeight,
  nativeCanvasHeight,
  nativeCanvasWidth,
  globalPositionX,
  globalPositionXMax,
  globalPositionY,
  globalPositionYMax,
  resolvedTextColor,
  resolvedTextFamily,
  resolvedTextShadow,
  resolvedTextSize,
  resolvedTextWeight,
  onBackgroundImageChange,
  onBgColorChange,
  onCanvasKeyChange,
  onClose,
  onFontColorChange,
  onFontFamilyChange,
  onFontShadowChange,
  onFontSizeChange,
  onFontWeightChange,
  onBoxWidthChange,
  onImageOpacityChange,
  onTextPositionXChange,
  onTextPositionYChange,
}: InlineFeaturePanelProps) {
  const [draftColor, setDraftColor] = useState(feature === 'FontColor' ? fontColor : bgColor);
  const [draftOpacity, setDraftOpacity] = useState(imageOpacity);
  const [draftFontSize, setDraftFontSize] = useState(fontSize);
  const [draftFontShadow, setDraftFontShadow] = useState(fontShadow);
  const [draftBoxWidth, setDraftBoxWidth] = useState(boxWidth);
  const [draftX, setDraftX] = useState(globalPositionX);
  const [draftY, setDraftY] = useState(globalPositionY);

  useEffect(() => {
    setDraftColor(feature === 'FontColor' ? fontColor : bgColor);
    setDraftOpacity(imageOpacity);
    setDraftFontSize(fontSize);
    setDraftFontShadow(fontShadow);
    setDraftBoxWidth(boxWidth);
    setDraftX(globalPositionX);
    setDraftY(globalPositionY);
  }, [feature]);

  const commitAndClose = () => {
    onClose();
  };

  switch (feature) {
    case 'BackgroundImage':
      return (
        <InlineFeatureShell onClose={commitAndClose}>
          <View style={styles.featureOptionsRow}>
            <Pressable
              style={styles.featureOptionCard}
              onPress={() => {
                launchCamera({ mediaType: 'photo' }, (response) => {
                  if (response.assets && response.assets[0] && response.assets[0].uri) {
                    onBackgroundImageChange(response.assets[0].uri);
                    onClose();
                  }
                });
              }}
            >
              <Icon source="camera" size={24} color="#222" />
              <Text style={styles.featureOptionText}>Camera</Text>
            </Pressable>
            <Pressable
              style={styles.featureOptionCard}
              onPress={() => {
                launchImageLibrary({ mediaType: 'photo' }, (response) => {
                  if (response.assets && response.assets[0] && response.assets[0].uri) {
                    onBackgroundImageChange(response.assets[0].uri);
                    onClose();
                  }
                });
              }}
            >
              <Icon source="folder-image" size={24} color="#222" />
              <Text style={styles.featureOptionText}>Device</Text>
            </Pressable>
            <Pressable
              style={styles.featureOptionCard}
              onPress={() => {
                Alert.alert('Coming Soon', 'Unsplash integration is coming soon!');
                onClose();
              }}
            >
              <Icon source="image-search" size={24} color="#222" />
              <Text style={styles.featureOptionText}>Unsplash</Text>
              </Pressable>
            </View>
        </InlineFeatureShell>
      );
    case 'BackgroundColor':
    case 'FontColor':
      return (
        <InlineFeatureShell onClose={commitAndClose}>
          <View style={styles.colorPickerWrap}>
            <ColorPickerComponent
              value={draftColor}
              sliderThickness={14}
              thumbSize={14}
              thumbShape="circle"
              thumbColor={INLINE_EDITOR_YELLOW}
              boundedThumb
              onChangeJS={(color) => {
                setDraftColor(color.hex);
                if (feature === 'FontColor') {
                  onFontColorChange(color.hex);
                } else {
                  onBgColorChange(color.hex);
                }
              }}
              onCompleteJS={(color) => {
                setDraftColor(color.hex);
                }}
              >
              <Panel1
                style={[styles.colorPickerSurface, { height: inlinePickerHeight, borderRadius: 14 }]}
                boundedThumb
                thumbShape="circle"
                thumbSize={14}
                thumbColor={INLINE_EDITOR_YELLOW}
              />
              <HueSlider
                style={styles.colorPickerHueSlider}
                sliderThickness={14}
                thumbShape="circle"
                thumbSize={14}
                thumbColor={INLINE_EDITOR_YELLOW}
                boundedThumb
              />
            </ColorPickerComponent>
          </View>
        </InlineFeatureShell>
      );
    case 'ImageOpacity':
      return (
        <InlineFeatureShell onClose={commitAndClose}>
          <View style={styles.sliderSection}>
            <Text style={styles.sliderLabelText}>Opacity</Text>
            <Slider
              style={styles.sliderLarge}
              minimumValue={0}
              maximumValue={1}
              value={draftOpacity}
              minimumTrackTintColor={INLINE_EDITOR_YELLOW}
              maximumTrackTintColor={INLINE_EDITOR_DARK}
              thumbTintColor={INLINE_EDITOR_YELLOW}
              onValueChange={(value) => {
                setDraftOpacity(value);
                onImageOpacityChange(value);
              }}
              onSlidingComplete={() => {}}
            />
            <Text style={styles.sliderPercentText}>{Math.round(draftOpacity * 100)}%</Text>
          </View>
        </InlineFeatureShell>
      );
    case 'FontSize':
      return (
        <InlineFeatureShell onClose={commitAndClose}>
          <View style={styles.sliderSection}>
            <Text style={styles.sliderLabelText}>Font Size</Text>
            <Slider
              style={styles.sliderLarge}
              minimumValue={8}
              maximumValue={Math.max(48, Math.round(nativeCanvasHeight * 0.14))}
              value={draftFontSize}
              minimumTrackTintColor={INLINE_EDITOR_YELLOW}
              maximumTrackTintColor={INLINE_EDITOR_DARK}
              thumbTintColor={INLINE_EDITOR_YELLOW}
              onValueChange={(value) => {
                setDraftFontSize(value);
                onFontSizeChange(value);
              }}
              onSlidingComplete={() => {}}
            />
            <Text style={styles.sliderPercentText}>{Math.round(draftFontSize)}px</Text>
          </View>
        </InlineFeatureShell>
      );
    case 'FontFamily':
      return (
        <InlineFeatureShell onClose={commitAndClose}>
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fontStrip}>
            {availableFonts.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  onFontFamilyChange(item);
                  onClose();
                }}
                style={[styles.fontChip, resolvedTextFamily === item && styles.fontChipActive]}
              >
                <Text style={[styles.fontChipText, resolvedTextFamily === item && styles.fontChipTextActive]} numberOfLines={1}>
                  {item}
                </Text>
                </Pressable>
            ))}
          </ScrollView>
        </InlineFeatureShell>
      );
    case 'CanvasSize':
      return (
        <InlineFeatureShell onClose={commitAndClose}>
          <View style={styles.sizeOptionsContainer}>
            <Pressable
              onPress={() => {
                onCanvasKeyChange('instagram_post_square');
                onClose();
              }}
              style={[styles.sizeOption, activeCanvasKey === 'instagram_post_square' && styles.sizeOptionActive]}
            >
              <View style={[styles.squarePreview, activeCanvasKey === 'instagram_post_square' && styles.squarePreviewActive]} />
              <Text style={styles.sizeLabel}>Square</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onCanvasKeyChange('instagram_story');
                onClose();
              }}
              style={[styles.sizeOption, activeCanvasKey === 'instagram_story' && styles.sizeOptionActive]}
            >
              <View style={[styles.storyPreview, activeCanvasKey === 'instagram_story' && styles.storyPreviewActive]} />
              <Text style={styles.sizeLabel}>Story</Text>
            </Pressable>
          </View>
        </InlineFeatureShell>
      );
    case 'FontShadow':
      return (
        <InlineFeatureShell onClose={commitAndClose}>
          <View style={styles.sliderSection}>
            <Text style={styles.sliderLabelText}>Shadow</Text>
            <Slider
              style={styles.sliderLarge}
              minimumValue={0}
              maximumValue={10}
              value={draftFontShadow}
              minimumTrackTintColor={INLINE_EDITOR_YELLOW}
              maximumTrackTintColor={INLINE_EDITOR_DARK}
              thumbTintColor={INLINE_EDITOR_YELLOW}
              onValueChange={(value) => {
                setDraftFontShadow(value);
                onFontShadowChange(value);
              }}
              onSlidingComplete={() => {}}
            />
            <Text style={styles.sliderPercentText}>{Math.round(draftFontShadow)}</Text>
          </View>
        </InlineFeatureShell>
      );
    case 'FontWeight':
      return (
        <InlineFeatureShell onClose={commitAndClose}>
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weightStrip}>
            {[
              { label: 'Light', value: FontWeight.Thin },
              { label: 'Normal', value: FontWeight.Normal },
              { label: 'Medium', value: FontWeight.Bold },
              { label: 'SemiBold', value: FontWeight.Bold },
              { label: 'Bold', value: FontWeight.Bold },
              { label: 'ExtraBold', value: FontWeight.Bold },
            ].map((item, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  onFontWeightChange(item.value);
                  onClose();
                }}
                style={[styles.weightChip, resolvedTextWeight === item.value && styles.weightChipActive]}
              >
                <Text style={[styles.weightOptionText, resolvedTextWeight === item.value && styles.weightOptionTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </InlineFeatureShell>
      );
    case 'BoxWidth':
      return (
        <InlineFeatureShell onClose={commitAndClose}>
          <View style={styles.sliderSection}>
            <Text style={styles.sliderLabelText}>Box Width</Text>
            <Slider
              style={styles.sliderLarge}
              minimumValue={0.15}
              maximumValue={0.85}
              value={draftBoxWidth}
              minimumTrackTintColor={INLINE_EDITOR_YELLOW}
              maximumTrackTintColor={INLINE_EDITOR_DARK}
              thumbTintColor={INLINE_EDITOR_YELLOW}
              onValueChange={(value) => {
                setDraftBoxWidth(value);
                onBoxWidthChange(value);
              }}
              onSlidingComplete={() => {}}
            />
            <Text style={styles.sliderPercentText}>{Math.round(draftBoxWidth * 100)}%</Text>
          </View>
        </InlineFeatureShell>
      );
    case 'TextPosition':
      return (
        <InlineFeatureShell onClose={commitAndClose}>
          <View style={styles.positionRow}>
            <View style={styles.positionColumn}>
              <Text style={styles.sliderLabelText}>X</Text>
              <Slider
                style={styles.sliderCompact}
                minimumValue={0}
                maximumValue={globalPositionXMax}
                value={draftX}
                minimumTrackTintColor={INLINE_EDITOR_YELLOW}
                maximumTrackTintColor={INLINE_EDITOR_DARK}
                thumbTintColor={INLINE_EDITOR_YELLOW}
                onValueChange={(value) => {
                  setDraftX(value);
                  onTextPositionXChange(value);
                }}
                onSlidingComplete={() => {}}
              />
              <Text style={styles.sliderPercentText}>{Math.round(draftX)}px</Text>
            </View>
            <View style={styles.positionColumn}>
              <Text style={styles.sliderLabelText}>Y</Text>
              <Slider
                style={styles.sliderCompact}
                minimumValue={0}
                maximumValue={globalPositionYMax}
                value={draftY}
                minimumTrackTintColor={INLINE_EDITOR_YELLOW}
                maximumTrackTintColor={INLINE_EDITOR_DARK}
                thumbTintColor={INLINE_EDITOR_YELLOW}
                onValueChange={(value) => {
                  setDraftY(value);
                  onTextPositionYChange(value);
                }}
                onSlidingComplete={() => {}}
              />
              <Text style={styles.sliderPercentText}>{Math.round(draftY)}px</Text>
            </View>
          </View>
        </InlineFeatureShell>
      );
    default:
      return null;
  }
});

type QuotesViewProps = {
  title?: string;
  initialQuoteText?: string;
  initialBackgroundImageUri?: string | null;
  initialEditorConfig?: QuoteEditorConfig | null;
  onBack?: () => void;
  onSave?: (quote: QuoteEditorConfig) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
};

export default function QuotesView({
  title = 'Quotes',
  initialQuoteText,
  initialBackgroundImageUri,
  initialEditorConfig,
  onBack,
  onSave,
  onDelete,
}: QuotesViewProps) {

  //Todo  make the width and height of the canvas based on user selection quote verticle / instagram view etc
  //Todo  make the background color of the canvas based on user selection
  //Toto impliment color picker 
  //Todo impliment text aligment and font selection
  //todo impliment text input by default at the center of the canvas
  //todo create saving mechanisum without loosing user created layout, fonts, colors etc
  
  const [activeCanvasKey, setActiveCanvasKey] = useState<CanvasPresetKey>(
    initialEditorConfig?.activeCanvasKey ?? DEFAULT_EDITOR_CONFIG.activeCanvasKey,
  );
  const [backgroundImageUri, setBackgroundImageUri] = useState<string | null>(
    initialEditorConfig?.background_image_uri ?? initialBackgroundImageUri ?? null,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<string | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [exportMenuVisible, setExportMenuVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('Ready to export');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [settingsScrollX, setSettingsScrollX] = useState(0);
  const [settingsViewportWidth, setSettingsViewportWidth] = useState(0);
  const [settingsContentWidth, setSettingsContentWidth] = useState(0);
  const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
  const [imageOpacity, setImageOpacity] = useState(
    initialEditorConfig?.image_opacity ?? DEFAULT_EDITOR_CONFIG.image_opacity,
  );
  const [fontSize, setFontSize] = useState(
    initialEditorConfig?.font_size ?? DEFAULT_EDITOR_CONFIG.font_size,
  );
  const [fontColor, setFontColor] = useState(
    initialEditorConfig?.font_color ?? DEFAULT_EDITOR_CONFIG.font_color,
  );
  const [bgColor, setBgColor] = useState(
    initialEditorConfig?.bg_color ?? DEFAULT_EDITOR_CONFIG.bg_color,
  );
  const [fontFamily, setFontFamily] = useState(
    initialEditorConfig?.font_family ?? DEFAULT_EDITOR_CONFIG.font_family,
  );
  const [fontShadow, setFontShadow] = useState(
    initialEditorConfig?.font_shadow ?? DEFAULT_EDITOR_CONFIG.font_shadow,
  );
  const [fontWeight, setFontWeight] = useState<FontWeight>(
    initialEditorConfig?.font_weight ?? DEFAULT_EDITOR_CONFIG.font_weight,
  );
  const [textAlign, setTextAlign] = useState<TextAlign>(
    initialEditorConfig?.text_align ?? DEFAULT_EDITOR_CONFIG.text_align,
  );
  const [textBoxes, setTextBoxes] = useState<QuoteTextBox[]>(
    normalizeTextBoxes(
      initialEditorConfig?.text_boxes,
      initialEditorConfig?.quote_text ?? initialQuoteText ?? DEFAULT_QUOTE_TEXT,
    ),
  );
  const exportCanvasRef = useCanvasRef();
  const [selectedTextBoxId, setSelectedTextBoxId] = useState('');
  const selectedTextInputRef = useRef<TextInput>(null);
  const initialSaveKeyRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [globalQuoteText, setGlobalQuoteText] = useState(
    initialEditorConfig?.quote_text ?? initialQuoteText ?? DEFAULT_QUOTE_TEXT,
  );
  // text position as percentages of canvas dimensions
  const [textXPercent, setTextXPercent] = useState(
    initialEditorConfig?.text_x_percent ?? DEFAULT_EDITOR_CONFIG.text_x_percent,
  );
  const [textYPercent, setTextYPercent] = useState(
    initialEditorConfig?.text_y_percent ?? DEFAULT_EDITOR_CONFIG.text_y_percent,
  );
  // get available fonts
  const availableFonts = listFontFamilies();
  useEffect(() => {
    const config = initialEditorConfig ?? DEFAULT_EDITOR_CONFIG;
    setActiveCanvasKey(config.activeCanvasKey);
    setBackgroundImageUri(config.background_image_uri ?? initialBackgroundImageUri ?? null);
    setImageOpacity(config.image_opacity);
    setFontSize(config.font_size);
    setFontColor(config.font_color);
    setBgColor(config.bg_color);
    setFontFamily(config.font_family);
    setFontShadow(config.font_shadow);
    setFontWeight(config.font_weight);
    setTextAlign(config.text_align);
    setTextBoxes(normalizeTextBoxes(config.text_boxes, config.quote_text || initialQuoteText || DEFAULT_QUOTE_TEXT));
    setSelectedTextBoxId('');
    setGlobalQuoteText(config.quote_text || initialQuoteText || DEFAULT_QUOTE_TEXT);
    setTextXPercent(config.text_x_percent);
    setTextYPercent(config.text_y_percent);
    initialSaveKeyRef.current = null;
  }, []);

  useEffect(() => {
    if (currentFeature !== 'TextEdit') {
      return;
    }

    const handle = setTimeout(() => {
      selectedTextInputRef.current?.focus();
    }, 50);

    return () => clearTimeout(handle);
  }, [currentFeature, selectedTextBoxId]);

  useEffect(() => {
    if (!modalVisible) {
      setCurrentFeature(null);
    }
  }, [modalVisible]);

    const activePreset = CANVAS_PRESETS[activeCanvasKey];

  // Scale the preset down to fit within 90 % of screen width and 70 % of
  // screen height while preserving the preset's aspect ratio.
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isTablet = screenWidth >= 768;
  const horizontalInset = isTablet ? 24 : 16;
  const headerReserve = isTablet ? 92 : 112;
  const maxDisplayWidth = Math.min(screenWidth - horizontalInset * 2, screenWidth * 0.9, 900);
  const settingsPanelHeight = Math.max(isTablet ? 220 : 200, screenHeight * 0.28);
  const maxDisplayHeight = Math.min(
    screenHeight * (isTablet ? 0.56 : 0.44),
    screenHeight - headerReserve - settingsPanelHeight - 24,
  );
  const nativeCanvasWidth = activePreset.nativeWidth;
  const nativeCanvasHeight = activePreset.nativeHeight;
  const previewScale = Math.min(
    maxDisplayWidth / nativeCanvasWidth,
    maxDisplayHeight / nativeCanvasHeight,
  );

  const canvasWidth = nativeCanvasWidth * previewScale;
  const canvasHeight = nativeCanvasHeight * previewScale;
  const featureTileWidth = Math.floor((screenWidth - horizontalInset * 2 - 16) / 5);
  const settingsTileWidth = Math.max(64, Math.min(isTablet ? 96 : 84, featureTileWidth));
  const settingsTileHeight = isTablet ? 96 : 88;
  const settingsStripHeight = settingsTileHeight * 2 + 16;
  const scrollbarTrackWidth = Math.max(40, Math.floor((settingsTileWidth / 2) * 0.7));
  const scrollbarThumbSize = 8;
  const inlinePickerHeight = Math.max(118, Math.min(146, Math.round(settingsPanelHeight * 0.6)));
  const maxSettingsScroll = Math.max(0, settingsContentWidth - settingsViewportWidth);
  const scrollbarUsableWidth = Math.max(0, scrollbarTrackWidth - 6 - scrollbarThumbSize);
  const scrollbarThumbX =
    maxSettingsScroll > 0
      ? (settingsScrollX / maxSettingsScroll) * scrollbarUsableWidth
      : 0;
  const showSettingsScrollbar = maxSettingsScroll > 0;
  const FeaturesArray=[
  {
    name:"BackgroundImage",
    icon:<MaterialIcons name="image" size={24}/>,
    label:"Image"
  },
  {
    name:"BackgroundColor",
    
    icon:<MaterialIcons name="select-color"  size={20} />,
    label:"Bg Color"
  },
  {
    name:"FontColor",
    icon:<MaterialIcons name="format-color-text" size={24}/>,
    label:"Font Color"
  },
  {
    name:"ImageOpacity",
    icon:<MaterialIcons name="opacity" size={24}/>,
    label:"Opacity"
  },
  {
    name:"FontSize",
    icon:<MaterialIcons name="format-size" size={24}/>,
    label:"Font Size"
  },
  {
    name:"FontFamily",
    icon:<MaterialIcons name="format-font" size={24}/>,
    label:"Fonts"
  },
  {
    name:"CanvasSize",
    icon:<MaterialIcons name="resize" size={24}/>,
    label:"Size"
  },
  {
    name:"FontShadow",
    icon:<MaterialIcons name="text-shadow" size={24}/>,
    label:"Shadow"
  },
  {
    name:"BoxWidth",
    icon:<MaterialIcons name="arrow-expand-horizontal" size={24}/>,
    label:"Box Width"
  },
  {
    name:"AddText",
    icon:<MaterialIcons name="text-box-plus-outline" size={24}/>,
    label:"Add Text"
  },
  {
    name:"TextEdit",
    icon:<MaterialIcons name="pencil" size={24}/>,
    label:"Edit Text"
  },
  {
    name:"TextPosition",
    icon:<MaterialIcons name="axis-arrow" size={24}/>,
    label:"Text Position"
  }
];
  const templateOptions = [
    { key: 'instagram_post_square', label: 'Square' },
    { key: 'instagram_post_portrait', label: 'Portrait' },
    { key: 'instagram_post_landscape', label: 'Landscape' },
    { key: 'instagram_story', label: 'Story' },
    { key: 'whatsapp_status', label: 'WhatsApp' },
  ] as const;
  const featureColumns: typeof FeaturesArray[] = [];
  for (let i = 0; i < FeaturesArray.length; i += 2) {
    featureColumns.push(FeaturesArray.slice(i, i + 2));
  }
const imageUri = backgroundImageUri || require("../../assets/test.jpg");
  const image = useImage(imageUri);

  const selectedTextBox = useMemo(
    () => textBoxes.find((box) => box.id === selectedTextBoxId) ?? null,
    [selectedTextBoxId, textBoxes],
  );

  const quoteText = useMemo(
    () => textBoxes.map((box) => box.text.trim()).filter(Boolean).join('\n'),
    [textBoxes],
  );

  const resolvedTextColor = selectedTextBox?.font_color ?? fontColor;
  const resolvedTextSize = selectedTextBox?.font_size ?? fontSize;
  const resolvedTextFamily = selectedTextBox?.font_family ?? fontFamily;
  const resolvedTextShadow = selectedTextBox?.font_shadow ?? fontShadow;
  const resolvedTextWeight = selectedTextBox?.font_weight ?? fontWeight;
  const resolvedTextAlign = selectedTextBox?.text_align ?? textAlign;
  const resolvedBoxWidth = selectedTextBox?.width_percent ?? textBoxes[0]?.width_percent ?? DEFAULT_TEXT_BOX_WIDTH;

  const updateTextBox = (boxId: string, updates: Partial<QuoteTextBox>) => {
    setTextBoxes((current) => current.map((box) => (box.id === boxId ? { ...box, ...updates } : box)));
  };

  const updateAllTextBoxes = (updates: Partial<QuoteTextBox>) => {
    setTextBoxes((current) => current.map((box) => ({ ...box, ...updates })));
  };

  const focusTextBox = (boxId: string) => {
    setSelectedTextBoxId(boxId);
  };

  const clearTextFocus = () => {
    setSelectedTextBoxId('');
  };

  const applyTextChange = (value: string) => {
    if (selectedTextBox) {
      updateTextBox(selectedTextBox.id, { text: value });
      return;
    }

    setGlobalQuoteText(value);
    updateAllTextBoxes({ text: value });
  };

  const applyStyleChange = (updates: Partial<QuoteTextBox>, globalSetter?: (value: any) => void, globalValue?: any) => {
    if (selectedTextBox) {
      updateTextBox(selectedTextBox.id, updates);
      return;
    }

    if (globalSetter) {
      globalSetter(globalValue);
    }
    updateAllTextBoxes(updates);
  };

  const setTextColor = (color: string) => applyStyleChange({ font_color: color }, setFontColor, color);
  const setTextSize = (value: number) => applyStyleChange({ font_size: value }, setFontSize, value);
  const setTextFamily = (family: string) => applyStyleChange({ font_family: family }, setFontFamily, family);
  const setTextShadow = (value: number) => applyStyleChange({ font_shadow: value }, setFontShadow, value);
  const setTextWeight = (value: FontWeight) => applyStyleChange({ font_weight: value }, setFontWeight, value);
  const setTextAlignment = (value: TextAlign) => applyStyleChange({ text_align: value }, setTextAlign, value);
  const setBoxWidth = (value: number) => {
    if (selectedTextBox) {
      updateTextBox(selectedTextBox.id, { width_percent: value });
      return;
    }

    updateAllTextBoxes({ width_percent: value });
  };

  const setTextX = (value: number) => {
    if (selectedTextBox) {
      setTextXPercent(value);
      updateTextBox(selectedTextBox.id, { x_percent: value });
      return;
    }

    const xLimits = textBoxes.reduce(
      (acc, box) => {
        const boxWidth = box.width_percent ?? DEFAULT_TEXT_BOX_WIDTH;
        return {
          min: Math.min(acc.min, box.x_percent),
          max: Math.max(acc.max, box.x_percent + boxWidth),
        };
      },
      { min: 1, max: 0 },
    );
    const delta = clampDeltaValue(value - textXPercent, -xLimits.min, 1 - xLimits.max);
    const nextValue = textXPercent + delta;
    setTextXPercent(nextValue);
    setTextBoxes((current) =>
      current.map((box) => ({
        ...box,
        x_percent: clampPercentValue(
          box.x_percent + delta,
          0,
          Math.max(0, 1 - (box.width_percent ?? DEFAULT_TEXT_BOX_WIDTH)),
        ),
      })),
    );
  };

  const setTextY = (value: number) => {
    if (selectedTextBox) {
      setTextYPercent(value);
      updateTextBox(selectedTextBox.id, { y_percent: value });
      return;
    }

    const yLimits = textBoxes.reduce(
      (acc, box) => {
        const boxHeight = (layoutTextBoxMetrics.find((metric) => metric.box.id === box.id)?.contentHeight ?? 0) / nativeCanvasHeight;
        return {
          min: Math.min(acc.min, box.y_percent),
          max: Math.max(acc.max, box.y_percent + boxHeight),
        };
      },
      { min: 1, max: 0 },
    );
    const delta = clampDeltaValue(value - textYPercent, -yLimits.min, 1 - yLimits.max);
    const nextValue = textYPercent + delta;
    setTextYPercent(nextValue);
    setTextBoxes((current) =>
      current.map((box) => {
        const measuredHeight = (layoutTextBoxMetrics.find((metric) => metric.box.id === box.id)?.contentHeight ?? 0) / nativeCanvasHeight;
        return {
          ...box,
          y_percent: clampPercentValue(
            box.y_percent + delta,
            0,
            Math.max(0, 1 - measuredHeight),
          ),
        };
      }),
    );
  };

  const addTextBox = () => {
    if (textBoxes.length >= MAX_TEXT_BOXES) {
      return;
    }

    const lastBox = textBoxes[textBoxes.length - 1];
    const lastBoxHeight = lastBox
      ? (layoutTextBoxMetrics.find((metric) => metric.box.id === lastBox.id)?.contentHeight ?? 0) / nativeCanvasHeight
      : DEFAULT_TEXT_BOX_HEIGHT;
    const nextBox = lastBox
      ? {
          ...createTextBox('', textBoxes.length),
          x_percent: lastBox.x_percent,
          y_percent: clampPercentValue(
            lastBox.y_percent + lastBoxHeight + DEFAULT_TEXT_BOX_VERTICAL_GAP,
            0,
            Math.max(0, 1 - DEFAULT_TEXT_BOX_HEIGHT),
          ),
        }
      : createTextBox('', textBoxes.length);
    setTextBoxes((current) => [...current, nextBox]);
    setSelectedTextBoxId(nextBox.id);
  };

  const removeTextBox = (boxId: string) => {
    setTextBoxes((current) => {
      if (current.length <= 1) {
        return current;
      }

      const next = current.filter((box) => box.id !== boxId);
      setSelectedTextBoxId(next[0]?.id ?? '');
      return next;
    });
  };

  const buildTextBoxMetrics = (layoutWidth: number) =>
    textBoxes.map((box) => {
      const paragraph = (() => {
        const builder = Skia.ParagraphBuilder.Make({
          textAlign: box.text_align ?? textAlign,
          textStyle: {
            color: Skia.Color(box.font_color ?? fontColor),
            fontFamilies: [box.font_family ?? fontFamily],
            fontSize: box.font_size ?? fontSize,
            fontStyle: {
              weight: box.font_weight ?? fontWeight,
              slant: FontSlant.Italic,
            },
            shadows:
              (box.font_shadow ?? fontShadow) > 0
                ? [{ color: Skia.Color('rgba(0,0,0,0.6)'), offset: { x: 1, y: 1 }, blurRadius: box.font_shadow ?? fontShadow }]
                : [],
          },
        });
        builder.addText(box.text);
        return builder.build();
      })();

      const canvasTextWidth = Math.max(
        24,
        layoutWidth * (box.width_percent ?? DEFAULT_TEXT_BOX_WIDTH) - TEXT_BOX_HORIZONTAL_PADDING * 2,
      );
      paragraph.layout(canvasTextWidth);

      return {
        box,
        paragraph,
        contentWidth: canvasTextWidth,
        contentHeight: Math.max(24, paragraph.getHeight()),
      };
    });

  const layoutTextBoxMetrics = useMemo(
    () => buildTextBoxMetrics(nativeCanvasWidth),
    [textBoxes, fontSize, fontFamily, fontColor, fontShadow, fontWeight, textAlign, nativeCanvasWidth],
  );

  const selectedLayoutMetric = useMemo(
    () => layoutTextBoxMetrics.find((item) => item.box.id === selectedTextBoxId) ?? null,
    [layoutTextBoxMetrics, selectedTextBoxId],
  );

  const selectedLayoutBoxWidth = selectedTextBox
    ? Math.max(24, nativeCanvasWidth * (selectedTextBox.width_percent ?? DEFAULT_TEXT_BOX_WIDTH))
    : 0;
  const selectedLayoutBoxHeight = selectedTextBox
    ? Math.max(24, (selectedLayoutMetric?.contentHeight ?? 0) + TEXT_BOX_VERTICAL_PADDING * 2)
    : 0;

  const layoutBounds = useMemo(() => {
    if (layoutTextBoxMetrics.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
      };
    }

    const bounds = layoutTextBoxMetrics.reduce(
      (acc, metric) => {
        const boxWidth = Math.max(
          24,
          nativeCanvasWidth * (metric.box.width_percent ?? DEFAULT_TEXT_BOX_WIDTH),
        );
        const boxHeight = Math.max(
          24,
          metric.contentHeight + TEXT_BOX_VERTICAL_PADDING * 2,
        );
        const x = nativeCanvasWidth * metric.box.x_percent;
        const y = nativeCanvasHeight * metric.box.y_percent;
        return {
          minX: Math.min(acc.minX, x),
          minY: Math.min(acc.minY, y),
          maxX: Math.max(acc.maxX, x + boxWidth),
          maxY: Math.max(acc.maxY, y + boxHeight),
        };
      },
      {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
        },
      );

    return {
      ...bounds,
      width: Math.max(0, bounds.maxX - bounds.minX),
      height: Math.max(0, bounds.maxY - bounds.minY),
    };
  }, [layoutTextBoxMetrics, nativeCanvasWidth, nativeCanvasHeight]);

  const globalPositionX = selectedTextBox ? selectedTextBox.x_percent * nativeCanvasWidth : layoutBounds.minX;
  const globalPositionY = selectedTextBox ? selectedTextBox.y_percent * nativeCanvasHeight : layoutBounds.minY;
  const globalPositionXMax = selectedTextBox
    ? Math.max(0, nativeCanvasWidth - selectedLayoutBoxWidth)
    : Math.max(0, nativeCanvasWidth - layoutBounds.width);
  const globalPositionYMax = selectedTextBox
    ? Math.max(0, nativeCanvasHeight - selectedLayoutBoxHeight)
    : Math.max(0, nativeCanvasHeight - layoutBounds.height);

  const autosavePayload = useMemo(
    () => ({
      activeCanvasKey,
      background_image_uri: backgroundImageUri,
      image_opacity: imageOpacity,
      font_size: selectedTextBox?.font_size ?? fontSize,
      font_color: selectedTextBox?.font_color ?? fontColor,
      bg_color: bgColor,
      font_family: selectedTextBox?.font_family ?? fontFamily,
      font_shadow: selectedTextBox?.font_shadow ?? fontShadow,
      font_weight: selectedTextBox?.font_weight ?? fontWeight,
      text_align: selectedTextBox?.text_align ?? textAlign,
      quote_text: quoteText,
      text_boxes: textBoxes,
      text_x_percent: selectedTextBox?.x_percent ?? textBoxes[0]?.x_percent ?? textXPercent,
      text_y_percent: selectedTextBox?.y_percent ?? textBoxes[0]?.y_percent ?? textYPercent,
    }),
    [
      activeCanvasKey,
      backgroundImageUri,
      imageOpacity,
      selectedTextBox?.font_size,
      selectedTextBox?.font_color,
      selectedTextBox?.font_family,
      selectedTextBox?.font_shadow,
      selectedTextBox?.font_weight,
      selectedTextBox?.text_align,
      selectedTextBox?.x_percent,
      selectedTextBox?.y_percent,
      fontSize,
      fontColor,
      bgColor,
      fontFamily,
      fontShadow,
      fontWeight,
      textAlign,
      quoteText,
      textBoxes,
      textXPercent,
      textYPercent,
    ],
  );

  const autosavePayloadKey = useMemo(() => JSON.stringify(autosavePayload), [autosavePayload]);

  useEffect(() => {
    if (!onSave) {
      return;
    }

    if (initialSaveKeyRef.current === null) {
      initialSaveKeyRef.current = autosavePayloadKey;
      return;
    }

    if (autosavePayloadKey === initialSaveKeyRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(async () => {
      try {
        await onSave(autosavePayload);
        initialSaveKeyRef.current = autosavePayloadKey;
        setSaveStatus('saved');
      } catch (error) {
        console.warn('Autosave failed', error);
        setSaveStatus('error');
      }
    }, 900);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [autosavePayload, autosavePayloadKey, onSave]);

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const exportFormats: Record<ExportFormat, { label: string; extension: string; mime: string; skiaFormat: ImageFormat; quality: number }> = {
    png: { label: 'PNG', extension: 'png', mime: 'image/png', skiaFormat: ImageFormat.PNG, quality: 100 },
    jpeg: { label: 'JPEG', extension: 'jpeg', mime: 'image/jpeg', skiaFormat: ImageFormat.JPEG, quality: 92 },
    jpg: { label: 'JPG', extension: 'jpg', mime: 'image/jpeg', skiaFormat: ImageFormat.JPEG, quality: 92 },
  };

  const renderCanvasContent = (metrics: typeof layoutTextBoxMetrics, renderWidth: number, renderHeight: number) => (
    <>
      <Rect x={0} y={0} width={renderWidth} height={renderHeight} color={bgColor} />
      {image && (
        <SkiaImage
          image={image}
          opacity={imageOpacity}
          fit="cover"
          x={0}
          y={0}
          width={renderWidth}
          height={renderHeight}
        />
      )}
      {textBoxes.map((box, index) => {
        const metric = metrics[index];
        const paragraph = metric?.paragraph;
        const boxWidth = Math.max(24, renderWidth * (box.width_percent ?? DEFAULT_TEXT_BOX_WIDTH));
        const x = renderWidth * box.x_percent;
        const y = renderHeight * box.y_percent;

        return (
          <Paragraph
            key={box.id}
            paragraph={paragraph}
            x={x + TEXT_BOX_HORIZONTAL_PADDING}
            y={y + TEXT_BOX_VERTICAL_PADDING}
            width={Math.max(12, boxWidth - TEXT_BOX_HORIZONTAL_PADDING * 2)}
          />
        );
      })}
    </>
  );

  const renderProgressPath = (progress: number) => {
    const size = 112;
    const strokeWidth = 10;
    const path = Skia.Path.Make();
    path.addOval({
      x: strokeWidth / 2,
      y: strokeWidth / 2,
      width: size - strokeWidth,
      height: size - strokeWidth,
    });

    return { path, size, strokeWidth, progress };
  };

  const getRNFS = () => require('react-native-fs') as typeof import('react-native-fs');

  const getExportDirectories = async () => {
    const RNFS = getRNFS();
    if (Platform.OS !== 'android') {
      return {
        preferred: RNFS.DocumentDirectoryPath,
        fallback: RNFS.DocumentDirectoryPath,
      };
    }

    const androidVersion = Number(Platform.Version);
    const appBaseDirectory = RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath;
    const appExportDirectory = `${appBaseDirectory}/notetoquote/quotes`;
    const publicPicturesDirectory = `${RNFS.PicturesDirectoryPath}/notetoquote/quotes`;

    if (androidVersion < 29) {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      );

      if (permission === PermissionsAndroid.RESULTS.GRANTED) {
        return {
          preferred: publicPicturesDirectory,
          fallback: appExportDirectory,
        };
      }
    }

    return {
      preferred: publicPicturesDirectory,
      fallback: appExportDirectory,
    };
  };

  const handleExport = async () => {
    if (exporting) {
      return;
    }

    try {
      const RNFS = getRNFS();
      const format = exportFormats[exportFormat];
      setExporting(true);
      setExportProgress(5);
      setExportStatus('Preparing export...');

      await sleep(120);

      setExportProgress(20);
      setExportStatus('Rendering quote...');
      await sleep(120);

      const snapshot = await exportCanvasRef.current?.makeImageSnapshotAsync();
      if (!snapshot) {
        throw new Error('Could not capture the quote canvas');
      }

      setExportProgress(55);
      setExportStatus('Encoding file...');
      await sleep(120);

      const fileName = `quote_${Date.now()}.${format.extension}`;
      const { preferred, fallback } = await getExportDirectories();
      const base64 = snapshot.encodeToBase64(format.skiaFormat, format.quality);

      const writeExport = async (exportDirectory: string) => {
        await RNFS.mkdir(exportDirectory);
        const filePath = `${exportDirectory}/${fileName}`;
        setExportProgress(80);
        setExportStatus('Writing file...');
        await RNFS.writeFile(filePath, base64, 'base64');

        if (Platform.OS === 'android' && exportDirectory.includes('/Pictures/') && typeof RNFS.scanFile === 'function') {
          await RNFS.scanFile(filePath);
        }

        return filePath;
      };

      let filePath = '';
      try {
        filePath = await writeExport(preferred);
      } catch (preferredError) {
        if (preferred !== fallback) {
          filePath = await writeExport(fallback);
        } else {
          throw preferredError;
        }
      }

      setExportProgress(100);
      setExportStatus('Export complete');
      Alert.alert('Exported', `Saved as ${fileName}\n\n${filePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to export the quote';
      const hint = /RNFSManager|RNFSFileTypeRegular|native module/i.test(message)
        ? '\n\nThe native RNFS module is not registered in this app session. Rebuild the Android app after installing native dependencies.'
        : /EPERM|permission|not permitted/i.test(message)
          ? '\n\nAndroid is blocking direct writes to public Pictures on this version. The app will fall back to app storage unless MediaStore is used.'
        : '';
      Alert.alert('Export failed', `${message}${hint}`);
      setExportStatus('Export failed');
    } finally {
      setExporting(false);
      setTimeout(() => {
        setExportProgress(0);
        setExportStatus('Ready to export');
      }, 900);
    }
  };

  

  const HandleFeature = (featureName:string) => {
    console.log("clicked on feature", featureName)
        if (featureName === 'AddText') {
          addTextBox();
          setCurrentFeature('TextEdit');
          setModalVisible(true);
          return;
        }
        setCurrentFeature(featureName);
        setModalVisible(featureName === 'TextEdit');
    
    // switch(featureName){
    //   case "BackgroundImage":
    //     setCurrentFeature(featureName);
    //     setModalVisible(true);
    //     break;
    //   case "BackgroundColor":
    //     //handle background color selection
    //     setCurrentFeature(featureName);
    //     setModalVisible(true);
    //     break;
    // }
  };

  const HandleOpactyChange = (value:number) => {
    setImageOpacity(value);
  }

  const closeFeaturePanel = () => {
    setModalVisible(false);
    setCurrentFeature(null);
  };

  const renderInlineFeatureContent = () => {
    if (!currentFeature || currentFeature === 'TextEdit') {
      return null;
    }

    return (
      <InlineFeaturePanel
        key={currentFeature}
        feature={currentFeature as InlineFeatureKey}
        activeCanvasKey={activeCanvasKey}
        availableFonts={availableFonts}
        backgroundImageUri={backgroundImageUri}
        bgColor={bgColor}
        fontColor={fontColor}
        fontFamily={fontFamily}
        fontShadow={fontShadow}
        fontSize={fontSize}
        fontWeight={fontWeight}
        boxWidth={resolvedBoxWidth}
        imageOpacity={imageOpacity}
        inlinePickerHeight={inlinePickerHeight}
        nativeCanvasHeight={nativeCanvasHeight}
        nativeCanvasWidth={nativeCanvasWidth}
        globalPositionX={globalPositionX}
        globalPositionXMax={globalPositionXMax}
        globalPositionY={globalPositionY}
        globalPositionYMax={globalPositionYMax}
        resolvedTextColor={resolvedTextColor}
        resolvedTextFamily={resolvedTextFamily}
        resolvedTextShadow={resolvedTextShadow}
        resolvedTextSize={resolvedTextSize}
        resolvedTextWeight={resolvedTextWeight}
        onBackgroundImageChange={setBackgroundImageUri}
        onBgColorChange={setBgColor}
        onCanvasKeyChange={setActiveCanvasKey}
        onClose={closeFeaturePanel}
        onFontColorChange={setTextColor}
        onFontFamilyChange={setTextFamily}
        onFontShadowChange={setTextShadow}
        onFontSizeChange={setTextSize}
        onFontWeightChange={setTextWeight}
        onBoxWidthChange={setBoxWidth}
        onImageOpacityChange={HandleOpactyChange}
        onTextPositionXChange={(value) => setTextX(value / nativeCanvasWidth)}
        onTextPositionYChange={(value) => setTextY(value / nativeCanvasHeight)}
      />
    );
  };

  const renderTextEditorModalContent = () => (
    <View style={styles.modalBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={closeFeaturePanel} />
      <View style={[styles.modalContent, styles.textEditorModalContent]}>
        <View style={styles.featurePanelHeader}>
          <View style={styles.featurePanelTitleWrap}>
            <Text style={styles.featurePanelTitle}>Edit Text Boxes</Text>
          </View>
          <Pressable onPress={closeFeaturePanel} hitSlop={10} style={styles.featureDoneButton}>
            <MaterialIcons name="check" size={22} color="#1a73e8" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.textEditorScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.textInputLabel}>Choose a box</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boxPickerRow}>
            <Pressable
              onPress={() => setSelectedTextBoxId('')}
              style={[styles.boxPickerChip, !selectedTextBoxId && styles.boxPickerChipActive]}
            >
              <Text style={[styles.boxPickerChipText, !selectedTextBoxId && styles.boxPickerChipTextActive]}>
                All Texts
              </Text>
            </Pressable>
            {textBoxes.map((box, index) => {
              const isActive = selectedTextBoxId === box.id;
              return (
                <Pressable
                  key={box.id}
                  onPress={() => setSelectedTextBoxId(box.id)}
                  style={[styles.boxPickerChip, isActive && styles.boxPickerChipActive]}
                >
                  <Text style={[styles.boxPickerChipText, isActive && styles.boxPickerChipTextActive]}>
                    Text {index + 1}
                  </Text>
                </Pressable>
              );
            })}
            {textBoxes.length < MAX_TEXT_BOXES ? (
              <Pressable onPress={addTextBox} style={[styles.boxPickerChip, styles.boxPickerAddChip]}>
                <Icon source="plus" size={18} color="#1a73e8" />
                <Text style={styles.boxPickerAddText}>Add</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <View style={styles.alignmentContainer}>
            <Pressable
              onPress={() => setTextAlignment(TextAlign.Left)}
              style={[styles.alignButton, resolvedTextAlign === TextAlign.Left && styles.alignButtonActive]}
            >
              <Icon source="format-align-left" size={24} color={resolvedTextAlign === TextAlign.Left ? '#1a73e8' : '#666'} />
            </Pressable>
            <Pressable
              onPress={() => setTextAlignment(TextAlign.Center)}
              style={[styles.alignButton, resolvedTextAlign === TextAlign.Center && styles.alignButtonActive]}
            >
              <Icon source="format-align-center" size={24} color={resolvedTextAlign === TextAlign.Center ? '#1a73e8' : '#666'} />
            </Pressable>
            <Pressable
              onPress={() => setTextAlignment(TextAlign.Right)}
              style={[styles.alignButton, resolvedTextAlign === TextAlign.Right && styles.alignButtonActive]}
            >
              <Icon source="format-align-right" size={24} color={resolvedTextAlign === TextAlign.Right ? '#1a73e8' : '#666'} />
            </Pressable>
          </View>

          <Text style={styles.textInputLabel}>
            {selectedTextBox ? 'Text content for selected box' : 'Text content for all boxes'}
          </Text>
          <TextInput
            ref={selectedTextInputRef}
            style={styles.quoteTextInput}
            placeholder="Enter your text here..."
            placeholderTextColor="#999"
            multiline
            value={selectedTextBox ? selectedTextBox.text : globalQuoteText}
            onChangeText={applyTextChange}
            textAlignVertical="top"
          />

          <View style={styles.textEditorActionsRow}>
            <Pressable
              onPress={addTextBox}
              disabled={textBoxes.length >= MAX_TEXT_BOXES}
              style={[styles.secondaryActionButton, textBoxes.length >= MAX_TEXT_BOXES && styles.secondaryActionButtonDisabled]}
            >
              <Text style={styles.secondaryActionButtonText}>Add Text</Text>
            </Pressable>
            {selectedTextBox ? (
              <Pressable
                onPress={() => removeTextBox(selectedTextBox.id)}
                disabled={textBoxes.length <= 1}
                style={[styles.dangerActionButton, textBoxes.length <= 1 && styles.secondaryActionButtonDisabled]}
              >
                <Text style={styles.dangerActionButtonText}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </View>
  );


  return (
    <>
    <View style={styles.container}>
      <Appbar.Header>
        {onBack ? <Appbar.BackAction onPress={onBack} /> : null}
        <Appbar.Content
          color='#433e3e'
          titleStyle={{ fontSize: 25, fontWeight: 'bold' }}
          title={title}
          // subtitle={
          //   saveStatus === 'saving'
          //     ? 'Saving...'
          //     : saveStatus === 'saved'
          //       ? 'Saved'
          //       : saveStatus === 'error'
          //         ? 'Autosave failed'
          //         : 'Autosave on'
          // }
        />
        {onDelete ? (
          <Appbar.Action
            icon="delete-outline"
            onPress={() => {
              Alert.alert('Delete quote?', 'This quote will be removed permanently.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete() },
              ]);
            }}
          />
        ) : null}
        <Appbar.Action
          icon="export"
          onPress={() => {
            setExportModalVisible(true);
            setExportMenuVisible(false);
          }}
        />
      </Appbar.Header>

      <View style={[styles.canvasViewport, { paddingBottom: settingsPanelHeight }]}>
        <View
          style={[styles.canvas, { width: canvasWidth, height: canvasHeight, marginHorizontal: horizontalInset }]}
        >
          <View
            style={[
              styles.previewStage,
              {
                width: nativeCanvasWidth,
                height: nativeCanvasHeight,
                transform: [{ scale: previewScale }],
              },
            ]}
            pointerEvents="box-none"
          >
            <Canvas style={{ width: nativeCanvasWidth, height: nativeCanvasHeight }}>
              {renderCanvasContent(layoutTextBoxMetrics, nativeCanvasWidth, nativeCanvasHeight)}
            </Canvas>
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <Pressable style={StyleSheet.absoluteFill} onPress={clearTextFocus} />
              {textBoxes.map((box) => {
                const isSelected = box.id === selectedTextBoxId;
                const metric = layoutTextBoxMetrics.find((item) => item.box.id === box.id);
                const boxWidth = Math.max(24, nativeCanvasWidth * (box.width_percent ?? DEFAULT_TEXT_BOX_WIDTH));
                const boxHeight = Math.max(24, (metric?.contentHeight ?? 0) + TEXT_BOX_VERTICAL_PADDING * 2);
                const x = nativeCanvasWidth * box.x_percent;
                const y = nativeCanvasHeight * box.y_percent;

                return (
                  <Pressable
                    key={box.id}
                    onPress={() => focusTextBox(box.id)}
                    style={[
                      styles.textBoxOverlay,
                      {
                        left: x,
                        top: y,
                        width: boxWidth,
                        height: boxHeight,
                      },
                      isSelected && styles.textBoxOverlaySelected,
                    ]}
                  >
                    {isSelected ? (
                      <>
                        <View style={styles.selectionDotTopLeft} />
                        <View style={styles.selectionDotTopRight} />
                        <View style={styles.selectionDotBottomLeft} />
                        <View style={styles.selectionDotBottomRight} />
                      </>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Canvas
            ref={exportCanvasRef}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: -10000,
              top: -10000,
              width: nativeCanvasWidth,
              height: nativeCanvasHeight,
            }}
          >
            {renderCanvasContent(layoutTextBoxMetrics, nativeCanvasWidth, nativeCanvasHeight)}
          </Canvas>
        </View>
      </View>
      <View style={[styles.settingsContainer, { height: settingsPanelHeight }]}>
          {currentFeature && currentFeature !== 'TextEdit' ? (
            <View style={[styles.featurePanelHost, { height: settingsPanelHeight }]}>
              {renderInlineFeatureContent()}
            </View>
          ) : (
            <>
              <View style={styles.settingsScrollbarZone}>
                {showSettingsScrollbar ? (
                  <View style={[styles.settingsScrollbarTrack, { width: scrollbarTrackWidth }]}>
                    <View
                      style={[
                        styles.settingsScrollbarThumb,
                        {
                          width: scrollbarThumbSize,
                          height: scrollbarThumbSize,
                          borderRadius: scrollbarThumbSize / 2,
                          transform: [{ translateX: scrollbarThumbX }],
                        },
                      ]}
                    />
                  </View>
                ) : null}
              </View>
              <View style={[styles.settingsStrip, { height: settingsStripHeight }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onLayout={(event) => setSettingsViewportWidth(event.nativeEvent.layout.width)}
                  onContentSizeChange={(contentWidth) => setSettingsContentWidth(contentWidth)}
                  onScroll={(event) => setSettingsScrollX(event.nativeEvent.contentOffset.x)}
                  scrollEventThrottle={16}
                  contentContainerStyle={styles.settingsScrollContent}
                >
                  {featureColumns.map((column, columnIndex) => (
                    <View
                      key={`feature-column-${columnIndex}`}
                      style={[
                        styles.settingsColumn,
                        {
                          width: settingsTileWidth,
                        },
                      ]}
                    >
                      {column.map((feature, index) => (
                        <View
                          key={`feature-item-${columnIndex}-${index}`}
                          style={[
                            styles.settingsGridItem,
                            {
                              width: settingsTileWidth,
                              height: settingsTileHeight,
                            },
                          ]}
                          onTouchEnd={() => HandleFeature(feature.name)}
                        >
                          <View style={styles.settingsIconCircle}>{feature.icon}</View>
                          <Text style={styles.settingsGridItemText}>{feature.label}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.templatesZone}>
                <Pressable
                  style={styles.templatesButton}
                  onPress={() => setTemplatesModalVisible(true)}
                >
                  <Text style={styles.templatesButtonText}>Templates</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
    </View>
      <Modal
        visible={modalVisible && currentFeature === 'TextEdit'}
        animationType="slide"
        transparent={true}
        onRequestClose={closeFeaturePanel}
      >
        {renderTextEditorModalContent()}
      </Modal>
      <Modal
        visible={exportModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          if (!exporting) {
            setExportModalVisible(false);
            setExportMenuVisible(false);
          }
        }}
      >
        <View style={styles.exportBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!exporting) {
                setExportModalVisible(false);
                setExportMenuVisible(false);
              }
            }}
          />
          <View style={styles.exportSheet}>
            <Text style={styles.modalTitle}>Export Quote</Text>
            <Text style={styles.exportDescription}>
              Choose the format, then export the current quote with all saved settings.
            </Text>

            <View style={styles.exportField}>
              <Text style={styles.exportFieldLabel}>File type</Text>
              <Pressable
                style={styles.exportDropdown}
                onPress={() => {
                  if (!exporting) {
                    setExportMenuVisible((current) => !current);
                  }
                }}
              >
                <Text style={styles.exportDropdownText}>{exportFormats[exportFormat].label}</Text>
                <Icon source={exportMenuVisible ? 'chevron-up' : 'chevron-down'} size={20} />
              </Pressable>
              {exportMenuVisible ? (
                <View style={styles.exportMenu}>
                  {(['png', 'jpeg', 'jpg'] as ExportFormat[]).map((format) => (
                    <Pressable
                      key={format}
                      style={[styles.exportMenuItem, exportFormat === format && styles.exportMenuItemActive]}
                      onPress={() => {
                        setExportFormat(format);
                        setExportMenuVisible(false);
                      }}
                    >
                      <Text style={styles.exportMenuItemText}>{exportFormats[format].label}</Text>
                      {exportFormat === format ? <Icon source="check" size={18} color="#1a73e8" /> : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.exportProgressWrap}>
              {(() => {
                const progressConfig = renderProgressPath(exportProgress);
                return (
                  <>
                    <Canvas style={{ width: progressConfig.size, height: progressConfig.size }}>
                      <Path
                        path={progressConfig.path}
                        start={0}
                        end={1}
                        stroke={{ width: progressConfig.strokeWidth, cap: StrokeCap.Round }}
                        color="rgba(26, 115, 232, 0.15)"
                      />
                      <Path
                        path={progressConfig.path}
                        start={0}
                        end={Math.max(0, Math.min(1, progressConfig.progress / 100))}
                        stroke={{ width: progressConfig.strokeWidth, cap: StrokeCap.Round }}
                        color="#1a73e8"
                      />
                    </Canvas>
                    <View style={styles.exportProgressCenter}>
                      <Text style={styles.exportProgressText}>{Math.round(exportProgress)}%</Text>
                    </View>
                  </>
                );
              })()}
            </View>

            <Text style={styles.exportStatusText}>{exportStatus}</Text>

            <View style={styles.exportActions}>
              <Pressable
                style={[styles.exportActionButton, styles.exportCancelButton, exporting && styles.exportActionDisabled]}
                disabled={exporting}
                onPress={() => {
                  setExportModalVisible(false);
                  setExportMenuVisible(false);
                }}
              >
                <Text style={styles.exportCancelText}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.exportActionButton, styles.exportPrimaryButton, exporting && styles.exportActionDisabled]}
                disabled={exporting}
                onPress={handleExport}
              >
                <Text style={styles.exportPrimaryText}>{exporting ? 'Exporting...' : 'Export'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={templatesModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTemplatesModalVisible(false)}
      >
        <View style={styles.templatesBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTemplatesModalVisible(false)} />
          <View style={styles.templatesSheet}>
            <View style={styles.templatesHeader}>
              <Text style={styles.templatesTitle}>Choose Template</Text>
              <Pressable onPress={() => setTemplatesModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#222" />
              </Pressable>
            </View>
            <View style={styles.templateGrid}>
              {templateOptions.map((template) => {
                const preview = CANVAS_PRESETS[template.key];
                return (
                  <Pressable
                    key={template.key}
                    style={styles.templateCard}
                    onPress={() => {
                      setActiveCanvasKey(template.key);
                      setTemplatesModalVisible(false);
                    }}
                  >
                    <View
                      style={[
                        styles.templatePreview,
                        { aspectRatio: preview.aspectRatio },
                      ]}
                    >
                      <Text style={styles.templatePreviewLabel}>{template.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    backgroundColor: '#fff',
    //  backgroundColor: 'red'

  },
  canvasViewport: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
  },
  canvas: {
    marginTop: 12,
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  previewStage: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'top left',
  },
  textBoxOverlay: {
    position: 'absolute',
  },
  textBoxOverlaySelected: {
    borderWidth: 1.5,
    borderColor: '#1a73e8',
    borderStyle: 'dashed',
  },
  selectionDotTopLeft: {
    position: 'absolute',
    left: -6,
    top: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1a73e8',
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectionDotTopRight: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1a73e8',
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectionDotBottomLeft: {
    position: 'absolute',
    left: -6,
    bottom: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1a73e8',
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectionDotBottomRight: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1a73e8',
    borderWidth: 2,
    borderColor: '#fff',
  },
  // // ── Dropdown trigger ──────────────────────────────────────────────────────
  // dropdownTrigger: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   marginTop: 10,
  //   marginHorizontal: '5%',
  //   paddingVertical: 10,
  //   paddingHorizontal: 14,
  //   backgroundColor: '#f0f0f0',
  //   borderRadius: 8,
  //   borderWidth: 1,
  //   borderColor: '#ddd',
  //   dropdownTriggerPressed: {
  //     backgroundColor: '#e0e0e0',
  //   },
  // },
  // dropdownTriggerText: {
  //   flex: 1,
  //   fontSize: 14,
  //   fontWeight: '600',
  //   color: '#222',
  // },
  // dropdownTriggerHint: {
  //   fontSize: 11,
  //   color: '#888',
  //   marginRight: 8,
  // },
  // dropdownChevron: {
  //   fontSize: 16,
  //   color: '#555',
  // },
  // // ── Dropdown modal ────────────────────────────────────────────────────────
  // modalBackdrop: {
  //   flex: 1,
  //   backgroundColor: 'rgba(0,0,0,0.4)',
  //   justifyContent: 'flex-end',
  // },
  // dropdownList: {
  //   backgroundColor: '#fff',
  //   borderTopLeftRadius: 16,
  //   borderTopRightRadius: 16,
  //   paddingBottom: 24,
  //   maxHeight: '60%',
  // },
  // dropdownListTitle: {
  //   textAlign: 'center',
  //   paddingVertical: 14,
  //   fontSize: 13,
  //   fontWeight: '700',
  //   color: '#444',
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#eee',
  // },
  // dropdownItem: {
  //   paddingVertical: 14,
  //   paddingHorizontal: 20,
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#f2f2f2',
  // },
  // dropdownItemActive: {
  //     dropdownItemPressed: {
  //       backgroundColor: '#f5f5f5',
  //     },
  //   backgroundColor: '#e8f0fe',
  // },
  // dropdownItemLabel: {
  //   fontSize: 14,
  //   color: '#222',
  // },
  // dropdownItemLabelActive: {
  //   fontWeight: '700',
  //   color: '#1a73e8',
  // },
  // dropdownItemHint: {
  //   fontSize: 11,
  //   color: '#999',
  //   marginTop: 2,
  // },
  settingsContainer: {
    // backgroundColor: 'green',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flex: 1,
    paddingTop: 4,
    paddingBottom: 4,
  },
  settingsStrip: {
    flexShrink: 0,
  },
  featurePanelHost: {
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  featurePanel: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderRadius: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    overflow: 'hidden',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  featurePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 4,
  },
  featurePanelTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  featurePanelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
  },
  featurePanelSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#6b7280',
  },
  featurePanelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
  },
  featureDoneButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4ff',
    borderWidth: 1,
    borderColor: '#d8e4ff',
  },
  inlineFeatureDoneButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INLINE_EDITOR_YELLOW,
    borderWidth: 0,
  },
  featurePanelScroll: {
    flex: 1,
  },
  featurePanelBody: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 2,
    gap: 6,
  },
  featureSection: {
    gap: 8,
  },
  featureSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  featureSectionHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  featureOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  featureOptionCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#f7f7f8',
    borderWidth: 1,
    borderColor: '#ececec',
    gap: 6,
  },
  featureOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  settingsGrid: {
    minHeight: '100%',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
  },
  settingsScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  settingsColumn: {
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    marginRight: 8,
  },
  settingsGridItem: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f4f4f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  settingsGridItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
  },
  settingsScrollbarTrack: {
    alignSelf: 'center',
    height: 14,
    borderRadius: 999,
    backgroundColor: '#ececec',
    justifyContent: 'center',
    paddingHorizontal: 3,
    overflow: 'hidden',
  },
  settingsScrollbarThumb: {
    backgroundColor: '#ffc107',
    position: 'absolute',
    left: 3,
    top: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  settingsScrollbarZone: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 4,
  },
  templatesZone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 2,
  },
  templatesButton: {
    minHeight: 40,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: '#f4f4f4',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templatesButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  fontStrip: {
    paddingVertical: 4,
    paddingRight: 6,
    gap: 10,
    alignItems: 'center',
  },
  fontChip: {
    minWidth: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f7f7f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontChipActive: {
    backgroundColor: '#e8f0fe',
    borderColor: '#1a73e8',
  },
  fontChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3f3f46',
  },
  fontChipTextActive: {
    color: '#1a73e8',
  },
  weightStrip: {
    paddingVertical: 4,
    paddingRight: 6,
    gap: 10,
    alignItems: 'center',
  },
  weightChip: {
    minWidth: 100,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f7f7f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightChipActive: {
    backgroundColor: '#e8f0fe',
    borderColor: '#1a73e8',
  },
  colorPickerWrap: {
    flex: 1,
    minHeight: 0,
    borderRadius: 18,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ececec',
  },
  colorPickerSurface: {
    width: '100%',
    marginBottom: 10,
    overflow: 'hidden',
  },
  colorPickerHueSlider: {
    width: '100%',
    height: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  templatesBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  templatesSheet: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  templatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templatesTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateCard: {
    width: '48%',
    borderRadius: 18,
  },
  templatePreview: {
    borderRadius: 18,
    backgroundColor: '#f3f3f3',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    minHeight: 120,
    padding: 14,
    justifyContent: 'flex-end',
  },
  templatePreviewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  exportBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exportSheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  exportDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
  },
  exportField: {
    marginBottom: 16,
    zIndex: 2,
  },
  exportFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    marginBottom: 8,
  },
  exportDropdown: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d7dbe2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
  },
  exportDropdownText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  exportMenu: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  exportMenuItem: {
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  exportMenuItemActive: {
    backgroundColor: '#e8f0fe',
  },
  exportMenuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  exportProgressWrap: {
    alignSelf: 'center',
    width: 112,
    height: 112,
    marginTop: 12,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportProgressCenter: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportProgressText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a73e8',
  },
  exportStatusText: {
    fontSize: 13,
    color: '#667085',
    textAlign: 'center',
    marginBottom: 18,
  },
  exportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  exportActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportCancelButton: {
    backgroundColor: '#eef2f7',
  },
  exportPrimaryButton: {
    backgroundColor: '#1a73e8',
  },
  exportActionDisabled: {
    opacity: 0.6,
  },
  exportCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#344054',
  },
  exportPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  textEditorModalContent: {
    maxHeight: '88%',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  textEditorScrollContent: {
    paddingBottom: 18,
    gap: 12,
  },
  boxPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    marginBottom: 8,
  },
  boxPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  boxPickerChipActive: {
    backgroundColor: '#e8f0fe',
    borderColor: '#1a73e8',
  },
  boxPickerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  boxPickerChipTextActive: {
    color: '#1a73e8',
  },
  boxPickerAddChip: {
    borderStyle: 'dashed',
  },
  boxPickerAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a73e8',
  },
  modalOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalOption: {
    alignItems: 'center',
    padding: 10,
  },
  modalOptionText: {
    fontSize: 14,
    marginTop: 5,
  },
  previewContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  sliderSection: {
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f7f7f8',
    borderWidth: 1,
    borderColor: '#ececec',
  },
  sliderLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  sliderLarge: {
    width: '100%',
    height: 38,
    marginVertical: 0,
  },
  sliderCompact: {
    width: '100%',
    height: 34,
    marginVertical: 0,
  },
  sliderPercentText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  textEditorActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  secondaryActionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#e8f0fe',
  },
  secondaryActionButtonNeutral: {
    backgroundColor: '#f3f4f6',
  },
  secondaryActionButtonDisabled: {
    opacity: 0.5,
  },
  secondaryActionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a73e8',
  },
  dangerActionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fde8e8',
  },
  dangerActionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#c62828',
  },
  inputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#222',
    backgroundColor: '#f9f9f9',
  },
  fontOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fontOptionActive: {
    backgroundColor: '#e8f0fe',
  },
  fontOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  fontOptionTextActive: {
    fontWeight: '600',
    color: '#1a73e8',
  },
  sizeOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  sizeOption: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  sizeOptionActive: {
    opacity: 1,
  },
  squarePreview: {
    width: 54,
    height: 54,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    marginBottom: 12,
  },
  squarePreviewActive: {
    borderColor: '#1a73e8',
    borderWidth: 3,
    backgroundColor: '#e8f0fe',
  },
  storyPreview: {
    width: 38,
    height: 66,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    marginBottom: 12,
  },
  storyPreviewActive: {
    borderColor: '#1a73e8',
    borderWidth: 3,
    backgroundColor: '#e8f0fe',
  },
  sizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
  },
  weightOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  weightOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 4,
    minWidth: '30%',
    alignItems: 'center',
  },
  weightOptionActive: {
    borderColor: '#1a73e8',
    backgroundColor: '#e8f0fe',
    borderWidth: 2,
  },
  weightOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  weightOptionTextActive: {
    color: '#1a73e8',
    fontWeight: '700',
  },
  alignmentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  positionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  positionColumn: {
    flex: 1,
    gap: 6,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f7f7f8',
    borderWidth: 1,
    borderColor: '#ececec',
  },
  alignButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  alignButtonActive: {
    borderColor: '#1a73e8',
    backgroundColor: '#e8f0fe',
    borderWidth: 2,
  },
  textInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  quoteTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
    backgroundColor: '#f9f9f9',
    minHeight: 110,
  },
  editCloseButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  editCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
})
