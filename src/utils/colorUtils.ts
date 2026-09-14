/**
 * Parses any valid color string (hex, rgb, rgba) and returns a standard #rrggbb hex string
 * for use with <input type="color">
 */
export function colorToHex(color: string): string {
  if (!color) return '#000000';
  const trimmed = color.trim().toLowerCase();

  // #fff or #ffffff
  if (trimmed.startsWith('#')) {
    if (trimmed.length === 4) {
      return (
        '#' +
        trimmed[1] +
        trimmed[1] +
        trimmed[2] +
        trimmed[2] +
        trimmed[3] +
        trimmed[3]
      );
    }
    return trimmed.slice(0, 7);
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10)));
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10)));
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10)));
    return (
      '#' +
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0')
    );
  }

  return '#000000';
}

/**
 * Validates if string is a valid HEX or RGB/RGBA color
 */
export function isValidColor(color: string): boolean {
  if (!color) return false;
  const s = new Option().style;
  s.color = color;
  return s.color !== '';
}
