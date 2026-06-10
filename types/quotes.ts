import type { FontWeight, TextAlign } from '@shopify/react-native-skia';

export type CanvasPresetKey =
  | 'instagram_post_square'
  | 'instagram_post_portrait'
  | 'instagram_post_landscape'
  | 'instagram_story';

export type QuoteImageCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
};

export type UserProfile = {
  name: string;
  email: string;
  instagram_handle: string;
};

export type UnsplashImageAttribution = {
  photo_id: string;
  photographer_name: string;
  photographer_profile_url: string;
  photo_page_url: string;
  download_location: string;
};

export type QuoteTextBox = {
  id: string;
  text: string;
  x_percent: number;
  y_percent: number;
  width_percent?: number;
  height_percent?: number;
  font_color?: string;
  font_size?: number;
  font_family?: string;
  font_shadow?: number;
  font_weight?: FontWeight;
  text_align?: TextAlign;
};

export type QuoteEditorConfig = {
  activeCanvasKey: CanvasPresetKey;
  background_image_uri: string | null;
  background_image_crop: QuoteImageCrop | null;
  background_image_source: 'camera' | 'device' | 'unsplash' | null;
  unsplash_attribution: UnsplashImageAttribution | null;
  image_opacity: number;
  font_size: number;
  font_color: string;
  bg_color: string;
  font_family: string;
  font_shadow: number;
  font_weight: FontWeight;
  text_align: TextAlign;
  quote_text: string;
  text_boxes: QuoteTextBox[];
  text_x_percent: number;
  text_y_percent: number;
};

export type QuoteTemplateDiagnostics = {
  source_image_uri?: string | null;
  source_image_width?: number | null;
  source_image_height?: number | null;
  confidence?: number | null;
  warnings?: string[];
  notes?: string | null;
};

export type QuoteTemplateCanvas = {
  preset: CanvasPresetKey;
};

export type QuoteTemplateBackground = {
  image_uri: string | null;
  crop: QuoteImageCrop | null;
  color: string;
  opacity: number;
};

export type QuoteTemplateTypography = {
  font_size: number;
  font_color: string;
  font_family: string;
  font_shadow: number;
  font_weight: FontWeight;
  text_align: TextAlign;
};

export type QuoteTemplateLayout = {
  quote_text: string;
  text_boxes: QuoteTextBox[];
  text_x_percent: number;
  text_y_percent: number;
};

export type QuoteTemplate = {
  schema_version: 1;
  template_name: string;
  canvas: QuoteTemplateCanvas;
  background: QuoteTemplateBackground;
  typography: QuoteTemplateTypography;
  layout: QuoteTemplateLayout;
  diagnostics?: QuoteTemplateDiagnostics;
};

export interface Quote {
  id: string;
  quote_text: string;
  background_image_uri: string | null;
  quote_category_id: string;
  pinned: number;
  editor_config: QuoteEditorConfig;
  created_at: number;
  updated_at: number;
}

export interface QuoteCategory {
  id: string;
  name: string;
  is_default: number;
  created_at: number;
  updated_at: number;
  quote_count?: number;
}
