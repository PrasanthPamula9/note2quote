import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Modal, FlatList, Pressable, ScrollView, Alert, TextInput } from 'react-native';
import { Canvas, Rect, Image as SkiaImage, useImage, Paragraph, Skia, TextAlign, FontWeight, FontSlant } from '@shopify/react-native-skia';
import { Appbar, Icon } from 'react-native-paper'
import {listFontFamilies} from "@shopify/react-native-skia";
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import Slider from '@react-native-community/slider';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import ColorPickerComponent, { HueSlider, Panel1 } from 'reanimated-color-picker';
import { QuoteEditorConfig, CanvasPresetKey, QuoteTextBox } from '../../types/quotes';
// ─── Canvas size presets ─────────────────────────────────────────────────────
type CanvasPreset = {
  label: string;
  nativeWidth: number;
  nativeHeight: number;
  aspectRatio: number; // width / height
};

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
  const [selectedTextBoxId, setSelectedTextBoxId] = useState('');
  const selectedTextInputRef = useRef<TextInput>(null);
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
  }, [initialBackgroundImageUri, initialEditorConfig, initialQuoteText]);

  useEffect(() => {
    if (!modalVisible || currentFeature !== 'TextEdit') {
      return;
    }

    const handle = setTimeout(() => {
      selectedTextInputRef.current?.focus();
    }, 50);

    return () => clearTimeout(handle);
  }, [currentFeature, modalVisible, selectedTextBoxId]);

    const activePreset = CANVAS_PRESETS[activeCanvasKey];

  // Scale the preset down to fit within 90 % of screen width and 70 % of
  // screen height while preserving the preset's aspect ratio.
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const maxDisplayWidth = screenWidth * 0.9;
  // Use 55 % so the dropdown trigger always has room below the canvas
  const maxDisplayHeight = screenHeight * 0.55;

  const scaleByWidth = maxDisplayWidth;
  const scaleByHeight = maxDisplayHeight * activePreset.aspectRatio;
  const canvasWidth = Math.min(scaleByWidth, scaleByHeight);
  const canvasHeight = canvasWidth / activePreset.aspectRatio;
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
    name:"FontWeight",
    icon:<MaterialIcons name="format-line-weight" size={24}/>,
    label:"Weight"
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
        const boxHeight = (textBoxMetrics.find((metric) => metric.box.id === box.id)?.contentHeight ?? 0) / canvasHeight;
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
        const measuredHeight = (textBoxMetrics.find((metric) => metric.box.id === box.id)?.contentHeight ?? 0) / canvasHeight;
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
      ? (textBoxMetrics.find((metric) => metric.box.id === lastBox.id)?.contentHeight ?? 0) / canvasHeight
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

  const textBoxMetrics = useMemo(
    () =>
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
          canvasWidth * (box.width_percent ?? DEFAULT_TEXT_BOX_WIDTH) - TEXT_BOX_HORIZONTAL_PADDING * 2,
        );
        paragraph.layout(canvasTextWidth);

        return {
          box,
          paragraph,
          contentWidth: canvasTextWidth,
          contentHeight: Math.max(24, paragraph.getHeight()),
        };
      }),
    [textBoxes, fontSize, fontFamily, fontColor, fontShadow, fontWeight, textAlign, canvasWidth],
  );

  

  const HandleFeature = (featureName:string) => {
    console.log("clicked on feature", featureName)
        if (featureName === 'AddText') {
          addTextBox();
          setCurrentFeature('TextEdit');
          setModalVisible(true);
          return;
        }
        setCurrentFeature(featureName);
        setModalVisible(true);
    
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
    console.log("Opacity value changed:", value);
    setImageOpacity(value);
  }

  const renderModalContent = () => {
    switch(currentFeature) {
      case "BackgroundImage":
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.3 }]}>
              <Text style={styles.modalTitle}>Select Background Image Source</Text>
              <View style={styles.modalOptions}>
                <Pressable style={styles.modalOption} onPress={() => {
                  launchCamera({ mediaType: 'photo' }, (response) => {
                    if (response.assets && response.assets[0] && response.assets[0].uri) {
                      setBackgroundImageUri(response.assets[0].uri);
                      setModalVisible(false);
                    }
                  });
                }}>
                  <Icon source="camera" size={24} />
                  <Text style={styles.modalOptionText}>Camera</Text>
                </Pressable>
                <Pressable style={styles.modalOption} onPress={() => {
                  launchImageLibrary({ mediaType: 'photo' }, (response) => {
                    if (response.assets && response.assets[0] && response.assets[0].uri) {
                      setBackgroundImageUri(response.assets[0].uri);
                      setModalVisible(false);
                    }
                  });
                }}>
                  <Icon source="folder-image" size={24} />
                  <Text style={styles.modalOptionText}>Device</Text>
                </Pressable>
                <Pressable style={styles.modalOption} onPress={() => {
                  Alert.alert('Coming Soon', 'Unsplash integration is coming soon!');
                  setModalVisible(false);
                }}>
                  <Icon source="image-search" size={24} />
                  <Text style={styles.modalOptionText}>Unsplash</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        );
      case 'BackgroundColor':
      case 'FontColor':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.4 }]} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>
                {currentFeature === 'FontColor' ? 'Font Color' : 'Background Color'}
              </Text>
              <ColorPickerComponent
                value={currentFeature === 'FontColor' ? resolvedTextColor : bgColor}
                onCompleteJS={(color) => {
                  if (currentFeature === 'FontColor') {
                    setTextColor(color.hex);
                  } else {
                    setBgColor(color.hex);
                  }
                }}
              >
                <Panel1 style={{ borderRadius: 16 }} />
                <HueSlider style={{ marginTop: 16, borderRadius: 16 }} />
              </ColorPickerComponent>
            </View>
          </Pressable>
        )
      case 'ImageOpacity':
        return (
          
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.3 }]}>
              <Slider
                style={{width: 200, height: 40}}
                minimumValue={0}
                maximumValue={1}
                value={imageOpacity}
                minimumTrackTintColor="#FFFFFF"
                maximumTrackTintColor="#000000"
                onValueChange={(value) => HandleOpactyChange(value)}
                />
            </View>
          </Pressable>
        );
      case 'FontSize':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.3 }]}>
                  <Slider
                style={{width: 200, height: 40}}
                minimumValue={10}
                maximumValue={30}
                value={resolvedTextSize}
                minimumTrackTintColor="#FFFFFF"
                maximumTrackTintColor="#000000"
                onValueChange={(value) => setTextSize(value)}
                />
                </View>
          </Pressable>
        );
      case 'FontFamily':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.6 }]} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>Select Font</Text>
              <FlatList
                data={availableFonts}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setTextFamily(item);
                      setModalVisible(false);
                    }}
                    style={[styles.fontOption, resolvedTextFamily === item && styles.fontOptionActive]}
                  >
                    <Text style={[styles.fontOptionText, resolvedTextFamily === item && styles.fontOptionTextActive]} numberOfLines={1}>
                      {item}
                    </Text>
                    {resolvedTextFamily === item && <Icon source="check" size={20} color="#1a73e8" />}
                  </Pressable>
                )}
                scrollEnabled={true}
                nestedScrollEnabled={true}
              />
            </View>
          </Pressable>
        );
      case 'CanvasSize':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.4 }]}>
              <Text style={styles.modalTitle}>Quote Size</Text>
              <View style={styles.sizeOptionsContainer}>
                {/* Square Size */}
                <Pressable
                  onPress={() => {
                    setActiveCanvasKey('instagram_post_square');
                    setModalVisible(false);
                  }}
                  style={[styles.sizeOption, activeCanvasKey === 'instagram_post_square' && styles.sizeOptionActive]}
                >
                  <View style={[styles.squarePreview, activeCanvasKey === 'instagram_post_square' && styles.squarePreviewActive]} />
                  <Text style={styles.sizeLabel}>Square</Text>
                </Pressable>

                {/* Story Size */}
                <Pressable
                  onPress={() => {
                    setActiveCanvasKey('instagram_story');
                    setModalVisible(false);
                  }}
                  style={[styles.sizeOption, activeCanvasKey === 'instagram_story' && styles.sizeOptionActive]}
                >
                  <View style={[styles.storyPreview, activeCanvasKey === 'instagram_story' && styles.storyPreviewActive]} />
                  <Text style={styles.sizeLabel}>Story</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        );
      case 'FontShadow':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.3 }]}>
              <Text style={styles.modalTitle}>Shadow</Text>
              <View style={styles.sliderSection}>
                <Slider
                  style={styles.sliderLarge}
                  minimumValue={0}
                  maximumValue={10}
                  value={resolvedTextShadow}
                  minimumTrackTintColor="#1a73e8"
                  maximumTrackTintColor="#ddd"
                  onValueChange={(value) => setTextShadow(value)}
                />
                <Text style={styles.sliderPercentText}>{Math.round(resolvedTextShadow)}</Text>
              </View>
            </View>
          </Pressable>
        );
      case 'FontWeight':
        const fontWeights = [
          { label: 'Light', value: FontWeight.Thin },
          { label: 'Normal', value: FontWeight.Normal },
          { label: 'Medium', value: FontWeight.Bold },
          { label: 'SemiBold', value: FontWeight.Bold },
          { label: 'Bold', value: FontWeight.Bold },
          { label: 'ExtraBold', value: FontWeight.Bold },
        ];
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.5 }]}>
              <Text style={styles.modalTitle}>Font Weight</Text>
              <View style={styles.weightOptionsContainer}>
                {fontWeights.map((item, index) => (
                  <Pressable
                    key={index}
                    onPress={() => {
                      setTextWeight(item.value);
                      setModalVisible(false);
                    }}
                    style={[styles.weightOption, resolvedTextWeight === item.value && styles.weightOptionActive]}
                  >
                    <Text style={[styles.weightOptionText, resolvedTextWeight === item.value && styles.weightOptionTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        );
      case 'TextEdit':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <ScrollView
              style={[styles.modalContent, { maxHeight: screenHeight * 0.82 }]}
              contentContainerStyle={styles.textEditorScrollContent}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.modalTitle}>Edit Text Boxes</Text>

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
                multiline={true}
                value={selectedTextBox ? selectedTextBox.text : globalQuoteText}
                onChangeText={applyTextChange}
                textAlignVertical="top"
              />

              <View style={styles.sliderSection}>
                <Text style={styles.sliderLabelText}>Box Width</Text>
                <Slider
                  style={styles.sliderLarge}
                  minimumValue={0.15}
                  maximumValue={0.85}
                  value={selectedTextBox?.width_percent ?? textBoxes[0]?.width_percent ?? DEFAULT_TEXT_BOX_WIDTH}
                  minimumTrackTintColor="#1a73e8"
                  maximumTrackTintColor="#ddd"
                  onValueChange={(value) => {
                    if (selectedTextBox) {
                      updateTextBox(selectedTextBox.id, { width_percent: value });
                      return;
                    }

                    updateAllTextBoxes({ width_percent: value });
                  }}
                />
                <Text style={styles.sliderPercentText}>{Math.round((selectedTextBox?.width_percent ?? textBoxes[0]?.width_percent ?? DEFAULT_TEXT_BOX_WIDTH) * 100)}%</Text>
              </View>

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

              <Pressable onPress={() => setModalVisible(false)} style={styles.editCloseButton}>
                <Text style={styles.editCloseButtonText}>Done</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        );
      case 'TextPosition':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.35 }]}>
              <Text style={styles.modalTitle}>Text Position</Text>
              <View style={styles.sliderSection}>
                <Text style={styles.sliderLabelText}>X Position</Text>
                <Slider
                  style={styles.sliderLarge}
                  minimumValue={0}
                  maximumValue={1}
                  value={selectedTextBox ? selectedTextBox.x_percent : textXPercent}
                  minimumTrackTintColor="#1a73e8"
                  maximumTrackTintColor="#ddd"
                  onValueChange={setTextX}
                />
                <Text style={styles.sliderPercentText}>{Math.round((selectedTextBox ? selectedTextBox.x_percent : textXPercent) * 100)}%</Text>
              </View>

              <View style={styles.sliderSection}>
                <Text style={styles.sliderLabelText}>Y Position</Text>
                <Slider
                  style={styles.sliderLarge}
                  minimumValue={0}
                  maximumValue={1}
                  value={selectedTextBox ? selectedTextBox.y_percent : textYPercent}
                  minimumTrackTintColor="#1a73e8"
                  maximumTrackTintColor="#ddd"
                  onValueChange={setTextY}
                />
                <Text style={styles.sliderPercentText}>{Math.round((selectedTextBox ? selectedTextBox.y_percent : textYPercent) * 100)}%</Text>
              </View>
            </View>
          </Pressable>
        );
        
                
      default:
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.3 }]}>
              <Text style={styles.modalTitle}>Default Modal Content</Text>
            </View>
          </Pressable>
        );
    }
  };


  return (
    <>
    <View style={styles.container}>
      <Appbar.Header>
        {onBack ? <Appbar.BackAction onPress={onBack} /> : null}
        <Appbar.Content title={title} />
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
        {onSave ? (
          <Appbar.Action
            icon="content-save-outline"
            onPress={() => {
              onSave({
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
              });
            }}
          />
        ) : null}
      </Appbar.Header>

      <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
        <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} color={bgColor} />
          {image && (
            <SkiaImage
              image={image}
              //make control for opacity and fit in the future
              opacity={imageOpacity}
              fit="cover"
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
            />
          )}
          {textBoxes.map((box, index) => {
            const metric = textBoxMetrics[index];
            const paragraph = metric?.paragraph;
            const boxWidth = Math.max(24, canvasWidth * (box.width_percent ?? DEFAULT_TEXT_BOX_WIDTH));
            const boxHeight = Math.max(
              24,
              (metric?.contentHeight ?? 0) + TEXT_BOX_VERTICAL_PADDING * 2,
            );
            const x = canvasWidth * box.x_percent;
            const y = canvasHeight * box.y_percent;

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
        </Canvas>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={clearTextFocus} />
          {textBoxes.map((box) => {
            const isSelected = box.id === selectedTextBoxId;
            const metric = textBoxMetrics.find((item) => item.box.id === box.id);
            const boxWidth = Math.max(24, canvasWidth * (box.width_percent ?? DEFAULT_TEXT_BOX_WIDTH));
            const boxHeight = Math.max(24, (metric?.contentHeight ?? 0) + TEXT_BOX_VERTICAL_PADDING * 2);
            const x = canvasWidth * box.x_percent;
            const y = canvasHeight * box.y_percent;

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
        <View style={styles.settingsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={styles.settingsScrollContent}
          >
            <View style={styles.settingsGrid}>
              {/* {Array.from({ length: 20 }, (_, index) => (
                <View key={`setting-item-${index}`} style={styles.settingsGridItem}>
                  <Text style={styles.settingsGridItemText}>{index + 1}</Text>

                </View>
              ))} */}
              {FeaturesArray.map((feature, index) => (
                <View key={`feature-item-${index}`} style={styles.settingsGridItem} onTouchEnd={() => HandleFeature(feature.name)}>
                  {/* <Icon source={feature.icon} size={24} /> */}
                  {/* <MaterialIcons name={feature.icon} size={24}/> */}
                  {feature.icon}

                  <Text style={styles.settingsGridItemText}>{feature.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
    </View>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        
        onRequestClose={() => setModalVisible(false)}
      >
        {renderModalContent()}
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    //  backgroundColor: 'red'

  },
  canvas: {
    marginTop: 12,
    marginLeft: '5%',
    marginRight: '5%',
    position: 'relative',
    overflow: 'hidden',
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
    height: '20%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flex:1
  },
  settingsGrid: {
    height: '100%',
    flexDirection: 'column',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  settingsScrollContent: {
    // paddingHorizontal: 4,
  },
  settingsGridItem: {
    width: 72,
    height: '50%',
   
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  settingsGridItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  textEditorScrollContent: {
    paddingBottom: 24,
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
    marginVertical: 20,
    marginHorizontal: 10,
  },
  sliderLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 12,
  },
  sliderLarge: {
    width: '100%',
    height: 50,
    marginVertical: 0,
  },
  sliderPercentText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  textEditorActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
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
    marginTop: 24,
    paddingHorizontal: 20,
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
    width: 60,
    height: 60,
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
    width: 40,
    height: 70,
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
    marginVertical: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    marginBottom: 8,
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
    minHeight: 120,
    marginBottom: 16,
  },
  editCloseButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  editCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
})
