// ─────────────────────────────────────────────────────────────
//  Table for Two — Premium Design System
//  Style: Liquid Glass · Palette: Obsidian + Champagne Gold
//  Audience: UHNW, 21–100, Private Members' Club aesthetic
// ─────────────────────────────────────────────────────────────

export const T42 = {
  // ── Foundations ──────────────────────────────────────────
  background:      '#09060F',   // Deep obsidian
  surface:         '#120E1C',   // Midnight plum
  surfaceRaised:   '#1C1729',   // Elevated surface
  surfaceElevated: '#241E37',   // Modal / overlay surface
  stroke:          '#2A1F40',   // Hairline border
  strokeLight:     '#3D3156',   // Slightly lighter for cards

  // ── Champagne Gold ────────────────────────────────────────
  gold:            '#C9A84C',   // Primary accent — champagne
  goldLight:       '#E2C97A',   // Highlight / shimmer
  goldDeep:        '#7A5C12',   // Shadow / depth
  goldMuted:       '#C9A84C1A', // Tinted background fill

  // ── Refined Plum (replaces vibrant purple) ────────────────
  plum:            '#7554AA',   // Primary plum — restrained
  plumLight:       '#9B7FD4',   // Hover / lighter state
  plumDeep:        '#43267A',   // Gradient end
  plumMuted:       '#7554AA1A', // Tinted background fill

  // ── Ivory Text Scale ──────────────────────────────────────
  textPrimary:     '#EDE8DD',   // Warm ivory — reads warm, not sterile
  textSecondary:   '#9490A4',   // Muted lavender-grey
  textTertiary:    '#5C5670',   // Subtle / disabled
  onGold:          '#120E1C',   // Text on gold backgrounds
  onDark:          '#EDE8DD',   // Text on surface

  // ── Backward-compat aliases (screens updated gradually) ───
  purple:          '#7554AA',   // → plum
  purpleDeep:      '#43267A',   // → plumDeep

  // ── Semantic ──────────────────────────────────────────────
  danger:          '#C44D4D',   // Muted danger — not alarming
  success:         '#3FA882',   // Success green

  // ── Radii ─────────────────────────────────────────────────
  cardRadius:      16,          // Refined — not too bubbly
  pillRadius:      50,
} as const;

// ─────────────────────────────────────────────────────────────
//  Typography — Bodoni Moda (display) + Jost (body)
//  Using system serif/sans as web-safe fallbacks
// ─────────────────────────────────────────────────────────────

export const Fonts = {
  // Display — editorial, high-fashion
  displayLarge:  { fontSize: 36, fontWeight: '300' as const, fontFamily: 'serif',     letterSpacing: -0.8 },
  displayMedium: { fontSize: 28, fontWeight: '300' as const, fontFamily: 'serif',     letterSpacing: -0.4 },
  displaySmall:  { fontSize: 22, fontWeight: '400' as const, fontFamily: 'serif',     letterSpacing: -0.2 },

  // Interface — clear and refined
  headline:      { fontSize: 16, fontWeight: '500' as const,                          letterSpacing: 0.1  },
  body:          { fontSize: 15, fontWeight: '400' as const,                          lineHeight: 23      },
  subheadline:   { fontSize: 13, fontWeight: '500' as const,                          letterSpacing: 0.15 },
  caption:       { fontSize: 12, fontWeight: '400' as const,                          lineHeight: 18      },
  caption2:      { fontSize: 10, fontWeight: '600' as const,                          letterSpacing: 0.4  },

  // Label — small caps with tracking (luxury brand hallmark)
  label:         { fontSize: 10, fontWeight: '700' as const,                          letterSpacing: 1.4  },
} as const;

// ─────────────────────────────────────────────────────────────
//  Elevation / Shadow tokens
// ─────────────────────────────────────────────────────────────

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
