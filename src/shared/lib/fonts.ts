/**
 * Font registry for RoomCast.
 *
 * All display-selectable fonts are listed here. The CSS for each font is
 * loaded via @fontsource imports in globals.css, so every font listed
 * below is available without any CDN dependency.
 */

export interface FontDefinition {
  /** Stable identifier stored in DB / config JSON (e.g. "inter") */
  id: string;
  /** Human-readable label shown in font selectors */
  name: string;
  /** CSS font-family value including fallbacks */
  family: string;
}

export const AVAILABLE_FONTS: readonly FontDefinition[] = [
  { id: "inter", name: "Inter", family: "'Inter Variable', 'Inter', sans-serif" },
  { id: "roboto", name: "Roboto", family: "'Roboto Flex Variable', 'Roboto', sans-serif" },
  { id: "dm-sans", name: "DM Sans", family: "'DM Sans Variable', 'DM Sans', sans-serif" },
  { id: "geist", name: "Geist Sans", family: "'Geist Sans', sans-serif" },
  { id: "nunito", name: "Nunito", family: "'Nunito Variable', 'Nunito', sans-serif" },
  { id: "source-sans", name: "Source Sans", family: "'Source Sans 3 Variable', 'Source Sans 3', sans-serif" },
] as const;

/** Default font used when no font is configured or the configured font is unknown. */
export const DEFAULT_FONT = AVAILABLE_FONTS[0];

/**
 * Resolve a font id (e.g. "inter", "roboto") to a CSS font-family string.
 * Falls back to the default font (Inter) if the id is not found.
 */
export function getFontFamily(fontId: string): string {
  return AVAILABLE_FONTS.find((f) => f.id === fontId)?.family ?? DEFAULT_FONT.family;
}

/**
 * Font options formatted for use in <select> elements.
 * Value is the font id, label is the human-readable name.
 */
export const FONT_OPTIONS = AVAILABLE_FONTS.map((f) => ({
  value: f.id,
  label: f.name,
}));
