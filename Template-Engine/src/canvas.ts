export type CanvasPresetKey =
  | 'instagram_post_square'
  | 'instagram_post_portrait'
  | 'instagram_post_landscape'
  | 'instagram_story';

export type CanvasPresetMeta = {
  key: CanvasPresetKey;
  label: string;
  nativeWidth: number;
  nativeHeight: number;
  aspectRatio: number;
};

export const CANVAS_PRESETS: Record<CanvasPresetKey, CanvasPresetMeta> = {
  instagram_post_square: {
    key: 'instagram_post_square',
    label: 'Instagram Post - Square',
    nativeWidth: 1080,
    nativeHeight: 1080,
    aspectRatio: 1,
  },
  instagram_post_portrait: {
    key: 'instagram_post_portrait',
    label: 'Instagram Post - Portrait',
    nativeWidth: 1080,
    nativeHeight: 1350,
    aspectRatio: 1080 / 1350,
  },
  instagram_post_landscape: {
    key: 'instagram_post_landscape',
    label: 'Instagram Post - Landscape',
    nativeWidth: 1080,
    nativeHeight: 566,
    aspectRatio: 1080 / 566,
  },
  instagram_story: {
    key: 'instagram_story',
    label: 'Instagram Story',
    nativeWidth: 1080,
    nativeHeight: 1920,
    aspectRatio: 1080 / 1920,
  },
};

export const CANVAS_PRESET_KEYS = Object.keys(CANVAS_PRESETS) as CanvasPresetKey[];

export const pickCanvasPreset = (width?: number | null, height?: number | null): CanvasPresetKey => {
  if (!width || !height || width <= 0 || height <= 0) {
    return 'instagram_post_square';
  }

  const ratio = width / height;
  return CANVAS_PRESET_KEYS.reduce(
    (best, key) => {
      const current = CANVAS_PRESETS[key];
      const currentDelta = Math.abs(current.aspectRatio - ratio);
      if (currentDelta < best.delta) {
        return { key, delta: currentDelta };
      }
      return best;
    },
    { key: 'instagram_post_square' as CanvasPresetKey, delta: Number.POSITIVE_INFINITY },
  ).key;
};
