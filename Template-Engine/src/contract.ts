import { z } from 'zod';
import { CANVAS_PRESET_KEYS, type CanvasPresetKey } from './canvas.js';
import { DEFAULT_FONT_FAMILY, SUPPORTED_FONT_FAMILY_NAMES, normalizeFontFamily } from './fonts.js';

const percentSchema = z.number().min(0).max(1);
const positiveNumberSchema = z.number().finite().positive();

export const quoteImageCropSchema = z.object({
  x: z.number().finite().min(0),
  y: z.number().finite().min(0),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
});

export const quoteTextBoxSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  x_percent: percentSchema,
  y_percent: percentSchema,
  width_percent: percentSchema,
  height_percent: percentSchema,
  font_color: z.string().min(1).optional(),
  font_size: positiveNumberSchema.optional(),
  font_family: z.string().min(1).optional(),
  font_shadow: z.number().finite().optional(),
  font_weight: z.number().finite().optional(),
  text_align: z.number().finite().optional(),
});

export const quoteTemplateSchema = z.object({
  schema_version: z.literal(1),
  template_name: z.string().min(1),
  canvas: z.object({
    preset: z.enum(CANVAS_PRESET_KEYS as [CanvasPresetKey, ...CanvasPresetKey[]]),
  }),
  background: z.object({
    image_uri: z.string().nullable(),
    crop: quoteImageCropSchema.nullable(),
    color: z.string().min(1),
    opacity: z.number().min(0).max(1),
  }),
  typography: z.object({
    font_size: positiveNumberSchema,
    font_color: z.string().min(1),
    font_family: z.string().min(1),
    font_shadow: z.number().finite(),
    font_weight: z.number().finite(),
    text_align: z.number().finite(),
  }),
  layout: z.object({
    quote_text: z.string().min(1),
    text_boxes: z.array(quoteTextBoxSchema).max(5),
    text_x_percent: percentSchema,
    text_y_percent: percentSchema,
  }),
  diagnostics: z
    .object({
      source_image_uri: z.string().nullable().optional(),
      source_image_width: z.number().finite().nullable().optional(),
      source_image_height: z.number().finite().nullable().optional(),
      confidence: z.number().min(0).max(1).nullable().optional(),
      warnings: z.array(z.string()).optional(),
      notes: z.string().nullable().optional(),
    })
    .optional(),
});

export type QuoteTemplate = z.infer<typeof quoteTemplateSchema>;
export type QuoteTextBox = z.infer<typeof quoteTextBoxSchema>;
export type QuoteImageCrop = z.infer<typeof quoteImageCropSchema>;
export type QuoteTemplateNormalizationHints = {
  templateName?: string;
  canvasPreset?: CanvasPresetKey;
  analysis?: TemplateAnalysis;
  sourceImage?: TemplateImageInput;
};

