import React, { createContext, useContext } from 'react';
import { useFonts } from '@shopify/react-native-skia';
import { BUNDLED_FONT_ASSETS } from '../utils/bundledFonts';

const BundledFontProviderContext = createContext<ReturnType<typeof useFonts> | null>(null);

const bundledFontSources = Object.fromEntries(
  Object.entries(BUNDLED_FONT_ASSETS).map(([family, asset]) => [family, [asset]]),
) as Record<string, Array<(typeof BUNDLED_FONT_ASSETS)[keyof typeof BUNDLED_FONT_ASSETS]>>;

export function BundledFontProviderGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontProvider = useFonts(bundledFontSources);

  return (
    <BundledFontProviderContext.Provider value={fontProvider}>
      {children}
    </BundledFontProviderContext.Provider>
  );
}

export function useBundledFontProvider() {
  return useContext(BundledFontProviderContext);
}
