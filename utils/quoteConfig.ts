import { FontWeight, TextAlign } from '@shopify/react-native-skia';
import type {
  CanvasPresetKey,
  QuoteEditorConfig,
  QuoteImageCrop,
  QuoteTemplate,
  QuoteTemplateDiagnostics,
  QuoteTextBox,
} from '../types/quotes';

export const DEFAULT_QUOTE_TEXT = 'Go and build something amazing with React Native Skia!';
export const DEFAULT_AUTHOR_TEXT = '- Author_name';
export const MAX_TEXT_BOXES = 5;
export const DEFAULT_TEXT_BOX_WIDTH = 0.55;
export const DEFAULT_TEXT_BOX_HEIGHT = 0.22;
export const DEFAULT_TEXT_BOX_VERTICAL_GAP = 0.04;
export const DEFAULT_EDITOR_BG_COLOR = '#222222';
export const DEFAULT_EDITOR_FONT_COLOR = 'white';
export const DEFAULT_EDITOR_FONT_FAMILY = 'serif';
export const DEFAULT_EDITOR_IMAGE_OPACITY = 0.6;
export const DEFAULT_EDITOR_FONT_SIZE = 14;
export const DEFAULT_EDITOR_FONT_SHADOW = 0;

export const DEFAULT_EDITOR_CONFIG: QuoteEditorConfig = {
  activeCanvasKey: 'instagram_post_square',
  background_image_uri: null,
  background_image_crop: null,
  image_opacity: DEFAULT_EDITOR_IMAGE_OPACITY,
  font_size: DEFAULT_EDITOR_FONT_SIZE,
  font_color: DEFAULT_EDITOR_FONT_COLOR,
  bg_color: DEFAULT_EDITOR_BG_COLOR,
  font_family: DEFAULT_EDITOR_FONT_FAMILY,
  font_shadow: DEFAULT_EDITOR_FONT_SHADOW,
  font_weight: FontWeight.Bold,
  text_align: TextAlign.Center,
  quote_text: DEFAULT_QUOTE_TEXT,
  text_boxes: [],
  text_x_percent: 0.05,
  text_y_percent: 0.35,
};

const DEFAULT_TEMPLATE_NAME = 'Quote Template';
type QuoteEditorConfigInput = Partial<Omit<QuoteEditorConfig, 'text_boxes'>> & {
  text_boxes?: QuoteTextBox[] | null;
};

type TemplateTextBoxSpec = {
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  font_size: number;
  font_shadow: number;
  font_weight: QuoteEditorConfig['font_weight'];
  text_align: QuoteEditorConfig['text_align'];
};

type ColorTemplateSpec = {
  template_name: string;
  canvas: CanvasPresetKey;
  background_color: string;
  font_color: string;
  font_family: string;
  quote_box: TemplateTextBoxSpec;
  author_box: TemplateTextBoxSpec;
};

export type CanvasSizeOption = {
  key: CanvasPresetKey;
  label: string;
};

export const CANVAS_SIZE_OPTIONS: CanvasSizeOption[] = [
  { key: 'instagram_post_square', label: 'Square' },
  { key: 'instagram_post_portrait', label: 'Portrait' },
  { key: 'instagram_post_landscape', label: 'Landscape' },
  { key: 'instagram_story', label: 'Story' },
];

