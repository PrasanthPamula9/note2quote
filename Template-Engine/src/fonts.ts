export type FontFamilyOption = {
  family: string;
  label: string;
  category: string;
  bestFor: string;
  fallbackFamily: 'sans-serif' | 'serif' | 'monospace';
};

export const DEFAULT_FONT_FAMILY = 'Inter';

export const SUPPORTED_FONT_FAMILIES: FontFamilyOption[] = [
  { family: 'Inter', label: 'Inter', category: 'Modern Sans', bestFor: 'Premium modern quotes, clean templates', fallbackFamily: 'sans-serif' },
  { family: 'Poppins', label: 'Poppins', category: 'Modern Sans', bestFor: 'Instagram-style aesthetic quotes', fallbackFamily: 'sans-serif' },
  { family: 'Lato', label: 'Lato', category: 'Modern Sans', bestFor: 'Clean, highly readable quote text', fallbackFamily: 'sans-serif' },
  { family: 'Open Sans', label: 'Open Sans', category: 'Modern Sans', bestFor: 'Long quotes, body text', fallbackFamily: 'sans-serif' },
  { family: 'Nunito Sans', label: 'Nunito Sans', category: 'Modern Sans', bestFor: 'Friendly, soft emotional quotes', fallbackFamily: 'sans-serif' },
  { family: 'Work Sans', label: 'Work Sans', category: 'Modern Sans', bestFor: 'Minimal professional quotes', fallbackFamily: 'sans-serif' },
  { family: 'Raleway', label: 'Raleway', category: 'Elegant Sans', bestFor: 'Stylish headings, premium minimal look', fallbackFamily: 'sans-serif' },
  { family: 'Montserrat', label: 'Montserrat', category: 'Modern Sans', bestFor: 'Bold social media captions', fallbackFamily: 'sans-serif' },
  { family: 'Playfair Display', label: 'Playfair Display', category: 'Serif', bestFor: 'Luxury, romantic, premium quote headings', fallbackFamily: 'serif' },
  { family: 'Lora', label: 'Lora', category: 'Serif', bestFor: 'Emotional, poetry, storytelling quotes', fallbackFamily: 'serif' },
  { family: 'Merriweather', label: 'Merriweather', category: 'Serif', bestFor: 'Long readable quotes', fallbackFamily: 'serif' },
  { family: 'Libre Baskerville', label: 'Libre Baskerville', category: 'Serif', bestFor: 'Editorial, classic, premium quotes', fallbackFamily: 'serif' },
  { family: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'Serif', bestFor: 'Luxury, cinematic, poetic templates', fallbackFamily: 'serif' },
  { family: 'EB Garamond', label: 'EB Garamond', category: 'Serif', bestFor: 'Classic literature-style quotes', fallbackFamily: 'serif' },
  { family: 'Crimson Pro', label: 'Crimson Pro', category: 'Serif', bestFor: 'Poetry, deep thoughts, elegant quotes', fallbackFamily: 'serif' },
  { family: 'Bebas Neue', label: 'Bebas Neue', category: 'Display Bold', bestFor: 'Motivational, gym, hustle quotes', fallbackFamily: 'sans-serif' },
  { family: 'Anton', label: 'Anton', category: 'Display Bold', bestFor: 'Strong viral quote posters', fallbackFamily: 'sans-serif' },
  { family: 'Oswald', label: 'Oswald', category: 'Condensed Sans', bestFor: 'Poster-style quotes', fallbackFamily: 'sans-serif' },
  { family: 'Archivo Black', label: 'Archivo Black', category: 'Display Bold', bestFor: 'High-impact titles', fallbackFamily: 'sans-serif' },
  { family: 'League Spartan', label: 'League Spartan', category: 'Display Bold', bestFor: 'Premium bold headings', fallbackFamily: 'sans-serif' },
  { family: 'Great Vibes', label: 'Great Vibes', category: 'Script', bestFor: 'Romantic, wedding, luxury quotes', fallbackFamily: 'serif' },
  { family: 'Dancing Script', label: 'Dancing Script', category: 'Script', bestFor: 'Casual handwritten quotes', fallbackFamily: 'serif' },
  { family: 'Satisfy', label: 'Satisfy', category: 'Script', bestFor: 'Elegant handwritten quotes', fallbackFamily: 'serif' },
  { family: 'Caveat', label: 'Caveat', category: 'Handwritten', bestFor: 'Journal, personal, note-style quotes', fallbackFamily: 'serif' },
  { family: 'Sacramento', label: 'Sacramento', category: 'Script', bestFor: 'Signature-style premium quotes', fallbackFamily: 'serif' },
  { family: 'Special Elite', label: 'Special Elite', category: 'Typewriter', bestFor: 'Vintage typewriter, dark academia', fallbackFamily: 'monospace' },
  { family: 'Courier Prime', label: 'Courier Prime', category: 'Typewriter', bestFor: 'Clean readable typewriter quotes', fallbackFamily: 'monospace' },
  { family: 'Cutive Mono', label: 'Cutive Mono', category: 'Typewriter', bestFor: 'Minimal vintage quote templates', fallbackFamily: 'monospace' },
  { family: 'IBM Plex Mono', label: 'IBM Plex Mono', category: 'Mono / Typewriter', bestFor: 'Modern typewriter, tech, notes', fallbackFamily: 'monospace' },
  { family: 'Space Mono', label: 'Space Mono', category: 'Mono / Typewriter', bestFor: 'Retro-modern quote designs', fallbackFamily: 'monospace' },
];

export const SUPPORTED_FONT_FAMILY_NAMES = SUPPORTED_FONT_FAMILIES.map((font) => font.family);

export const normalizeFontFamily = (value: unknown) => {
  const candidate = String(value ?? '').trim();
  if (SUPPORTED_FONT_FAMILY_NAMES.includes(candidate)) {
    return candidate;
  }

  const lower = candidate.toLowerCase();
  const match = SUPPORTED_FONT_FAMILIES.find((font) => font.family.toLowerCase() === lower || font.label.toLowerCase() === lower);
  return match?.family ?? DEFAULT_FONT_FAMILY;
};
