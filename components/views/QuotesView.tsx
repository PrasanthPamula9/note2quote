import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Modal, FlatList, Pressable, ScrollView, Alert, TextInput, Platform, PermissionsAndroid, Image, ImageBackground, ActivityIndicator, Animated, Easing, Linking } from 'react-native';
import { Canvas, Rect, Path, Image as SkiaImage, Group, Picture, useImage, Paragraph, Skia, TextAlign, FontWeight, FontSlant, useCanvasRef, ImageFormat, fitbox } from '@shopify/react-native-skia';
import { Appbar, Icon } from 'react-native-paper'
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import Slider from '@react-native-community/slider';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import ColorPickerComponent, { HueSlider, Panel1 } from 'reanimated-color-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QuoteExportView from './QuoteExportView';
import UnsplashImagePickerModal from './UnsplashImagePickerModal';
import { QuoteEditorConfig, CanvasPresetKey, QuoteTemplate, QuoteTextBox, UnsplashImageAttribution } from '../../types/quotes';
import { DEFAULT_FONT_FAMILY, QUOTE_FONT_CATALOG, type FontCatalogEntry } from '../../utils/fontCatalog';
import { BUNDLED_FONT_FAMILIES, type BundledFontFamily } from '../../utils/bundledFonts';
import { useBundledFontProvider } from '../../contexts/BundledFontProviderContext';
import {
  BACKGROUND_QUOTE_TEMPLATES,
  DEFAULT_EDITOR_CONFIG,
  DEFAULT_QUOTE_TEXT,
  DEFAULT_TEXT_BOX_HEIGHT,
  DEFAULT_TEXT_BOX_VERTICAL_GAP,
  DEFAULT_TEXT_BOX_WIDTH,
  CANVAS_SIZE_OPTIONS,
  COLOR_QUOTE_TEMPLATES,
  MAX_TEXT_BOXES,
  clampDeltaValue,
  clampPercentValue,
  createTextBox,
  normalizeCropRotation,
  normalizeTextBoxes,
  quoteTemplateToEditorConfig,
} from '../../utils/quoteConfig';
import { getUnsplashPhotoSourceUrl, trackUnsplashDownload, type UnsplashPhoto, type UnsplashSearchOrientation } from '../../utils/unsplash';
const INLINE_EDITOR_YELLOW = '#ffc107';
const INLINE_EDITOR_DARK = '#433e3e';
// ─── Canvas size presets ─────────────────────────────────────────────────────
type CropRotation = 0 | 90 | 180 | 270;

type CanvasPreset = {
  label: string;
  nativeWidth: number;
  nativeHeight: number;
  aspectRatio: number; // width / height
};

type ExportFormat = 'png' | 'jpeg' | 'jpg';

type QuoteSavePayload = QuoteEditorConfig & {
  preview_image_base64?: string | null;
};

type PendingCropImage = {
  uri: string;
  width: number;
  height: number;
  label: string;
  source?: 'camera' | 'device' | 'unsplash';
  isNewSelection?: boolean;
  unsplashAttribution?: UnsplashImageAttribution | null;
};

type BackgroundImageCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: CropRotation;
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
};

const TEXT_BOX_HORIZONTAL_PADDING = 12;
const TEXT_BOX_VERTICAL_PADDING = 10;
const FONT_PREVIEW_WIDTH = 42;
const FONT_PREVIEW_HEIGHT = 24;
const FONT_CHIP_WIDTH = 108;
const FONT_CHIP_SPACING = 10;
const FONT_PREVIEW_CACHE = new Map<string, string>();

const LoadingQuoteEditor = React.memo(function LoadingQuoteEditor() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const dotStyle = {
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 1],
    }),
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1.1],
        }),
      },
    ],
  } as const;

  return (
    <View style={styles.loadingScreen}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#ffc107" />
        <Animated.View style={[styles.loadingDot, dotStyle]} />
        <Text style={styles.loadingTitle}>Preparing quote editor</Text>
        <Text style={styles.loadingSubtitle}>Loading bundled fonts and previews...</Text>
      </View>
    </View>
  );
});

const getNextCropRotation = (rotation: CropRotation): CropRotation => {
  switch (rotation) {
    case 0:
      return 90;
    case 90:
      return 180;
    case 180:
      return 270;
    default:
      return 0;
  }
};

const resolveCropRect = (
  sourceWidth: number,
  sourceHeight: number,
  aspectRatio: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
  rotation: CropRotation,
) => {
  const targetAspectRatio = rotation === 90 || rotation === 270 ? 1 / aspectRatio : aspectRatio;
  const imageAspectRatio = sourceWidth / sourceHeight;
  const baseCropWidth =
    imageAspectRatio > targetAspectRatio ? sourceHeight * targetAspectRatio : sourceWidth;
  const baseCropHeight =
    imageAspectRatio > targetAspectRatio ? sourceHeight : sourceWidth / targetAspectRatio;

  const cropWidth = Math.max(1, Math.round(baseCropWidth / zoom));
  const cropHeight = Math.max(1, Math.round(baseCropHeight / zoom));
  const maxCropX = Math.max(0, sourceWidth - cropWidth);
  const maxCropY = Math.max(0, sourceHeight - cropHeight);

  return {
    x: Math.max(0, Math.min(maxCropX, Math.round(maxCropX * offsetX))),
    y: Math.max(0, Math.min(maxCropY, Math.round(maxCropY * offsetY))),
    width: cropWidth,
    height: cropHeight,
    rotation,
  };
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
  fontOptions: Array<FontCatalogEntry & { available: boolean }>;
  fontProvider: ReturnType<typeof Skia.TypefaceFontProvider.Make> | null;
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
  onRequestImageCrop: (image: PendingCropImage) => void;
  onImageOpacityChange: (value: number) => void;
  onTextPositionXChange: (value: number) => void;
  onTextPositionYChange: (value: number) => void;
  onUnsplashPress: () => void;
};