const COLOR_TEMPLATE_SPECS: ColorTemplateSpec[] = [
  {
    template_name: 'Sunset Bold',
    canvas: 'instagram_post_square',
    background_color: '#FF6B6B',
    font_color: '#FFFFFF',
    font_family: 'serif',
    quote_box: {
      x_percent: 0.08,
      y_percent: 0.18,
      width_percent: 0.84,
      height_percent: 0.44,
      font_size: 48,
      font_shadow: 2,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Center,
    },
    author_box: {
      x_percent: 0.1,
      y_percent: 0.68,
      width_percent: 0.8,
      height_percent: 0.12,
      font_size: 32,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Center,
    },
  },
  {
    template_name: 'Ocean Calm',
    canvas: 'instagram_post_portrait',
    background_color: '#0B5FA5',
    font_color: '#F7FBFF',
    font_family: 'sans-serif',
    quote_box: {
      x_percent: 0.1,
      y_percent: 0.18,
      width_percent: 0.76,
      height_percent: 0.5,
      font_size: 44,
      font_shadow: 1,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Left,
    },
    author_box: {
      x_percent: 0.12,
      y_percent: 0.72,
      width_percent: 0.7,
      height_percent: 0.1,
      font_size: 30,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Left,
    },
  },
  {
    template_name: 'Midnight Minimal',
    canvas: 'instagram_post_square',
    background_color: '#121212',
    font_color: '#F2F2F2',
    font_family: 'monospace',
    quote_box: {
      x_percent: 0.12,
      y_percent: 0.16,
      width_percent: 0.76,
      height_percent: 0.48,
      font_size: 50,
      font_shadow: 0,
      font_weight: FontWeight.Normal,
      text_align: TextAlign.Left,
    },
    author_box: {
      x_percent: 0.12,
      y_percent: 0.7,
      width_percent: 0.52,
      height_percent: 0.1,
      font_size: 30,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Left,
    },
  },
  {
    template_name: 'Forest Calm',
    canvas: 'instagram_post_landscape',
    background_color: '#1F5A3A',
    font_color: '#F4FFE9',
    font_family: 'serif',
    quote_box: {
      x_percent: 0.12,
      y_percent: 0.18,
      width_percent: 0.58,
      height_percent: 0.36,
      font_size: 48,
      font_shadow: 1,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Left,
    },
    author_box: {
      x_percent: 0.12,
      y_percent: 0.58,
      width_percent: 0.36,
      height_percent: 0.12,
      font_size: 32,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Left,
    },
  },
  {
    template_name: 'Coral Corner',
    canvas: 'instagram_post_portrait',
    background_color: '#F46B45',
    font_color: '#FFF8F3',
    font_family: 'sans-serif',
    quote_box: {
      x_percent: 0.14,
      y_percent: 0.22,
      width_percent: 0.72,
      height_percent: 0.42,
      font_size: 46,
      font_shadow: 2,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Right,
    },
    author_box: {
      x_percent: 0.26,
      y_percent: 0.7,
      width_percent: 0.56,
      height_percent: 0.1,
      font_size: 30,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Right,
    },
  },
  {
    template_name: 'Lavender Soft',
    canvas: 'instagram_story',
    background_color: '#8B7CF6',
    font_color: '#FFFFFF',
    font_family: 'serif',
    quote_box: {
      x_percent: 0.1,
      y_percent: 0.2,
      width_percent: 0.8,
      height_percent: 0.34,
      font_size: 60,
      font_shadow: 1,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Center,
    },
    author_box: {
      x_percent: 0.22,
      y_percent: 0.62,
      width_percent: 0.56,
      height_percent: 0.1,
      font_size: 34,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Center,
    },
  },
  {
    template_name: 'Amber Highlight',
    canvas: 'instagram_post_square',
    background_color: '#D97706',
    font_color: '#FFFBEA',
    font_family: 'sans-serif',
    quote_box: {
      x_percent: 0.1,
      y_percent: 0.14,
      width_percent: 0.76,
      height_percent: 0.44,
      font_size: 50,
      font_shadow: 1,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Left,
    },
    author_box: {
      x_percent: 0.24,
      y_percent: 0.66,
      width_percent: 0.6,
      height_percent: 0.1,
      font_size: 30,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Left,
    },
  },
  {
    template_name: 'Teal Panel',
    canvas: 'instagram_post_landscape',
    background_color: '#0F766E',
    font_color: '#ECFEFF',
    font_family: 'monospace',
    quote_box: {
      x_percent: 0.1,
      y_percent: 0.2,
      width_percent: 0.56,
      height_percent: 0.34,
      font_size: 46,
      font_shadow: 1,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Left,
    },
    author_box: {
      x_percent: 0.1,
      y_percent: 0.58,
      width_percent: 0.32,
      height_percent: 0.12,
      font_size: 30,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Left,
    },
  },
  {
    template_name: 'Rose Contrast',
    canvas: 'instagram_post_portrait',
    background_color: '#A21CAF',
    font_color: '#FFF5FF',
    font_family: 'serif',
    quote_box: {
      x_percent: 0.1,
      y_percent: 0.18,
      width_percent: 0.76,
      height_percent: 0.42,
      font_size: 46,
      font_shadow: 2,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Center,
    },
    author_box: {
      x_percent: 0.18,
      y_percent: 0.68,
      width_percent: 0.64,
      height_percent: 0.1,
      font_size: 30,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Center,
    },
  },
  {
    template_name: 'Paper Dawn',
    canvas: 'instagram_post_square',
    background_color: '#F7EDE2',
    font_color: '#2F2A26',
    font_family: 'sans-serif',
    quote_box: {
      x_percent: 0.1,
      y_percent: 0.14,
      width_percent: 0.8,
      height_percent: 0.46,
      font_size: 48,
      font_shadow: 0,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Center,
    },
    author_box: {
      x_percent: 0.18,
      y_percent: 0.68,
      width_percent: 0.64,
      height_percent: 0.1,
      font_size: 28,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Center,
    },
  },
  {
    template_name: 'Monochrome Edge',
    canvas: 'instagram_post_square',
    background_color: '#1F2937',
    font_color: '#F9FAFB',
    font_family: 'monospace',
    quote_box: {
      x_percent: 0.1,
      y_percent: 0.18,
      width_percent: 0.78,
      height_percent: 0.42,
      font_size: 46,
      font_shadow: 1,
      font_weight: FontWeight.Normal,
      text_align: TextAlign.Left,
    },
    author_box: {
      x_percent: 0.1,
      y_percent: 0.66,
      width_percent: 0.46,
      height_percent: 0.1,
      font_size: 28,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Left,
    },
  },
  {
    template_name: 'Warm Clay',
    canvas: 'instagram_post_square',
    background_color: '#C97C5D',
    font_color: '#FFF8F3',
    font_family: 'serif',
    quote_box: {
      x_percent: 0.11,
      y_percent: 0.16,
      width_percent: 0.78,
      height_percent: 0.44,
      font_size: 47,
      font_shadow: 1,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Right,
    },
    author_box: {
      x_percent: 0.24,
      y_percent: 0.68,
      width_percent: 0.56,
      height_percent: 0.1,
      font_size: 29,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Right,
    },
  },
  {
    template_name: 'Canvas Light',
    canvas: 'instagram_post_square',
    background_color: '#E8EEF2',
    font_color: '#1F2937',
    font_family: 'serif',
    quote_box: {
      x_percent: 0.12,
      y_percent: 0.16,
      width_percent: 0.76,
      height_percent: 0.46,
      font_size: 47,
      font_shadow: 0,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Center,
    },
    author_box: {
      x_percent: 0.2,
      y_percent: 0.68,
      width_percent: 0.6,
      height_percent: 0.1,
      font_size: 28,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Center,
    },
  },
  {
    template_name: 'Indigo Fade',
    canvas: 'instagram_post_portrait',
    background_color: '#203A86',
    font_color: '#EEF2FF',
    font_family: 'sans-serif',
    quote_box: {
      x_percent: 0.1,
      y_percent: 0.16,
      width_percent: 0.74,
      height_percent: 0.5,
      font_size: 45,
      font_shadow: 1,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Left,
    },
    author_box: {
      x_percent: 0.12,
      y_percent: 0.72,
      width_percent: 0.56,
      height_percent: 0.1,
      font_size: 28,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Left,
    },
  },
  {
    template_name: 'Mint Frame',
    canvas: 'instagram_post_portrait',
    background_color: '#4BAF8C',
    font_color: '#F4FFFB',
    font_family: 'serif',
    quote_box: {
      x_percent: 0.12,
      y_percent: 0.2,
      width_percent: 0.72,
      height_percent: 0.44,
      font_size: 46,
      font_shadow: 1,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Center,
    },
    author_box: {
      x_percent: 0.18,
      y_percent: 0.7,
      width_percent: 0.64,
      height_percent: 0.1,
      font_size: 29,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Center,
    },
  },
  {
    template_name: 'Crimson Echo',
    canvas: 'instagram_post_portrait',
    background_color: '#8B1E3F',
    font_color: '#FFF5F7',
    font_family: 'monospace',
    quote_box: {
      x_percent: 0.11,
      y_percent: 0.18,
      width_percent: 0.76,
      height_percent: 0.46,
      font_size: 44,
      font_shadow: 2,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Right,
    },
    author_box: {
      x_percent: 0.24,
      y_percent: 0.7,
      width_percent: 0.56,
      height_percent: 0.1,
      font_size: 28,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Right,
    },
  },
  {
    template_name: 'Sage Horizon',
    canvas: 'instagram_post_landscape',
    background_color: '#6B8F71',
    font_color: '#F7FBF4',
    font_family: 'serif',
    quote_box: {
      x_percent: 0.1,
      y_percent: 0.18,
      width_percent: 0.52,
      height_percent: 0.36,
      font_size: 46,
      font_shadow: 1,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Left,
    },
    author_box: {
      x_percent: 0.1,
      y_percent: 0.58,
      width_percent: 0.34,
      height_percent: 0.12,
      font_size: 28,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Left,
    },
  },
  {
    template_name: 'Amber Ridge',
    canvas: 'instagram_post_landscape',
    background_color: '#B45309',
    font_color: '#FFF8EC',
    font_family: 'sans-serif',
    quote_box: {
      x_percent: 0.12,
      y_percent: 0.16,
      width_percent: 0.54,
      height_percent: 0.38,
      font_size: 45,
      font_shadow: 1,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Center,
    },
    author_box: {
      x_percent: 0.12,
      y_percent: 0.58,
      width_percent: 0.3,
      height_percent: 0.12,
      font_size: 28,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Center,
    },
  },
  {
    template_name: 'Nightline',
    canvas: 'instagram_post_landscape',
    background_color: '#111827',
    font_color: '#E5E7EB',
    font_family: 'monospace',
    quote_box: {
      x_percent: 0.1,
      y_percent: 0.18,
      width_percent: 0.58,
      height_percent: 0.34,
      font_size: 44,
      font_shadow: 0,
      font_weight: FontWeight.Normal,
      text_align: TextAlign.Left,
    },
    author_box: {
      x_percent: 0.1,
      y_percent: 0.58,
      width_percent: 0.28,
      height_percent: 0.12,
      font_size: 27,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Left,
    },
  },
  {
    template_name: 'Olive Postcard',
    canvas: 'instagram_post_landscape',
    background_color: '#556B2F',
    font_color: '#F7F5E8',
    font_family: 'serif',
    quote_box: {
      x_percent: 0.12,
      y_percent: 0.16,
      width_percent: 0.56,
      height_percent: 0.36,
      font_size: 45,
      font_shadow: 1,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Right,
    },
    author_box: {
      x_percent: 0.24,
      y_percent: 0.58,
      width_percent: 0.3,
      height_percent: 0.12,
      font_size: 28,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Right,
    },
  },
  {
    template_name: 'Slate Editorial',
    canvas: 'instagram_story',
    background_color: '#334455',
    font_color: '#F8FAFC',
    font_family: 'sans-serif',
    quote_box: {
      x_percent: 0.12,
      y_percent: 0.18,
      width_percent: 0.72,
      height_percent: 0.4,
      font_size: 52,
      font_shadow: 1,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Left,
    },
    author_box: {
      x_percent: 0.12,
      y_percent: 0.66,
      width_percent: 0.5,
      height_percent: 0.1,
      font_size: 32,
      font_shadow: 0,
      font_weight: FontWeight.Medium,
      text_align: TextAlign.Left,
    },
  },
];

