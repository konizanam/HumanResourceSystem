import DOMPurify from "dompurify";
import { useEffect, useMemo, useRef } from "react";

const ALLOWED_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "br",
  "p",
  "div",
  "ul",
  "ol",
  "li",
  "a",
] as const;

const ALLOWED_ATTR = ["href", "target", "rel"] as const;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function looksLikeHtml(input: string): boolean {
  const v = String(input ?? "");
  return /<\/?[a-z][\s\S]*>/i.test(v);
}

export function plainTextToHtml(input: string): string {
  const raw = String(input ?? "");
  if (!raw) return "";
  return escapeHtml(raw).replace(/\r\n|\r|\n/g, "<br />");
}

export function sanitizeRichTextHtml(html: string): string {
  const raw = String(html ?? "");
  if (!raw.trim()) return "";

  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
    FORBID_TAGS: ["style", "script"],
    FORBID_ATTR: ["style", "onerror", "onload"],
  });
}

export function normalizeRichTextForSave(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!looksLikeHtml(raw)) return raw;
  return sanitizeRichTextHtml(raw);
}

export function richTextToPlainText(value: string): string {
  const raw = String(value ?? "");
  if (!raw) return "";
  if (!looksLikeHtml(raw)) return raw;

  if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
    try {
      const doc = new window.DOMParser().parseFromString(raw, "text/html");
      return (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
    } catch {
      // fall through
    }
  }

  return raw
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toEditorHtml(value: string): string {
  const raw = String(value ?? "");
  if (!raw.trim()) return "";
  return looksLikeHtml(raw) ? raw : plainTextToHtml(raw);
}

export function RichTextView({
  value,
  className,
  empty = "—",
}: {
  value: string | null | undefined;
  className?: string;
  empty?: string;
}) {
  const html = useMemo(() => {
    const raw = String(value ?? "");
    if (!raw.trim()) return "";
    if (looksLikeHtml(raw)) return sanitizeRichTextHtml(raw);
    return plainTextToHtml(raw);
  }, [value]);

  if (!html) return <span className={className}>{empty}</span>;

  return (
    <div
      className={className ? `${className} richTextContent` : "richTextContent"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function RichTextEditor({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (nextHtml: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastPropValueRef = useRef<string>("");

  useEffect(() => {
    if (!editorRef.current) return;
    if (value === lastPropValueRef.current) return;

    const nextHtml = toEditorHtml(value);
    if (editorRef.current.innerHTML !== nextHtml) {
      editorRef.current.innerHTML = nextHtml;
    }
    lastPropValueRef.current = value;
  }, [value]);

  function exec(command: string) {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command);
    const html = editorRef.current?.innerHTML ?? "";
    lastPropValueRef.current = html;
    onChange(html);
  }

  function onLink() {
    if (disabled) return;
    editorRef.current?.focus();
    const url = window.prompt("Enter link URL");
    if (!url) return;
    document.execCommand("createLink", false, url);
    const html = editorRef.current?.innerHTML ?? "";
    lastPropValueRef.current = html;
    onChange(html);
  }

  return (
    <div className="richTextRoot">
      <div className="richTextToolbar" role="toolbar" aria-label="Formatting">
        <button className="btn btnGhost btnSm" type="button" onClick={() => exec("bold")} disabled={disabled}>
          Bold
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={() => exec("italic")} disabled={disabled}>
          Italic
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={() => exec("underline")} disabled={disabled}>
          Underline
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={() => exec("insertUnorderedList")} disabled={disabled}>
          Bullets
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={() => exec("insertOrderedList")} disabled={disabled}>
          Numbered
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={onLink} disabled={disabled}>
          Link
        </button>
      </div>

      <div
        ref={editorRef}
        className="input textarea richTextEditor"
        contentEditable={!disabled}
        role="textbox"
        aria-multiline="true"
        aria-disabled={disabled ? "true" : "false"}
        onInput={() => {
          const html = editorRef.current?.innerHTML ?? "";
          lastPropValueRef.current = html;
          onChange(html);
        }}
        data-placeholder={placeholder ?? "Type here…"}
      />
    </div>
  );
}