export type TemplateImageInput = {
  uri: string;
  mimeType?: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type TemplateAgentInput = {
  images: TemplateImageInput[];
  brief?: string;
  templateName?: string;
  canvasHint?: CanvasPresetKey;
};

export type TemplateAnalysis = {
  canvas_preset: CanvasPresetKey;
  source_image_width: number | null;
  source_image_height: number | null;
  dominant_palette: string[];
  visual_hierarchy: string[];
  text_regions: Array<{
    role: 'quote' | 'author' | 'title' | 'subtitle' | 'cta' | 'decorative';
    text: string;
    x_percent: number;
    y_percent: number;
    width_percent: number;
    height_percent: number;
  }>;
  typography_direction: {
    font_family: string;
    font_size: number;
    font_weight: number;
    text_align: number;
    font_shadow: number;
    font_color: string;
  };
  background_direction: {
    image_uri: string | null;
    color: string;
    opacity: number;
  };
  confidence: number;
  warnings: string[];
  notes: string;
};

export const analysisSchema = z.object({
  canvas_preset: z.enum(CANVAS_PRESET_KEYS as [CanvasPresetKey, ...CanvasPresetKey[]]),
  source_image_width: z.number().finite().nullable(),
  source_image_height: z.number().finite().nullable(),
  dominant_palette: z.array(z.string()).max(8),
  visual_hierarchy: z.array(z.string()).max(8),
  text_regions: z.array(
    z.object({
      role: z.enum(['quote', 'author', 'title', 'subtitle', 'cta', 'decorative']),
      text: z.string(),
      x_percent: percentSchema,
      y_percent: percentSchema,
      width_percent: percentSchema,
      height_percent: percentSchema,
    }),
  ),
  typography_direction: z.object({
    font_family: z.string(),
    font_size: positiveNumberSchema,
    font_weight: z.number().finite(),
    text_align: z.number().finite(),
    font_shadow: z.number().finite(),
    font_color: z.string(),
  }),
  background_direction: z.object({
    image_uri: z.string().nullable(),
    color: z.string(),
    opacity: z.number().min(0).max(1),
  }),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  notes: z.string(),
});

export const normalizeSupportedFont = (fontFamily: unknown) => {
  const normalized = normalizeFontFamily(fontFamily);
  return SUPPORTED_FONT_FAMILY_NAMES.includes(normalized) ? normalized : DEFAULT_FONT_FAMILY;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toFiniteNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPercent = (value: unknown, fallback: number) => clamp(toFiniteNumber(value, fallback), 0, 1);

const normalizeCanvasPresetValue = (value: unknown, fallback: CanvasPresetKey = 'instagram_post_square') => {
  const candidate = String(value ?? '').trim();
  return (CANVAS_PRESET_KEYS as readonly string[]).includes(candidate) ? (candidate as CanvasPresetKey) : fallback;
};

const normalizeCropValue = (value: unknown): QuoteImageCrop | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const crop = value as Record<string, unknown>;
  return {
    x: Math.max(0, toFiniteNumber(crop.x, 0)),
    y: Math.max(0, toFiniteNumber(crop.y, 0)),
    width: Math.max(0.0001, toFiniteNumber(crop.width, 1)),
    height: Math.max(0.0001, toFiniteNumber(crop.height, 1)),
    rotation: [0, 90, 180, 270].includes(Number(crop.rotation)) ? (Number(crop.rotation) as QuoteImageCrop['rotation']) : 0,
  };
};

const normalizeTextBoxValue = (
  value: unknown,
  fallback: {
    id: string;
    text: string;
    x_percent: number;
    y_percent: number;
    width_percent: number;
    height_percent: number;
    font_family: string;
    font_color: string;
    font_size: number;
    font_shadow: number;
    font_weight: number;
    text_align: number;
  },
): QuoteTextBox => {
  const box = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  return {
    id: String(box.id ?? fallback.id).trim() || fallback.id,
    text: String(box.text ?? fallback.text).trim() || fallback.text,
    x_percent: toPercent(box.x_percent, fallback.x_percent),
    y_percent: toPercent(box.y_percent, fallback.y_percent),
    width_percent: toPercent(box.width_percent, fallback.width_percent),
    height_percent: toPercent(box.height_percent, fallback.height_percent),
    font_color: String(box.font_color ?? fallback.font_color).trim() || fallback.font_color,
    font_size: Math.max(0.0001, toFiniteNumber(box.font_size, fallback.font_size)),
    font_family: normalizeSupportedFont(box.font_family ?? fallback.font_family),
    font_shadow: toFiniteNumber(box.font_shadow, fallback.font_shadow),
    font_weight: toFiniteNumber(box.font_weight, fallback.font_weight),
    text_align: toFiniteNumber(box.text_align, fallback.text_align),
  };
};

export const normalizeQuoteTemplatePayload = (
  value: unknown,
  hints: QuoteTemplateNormalizationHints = {},
): QuoteTemplate => {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const rawCanvas = raw.canvas && typeof raw.canvas === 'object' ? (raw.canvas as Record<string, unknown>) : {};
  const rawBackground = raw.background && typeof raw.background === 'object' ? (raw.background as Record<string, unknown>) : {};
  const rawTypography = raw.typography && typeof raw.typography === 'object' ? (raw.typography as Record<string, unknown>) : {};
  const rawLayout = raw.layout && typeof raw.layout === 'object' ? (raw.layout as Record<string, unknown>) : {};
  const rawDiagnostics =
    raw.diagnostics && typeof raw.diagnostics === 'object' ? (raw.diagnostics as Record<string, unknown>) : {};

  const analysis = hints.analysis;
  const templateName = String(raw.template_name ?? hints.templateName ?? 'Generated Template').trim() || 'Generated Template';
  const canvasPreset = normalizeCanvasPresetValue(
    rawCanvas.preset ?? analysis?.canvas_preset ?? hints.canvasPreset,
    hints.canvasPreset ?? analysis?.canvas_preset ?? 'instagram_post_square',
  );
  const typographyFamily = normalizeSupportedFont(
    rawTypography.font_family ?? analysis?.typography_direction.font_family ?? DEFAULT_FONT_FAMILY,
  );
  const typographyFontSize = Math.max(
    0.0001,
    toFiniteNumber(rawTypography.font_size, analysis?.typography_direction.font_size ?? 36),
  );
  const typographyFontWeight = toFiniteNumber(
    rawTypography.font_weight,
    analysis?.typography_direction.font_weight ?? 700,
  );
  const typographyTextAlign = toFiniteNumber(
    rawTypography.text_align,
    analysis?.typography_direction.text_align ?? 2,
  );
  const typographyFontShadow = toFiniteNumber(
    rawTypography.font_shadow,
    analysis?.typography_direction.font_shadow ?? 0,
  );
  const typographyFontColor = String(
    rawTypography.font_color ?? analysis?.typography_direction.font_color ?? '#FFFFFF',
  ).trim() || '#FFFFFF';

  const defaultQuoteText =
    String(
      rawLayout.quote_text ??
        hints.analysis?.visual_hierarchy?.[0] ??
        hints.analysis?.text_regions?.find((region) => region.role === 'quote')?.text ??
        hints.analysis?.text_regions?.map((region) => region.text).filter(Boolean).join(' ') ??
        hints.templateName ??
        'Generated template',
    ).trim() || 'Generated template';

  const rawTextBoxes = Array.isArray(rawLayout.text_boxes) ? rawLayout.text_boxes : [];
  const fallbackBoxes = rawTextBoxes.length > 0
    ? rawTextBoxes
    : [
        {
          id: 'text-1',
          text: defaultQuoteText,
          x_percent: 0.1,
          y_percent: 0.15,
          width_percent: 0.8,
          height_percent: 0.55,
          font_family: typographyFamily,
          font_color: typographyFontColor,
          font_size: typographyFontSize,
          font_shadow: typographyFontShadow,
          font_weight: typographyFontWeight,
          text_align: typographyTextAlign,
        },
      ];

  const textBoxes = fallbackBoxes.slice(0, 5).map((box, index) =>
    normalizeTextBoxValue(box, {
      id: `text-${index + 1}`,
      text: defaultQuoteText,
      x_percent: 0.1 + index * 0.02,
      y_percent: 0.15 + index * 0.08,
      width_percent: 0.8,
      height_percent: 0.25,
      font_family: typographyFamily,
      font_color: typographyFontColor,
      font_size: typographyFontSize,
      font_shadow: typographyFontShadow,
      font_weight: typographyFontWeight,
      text_align: typographyTextAlign,
    }),
  );

  const sourceImageWidth =
    rawDiagnostics.source_image_width != null
      ? toFiniteNumber(rawDiagnostics.source_image_width, 0)
      : hints.sourceImage?.width ?? analysis?.source_image_width ?? null;
  const sourceImageHeight =
    rawDiagnostics.source_image_height != null
      ? toFiniteNumber(rawDiagnostics.source_image_height, 0)
      : hints.sourceImage?.height ?? analysis?.source_image_height ?? null;

  const diagnostics = rawDiagnostics || analysis
    ? {
        source_image_uri:
          rawDiagnostics.source_image_uri != null
            ? String(rawDiagnostics.source_image_uri)
            : hints.sourceImage?.uri ?? analysis?.background_direction.image_uri ?? null,
        source_image_width: sourceImageWidth,
        source_image_height: sourceImageHeight,
        confidence:
          rawDiagnostics.confidence != null
            ? clamp(toFiniteNumber(rawDiagnostics.confidence, analysis?.confidence ?? 0.5), 0, 1)
            : analysis?.confidence ?? 0.5,
        warnings:
          Array.isArray(rawDiagnostics.warnings)
            ? rawDiagnostics.warnings.map((warning) => String(warning))
            : analysis?.warnings ?? [],
        notes: String(rawDiagnostics.notes ?? analysis?.notes ?? '').trim() || null,
      }
    : undefined;

  return {
    schema_version: 1,
    template_name: templateName,
    canvas: {
      preset: canvasPreset,
    },
    background: {
      image_uri:
        rawBackground.image_uri != null
          ? String(rawBackground.image_uri)
          : analysis?.background_direction.image_uri ?? hints.sourceImage?.uri ?? null,
      crop: normalizeCropValue(rawBackground.crop),
      color: String(rawBackground.color ?? analysis?.background_direction.color ?? '#222222').trim() || '#222222',
      opacity: clamp(
        toFiniteNumber(rawBackground.opacity, analysis?.background_direction.opacity ?? 0.6),
        0,
        1,
      ),
    },
    typography: {
      font_size: typographyFontSize,
      font_color: typographyFontColor,
      font_family: typographyFamily,
      font_shadow: typographyFontShadow,
      font_weight: typographyFontWeight,
      text_align: typographyTextAlign,
    },
    layout: {
      quote_text: defaultQuoteText,
      text_boxes: textBoxes,
      text_x_percent: toPercent(rawLayout.text_x_percent, analysis?.text_regions?.[0]?.x_percent ?? 0.1),
      text_y_percent: toPercent(rawLayout.text_y_percent, analysis?.text_regions?.[0]?.y_percent ?? 0.15),
    },
    diagnostics,
  };
};

export const sanitizeQuoteTemplate = (template: QuoteTemplate): QuoteTemplate => {
  const typographyFamily = normalizeSupportedFont(template.typography.font_family);
  const textBoxes = template.layout.text_boxes.slice(0, 5).map((box, index) => ({
    ...box,
    text: String(box.text ?? '').trim(),
    x_percent: clamp(box.x_percent, 0, 1),
    y_percent: clamp(box.y_percent, 0, 1),
    width_percent: clamp(box.width_percent, 0, 1),
    height_percent: clamp(box.height_percent, 0, 1),
    font_family: normalizeSupportedFont(box.font_family ?? typographyFamily),
    font_color: box.font_color ?? template.typography.font_color,
    font_size: box.font_size ?? template.typography.font_size,
    font_shadow: box.font_shadow ?? template.typography.font_shadow,
    font_weight: box.font_weight ?? template.typography.font_weight,
    text_align: box.text_align ?? template.typography.text_align,
    id: String(box.id || `text-${index + 1}`),
  }));

  return {
    ...template,
    template_name: String(template.template_name || 'Generated Template').trim(),
    background: {
      ...template.background,
      image_uri: template.background.image_uri ?? null,
      crop: template.background.crop ?? null,
      opacity: clamp(template.background.opacity, 0, 1),
    },
    typography: {
      ...template.typography,
      font_family: typographyFamily,
    },
    layout: {
      ...template.layout,
      quote_text:
        textBoxes
          .map((box) => String(box.text).trim())
          .filter(Boolean)
          .join('\n') || String(template.layout.quote_text || '').trim(),
      text_boxes: textBoxes,
      text_x_percent: clamp(template.layout.text_x_percent, 0, 1),
      text_y_percent: clamp(template.layout.text_y_percent, 0, 1),
    },
    diagnostics: template.diagnostics
      ? {
          ...template.diagnostics,
          source_image_uri: template.diagnostics.source_image_uri ?? null,
          source_image_width: template.diagnostics.source_image_width ?? null,
          source_image_height: template.diagnostics.source_image_height ?? null,
          confidence:
            typeof template.diagnostics.confidence === 'number' && Number.isFinite(template.diagnostics.confidence)
              ? clamp(template.diagnostics.confidence, 0, 1)
              : null,
          warnings: template.diagnostics.warnings ?? [],
          notes: template.diagnostics.notes ?? null,
        }
      : undefined,
  };
};