const NON_STORY_COLOR_TEMPLATE_SPECS = COLOR_TEMPLATE_SPECS.filter(
  (spec) => spec.canvas !== 'instagram_story',
);

const buildColorTemplate = (
  spec: ColorTemplateSpec,
  quoteText = DEFAULT_QUOTE_TEXT,
  authorText = DEFAULT_AUTHOR_TEXT,
): QuoteTemplate => {
  return {
    schema_version: 1,
    template_name: spec.template_name,
    canvas: {
      preset: spec.canvas,
    },
    background: {
      image_uri: null,
      crop: null,
      color: spec.background_color,
      opacity: 1,
    },
    typography: {
      font_size: spec.quote_box.font_size,
      font_color: spec.font_color,
      font_family: spec.font_family,
      font_shadow: spec.quote_box.font_shadow,
      font_weight: spec.quote_box.font_weight,
      text_align: spec.quote_box.text_align,
    },
    layout: {
      quote_text: `${quoteText}\n${authorText}`,
      text_boxes: [
        {
          id: 'text-1',
          text: quoteText,
          x_percent: spec.quote_box.x_percent,
          y_percent: spec.quote_box.y_percent,
          width_percent: spec.quote_box.width_percent,
          height_percent: spec.quote_box.height_percent,
          font_color: spec.font_color,
          font_size: spec.quote_box.font_size,
          font_family: spec.font_family,
          font_shadow: spec.quote_box.font_shadow,
          font_weight: spec.quote_box.font_weight,
          text_align: spec.quote_box.text_align,
        },
        {
          id: 'text-2',
          text: authorText,
          x_percent: spec.author_box.x_percent,
          y_percent: spec.author_box.y_percent,
          width_percent: spec.author_box.width_percent,
          height_percent: spec.author_box.height_percent,
          font_color: spec.font_color,
          font_size: spec.author_box.font_size,
          font_family: spec.font_family,
          font_shadow: spec.author_box.font_shadow,
          font_weight: spec.author_box.font_weight,
          text_align: spec.author_box.text_align,
        },
      ],
      text_x_percent: spec.quote_box.x_percent,
      text_y_percent: spec.quote_box.y_percent,
    },
  };
};

