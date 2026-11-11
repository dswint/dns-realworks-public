export const FONT_PACKS = ["fraunces", "figtree"] as const;
export type FontPack = (typeof FONT_PACKS)[number];

export type ThemeColor = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
};

export type ThemeTokens = {
  color: ThemeColor;
  font: {
    display: FontPack;
    body: FontPack;
    eyebrow: FontPack;
  };
  radius: string;
  spacing: {
    unit: string;
  };
  elevation: {
    card: string;
  };
  photography: {
    treatment: "warm" | "cool" | "neutral";
  };
};

export const DEFAULT_THEME: ThemeTokens = {
  color: {
    background: "#f3efe6",
    foreground: "#1c1914",
    card: "#fffdf8",
    cardForeground: "#1c1914",
    popover: "#fffdf8",
    popoverForeground: "#1c1914",
    primary: "#6b4f2a",
    primaryForeground: "#fffdf8",
    secondary: "#e8e1d4",
    secondaryForeground: "#1c1914",
    muted: "#e8e1d4",
    mutedForeground: "#6f675c",
    accent: "#e8e1d4",
    accentForeground: "#1c1914",
    destructive: "#b42318",
    border: "#d9d0c0",
    input: "#cfc5b4",
    ring: "#6b4f2a",
  },
  font: { display: "fraunces", body: "figtree", eyebrow: "figtree" },
  radius: "0.5rem",
  spacing: { unit: "0.25rem" },
  elevation: { card: "0 1px 2px rgb(28 25 20 / 0.06)" },
  photography: { treatment: "warm" },
};

function isHex(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
  );
}

function isFont(value: unknown): value is FontPack {
  return FONT_PACKS.includes(value as FontPack);
}

export function parseTheme(raw: unknown): ThemeTokens {
  if (!raw || typeof raw !== "object") return DEFAULT_THEME;
  const input = raw as Partial<ThemeTokens> & { color?: Partial<ThemeColor> };
  const color = { ...DEFAULT_THEME.color };
  if (input.color && typeof input.color === "object") {
    for (const key of Object.keys(color) as (keyof ThemeColor)[]) {
      const value = input.color[key];
      if (isHex(value)) color[key] = value;
    }
  }
  return {
    color,
    font: {
      display: isFont(input.font?.display)
        ? input.font.display
        : DEFAULT_THEME.font.display,
      body: isFont(input.font?.body)
        ? input.font.body
        : DEFAULT_THEME.font.body,
      eyebrow: isFont(input.font?.eyebrow)
        ? input.font.eyebrow
        : DEFAULT_THEME.font.eyebrow,
    },
    radius:
      typeof input.radius === "string" && input.radius.trim()
        ? input.radius
        : DEFAULT_THEME.radius,
    spacing: {
      unit:
        typeof input.spacing?.unit === "string" && input.spacing.unit.trim()
          ? input.spacing.unit
          : DEFAULT_THEME.spacing.unit,
    },
    elevation: {
      card:
        typeof input.elevation?.card === "string" && input.elevation.card.trim()
          ? input.elevation.card
          : DEFAULT_THEME.elevation.card,
    },
    photography: {
      treatment:
        input.photography?.treatment === "cool" ||
        input.photography?.treatment === "neutral"
          ? input.photography.treatment
          : "warm",
    },
  };
}

const COLOR_CSS: Record<keyof ThemeColor, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  border: "--border",
  input: "--input",
  ring: "--ring",
};

export function themeToCssVars(theme: ThemeTokens): string {
  const parts: string[] = [];
  for (const [key, cssVar] of Object.entries(COLOR_CSS)) {
    parts.push(`${cssVar}:${theme.color[key as keyof ThemeColor]}`);
  }
  parts.push(`--radius:${theme.radius}`);
  parts.push(`--space:${theme.spacing.unit}`);
  parts.push(`--shadow-card:${theme.elevation.card}`);
  parts.push(`--font-display:var(--ff-${theme.font.display})`);
  parts.push(`--font-sans:var(--ff-${theme.font.body})`);
  parts.push(`--font-eyebrow:var(--ff-${theme.font.eyebrow})`);
  const photo =
    theme.photography.treatment === "cool"
      ? "saturate(0.92) hue-rotate(12deg)"
      : theme.photography.treatment === "neutral"
        ? "none"
        : "saturate(1.06) sepia(0.08)";
  parts.push(`--photo-filter:${photo}`);
  return parts.join(";");
}
