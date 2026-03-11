const DEFAULT_APP_COLOR = "#6b7280";

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

function lighten(hex: string, factor: number): string {
  const { r, g, b } = toRgb(hex);
  const rr = clampChannel(r + (255 - r) * factor);
  const gg = clampChannel(g + (255 - g) * factor);
  const bb = clampChannel(b + (255 - b) * factor);
  return toHexColor(rr, gg, bb);
}

export function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function applyAppThemeColor(appColor: unknown) {
  if (typeof document === "undefined") return;

  const base = normalizeHexColor(appColor);
  const dark = isDarkMode();
  const { r, g, b } = toRgb(base);

  if (dark) {
    // Dark mode: use a slightly lighter/more vivid version of the base color
    const menuIcon = lighten(base, 0.25);
    const menuIconActive = base;
    const active = darken(base, 0.82);
    const accentSoft = `rgba(${r}, ${g}, ${b}, 0.16)`;
    const bg0 = blend(base, "#0a0d14", 0.94);
    const bg1 = blend(base, "#111827", 0.92);
    const card2 = blend(base, "#0d1117", 0.94);
    const sidebarBg = blend(base, "#0a0e18", 0.92);
    const sidebarSurface = blend(base, "#111827", 0.90);
    const contentBg = blend(base, "#0a0e18", 0.94);

    const root = document.documentElement;
    root.style.setProperty("--menu-icon", menuIcon);
    root.style.setProperty("--menu-icon-active", menuIconActive);
    root.style.setProperty("--primary", active);
    root.style.setProperty("--accent-soft", accentSoft);
    root.style.setProperty("--bg0", bg0);
    root.style.setProperty("--bg1", bg1);
    root.style.setProperty("--card2", card2);
    root.style.setProperty("--sidebar-bg", sidebarBg);
    root.style.setProperty("--sidebar-surface", sidebarSurface);
    root.style.setProperty("--content-bg", contentBg);
  } else {
    // Light mode (original behaviour)
    const active = darken(base, 0.78);
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
}