export const COLOR_QUOTE_TEMPLATES: QuoteTemplate[] = NON_STORY_COLOR_TEMPLATE_SPECS.map((spec) =>
  buildColorTemplate(spec),
);

export const BACKGROUND_QUOTE_TEMPLATES: QuoteTemplate[] = [
  {
    schema_version: 1,
    template_name: 'Generated Template',
    canvas: {
      preset: 'instagram_post_square',
    },
    background: {
      image_uri:
        'https://storage.googleapis.com/generative-ai-service-client-upload-images/c8874697-3103-4903-855c-2101569426f0-image.png',
      crop: null,
      color: '#222222',
      opacity: 0.6,
    },
    typography: {
      font_size: 14,
      font_color: '#FFFFFF',
      font_family: 'Inter',
      font_shadow: 0,
      font_weight: FontWeight.Bold,
      text_align: TextAlign.Center,
    },
    layout: {
      quote_text: 'Generated template',
      text_boxes: [
        {
          id: 'text-1',
          text: 'Generated template',
          x_percent: 0.1,
          y_percent: 0.15,
          width_percent: 0.8,
          height_percent: 0.55,
          font_color: '#FFFFFF',
          font_size: 14,
          font_family: 'Inter',
          font_shadow: 0,
          font_weight: FontWeight.Bold,
          text_align: TextAlign.Center,
        },
      ],
      text_x_percent: 0.1,
      text_y_percent: 0.15,
    },
    diagnostics: {
      source_image_uri: 'F:\\note2quote\\assets\\test.jpg',
      source_image_width: null,
      source_image_height: null,
      confidence: 0.5,
      warnings: [],
      notes: 'Template generated for an image-only input, using default quote and author text placeholders.',
    },
  },
];

