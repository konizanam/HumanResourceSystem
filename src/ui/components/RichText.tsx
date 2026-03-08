import DOMPurify from "dompurify";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const ALLOWED_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "br",
  "h1",
  "h2",
  "h3",
  "p",
  "div",
  "blockquote",
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

function ToolbarIconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      {children}
    </svg>
  );
}

function BoldIcon() {
  return (
    <ToolbarIconBase>
      <path
        d="M7 5h6a4 4 0 0 1 0 8H7V5Zm0 8h7a4 4 0 1 1 0 8H7v-8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </ToolbarIconBase>
  );
}

function ItalicIcon() {
  return (
    <ToolbarIconBase>
      <path d="M10 4h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 20h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 4 10 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </ToolbarIconBase>
  );
}

function UnderlineIcon() {
  return (
    <ToolbarIconBase>
      <path
        d="M7 4v7a5 5 0 0 0 10 0V4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </ToolbarIconBase>
  );
}

function BulletsIcon() {
  return (
    <ToolbarIconBase>
      <path d="M9 6h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 6h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M5 12h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M5 18h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </ToolbarIconBase>
  );
}

function NumberedIcon() {
  return (
    <ToolbarIconBase>
      <path d="M10 6h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 12h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 18h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 7h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 17h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </ToolbarIconBase>
  );
}

function IndentIcon() {
  return (
    <ToolbarIconBase>
      <path d="M4 6h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 9l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </ToolbarIconBase>
  );
}

function OutdentIcon() {
  return (
    <ToolbarIconBase>
      <path d="M4 6h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 9l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </ToolbarIconBase>
  );
}

function LinkIcon() {
  return (
    <ToolbarIconBase>
      <path
        d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ToolbarIconBase>
  );
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
  required,
}: {
  value: string;
  onChange: (nextHtml: string) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastPropValueRef = useRef<string>("");

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

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

  function formatBlock(tag: "p" | "h1" | "h2" | "h3") {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
    const html = editorRef.current?.innerHTML ?? "";
    lastPropValueRef.current = html;
    onChange(html);
  }

  function openLinkModal() {
    if (disabled) return;
    editorRef.current?.focus();

    const selectionText = typeof window !== "undefined" ? (window.getSelection?.()?.toString() ?? "") : "";
    setLinkUrl("");
    setLinkText(selectionText);
    setLinkModalOpen(true);
  }

  function insertLink() {
    if (disabled) return;
    const url = String(linkUrl ?? "").trim();
    if (!url) return;

    editorRef.current?.focus();

    const selectionText = typeof window !== "undefined" ? (window.getSelection?.()?.toString() ?? "") : "";
    const displayText = String(linkText ?? "").trim() || selectionText || url;
    const html = `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(displayText)}</a>`;

    document.execCommand("insertHTML", false, html);

    const next = editorRef.current?.innerHTML ?? "";
    lastPropValueRef.current = next;
    onChange(next);
    setLinkModalOpen(false);
  }

  return (
    <div className="richTextRoot">
      <div className="richTextToolbar" role="toolbar" aria-label="Formatting">
        <button className="btn btnGhost btnSm" type="button" onClick={() => formatBlock("h1")} disabled={disabled} aria-label="Heading 1" title="Heading 1">
          H1
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={() => formatBlock("h2")} disabled={disabled} aria-label="Heading 2" title="Heading 2">
          H2
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={() => formatBlock("h3")} disabled={disabled} aria-label="Heading 3" title="Heading 3">
          H3
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={() => formatBlock("p")} disabled={disabled} aria-label="Normal" title="Normal">
          Normal
        </button>

        <button className="btn btnGhost btnSm" type="button" onClick={() => exec("bold")} disabled={disabled} aria-label="Bold" title="Bold">
          <BoldIcon />
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={() => exec("italic")} disabled={disabled} aria-label="Italic" title="Italic">
          <ItalicIcon />
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={() => exec("underline")} disabled={disabled} aria-label="Underline" title="Underline">
          <UnderlineIcon />
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={() => exec("indent")} disabled={disabled} aria-label="Indent" title="Indent">
          <IndentIcon />
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={() => exec("outdent")} disabled={disabled} aria-label="Outdent" title="Outdent">
          <OutdentIcon />
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={() => exec("insertUnorderedList")} disabled={disabled} aria-label="Bullets" title="Bullets">
          <BulletsIcon />
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={() => exec("insertOrderedList")} disabled={disabled} aria-label="Numbered" title="Numbered">
          <NumberedIcon />
        </button>
        <button className="btn btnGhost btnSm" type="button" onClick={openLinkModal} disabled={disabled} aria-label="Link" title="Link">
          <LinkIcon />
        </button>
      </div>

      <div
        ref={editorRef}
        className="input textarea richTextEditor"
        contentEditable={!disabled}
        role="textbox"
        aria-multiline="true"
        aria-required={required ? "true" : undefined}
        aria-disabled={disabled ? "true" : "false"}
        onInput={() => {
          const html = editorRef.current?.innerHTML ?? "";
          lastPropValueRef.current = html;
          onChange(html);
        }}
        data-placeholder={placeholder ?? "Type here…"}
      />

      {linkModalOpen ? (
        <div
          className="modalOverlay"
          role="presentation"
          onMouseDown={() => {
            if (disabled) return;
            setLinkModalOpen(false);
          }}
        >
          <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Insert Link</div>
            <div className="modalMessage" style={{ marginTop: 10 }}>
              <label className="field">
                <span className="fieldLabel">URL</span>
                <input className="input" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" />
              </label>
              <label className="field" style={{ marginTop: 10 }}>
                <span className="fieldLabel">Link name</span>
                <input className="input" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="e.g. Company website" />
              </label>
            </div>
            <div className="modalActions">
              <button className="btn btnGhost" type="button" onClick={() => setLinkModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btnPrimary" type="button" onClick={insertLink}>
                Insert
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