const FontPreviewSample = React.memo(function FontPreviewSample({
  family,
  provider,
}: {
  family: string;
  provider: ReturnType<typeof Skia.TypefaceFontProvider.Make> | null;
}) {
  const [previewUri, setPreviewUri] = useState<string | null>(FONT_PREVIEW_CACHE.get(family) ?? null);

  useEffect(() => {
    const cached = FONT_PREVIEW_CACHE.get(family);
    if (cached) {
      setPreviewUri(cached);
      return;
    }

    if (!provider) {
      return;
    }

    const surface = Skia.Surface.MakeOffscreen(FONT_PREVIEW_WIDTH, FONT_PREVIEW_HEIGHT);
    if (!surface) {
      return;
    }

    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('transparent'));

    const typeface = provider.matchFamilyStyle(family, {
      weight: FontWeight.Normal,
      width: 5,
      slant: FontSlant.Upright,
    });
    const font = Skia.Font(typeface, 18);
    const paint = Skia.Paint();
    paint.setColor(Skia.Color('#111111'));
    paint.setAntiAlias(true);

    const metrics = font.getMetrics();
    const textWidth = font.measureText('Aa').width;
    const baseline = (FONT_PREVIEW_HEIGHT - (metrics.descent - metrics.ascent)) / 2 - metrics.ascent;
    const x = Math.max(0, Math.round((FONT_PREVIEW_WIDTH - textWidth) / 2));
    canvas.drawText('Aa', x, baseline, paint, font);
    surface.flush();

    const snapshot = surface.makeImageSnapshot();
    const base64 = snapshot.encodeToBase64(ImageFormat.PNG);
    const uri = `data:image/png;base64,${base64}`;
    FONT_PREVIEW_CACHE.set(family, uri);
    setPreviewUri(uri);
  }, [family, provider]);

  return (
    previewUri ? (
      <Image source={{ uri: previewUri }} style={styles.fontPreviewImage} />
    ) : (
      <View style={styles.fontPreviewFallback}>
        <Text style={styles.fontPreviewFallbackText}>Aa</Text>
      </View>
    )
  );
});

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
      <View style={styles.featurePanelBody}>
        <View style={styles.featurePanelBodyContent}>{children}</View>
      </View>
    </View>
  );
});