export const getRandomColorQuoteTemplate = (quoteText = DEFAULT_QUOTE_TEXT) => {
  const index = Math.floor(Math.random() * NON_STORY_COLOR_TEMPLATE_SPECS.length);
  return buildColorTemplate(NON_STORY_COLOR_TEMPLATE_SPECS[index], quoteText);
};

export const getRandomColorQuoteEditorConfig = (quoteText = DEFAULT_QUOTE_TEXT) =>
  quoteTemplateToEditorConfig(getRandomColorQuoteTemplate(quoteText), quoteText);

export const clampPercentValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const clampDeltaValue = (value: number, minDelta: number, maxDelta: number) =>
  Math.min(maxDelta, Math.max(minDelta, value));

export const normalizeCropRotation = (rotation: number): QuoteImageCrop['rotation'] => {
  const normalized = ((Math.round(rotation / 90) * 90) % 360 + 360) % 360;
  switch (normalized) {
    case 90:
    case 180:
    case 270:
      return normalized;
    default:
      return 0;
  }
};

export const normalizeImageCrop = (value: unknown): QuoteImageCrop | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const crop = value as Partial<QuoteImageCrop>;
  const x = Number(crop.x);
  const y = Number(crop.y);
  const width = Number(crop.width);
  const height = Number(crop.height);

  return {
    x: Number.isFinite(x) && x >= 0 ? x : 0,
    y: Number.isFinite(y) && y >= 0 ? y : 0,
    width: Number.isFinite(width) && width > 0 ? width : 1,
    height: Number.isFinite(height) && height > 0 ? height : 1,
    rotation: normalizeCropRotation(Number(crop.rotation ?? 0)),
  };
};

