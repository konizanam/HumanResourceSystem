const DEFAULT_APP_COLOR = "#6366f1";

function normalizeHexColor(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) return DEFAULT_APP_COLOR;

  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(withHash);
  if (!match) return DEFAULT_APP_COLOR;

  const hex = match[1].length === 3
    ? match[1].split("").map((c) => c + c).join("")
    : match[1];

  return `#${hex.toLowerCase()}`;
}

function toRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(hex).slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function darken(hex: string, factor: number): string {
  const { r, g, b } = toRgb(hex);
  const rr = clampChannel(r * factor);
  const gg = clampChannel(g * factor);
  const bb = clampChannel(b * factor);
  const asHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${asHex(rr)}${asHex(gg)}${asHex(bb)}`;
}

export function applyAppThemeColor(appColor: unknown) {
  if (typeof document === "undefined") return;

  const base = normalizeHexColor(appColor);
  const active = darken(base, 0.78);
  const { r, g, b } = toRgb(base);
  const accentSoft = `rgba(${r}, ${g}, ${b}, 0.14)`;

  const root = document.documentElement;
  root.style.setProperty("--menu-icon", base);
  root.style.setProperty("--menu-icon-active", active);
  root.style.setProperty("--primary", active);
  root.style.setProperty("--accent-soft", accentSoft);
}
