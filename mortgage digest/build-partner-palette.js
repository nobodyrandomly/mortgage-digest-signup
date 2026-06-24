// ============================================================================
// build-partner-palette.js
// Expands a partner's 1–2 brand colors into a full, contrast-safe theme token
// set for the digest email. The legibility/fallback logic lives HERE, so that
// no matter how light, dark, or saturated a partner's color is, every piece of
// text stays readable and every fill gets correctly-contrasting text on top.
//
// Usage (at setup OR per-combo at send time):
//   const tokens = buildPartnerPalette({ primary: '#2E7D32', secondary: '#1B5E20' });
//   // tokens = { C_HEADER_BG: '#...', C_ACCENT_INK: '#...', ... }
//
// Then replace {{C_*}} placeholders in the base HTML with tokens[name].
//
// Semantic colors (rate up = red, down = green, per-source badges) are NOT
// themed — they carry meaning, so the base HTML keeps them as literals.
// ============================================================================

// ── color math ──
const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
const hexToRgb = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const rgbToHex = ({ r, g, b }) =>
  '#' + [r, g, b].map(c => clamp(c).toString(16).padStart(2, '0')).join('').toUpperCase();
const isHex = (hex) => /^#?[0-9a-f]{6}$/i.test(String(hex || '').trim());