const ImageCropModal = React.memo(function ImageCropModal({
  visible,
  image,
  aspectRatio,
  zoom,
  offsetX,
  offsetY,
  rotation,
  onZoomChange,
  onOffsetXChange,
  onOffsetYChange,
  onRotate,
  onCancel,
  onConfirm,
  saving,
}: {
  visible: boolean;
  image: PendingCropImage | null;
  aspectRatio: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: CropRotation;
  onZoomChange: (value: number) => void;
  onOffsetXChange: (value: number) => void;
  onOffsetYChange: (value: number) => void;
  onRotate: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  if (!visible || !image) {
    return null;
  }

  const previewWidth = Math.min(screenWidth - 32, 420);
  const previewHeight = Math.min(screenHeight * 0.42, 420);
  const rotatedImageWidth = rotation === 90 || rotation === 270 ? image.height : image.width;
  const rotatedImageHeight = rotation === 90 || rotation === 270 ? image.width : image.height;
  const baseImageScale = Math.min(previewWidth / rotatedImageWidth, previewHeight / rotatedImageHeight);
  const imageDisplayWidth = rotatedImageWidth * baseImageScale * zoom;
  const imageDisplayHeight = rotatedImageHeight * baseImageScale * zoom;
  const imageDisplayLeft = (previewWidth - imageDisplayWidth) / 2;
  const imageDisplayTop = (previewHeight - imageDisplayHeight) / 2;
  const rotatedAspectRatio = rotatedImageWidth / rotatedImageHeight;
  const cropBoxWidth =
    rotatedAspectRatio > aspectRatio ? rotatedImageHeight * baseImageScale * aspectRatio : rotatedImageWidth * baseImageScale;
  const cropBoxHeight =
    rotatedAspectRatio > aspectRatio ? rotatedImageHeight * baseImageScale : rotatedImageWidth * baseImageScale / aspectRatio;
  const cropBoxLeft = (previewWidth - cropBoxWidth) / 2;
  const cropBoxTop = (previewHeight - cropBoxHeight) / 2;
  const maxTranslateX = Math.max(0, (imageDisplayWidth - cropBoxWidth) / 2);
  const maxTranslateY = Math.max(0, (imageDisplayHeight - cropBoxHeight) / 2);
  const previewTranslateX = (0.5 - offsetX) * maxTranslateX * 2;
  const previewTranslateY = (0.5 - offsetY) * maxTranslateY * 2;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.cropBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.cropSheet}>
          <View style={styles.cropHeader}>
            <View style={styles.cropTitleWrap}>
              <Text style={styles.cropTitle}>Crop Image</Text>
              <Text style={styles.cropSubtitle}>{image.label}</Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={10} style={styles.cropCloseButton}>
              <MaterialIcons name="close" size={20} color="#433e3e" />
            </Pressable>
          </View>

          <View style={[styles.cropPreviewFrame, { width: previewWidth, height: previewHeight }]}>
            <ImageBackground
              source={{ uri: image.uri }}
              style={[
                {
                  position: 'absolute',
                  left: imageDisplayLeft,
                  top: imageDisplayTop,
                  width: imageDisplayWidth,
                  height: imageDisplayHeight,
                },
                {
                  transform: [
                    { translateX: previewTranslateX },
                    { translateY: previewTranslateY },
                    { rotate: `${rotation}deg` },
                  ],
                },
              ]}
              imageStyle={styles.cropPreviewFallbackImage}
            />
            <View style={[styles.cropPreviewMask, { top: 0, left: 0, right: 0, height: cropBoxTop }]} pointerEvents="none" />
            <View
              style={[
                styles.cropPreviewMask,
                {
                  top: cropBoxTop,
                  left: 0,
                  width: cropBoxLeft,
                  height: cropBoxHeight,
                },
              ]}
              pointerEvents="none"
            />
            <View
              style={[
                styles.cropPreviewMask,
                {
                  top: cropBoxTop,
                  right: 0,
                  width: cropBoxLeft,
                  height: cropBoxHeight,
                },
              ]}
              pointerEvents="none"
            />
            <View
              style={[
                styles.cropPreviewMask,
                {
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: cropBoxTop,
                },
              ]}
              pointerEvents="none"
            />
            <View
              style={[
                styles.cropPreviewBorder,
                {
                  left: cropBoxLeft,
                  top: cropBoxTop,
                  width: cropBoxWidth,
                  height: cropBoxHeight,
                },
              ]}
              pointerEvents="none"
            />
          </View>

          <View style={styles.cropControlGroup}>
            <Text style={styles.cropControlLabel}>Zoom</Text>
            <Slider
              style={styles.sliderLarge}
              minimumValue={1}
              maximumValue={3}
              step={0.01}
              value={zoom}
              minimumTrackTintColor="#ffc107"
              maximumTrackTintColor="#433e3e"
              thumbTintColor="#ffc107"
              onValueChange={onZoomChange}
            />
          </View>

          <View style={styles.cropControlRow}>
            <View style={styles.cropControlHalf}>
              <Text style={styles.cropControlLabel}>X</Text>
              <Slider
                style={styles.sliderCompact}
                minimumValue={0}
                maximumValue={1}
                step={0.01}
                value={offsetX}
                minimumTrackTintColor="#ffc107"
                maximumTrackTintColor="#433e3e"
                thumbTintColor="#ffc107"
                onValueChange={onOffsetXChange}
              />
            </View>
            <View style={styles.cropControlHalf}>
              <Text style={styles.cropControlLabel}>Y</Text>
              <Slider
                style={styles.sliderCompact}
                minimumValue={0}
                maximumValue={1}
                step={0.01}
                value={offsetY}
                minimumTrackTintColor="#ffc107"
                maximumTrackTintColor="#433e3e"
                thumbTintColor="#ffc107"
                onValueChange={onOffsetYChange}
              />
            </View>
          </View>

          <View style={styles.cropActionsRow}>
            <Pressable style={[styles.cropActionButton, styles.cropActionSecondary]} onPress={onCancel}>
              <Text style={styles.cropActionSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.cropActionButton, styles.cropActionRotate]} onPress={onRotate}>
              <MaterialIcons name="rotate-right" size={20} color="#433e3e" />
              <Text style={styles.cropActionRotateText}>Rotate</Text>
            </Pressable>
            <Pressable style={[styles.cropActionButton, styles.cropActionPrimary]} onPress={onConfirm} disabled={saving}>
              <Text style={styles.cropActionPrimaryText}>Save & Crop</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const InlineFeaturePanel = React.memo(function InlineFeaturePanel({
  feature,
  activeCanvasKey,
  fontOptions,
  fontProvider,
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
  onRequestImageCrop,
  onImageOpacityChange,
  onTextPositionXChange,
  onTextPositionYChange,
  onUnsplashPress,
}: InlineFeaturePanelProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const fontStripRef = useRef<FlatList<(typeof fontOptions)[number]> | null>(null);
  const fontStripFade = useRef(new Animated.Value(feature === 'FontFamily' ? 0 : 1)).current;
  const [draftColor, setDraftColor] = useState(feature === 'FontColor' ? fontColor : bgColor);
  const [draftOpacity, setDraftOpacity] = useState(imageOpacity);
  const [draftFontSize, setDraftFontSize] = useState(fontSize);
  const [draftFontShadow, setDraftFontShadow] = useState(fontShadow);
  const [draftBoxWidth, setDraftBoxWidth] = useState(boxWidth);
  const [draftX, setDraftX] = useState(globalPositionX);
  const [draftY, setDraftY] = useState(globalPositionY);
  const inlinePickerWidth = Math.max(
    260,
    Math.min(screenWidth - 32, screenWidth >= 768 ? 460 : screenWidth <= 390 ? 320 : 390),
  );
  const hueSliderHeight = Math.max(12, Math.min(18, Math.round(inlinePickerWidth * 0.045)));
  const inlinePickerSurfaceHeight = Math.max(
    64,
    Math.round(inlinePickerHeight * (screenWidth >= 768 ? 0.84 : 0.8)),
  );
  const inlinePickerHueHeight = Math.max(
    12,
    Math.min(18, Math.round(screenWidth * (screenWidth >= 768 ? 0.022 : 0.028))),
  );
  const inlinePickerGap = Math.max(6, Math.round(screenHeight * (screenWidth >= 768 ? 0.006 : 0.008)));
  const resolvedFontIndex = Math.max(
    0,
    fontOptions.findIndex((item) => item.family === resolvedTextFamily),
  );

  useEffect(() => {
    setDraftColor(feature === 'FontColor' ? fontColor : bgColor);
    setDraftOpacity(imageOpacity);
    setDraftFontSize(fontSize);
    setDraftFontShadow(fontShadow);
    setDraftBoxWidth(boxWidth);
    setDraftX(globalPositionX);
    setDraftY(globalPositionY);
  }, [feature]);

  useEffect(() => {
    if (feature !== 'FontFamily' || fontOptions.length === 0) {
      fontStripFade.setValue(1);
      return;
    }

    fontStripFade.setValue(0);

    const animationFrame = requestAnimationFrame(() => {
      fontStripRef.current?.scrollToIndex({
        index: resolvedFontIndex,
        animated: true,
        viewPosition: 0.5,
      });

      Animated.timing(fontStripFade, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [feature, fontOptions, resolvedFontIndex, fontStripFade]);

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
                  const asset = response.assets?.[0];
                  if (asset?.uri) {
                    onRequestImageCrop({
                      uri: asset.uri,
                      width: asset.width ?? 0,
                      height: asset.height ?? 0,
                      label: 'Camera',
                      source: 'camera',
                      isNewSelection: true,
                    });
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
                  const asset = response.assets?.[0];
                  if (asset?.uri) {
                    onRequestImageCrop({
                      uri: asset.uri,
                      width: asset.width ?? 0,
                      height: asset.height ?? 0,
                      label: 'Device',
                      source: 'device',
                      isNewSelection: true,
                    });
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
                onUnsplashPress();
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
          <View style={[styles.colorPickerWrap, { width: inlinePickerWidth, alignSelf: 'center' }]}>
            <ColorPickerComponent
              style={styles.colorPickerRoot}
              value={draftColor}
              sliderThickness={hueSliderHeight}
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
              <View style={styles.colorPickerStage}>
                <View style={[styles.colorPickerSurfaceWrap, { height: inlinePickerSurfaceHeight }]}>
                  <Panel1
                    style={[styles.colorPickerSurface, { borderRadius: 14 }]}
                    boundedThumb
                    thumbShape="circle"
                    thumbSize={14}
                    thumbColor={INLINE_EDITOR_YELLOW}
                  />
                </View>
                <View style={[styles.colorPickerHueWrap, { marginTop: inlinePickerGap }]}>
                  <HueSlider
                    style={[styles.colorPickerHueSlider, { height: inlinePickerHueHeight }]}
                    sliderThickness={inlinePickerHueHeight}
                    thumbShape="circle"
                    thumbSize={14}
                    thumbColor={INLINE_EDITOR_YELLOW}
                    boundedThumb
                  />
                </View>
              </View>
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
          <Animated.View style={{ opacity: fontStripFade }}>
            <FlatList
              ref={fontStripRef}
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              data={fontOptions}
              keyExtractor={(item) => item.family}
              contentContainerStyle={styles.fontStrip}
              getItemLayout={(_, index) => ({
                length: FONT_CHIP_WIDTH + FONT_CHIP_SPACING,
                offset: (FONT_CHIP_WIDTH + FONT_CHIP_SPACING) * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                const offset = (FONT_CHIP_WIDTH + FONT_CHIP_SPACING) * info.index;
                fontStripRef.current?.scrollToOffset({ offset, animated: true });
                setTimeout(() => {
                  fontStripRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0.5,
                  });
                }, 50);
              }}
              renderItem={({ item }) => {
                const isActive = resolvedTextFamily === item.family;
                return (
                  <Pressable
                    onPress={() => {
                      onFontFamilyChange(item.family);
                    }}
                    style={[
                      styles.fontChip,
                      isActive && styles.fontChipActive,
                    ]}
                  >
                    <View style={styles.fontChipPreviewWrap}>
                      <FontPreviewSample family={item.family} provider={fontProvider} />
                    </View>
                  </Pressable>
                );
              }}
            />
          </Animated.View>
        </InlineFeatureShell>
      );
    case 'CanvasSize':
      return (
        <InlineFeatureShell onClose={commitAndClose}>
          <View style={styles.sizeOptionsContainer}>
            {CANVAS_SIZE_OPTIONS.map((option) => {
              const preview = CANVAS_PRESETS[option.key];
              return (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    onCanvasKeyChange(option.key);
                    onClose();
                  }}
                  style={[styles.sizeOption, activeCanvasKey === option.key && styles.sizeOptionActive]}
                >
                  <View
                    style={[
                      styles.sizePreviewBase,
                      { aspectRatio: preview.aspectRatio },
                      activeCanvasKey === option.key && styles.sizePreviewActive,
                    ]}
                  />
                  <Text style={styles.sizeLabel}>{option.label}</Text>
                </Pressable>
              );
            })}
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
  onSave?: (quote: QuoteSavePayload) => void | Promise<void>;
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
  const [backgroundImageSource, setBackgroundImageSource] = useState<'camera' | 'device' | 'unsplash' | null>(
    initialEditorConfig?.background_image_source ?? (initialEditorConfig?.unsplash_attribution ? 'unsplash' : null),
  );
  const [backgroundImageAttribution, setBackgroundImageAttribution] = useState<UnsplashImageAttribution | null>(
    initialEditorConfig?.unsplash_attribution ?? null,
  );
  const [backgroundImageCrop, setBackgroundImageCrop] = useState<BackgroundImageCrop | null>(
    initialEditorConfig?.background_image_crop ?? DEFAULT_EDITOR_CONFIG.background_image_crop,
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
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [unsplashModalVisible, setUnsplashModalVisible] = useState(false);
  const [pendingCropImage, setPendingCropImage] = useState<PendingCropImage | null>(null);
  const [pendingCanvasKey, setPendingCanvasKey] = useState<CanvasPresetKey | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0.5);
  const [cropOffsetY, setCropOffsetY] = useState(0.5);
  const [cropRotation, setCropRotation] = useState<CropRotation>(0);
  const [croppingImage, setCroppingImage] = useState(false);
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
  const previewCanvasRef = useCanvasRef();
  const [selectedTextBoxId, setSelectedTextBoxId] = useState('');
  const selectedTextInputRef = useRef<TextInput>(null);
  const lastTextBoxTapRef = useRef<{ boxId: string; timestamp: number } | null>(null);
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
  const fontProvider = useBundledFontProvider();
  const insets = useSafeAreaInsets();
  const previewSnapshotScale = 0.4;
  const availableFontSet = useMemo(
    () => new Set<BundledFontFamily>(fontProvider ? BUNDLED_FONT_FAMILIES : []),
    [fontProvider],
  );
  const fontOptions = useMemo(
    () =>
      QUOTE_FONT_CATALOG.map((font) => ({
        ...font,
        available: availableFontSet.has(font.family as BundledFontFamily),
      })),
    [availableFontSet],
  );
  const resolveFontFamilyForRender = (family?: string | null) => {
    if (!family) {
      return DEFAULT_FONT_FAMILY;
    }
    return availableFontSet.has(family as BundledFontFamily) ? family : DEFAULT_FONT_FAMILY;
  };
  useEffect(() => {
    const config = initialEditorConfig ?? DEFAULT_EDITOR_CONFIG;
    setActiveCanvasKey(config.activeCanvasKey);
    setBackgroundImageUri(config.background_image_uri ?? initialBackgroundImageUri ?? null);
    setBackgroundImageCrop(config.background_image_crop ?? null);
    setBackgroundImageSource(config.background_image_source ?? (config.unsplash_attribution ? 'unsplash' : null));
    setBackgroundImageAttribution(config.unsplash_attribution ?? null);
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
    if (!backgroundImageUri) {
      setBackgroundImageCrop(null);
      setBackgroundImageSource(null);
      setBackgroundImageAttribution(null);
    }
  }, [backgroundImageUri]);

  useEffect(() => {
    if (currentFeature !== 'TextEdit') {
      return;
    }

    if (!selectedTextBoxId) {
      selectedTextInputRef.current?.blur();
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
  const isNarrowPhone = screenWidth <= 390 && screenHeight <= 860;
  const bottomInset = Math.max(insets.bottom, 8);
  const horizontalInset = isTablet ? 24 : 16;
  const headerReserve = isTablet ? 92 : 112;
  const maxDisplayWidth = Math.min(screenWidth - horizontalInset * 2, screenWidth * 0.9, 900);
  const bottomReserve = bottomInset + (isTablet ? 12 : isNarrowPhone ? 24 : 18);
  const settingsPanelHeight = Math.max(
    isTablet ? 220 : 200,
    Math.min(screenHeight * (isNarrowPhone ? 0.32 : 0.28), screenHeight - headerReserve - bottomReserve - 24),
  );
  const maxDisplayHeight = Math.min(
    screenHeight * (isTablet ? 0.56 : 0.44),
    screenHeight - headerReserve - settingsPanelHeight - bottomReserve - 24,
  );
  const nativeCanvasWidth = activePreset.nativeWidth;
  const nativeCanvasHeight = activePreset.nativeHeight;
  const previewScale = Math.min(
    maxDisplayWidth / nativeCanvasWidth,
    maxDisplayHeight / nativeCanvasHeight,
  );
  const previewSnapshotWidth = Math.max(1, Math.round(nativeCanvasWidth * previewSnapshotScale));
  const previewSnapshotHeight = Math.max(1, Math.round(nativeCanvasHeight * previewSnapshotScale));

  const canvasWidth = nativeCanvasWidth * previewScale;
  const canvasHeight = nativeCanvasHeight * previewScale;
  const featureTileWidth = Math.floor((screenWidth - horizontalInset * 2 - 16) / 5);
  const settingsTileWidth = Math.max(64, Math.min(isTablet ? 96 : 84, featureTileWidth));
  const settingsTileHeight = isTablet ? 96 : 88;
  const settingsStripHeight = settingsTileHeight * 2 + 16;
  const scrollbarTrackWidth = Math.max(40, Math.floor((settingsTileWidth / 2) * 0.7));
  const scrollbarThumbSize = 8;
  const inlinePickerHeight = Math.max(
    88,
    Math.round(
      Math.min(
        settingsPanelHeight * (isTablet ? 0.68 : isNarrowPhone ? 0.58 : 0.64),
        screenHeight * (isTablet ? 0.24 : isNarrowPhone ? 0.2 : 0.22),
        (screenWidth - horizontalInset * 2 - 20) * (isTablet ? 0.42 : 0.46),
      ),
    ),
  );
  const settingsContainerPaddingBottom = bottomInset + (isNarrowPhone ? 10 : 4);
  const templatesZonePaddingBottom = bottomInset + (isNarrowPhone ? 12 : 6);
  const settingsContainerPaddingTop = currentFeature && currentFeature !== 'TextEdit' ? 0 : 4;
  const settingsContainerPaddingBottomValue =
    currentFeature && currentFeature !== 'TextEdit' ? 0 : settingsContainerPaddingBottom;
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
  const featureColumns: typeof FeaturesArray[] = [];
  for (let i = 0; i < FeaturesArray.length; i += 2) {
    featureColumns.push(FeaturesArray.slice(i, i + 2));
  }
  const image = useImage(backgroundImageUri ?? undefined);

  const backgroundImageCropRect = useMemo(() => {
    if (!image || !backgroundImageCrop) {
      return null;
    }

    const sourceWidth = image.width();
    const sourceHeight = image.height();
    const cropWidth = Math.max(1, Math.min(sourceWidth, Math.round(backgroundImageCrop.width)));
    const cropHeight = Math.max(1, Math.min(sourceHeight, Math.round(backgroundImageCrop.height)));
    const maxCropX = Math.max(0, sourceWidth - cropWidth);
    const maxCropY = Math.max(0, sourceHeight - cropHeight);
    const rotation = normalizeCropRotation(backgroundImageCrop.rotation);

    return {
      x: clampPercentValue(Math.round(backgroundImageCrop.x), 0, maxCropX),
      y: clampPercentValue(Math.round(backgroundImageCrop.y), 0, maxCropY),
      width: cropWidth,
      height: cropHeight,
      rotation,
    };
  }, [backgroundImageCrop, image]);

  const backgroundPicture = useMemo(() => {
    if (!image) {
      return null;
    }

    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, nativeCanvasWidth, nativeCanvasHeight));
    const paint = Skia.Paint();
    paint.setAlphaf(imageOpacity);
    paint.setAntiAlias(true);

    const baseSourceRect = backgroundImageCropRect
      ? {
        x: backgroundImageCropRect.x,
        y: backgroundImageCropRect.y,
        width: backgroundImageCropRect.width,
        height: backgroundImageCropRect.height,
      }
      : {
        x: 0,
        y: 0,
        width: image.width(),
        height: image.height(),
      };
    const destinationRect = Skia.XYWHRect(0, 0, nativeCanvasWidth, nativeCanvasHeight);

    canvas.save();
    if (backgroundImageCropRect?.rotation) {
      canvas.rotate(backgroundImageCropRect.rotation, nativeCanvasWidth / 2, nativeCanvasHeight / 2);
      canvas.drawImageRect(
        image,
        Skia.XYWHRect(baseSourceRect.x, baseSourceRect.y, baseSourceRect.width, baseSourceRect.height),
        Skia.XYWHRect(
          -nativeCanvasWidth / 2,
          -nativeCanvasHeight / 2,
          nativeCanvasWidth,
          nativeCanvasHeight,
        ),
        paint,
        true,
      );
    } else {
      canvas.drawImageRect(
        image,
        Skia.XYWHRect(baseSourceRect.x, baseSourceRect.y, baseSourceRect.width, baseSourceRect.height),
        destinationRect,
        paint,
        true,
      );
    }
    canvas.restore();

    return recorder.finishRecordingAsPicture();
  }, [backgroundImageCropRect, image, imageOpacity, nativeCanvasHeight, nativeCanvasWidth]);

  const selectedTextBox = useMemo(
    () => textBoxes.find((box) => box.id === selectedTextBoxId) ?? null,
    [selectedTextBoxId, textBoxes],
  );
  const isAllTextMode = !selectedTextBox;

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

  const openTextEditorForBox = (boxId: string) => {
    setSelectedTextBoxId(boxId);
    setCurrentFeature('TextEdit');
    setModalVisible(true);
  };

  const handleCanvasTextTap = (boxId: string) => {
    const now = Date.now();
    const lastTap = lastTextBoxTapRef.current;

    focusTextBox(boxId);

    if (lastTap && lastTap.boxId === boxId && now - lastTap.timestamp < 300) {
      lastTextBoxTapRef.current = null;
      openTextEditorForBox(boxId);
      return;
    }

    lastTextBoxTapRef.current = { boxId, timestamp: now };
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

  const applyTemplatePreset = (template: QuoteTemplate) => {
    const currentTexts = textBoxes.map((box) => box.text);
    const normalized = quoteTemplateToEditorConfig(template, quoteText || globalQuoteText || DEFAULT_QUOTE_TEXT);
    const nextTextBoxes = normalized.text_boxes.map((box, index) => ({
      ...box,
      text: currentTexts[index] ?? box.text,
    }));
    const nextQuoteText =
      nextTextBoxes
        .map((box) => String(box.text || '').trim())
        .filter(Boolean)
        .join('\n') || normalized.quote_text;

    setActiveCanvasKey(normalized.activeCanvasKey);
    setBackgroundImageUri(normalized.background_image_uri);
    setBackgroundImageCrop(normalized.background_image_crop);
    setImageOpacity(normalized.image_opacity);
    setBgColor(normalized.bg_color);
    setFontSize(normalized.font_size);
    setFontColor(normalized.font_color);
    setFontFamily(normalized.font_family);
    setFontShadow(normalized.font_shadow);
    setFontWeight(normalized.font_weight);
    setTextAlign(normalized.text_align);
    setTextBoxes(nextTextBoxes);
    setGlobalQuoteText(nextQuoteText);
    setTextXPercent(normalized.text_x_percent);
    setTextYPercent(normalized.text_y_percent);
    setSelectedTextBoxId('');
    setTemplatesModalVisible(false);
  };

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
      const resolvedBoxFontFamily = resolveFontFamilyForRender(box.font_family ?? fontFamily);
    const paragraph = (() => {
        const paragraphStyle = {
          textAlign: box.text_align ?? textAlign,
          textStyle: {
            color: Skia.Color(box.font_color ?? fontColor),
            fontFamilies: [resolvedBoxFontFamily],
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
        };
        const builder = fontProvider
          ? Skia.ParagraphBuilder.Make(paragraphStyle, fontProvider)
          : Skia.ParagraphBuilder.Make(paragraphStyle);
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
    [textBoxes, fontSize, fontFamily, fontColor, fontShadow, fontWeight, textAlign, nativeCanvasWidth, fontProvider, availableFontSet],
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

  const isFontsReady = Boolean(fontProvider);

  const capturePreviewBase64 = React.useCallback(async () => {
    if (!isFontsReady) {
      return null;
    }

    try {
      const snapshot = await previewCanvasRef.current?.makeImageSnapshotAsync();
      if (!snapshot) {
        return null;
      }

      return snapshot.encodeToBase64(ImageFormat.JPEG, 85);
    } catch (error) {
      console.warn('Could not capture preview thumbnail', error);
      return null;
    }
  }, [isFontsReady, previewCanvasRef]);

  const autosavePayload = useMemo(
    () => ({
      activeCanvasKey,
      background_image_uri: backgroundImageUri,
      background_image_crop: backgroundImageCrop,
      background_image_source: backgroundImageSource,
      unsplash_attribution: backgroundImageAttribution,
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
      backgroundImageCrop,
      backgroundImageSource,
      backgroundImageAttribution,
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
        const preview_image_base64 = await capturePreviewBase64();
        await onSave({
          ...autosavePayload,
          preview_image_base64,
        });
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
  }, [autosavePayload, autosavePayloadKey, capturePreviewBase64, onSave]);

  const cropTargetCanvasKey = pendingCanvasKey ?? activeCanvasKey;
  const cropTargetPreset = CANVAS_PRESETS[cropTargetCanvasKey];
  const cropModalAspectRatio = cropTargetPreset.aspectRatio;

  const closeCropModal = () => {
    setCropModalVisible(false);
    setPendingCropImage(null);
    setPendingCanvasKey(null);
    setCropRotation(0);
    setCroppingImage(false);
  };

  const resolveUnsplashOrientation = (): UnsplashSearchOrientation => {
    if (activeCanvasKey === 'instagram_post_landscape') {
      return 'landscape';
    }

    if (activeCanvasKey === 'instagram_post_square') {
      return 'squarish';
    }

    return 'portrait';
  };

  const openImageCropEditor = async (image: PendingCropImage) => {
    let resolvedImage = image;

    if (!resolvedImage.width || !resolvedImage.height) {
      try {
        const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          Image.getSize(
            resolvedImage.uri,
            (width, height) => resolve({ width, height }),
            reject,
          );
        });
        resolvedImage = {
          ...resolvedImage,
          width: size.width,
          height: size.height,
        };
      } catch (error) {
        console.warn('Could not read image size', error);
        Alert.alert('Unable to crop image', 'The selected image could not be prepared for cropping.');
        return;
      }
    }

    setPendingCropImage(resolvedImage);
    setCropZoom(1);
    setCropOffsetX(0.5);
    setCropOffsetY(0.5);
    setCropRotation(0);
    setCropModalVisible(true);
  };

  const openUnsplashPicker = () => {
    setUnsplashModalVisible(true);
  };

  const handleUnsplashPhotoSelect = async (photo: UnsplashPhoto) => {
    if (!photo.links.download_location) {
      throw new Error('This photo does not provide a download location.');
    }

    await trackUnsplashDownload(photo.links.download_location);

    const attribution: UnsplashImageAttribution = {
      photo_id: photo.id,
      photographer_name: photo.user.name,
      photographer_profile_url: `${photo.user.links.html}?utm_source=note2quote&utm_medium=referral`,
      photo_page_url: `${photo.links.html}?utm_source=note2quote&utm_medium=referral`,
      download_location: photo.links.download_location,
    };

    setUnsplashModalVisible(false);

    await openImageCropEditor({
      uri: getUnsplashPhotoSourceUrl(photo, 1920),
      width: photo.width ?? 0,
      height: photo.height ?? 0,
      label: 'Unsplash',
      source: 'unsplash',
      isNewSelection: true,
      unsplashAttribution: attribution,
    });
  };

  const handleCanvasSizeChange = (nextCanvasKey: CanvasPresetKey) => {
    if (nextCanvasKey === activeCanvasKey) {
      return;
    }

    if (!backgroundImageUri) {
      setActiveCanvasKey(nextCanvasKey);
      return;
    }

    setPendingCanvasKey(nextCanvasKey);
    openImageCropEditor({
      uri: backgroundImageUri,
      width: 0,
      height: 0,
      label: 'Background image',
      source: backgroundImageSource ?? undefined,
      isNewSelection: false,
      unsplashAttribution: backgroundImageAttribution,
    }).catch((error) => {
      console.warn('Could not reopen crop editor for canvas resize', error);
      setPendingCanvasKey(null);
    });
  };

  const handleConfirmCrop = () => {
    if (!pendingCropImage || croppingImage) {
      return;
    }

    try {
      setCroppingImage(true);

      const sourceWidth = pendingCropImage.width;
      const sourceHeight = pendingCropImage.height;
      if (sourceWidth <= 0 || sourceHeight <= 0) {
        throw new Error('The selected image does not have a valid size.');
      }
      const crop = resolveCropRect(
        sourceWidth,
        sourceHeight,
        cropModalAspectRatio,
        cropZoom,
        cropOffsetX,
        cropOffsetY,
        cropRotation,
      );

      if (pendingCanvasKey) {
        setActiveCanvasKey(pendingCanvasKey);
      }
      setBackgroundImageUri(pendingCropImage.uri);
      setBackgroundImageCrop(crop);
      setBackgroundImageSource(pendingCropImage.source ?? null);
      setBackgroundImageAttribution(pendingCropImage.unsplashAttribution ?? null);
      if (pendingCropImage.isNewSelection) {
        setBgColor('#000000');
      }
      closeCropModal();
    } catch (error) {
      console.warn('Crop failed', error);
      Alert.alert('Crop failed', 'We could not crop the selected image. Please try again.');
    } finally {
      setCroppingImage(false);
    }
  };

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const exportFormats: Record<ExportFormat, { label: string; extension: string; mime: string; skiaFormat: ImageFormat; quality: number }> = {
    png: { label: 'PNG', extension: 'png', mime: 'image/png', skiaFormat: ImageFormat.PNG, quality: 100 },
    jpeg: { label: 'JPEG', extension: 'jpeg', mime: 'image/jpeg', skiaFormat: ImageFormat.JPEG, quality: 92 },
    jpg: { label: 'JPG', extension: 'jpg', mime: 'image/jpeg', skiaFormat: ImageFormat.JPEG, quality: 92 },
  };

  const renderCanvasContent = (metrics: typeof layoutTextBoxMetrics, renderWidth: number, renderHeight: number) => (
    <>
      <Rect
        x={0}
        y={0}
        width={renderWidth}
        height={renderHeight}
        color={bgColor}
      />
      {backgroundPicture ? <Picture picture={backgroundPicture} /> : null}
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
        fontOptions={fontOptions}
        fontProvider={fontProvider}
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
        onCanvasKeyChange={handleCanvasSizeChange}
        onClose={closeFeaturePanel}
        onFontColorChange={setTextColor}
        onFontFamilyChange={setTextFamily}
        onFontShadowChange={setTextShadow}
        onFontSizeChange={setTextSize}
        onFontWeightChange={setTextWeight}
        onBoxWidthChange={setBoxWidth}
        onRequestImageCrop={openImageCropEditor}
        onImageOpacityChange={HandleOpactyChange}
        onTextPositionXChange={(value) => setTextX(value / nativeCanvasWidth)}
        onTextPositionYChange={(value) => setTextY(value / nativeCanvasHeight)}
        onUnsplashPress={openUnsplashPicker}
      />
    );
  };

  const renderImageCropModal = () => (
    <ImageCropModal
      visible={cropModalVisible}
      image={pendingCropImage}
      aspectRatio={cropModalAspectRatio}
      zoom={cropZoom}
      offsetX={cropOffsetX}
      offsetY={cropOffsetY}
      rotation={cropRotation}
      onZoomChange={setCropZoom}
      onOffsetXChange={setCropOffsetX}
      onOffsetYChange={setCropOffsetY}
      onRotate={() => {
        setCropRotation((current) => getNextCropRotation(current));
      }}
      onCancel={closeCropModal}
      onConfirm={handleConfirmCrop}
      saving={croppingImage}
    />
  );

  const renderTextEditorModalContent = () => (
    <View style={styles.modalBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={closeFeaturePanel} />
      <View style={[styles.modalContent, styles.textEditorModalContent]}>
        <View style={styles.featurePanelHeader}>
          <View style={styles.featurePanelTitleWrap}>
            <Text style={styles.featurePanelTitle}>Edit Text Boxes</Text>
          </View>
          <Pressable onPress={closeFeaturePanel} hitSlop={10} style={styles.featureDoneButton}>
            <MaterialIcons name="check" size={22} color="#433e3e" />
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
                <Icon source="plus" size={18} color="#433e3e" />
                <Text style={styles.boxPickerAddText}>Add</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <View style={styles.alignmentContainer}>
            <Pressable
              onPress={() => setTextAlignment(TextAlign.Left)}
              style={[styles.alignButton, resolvedTextAlign === TextAlign.Left && styles.alignButtonActive]}
            >
              <Icon source="format-align-left" size={24} color={resolvedTextAlign === TextAlign.Left ? '#666' : '#666'} />
            </Pressable>
            <Pressable
              onPress={() => setTextAlignment(TextAlign.Center)}
              style={[styles.alignButton, resolvedTextAlign === TextAlign.Center && styles.alignButtonActive]}
            >
              <Icon source="format-align-center" size={24} color={resolvedTextAlign === TextAlign.Center ? '#666' : '#666'} />
            </Pressable>
            <Pressable
              onPress={() => setTextAlignment(TextAlign.Right)}
              style={[styles.alignButton, resolvedTextAlign === TextAlign.Right && styles.alignButtonActive]}
            >
              <Icon source="format-align-right" size={24} color={resolvedTextAlign === TextAlign.Right ? '#666' : '#666'} />
            </Pressable>
          </View>

          <Text style={styles.textInputLabel}>
            {selectedTextBox ? 'Text content for selected box' : 'Text editing is disabled in all-text mode'}
          </Text>
          <TextInput
            ref={selectedTextInputRef}
            style={[styles.quoteTextInput, isAllTextMode && styles.quoteTextInputDisabled]}
            placeholder="Enter your text here..."
            placeholderTextColor="#999"
            multiline
            value={selectedTextBox ? selectedTextBox.text : globalQuoteText}
            onChangeText={applyTextChange}
            textAlignVertical="top"
            editable={!isAllTextMode}
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
      <ImageBackground
        source={require('../../assets/app_bg.png')}
        resizeMode="cover"
        imageStyle={styles.backgroundImage}
        style={styles.container}
      >
        {!isFontsReady ? <LoadingQuoteEditor /> : null}
        <Appbar.Header style={styles.appbarHeader}>
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

        <View style={[styles.canvasViewport, { paddingBottom: settingsPanelHeight + bottomReserve }]}>
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
                      onPress={() => handleCanvasTextTap(box.id)}
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
            <Canvas
              ref={previewCanvasRef}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: -20000,
                top: -20000,
                width: previewSnapshotWidth,
                height: previewSnapshotHeight,
              }}
            >
              <Group transform={[{ scaleX: previewSnapshotScale }, { scaleY: previewSnapshotScale }]}>
                {renderCanvasContent(layoutTextBoxMetrics, nativeCanvasWidth, nativeCanvasHeight)}
              </Group>
            </Canvas>
          </View>
        </View>
        <View
          style={[
            styles.settingsContainer,
            {
              height: settingsPanelHeight,
              paddingTop: settingsContainerPaddingTop,
              paddingBottom: settingsContainerPaddingBottomValue,
            },
          ]}
        >
            {backgroundImageAttribution ? (
              <View style={styles.unsplashCreditBanner}>
                <Text style={styles.unsplashCreditText} numberOfLines={1}>
                  Photo by {backgroundImageAttribution.photographer_name} on Unsplash.
                </Text>
                <Text style={styles.unsplashCreditSeparator}>|</Text>
                <Pressable
                  style={styles.unsplashCreditButton}
                  onPress={() => {
                    void Linking.openURL(backgroundImageAttribution.photographer_profile_url);
                  }}
                >
                  <Text style={styles.unsplashCreditButtonText}>View profile</Text>
                </Pressable>
              </View>
            ) : null}
            {currentFeature && currentFeature !== 'TextEdit' ? (
              <View style={styles.featurePanelHost}>
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
                <View style={[styles.templatesZone, { paddingBottom: templatesZonePaddingBottom }]}>
                  {/* Templates button temporarily disabled for the next version.
                  <Pressable
                    style={styles.templatesButton}
                    onPress={() => setTemplatesModalVisible(true)}
                  >
                    <Text style={styles.templatesButtonText}>Templates</Text>
                  </Pressable>
                  */}
                </View>
              </>
            )}
          </View>
      </ImageBackground>
      {renderImageCropModal()}
      <UnsplashImagePickerModal
        visible={unsplashModalVisible}
        orientation={resolveUnsplashOrientation()}
        onClose={() => setUnsplashModalVisible(false)}
        onSelect={handleUnsplashPhotoSelect}
      />
      <Modal
        visible={modalVisible && currentFeature === 'TextEdit'}
        animationType="slide"
        transparent={true}
        onRequestClose={closeFeaturePanel}
      >
        {renderTextEditorModalContent()}
      </Modal>
      <QuoteExportView
        visible={exportModalVisible}
        exportFormat={exportFormat}
        exportMenuVisible={exportMenuVisible}
        exporting={exporting}
        exportProgress={exportProgress}
        exportStatus={exportStatus}
        onClose={() => {
          if (!exporting) {
            setExportModalVisible(false);
            setExportMenuVisible(false);
          }
        }}
        onToggleMenu={() => setExportMenuVisible((current) => !current)}
        onSelectFormat={(format) => {
          setExportFormat(format);
          setExportMenuVisible(false);
        }}
        onExport={handleExport}
      />
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
            <ScrollView
              style={styles.templatesScroll}
              contentContainerStyle={styles.templatesScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.templateSection}>
                <Text style={styles.templateSectionTitle}>Color Templates</Text>
                <View style={styles.templateGrid}>
                  {COLOR_QUOTE_TEMPLATES.map((template) => {
                    const preview = CANVAS_PRESETS[template.canvas.preset];
                    return (
                      <Pressable
                        key={template.template_name}
                        style={styles.templateCard}
                        onPress={() => applyTemplatePreset(template)}
                      >
                        <View
                          style={[
                            styles.templatePreview,
                            { aspectRatio: preview.aspectRatio, backgroundColor: template.background.color },
                          ]}
                        >
                          <View style={styles.templatePreviewTextWrap}>
                            <Text
                              style={[
                                styles.templatePreviewLabel,
                                {
                                  color: template.typography.font_color,
                                  fontSize: 14,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {template.template_name}
                            </Text>
                            <Text
                              style={[
                                styles.templatePreviewCaption,
                                {
                                  color: template.typography.font_color,
                                },
                              ]}
                              numberOfLines={2}
                            >
                              Quote + author
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.templateSection}>
                <Text style={styles.templateSectionTitle}>Background Templates</Text>
                {BACKGROUND_QUOTE_TEMPLATES.length > 0 ? (
                  <View style={styles.templateGrid}>
                    {BACKGROUND_QUOTE_TEMPLATES.map((template) => {
                      const preview = CANVAS_PRESETS[template.canvas.preset];
                      return (
                        <Pressable
                          key={template.template_name}
                          style={styles.templateCard}
                          onPress={() => applyTemplatePreset(template)}
                        >
                          <View
                            style={[
                              styles.templatePreview,
                              { aspectRatio: preview.aspectRatio, backgroundColor: template.background.color },
                            ]}
                          >
                            <View style={styles.templatePreviewTextWrap}>
                              <Text
                                style={[
                                  styles.templatePreviewLabel,
                                  {
                                    color: template.typography.font_color,
                                    fontSize: 14,
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {template.template_name}
                              </Text>
                              <Text
                                style={[
                                  styles.templatePreviewCaption,
                                  {
                                    color: template.typography.font_color,
                                  },
                                ]}
                                numberOfLines={2}
                              >
                                Background template
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.templateEmptyState}>
                    <Text style={styles.templateEmptyText}>
                      Background templates will appear here when they are generated from images.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
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
    backgroundColor: 'transparent',

  },
  backgroundImage: {
    opacity: 0.28,
  },
  appbarHeader: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(236, 236, 236, 0.7)',
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
    borderColor: '#ffc107',
    borderStyle: 'dashed',
  },
  selectionDotTopLeft: {
    position: 'absolute',
    left: -6,
    top: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffc107',
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
    backgroundColor: '#ffc107',
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
    backgroundColor: '#ffc107',
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
    backgroundColor: '#ffc107',
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
    // backgroundColor: 'red',
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
    // backgroundColor:'green',
    flex: 1,
    overflow: 'hidden',
  },
  featurePanel: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
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
    backgroundColor: '#ffc107',
    borderWidth: 1,
    borderColor: '#ffc107',
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
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
  },
  featurePanelBodyContent: {
    flexGrow: 1,
    minHeight: 0,
    alignItems: 'stretch',
    justifyContent: 'center',
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
    minWidth: 108,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f7f7f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontChipActive: {
    backgroundColor: '#ffc107',
    borderColor: '#ffc107',
  },
  fontChipPreviewWrap: {
    width: FONT_PREVIEW_WIDTH,
    height: FONT_PREVIEW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontPreviewFallback: {
    width: FONT_PREVIEW_WIDTH,
    height: FONT_PREVIEW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontPreviewImage: {
    width: FONT_PREVIEW_WIDTH,
    height: FONT_PREVIEW_HEIGHT,
    resizeMode: 'contain',
  },
  fontPreviewFallbackText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  loadingScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f7f4ef',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 50,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#fffaf2',
    borderWidth: 1,
    borderColor: 'rgba(67, 62, 62, 0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffc107',
    marginTop: 14,
    marginBottom: 14,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2f2b2b',
    textAlign: 'center',
  },
  loadingSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6b6b6b',
    textAlign: 'center',
    lineHeight: 20,
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
    backgroundColor: '#ffc107',
    borderColor: '#ffc107',
  },
  colorPickerWrap: {
    flex: 1,
    minHeight: 0,
    borderRadius: 18,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ececec',
  },
  colorPickerRoot: {
    flex: 1,
    minHeight: 0,
  },
  colorPickerStage: {
    flex: 1,
    minHeight: 0,
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  colorPickerSurfaceWrap: {
    flexShrink: 0,
    width: '100%',
    overflow: 'hidden',
  },
  colorPickerSurface: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  colorPickerHueWrap: {
    flexShrink: 0,
    width: '100%',
  },
  colorPickerHueSlider: {
    width: '100%',
    height: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cropBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cropSheet: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cropHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cropTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cropTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
  },
  cropSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#666',
  },
  cropCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  cropPreviewFrame: {
    alignSelf: 'center',
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d8d8d8',
  },
  cropPreviewFallbackImage: {
    resizeMode: 'contain',
  },
  cropPreviewClip: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  cropPreviewImage: {
    position: 'absolute',
  },
  cropPreviewBorder: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  cropPreviewMask: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  cropPreviewLoading: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243, 244, 246, 0.4)',
  },
  cropControlGroup: {
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f7f7f8',
    borderWidth: 1,
    borderColor: '#ececec',
  },
  cropControlRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cropControlHalf: {
    flex: 1,
    gap: 6,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f7f7f8',
    borderWidth: 1,
    borderColor: '#ececec',
  },
  cropControlLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  cropActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cropActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropActionSecondary: {
    backgroundColor: '#f3f4f6',
  },
  cropActionSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#433e3e',
  },
  cropActionRotate: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#f3f4f6',
  },
  cropActionRotateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#433e3e',
  },
  cropActionPrimary: {
    backgroundColor: '#ffc107',
  },
  cropActionPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#433e3e',
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
    maxHeight: '88%',
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
  templatesScroll: {
    flex: 1,
  },
  templatesScrollContent: {
    gap: 18,
    paddingBottom: 8,
  },
  templateSection: {
    gap: 10,
  },
  templateSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1f2937',
    letterSpacing: 0.2,
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
  templatePreviewTextWrap: {
    gap: 2,
  },
  templatePreviewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
  },
  templatePreviewCaption: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.86,
  },
  templateEmptyState: {
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  templateEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
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
    backgroundColor: '#ffc107',
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
    color: '#433e3e',
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
    backgroundColor: '#f7f7f8',
  },
  exportPrimaryButton: {
    backgroundColor: '#ffc107',
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
    backgroundColor: '#ffc107',
    borderColor: '#ffc107',
  },
  boxPickerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  boxPickerChipTextActive: {
    color: '#433e3e',
  },
  boxPickerAddChip: {
    borderStyle: 'dashed',
  },
  boxPickerAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#433e3e',
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
    backgroundColor: '#ffc107',
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
    color: '#433e3e',
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
    backgroundColor: '#ffc107',
  },
  fontOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  fontOptionTextActive: {
    fontWeight: '600',
    color: '#433e3e',
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
  sizePreviewBase: {
    width: 54,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    marginBottom: 12,
  },
  sizePreviewActive: {
    borderColor: '#ffc107',
    borderWidth: 3,
    backgroundColor: '#ffc107',
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
    borderColor: '#ffc107',
    backgroundColor: '#ffc107',
    borderWidth: 2,
  },
  weightOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  weightOptionTextActive: {
    color: '#433e3e',
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
    borderColor: '#ffc107',
    backgroundColor: '#ffc107',
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
  quoteTextInputDisabled: {
    color: '#8a8a8a',
    backgroundColor: '#f1f3f5',
  },
  editCloseButton: {
    backgroundColor: '#ffc107',
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
  unsplashCreditBanner: {
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 2,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unsplashCreditText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '500',
    color: '#444',
  },
  unsplashCreditSeparator: {
    fontSize: 12,
    color: '#888',
  },
  unsplashCreditButton: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  unsplashCreditButtonText: {
    color: '#1a73e8',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
})
