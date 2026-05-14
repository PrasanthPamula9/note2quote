export type ResponsiveMetrics = {
  isCompact: boolean;
  isTablet: boolean;
  contentMaxWidth: number;
  pagePadding: number;
  sectionPadding: number;
  titleSize: number;
  subtitleSize: number;
  bodySize: number;
  smallTextSize: number;
  cardRadius: number;
  cardGap: number;
  modalWidth: number;
  listColumns: number;
  settingsTileWidth: number;
  settingsTileHeight: number;
  settingsLabelSize: number;
};

const BASE_WIDTH = 375;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const scale = (size: number, width: number) => size * (width / BASE_WIDTH);

const moderateScale = (size: number, width: number, factor = 0.5) =>
  size + (scale(size, width) - size) * factor;

export const getResponsiveMetrics = (width: number, height: number): ResponsiveMetrics => {
  const isTablet = width >= 768;
  const isCompact = width < 360;

  return {
    isCompact,
    isTablet,
    contentMaxWidth: isTablet ? 720 : width,
    pagePadding: Math.round(clamp(moderateScale(16, width), 12, 28)),
    sectionPadding: Math.round(clamp(moderateScale(20, width), 16, 32)),
    titleSize: Math.round(clamp(moderateScale(28, width), 24, isTablet ? 36 : 30)),
    subtitleSize: Math.round(clamp(moderateScale(14, width), 13, 18)),
    bodySize: Math.round(clamp(moderateScale(16, width), 15, 19)),
    smallTextSize: Math.round(clamp(moderateScale(12, width), 11, 14)),
    cardRadius: Math.round(clamp(moderateScale(20, width), 16, 24)),
    cardGap: Math.round(clamp(moderateScale(12, width), 10, 18)),
    modalWidth: Math.min(width - 24, isTablet ? 560 : width - 24),
    listColumns: width >= 900 ? 3 : 2,
    settingsTileWidth: Math.round(clamp(moderateScale(72, width), 68, isTablet ? 88 : 78)),
    settingsTileHeight: Math.round(clamp(moderateScale(84, width), 78, isTablet ? 96 : 88)),
    settingsLabelSize: Math.round(clamp(moderateScale(12, width), 11, 14)),
  };
};
