import type { FontWeight, TextAlign } from '@shopify/react-native-skia';

export type CanvasPresetKey =
  | 'instagram_post_square'
  | 'instagram_post_portrait'
  | 'instagram_post_landscape'
  | 'instagram_story'
  | 'whatsapp_status';

export type QuoteImageCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
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

export interface Quote {
  id: string;
  quote_text: string;
  background_image_uri: string | null;
  editor_config: QuoteEditorConfig;
  created_at: number;
  updated_at: number;
}