export const normalizeFontWeight = (value: unknown): QuoteEditorConfig['font_weight'] => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value as QuoteEditorConfig['font_weight'];
  }

  const normalized = String(value || '').toLowerCase();
  switch (normalized) {
    case 'thin':
      return 100 as QuoteEditorConfig['font_weight'];
    case 'extralight':
    case 'extra_light':
      return 200 as QuoteEditorConfig['font_weight'];
    case 'light':
      return 300 as QuoteEditorConfig['font_weight'];
    case 'medium':
      return 500 as QuoteEditorConfig['font_weight'];
    case 'semibold':
    case 'semi_bold':
      return 600 as QuoteEditorConfig['font_weight'];
    case 'bold':
      return 700 as QuoteEditorConfig['font_weight'];
    case 'extrabold':
    case 'extra_bold':
      return 800 as QuoteEditorConfig['font_weight'];
    case 'black':
      return 900 as QuoteEditorConfig['font_weight'];
    case 'extrablack':
    case 'extra_black':
      return 1000 as QuoteEditorConfig['font_weight'];
    default:
      return FontWeight.Bold;
  }
};

export const normalizeTextAlign = (value: unknown): QuoteEditorConfig['text_align'] => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value as QuoteEditorConfig['text_align'];
  }

  const normalized = String(value || '').toLowerCase();
  switch (normalized) {
    case 'left':
      return TextAlign.Left;
    case 'right':
      return TextAlign.Right;
    case 'center':
      return TextAlign.Center;
    case 'justify':
      return TextAlign.Justify;
    case 'start':
      return TextAlign.Start;
    case 'end':
      return TextAlign.End;
    default:
      return TextAlign.Center;
  }
};