// linear blend toward a target color; t=0 keeps base, t=1 = target
const mix = (hex, target, t) => {
  const a = hexToRgb(hex), b = hexToRgb(target);
  if (!a || !b) return hex;
  return rgbToHex({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
};
const lighten = (hex, t) => mix(hex, '#FFFFFF', t);
const darken  = (hex, t) => mix(hex, '#000000', t);

// WCAG relative luminance + contrast ratio
const lum = (hex) => {
  const c = hexToRgb(hex); if (!c) return 0;
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
const contrast = (h1, h2) => {
  const l1 = lum(h1), l2 = lum(h2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const INK = '#0D1321';   // near-black for body text (constant, always readable on light)
const PAPER = '#FFFFFF';

// pick whichever of white / near-black reads best on a given background fill
const bestTextOn = (bg) => contrast(PAPER, bg) >= contrast(INK, bg) ? PAPER : INK;

// darken a color until it clears a contrast ratio against white — used for
// links / labels / small text sitting on a white card. This is the fallback
// that rescues very light brand colors (a pale gold becomes a readable deep gold).
const inkOnWhite = (hex, ratio = 4.5) => {
  let out = hex;
  for (let i = 0; i < 20 && contrast(out, PAPER) < ratio; i++) out = darken(out, 0.08);
  return out;
};

// darken a color until it's dark enough to host white text (header / footer band)
const toDarkBand = (hex, targetLum = 0.16) => {
  let out = hex;
  for (let i = 0; i < 20 && lum(out) > targetLum; i++) out = darken(out, 0.10);
  return out;
};

// lighten a color until it pops on a dark band (the header eyebrow text)
const toLightOnDark = (hex, bg, ratio = 4.0) => {
  let out = lighten(hex, 0.35);
  for (let i = 0; i < 20 && contrast(out, bg) < ratio; i++) out = lighten(out, 0.10);
  return out;
};

// ── HSL (so we can rotate hue and hold a brand-colored dark, not just mix toward black) ──
const hexToHsl = (hex) => {
  const c = hexToRgb(hex); if (!c) return { h: 0, s: 0, l: 0 };
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s, l };
};
const hslToHex = ({ h, s, l }) => {
  h = (((h % 360) + 360) % 360) / 360;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else { const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3); }
  return rgbToHex({ r: r * 255, g: g * 255, b: b * 255 });
};

// a brand-COLORED dark band for header/footer: keep hue + saturation, just drop
// lightness until white text clears contrast. Green stays green, gold stays amber,
// instead of every partner collapsing to the same near-black.
const brandDark = (hex) => {
  const hsl = hexToHsl(hex);
  hsl.s = Math.max(hsl.s, 0.45);   // keep it colorful, not a washed gray
  hsl.l = 0.27;                    // rich dark with the brand hue clearly readable
  let out = hslToHex(hsl);
  for (let i = 0; i < 12 && contrast('#FFFFFF', out) < 4.8; i++) {
    hsl.l = Math.max(0.10, hsl.l - 0.03); out = hslToHex(hsl);
  }
  return out;
};

// when a partner gives only ONE color, invent a harmonious-but-distinct second
// hue for the realtor/agent box (so the two boxes differ like the general digest).
// HUE_OFFSET tunes the relationship: 40=analogous, 90=general-digest-like, 120=triadic, 180=complement.
const HUE_OFFSET = 90;
const deriveSecondary = (hex) => {
  const hsl = hexToHsl(hex);
  hsl.h = hsl.h + HUE_OFFSET;
  hsl.s = Math.max(hsl.s, 0.42);                          // vivid enough to read as its own color
  hsl.l = Math.min(0.52, Math.max(0.40, hsl.l));          // usable mid tone for tint + ink derivations
  return hslToHex(hsl);
};

// ── the JWH default palette (used for the general / unbranded digest) ──
// Matches the current hand-built look exactly so general digests don't change.
const JWH_DEFAULT = {
  C_PAGE_BG: '#EEF0F5', C_CARD_BG: '#FFFFFF', C_BORDER: '#E2E5EC',
  C_STRIPE: '#3B6FE8',
  C_HEADER_BG: '#0D1321', C_HEADER_TEXT: '#FFFFFF', C_HEADER_EYEBROW: '#3B6FE8',
  C_ACCENT_FILL: '#3B6FE8', C_ON_ACCENT: '#FFFFFF', C_ACCENT_INK: '#3B6FE8',
  C_BOX1_BG: '#EEF2FF', C_BOX1_BORDER: '#C7D2FE', C_BOX1_LABEL: '#3B6FE8', C_BOX1_SUBLABEL: '#0D1321',
  C_BOX2_BG: '#F0FDF4', C_BOX2_BORDER: '#BBF7D0', C_BOX2_LABEL: '#15803D', C_BOX2_TEXT: '#166534',
  C_TEXT_PRIMARY: '#0D1321', C_TEXT_SECONDARY: '#4B5563', C_TEXT_MUTED: '#9CA3AF',
  C_FOOTER_BG: '#0D1321', C_FOOTER_TEXT: '#FFFFFF',
};

/**
 * @param {{primary?:string, secondary?:string}} input  partner brand color(s)
 * @returns {object} full token map; falls back to JWH_DEFAULT if no valid primary
 */
function buildPartnerPalette(input = {}) {
  const primaryRaw = input.primary;
  if (!isHex(primaryRaw)) return { ...JWH_DEFAULT };   // no/invalid color → JWH look

  const P = '#' + String(primaryRaw).replace('#', '').toUpperCase();

  // box2 (realtor/agent) color: use the partner's secondary ONLY if it's a
  // genuinely different hue from the primary. If they gave a same-hue shade
  // (e.g. dark green + light green) or no secondary at all, rotate the primary's
  // hue so the two boxes are always visibly distinct — like the general digest.
  let box2;
  if (isHex(input.secondary)) {
    const sec = '#' + String(input.secondary).replace('#', '').toUpperCase();
    let dh = Math.abs(hexToHsl(sec).h - hexToHsl(P).h); if (dh > 180) dh = 360 - dh;
    box2 = dh >= 30 ? sec : deriveSecondary(P);
  } else {
    box2 = deriveSecondary(P);
  }

  const headerBg = brandDark(P);           // brand-colored dark, not crushed to black
  const accentInk = inkOnWhite(P);          // primary, darkened only if needed, for text/links on white
  const secInk = inkOnWhite(box2);

  return {
    C_PAGE_BG: mix('#EEF0F5', P, 0.06),    // light neutral with a whisper of brand (was reversed → came out dark)
    C_CARD_BG: '#FFFFFF',
    C_BORDER: mix('#E2E5EC', P, 0.10),     // neutral border, faint brand hint

    C_STRIPE: P,                            // vivid brand top/bottom rules
    C_HEADER_BG: headerBg,                  // always dark enough for white text
    C_HEADER_TEXT: '#FFFFFF',
    C_HEADER_EYEBROW: toLightOnDark(P, headerBg),

    C_ACCENT_FILL: P,                       // chips, badges, number circles
    C_ON_ACCENT: bestTextOn(P),             // auto text color on those fills
    C_ACCENT_INK: accentInk,                // section labels, links, bullets on white

    // Market Implications box — primary family
    C_BOX1_BG: lighten(P, 0.90),
    C_BOX1_BORDER: lighten(P, 0.62),
    C_BOX1_LABEL: accentInk,
    C_BOX1_SUBLABEL: darken(accentInk, 0.15),

    // Realtor & Agent box — a distinct hue from the market box
    C_BOX2_BG: lighten(box2, 0.90),
    C_BOX2_BORDER: lighten(box2, 0.60),
    C_BOX2_LABEL: secInk,
    C_BOX2_TEXT: darken(secInk, 0.10),

    C_TEXT_PRIMARY: '#0D1321',              // body text stays near-black for readability
    C_TEXT_SECONDARY: '#4B5563',
    C_TEXT_MUTED: '#9CA3AF',

    C_FOOTER_BG: headerBg,
    C_FOOTER_TEXT: '#FFFFFF',
  };
}

if (typeof module !== 'undefined') module.exports = { buildPartnerPalette, JWH_DEFAULT, contrast, lum, hexToHsl };
