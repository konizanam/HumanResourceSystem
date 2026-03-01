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

function toHexColor(r: number, g: number, b: number): string {
  const asHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${asHex(clampChannel(r))}${asHex(clampChannel(g))}${asHex(clampChannel(b))}`;
}

function blend(hex: string, towardHex: string, amount: number): string {
  const a = toRgb(hex);
  const b = toRgb(towardHex);
  const t = Math.max(0, Math.min(1, amount));
  const rr = a.r + (b.r - a.r) * t;
  const gg = a.g + (b.g - a.g) * t;
  const bb = a.b + (b.b - a.b) * t;
  return toHexColor(rr, gg, bb);
}

function darken(hex: string, factor: number): string {
  const { r, g, b } = toRgb(hex);
  const rr = clampChannel(r * factor);
  const gg = clampChannel(g * factor);
  const bb = clampChannel(b * factor);
  return toHexColor(rr, gg, bb);
}

export function applyAppThemeColor(appColor: unknown) {
  if (typeof document === "undefined") return;

  const base = normalizeHexColor(appColor);
  const active = darken(base, 0.78);
  const { r, g, b } = toRgb(base);
  const accentSoft = `rgba(${r}, ${g}, ${b}, 0.14)`;
  const bg0 = blend(base, "#ffffff", 0.96);
  const bg1 = blend(base, "#ffffff", 0.92);
  const card2 = blend(base, "#ffffff", 0.94);
  const sidebarBg = blend(base, "#ffffff", 0.88);
  const sidebarSurface = blend(base, "#ffffff", 0.93);
  const contentBg = blend(base, "#ffffff", 0.95);

  const root = document.documentElement;
  root.style.setProperty("--menu-icon", base);
  root.style.setProperty("--menu-icon-active", active);
  root.style.setProperty("--primary", active);
  root.style.setProperty("--accent-soft", accentSoft);
  root.style.setProperty("--bg0", bg0);
  root.style.setProperty("--bg1", bg1);
  root.style.setProperty("--card2", card2);
  root.style.setProperty("--sidebar-bg", sidebarBg);
  root.style.setProperty("--sidebar-surface", sidebarSurface);
  root.style.setProperty("--content-bg", contentBg);
}