export const createTextBox = (text = '', index = 0): QuoteTextBox => ({
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

const normalizeTextBox = (box: QuoteTextBox | Partial<QuoteTextBox> | null | undefined, index: number, fallbackText: string) => {
  const base = createTextBox(fallbackText, index);
  const safeBox = box && typeof box === 'object' ? box : {};
  return {
    id: String(safeBox.id || base.id),
    text: String(safeBox.text ?? base.text ?? fallbackText ?? ''),
    x_percent: clampPercentValue(
      Number(safeBox.x_percent ?? base.x_percent),
      0,
      Math.max(0, 1 - (Number(safeBox.width_percent ?? base.width_percent ?? DEFAULT_TEXT_BOX_WIDTH) || DEFAULT_TEXT_BOX_WIDTH)),
    ),
    y_percent: clampPercentValue(
      Number(safeBox.y_percent ?? base.y_percent),
      0,
      Math.max(0, 1 - (Number(safeBox.height_percent ?? base.height_percent ?? DEFAULT_TEXT_BOX_HEIGHT) || DEFAULT_TEXT_BOX_HEIGHT)),
    ),
    width_percent: clampPercentValue(
      Number(safeBox.width_percent ?? base.width_percent ?? DEFAULT_TEXT_BOX_WIDTH),
      0.2,
      0.85,
    ),
    height_percent: clampPercentValue(
      Number(safeBox.height_percent ?? base.height_percent ?? DEFAULT_TEXT_BOX_HEIGHT),
      0.1,
      1,
    ),
    ...(safeBox.font_color != null ? { font_color: String(safeBox.font_color) } : {}),
    ...(safeBox.font_size != null ? { font_size: Number(safeBox.font_size) } : {}),
    ...(safeBox.font_family != null ? { font_family: String(safeBox.font_family) } : {}),
    ...(safeBox.font_shadow != null ? { font_shadow: Number(safeBox.font_shadow) } : {}),
    ...(safeBox.font_weight != null ? { font_weight: normalizeFontWeight(safeBox.font_weight) } : {}),
    ...(safeBox.text_align != null ? { text_align: normalizeTextAlign(safeBox.text_align) } : {}),
  } as QuoteTextBox;
};

export const normalizeTextBoxes = (boxes?: QuoteTextBox[] | null, fallbackText = DEFAULT_QUOTE_TEXT) => {
  const source = Array.isArray(boxes) && boxes.length > 0 ? boxes.slice(0, MAX_TEXT_BOXES) : [createTextBox(fallbackText, 0)];
  const normalized = source.map((box, index) => normalizeTextBox(box, index, fallbackText));

  const hasText = normalized.some((box) => String(box.text || '').trim().length > 0);
  if (!hasText && String(fallbackText || '').trim()) {
    normalized[0] = {
      ...normalized[0],
      text: String(fallbackText),
    };
  }

  return normalized;
};

export const normalizeQuoteEditorConfig = (
  config?: QuoteEditorConfigInput | null,
  fallbackText = DEFAULT_QUOTE_TEXT,
): QuoteEditorConfig => {
  const base = DEFAULT_EDITOR_CONFIG;
  const quoteText = String(config?.quote_text ?? base.quote_text ?? fallbackText);
  const textBoxes = normalizeTextBoxes(config?.text_boxes ?? null, quoteText);

  return {
    ...base,
    ...config,
    activeCanvasKey: (config?.activeCanvasKey ?? base.activeCanvasKey) as CanvasPresetKey,
    font_weight: normalizeFontWeight(config?.font_weight ?? base.font_weight),
    text_align: normalizeTextAlign(config?.text_align ?? base.text_align),
    background_image_uri: config?.background_image_uri ?? null,
    background_image_crop: normalizeImageCrop(config?.background_image_crop),
    quote_text: textBoxes
      .map((box) => String(box.text || '').trim())
      .filter(Boolean)
      .join('\n') || quoteText,
    text_boxes: textBoxes,
  };
};

const normalizeTemplateDiagnostics = (diagnostics?: QuoteTemplateDiagnostics | null): QuoteTemplateDiagnostics | undefined => {
  if (!diagnostics) {
    return undefined;
  }

  const warnings = Array.isArray(diagnostics.warnings)
    ? diagnostics.warnings.map((warning) => String(warning)).filter(Boolean)
    : undefined;

  return {
    source_image_uri: diagnostics.source_image_uri ?? null,
    source_image_width: diagnostics.source_image_width ?? null,
    source_image_height: diagnostics.source_image_height ?? null,
    confidence: typeof diagnostics.confidence === 'number' && Number.isFinite(diagnostics.confidence)
      ? diagnostics.confidence
      : null,
    warnings,
    notes: diagnostics.notes ?? null,
  };
};

export const normalizeQuoteTemplate = (
  template?: Partial<QuoteTemplate> | null,
  fallbackText = DEFAULT_QUOTE_TEXT,
): QuoteTemplate => {
  const normalizedDiagnostics = normalizeTemplateDiagnostics(template?.diagnostics);
  const editorConfig = normalizeQuoteEditorConfig(
    {
      activeCanvasKey: template?.canvas?.preset ?? DEFAULT_EDITOR_CONFIG.activeCanvasKey,
      background_image_uri: template?.background?.image_uri ?? null,
      background_image_crop: template?.background?.crop ?? null,
      image_opacity: template?.background?.opacity ?? DEFAULT_EDITOR_CONFIG.image_opacity,
      bg_color: template?.background?.color ?? DEFAULT_EDITOR_CONFIG.bg_color,
      font_size: template?.typography?.font_size ?? DEFAULT_EDITOR_CONFIG.font_size,
      font_color: template?.typography?.font_color ?? DEFAULT_EDITOR_CONFIG.font_color,
      font_family: template?.typography?.font_family ?? DEFAULT_EDITOR_CONFIG.font_family,
      font_shadow: template?.typography?.font_shadow ?? DEFAULT_EDITOR_CONFIG.font_shadow,
      font_weight: template?.typography?.font_weight ?? DEFAULT_EDITOR_CONFIG.font_weight,
      text_align: template?.typography?.text_align ?? DEFAULT_EDITOR_CONFIG.text_align,
      quote_text: template?.layout?.quote_text ?? fallbackText,
      text_boxes: template?.layout?.text_boxes ?? null,
      text_x_percent: template?.layout?.text_x_percent ?? DEFAULT_EDITOR_CONFIG.text_x_percent,
      text_y_percent: template?.layout?.text_y_percent ?? DEFAULT_EDITOR_CONFIG.text_y_percent,
    },
    fallbackText,
  );

  return {
    schema_version: 1,
    template_name: String(template?.template_name ?? DEFAULT_TEMPLATE_NAME),
    canvas: {
      preset: editorConfig.activeCanvasKey,
    },
    background: {
      image_uri: editorConfig.background_image_uri,
      crop: editorConfig.background_image_crop,
      color: editorConfig.bg_color,
      opacity: editorConfig.image_opacity,
    },
    typography: {
      font_size: editorConfig.font_size,
      font_color: editorConfig.font_color,
      font_family: editorConfig.font_family,
      font_shadow: editorConfig.font_shadow,
      font_weight: editorConfig.font_weight,
      text_align: editorConfig.text_align,
    },
    layout: {
      quote_text: editorConfig.quote_text,
      text_boxes: editorConfig.text_boxes,
      text_x_percent: editorConfig.text_x_percent,
      text_y_percent: editorConfig.text_y_percent,
    },
    ...(normalizedDiagnostics ? { diagnostics: normalizedDiagnostics } : {}),
  };
};

export const quoteTemplateToEditorConfig = (template?: Partial<QuoteTemplate> | null, fallbackText = DEFAULT_QUOTE_TEXT) => {
  const normalized = normalizeQuoteTemplate(template, fallbackText);
  return normalizeQuoteEditorConfig(
    {
      activeCanvasKey: normalized.canvas.preset,
      background_image_uri: normalized.background.image_uri,
      background_image_crop: normalized.background.crop,
      image_opacity: normalized.background.opacity,
      bg_color: normalized.background.color,
      font_size: normalized.typography.font_size,
      font_color: normalized.typography.font_color,
      font_family: normalized.typography.font_family,
      font_shadow: normalized.typography.font_shadow,
      font_weight: normalized.typography.font_weight,
      text_align: normalized.typography.text_align,
      quote_text: normalized.layout.quote_text,
      text_boxes: normalized.layout.text_boxes,
      text_x_percent: normalized.layout.text_x_percent,
      text_y_percent: normalized.layout.text_y_percent,
    },
    fallbackText,
  );
};

export const editorConfigToQuoteTemplate = (
  config?: Partial<QuoteEditorConfig> | null,
  templateName = DEFAULT_TEMPLATE_NAME,
  diagnostics?: QuoteTemplateDiagnostics | null,
): QuoteTemplate => {
  const normalizedDiagnostics = normalizeTemplateDiagnostics(diagnostics);
  const normalized = normalizeQuoteEditorConfig(config, DEFAULT_QUOTE_TEXT);
  return {
    schema_version: 1,
    template_name: templateName,
    canvas: {
      preset: normalized.activeCanvasKey,
    },
    background: {
      image_uri: normalized.background_image_uri,
      crop: normalized.background_image_crop,
      color: normalized.bg_color,
      opacity: normalized.image_opacity,
    },
    typography: {
      font_size: normalized.font_size,
      font_color: normalized.font_color,
      font_family: normalized.font_family,
      font_shadow: normalized.font_shadow,
      font_weight: normalized.font_weight,
      text_align: normalized.text_align,
    },
    layout: {
      quote_text: normalized.quote_text,
      text_boxes: normalized.text_boxes,
      text_x_percent: normalized.text_x_percent,
      text_y_percent: normalized.text_y_percent,
    },
    ...(normalizedDiagnostics ? { diagnostics: normalizedDiagnostics } : {}),
  };
};
