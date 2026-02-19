import { useEffect, useMemo, useRef, useState } from "react";
import {
  createEmailTemplate,
  getEmailTemplates,
  updateEmailTemplate,
  type EmailTemplate,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";

function formatUpdatedAt(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function EmailTemplatesPage() {
  const { accessToken } = useAuth();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const editingTemplate = useMemo(
    () => templates.find((t) => t.key === editingKey) ?? null,
    [templates, editingKey],
  );

  const [editSubject, setEditSubject] = useState("");
  const [editBodyText, setEditBodyText] = useState("");
  const [editPlaceholders, setEditPlaceholders] = useState<string>("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const isDirty = Boolean(
    editingTemplate &&
      (editTitle !== (editingTemplate.title ?? "") ||
        editDescription !== (editingTemplate.description ?? "") ||
        editSubject !== editingTemplate.subject ||
        editBodyText !== (editingTemplate.body_text ?? "") ||
        editPlaceholders.trim() !== (editingTemplate.placeholders ?? []).join(", ")),
  );

  const placeholders = useMemo(() => {
    return editPlaceholders
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }, [editPlaceholders]);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setSavedMessage(null);

    getEmailTemplates(accessToken)
      .then((data) => {
        if (cancelled) return;
        setTemplates(data);
        // Keep editing selection if it still exists, else close editor.
        setEditingKey((prev) => (prev && data.some((t) => t.key === prev) ? prev : null));
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load email templates");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!editingTemplate) return;
    setEditTitle(editingTemplate.title ?? "");
    setEditDescription(editingTemplate.description ?? "");
    setEditSubject(editingTemplate.subject ?? "");
    setEditBodyText(editingTemplate.body_text ?? "");
    setEditPlaceholders((editingTemplate.placeholders ?? []).join(", "));
    setError(null);
    setSavedMessage(null);
    // Initialize editor content when switching templates.
    window.setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerText = editingTemplate.body_text ?? "";
      }
    }, 0);
  }, [editingTemplate?.key]);

  function startEdit(t: EmailTemplate) {
    setEditingKey(t.key);
  }

  function cancelEdit() {
    setEditingKey(null);
    setError(null);
    setSavedMessage(null);
  }

  function insertPlaceholder(token: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    const placeholderText = `{{${token}}}`;
    const selection = window.getSelection();
    const selectionIsInsideEditor =
      Boolean(selection?.anchorNode) && el.contains(selection!.anchorNode);

    if (!selection || selection.rangeCount === 0 || !selectionIsInsideEditor) {
      // Put caret at end and append.
      el.innerText = (el.innerText ?? "") + placeholderText;
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      setEditBodyText(el.innerText);
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(placeholderText));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    setEditBodyText(el.innerText);
  }

  async function onSave() {
    if (!accessToken || !editingTemplate) return;
    setIsSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const updated = await updateEmailTemplate(accessToken, editingTemplate.key, {
        title: editTitle,
        description: editDescription,
        subject: editSubject,
        body_text: editBodyText,
        placeholders,
      });

      setTemplates((prev) =>
        prev.map((t) => (t.key === updated.key ? updated : t)),
      );
      setSavedMessage("Template saved successfully.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  }

  const [addOpen, setAddOpen] = useState(false);
  const [addKey, setAddKey] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addSubject, setAddSubject] = useState("");
  const [addBody, setAddBody] = useState("");
  const [addPlaceholders, setAddPlaceholders] = useState("");

  async function onCreate() {
    if (!accessToken) return;
    setIsSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const created = await createEmailTemplate(accessToken, {
        key: addKey.trim(),
        title: addTitle.trim(),
        description: addDescription.trim(),
        subject: addSubject,
        body_text: addBody,
        placeholders: addPlaceholders
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      });

      setTemplates((prev) => [...prev, created]);
      setAddOpen(false);
      setAddKey("");
      setAddTitle("");
      setAddDescription("");
      setAddSubject("");
      setAddBody("");
      setAddPlaceholders("");
      setSavedMessage("Template created successfully.");
      setEditingKey(created.key);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create template");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="emailTemplatesHeader">
        <h1 className="pageTitle">Email Templates</h1>
        <button
          type="button"
          className="btn btnGhost btnSm stepperSaveBtn"
          onClick={() => {
            setError(null);
            setSavedMessage(null);
            setAddOpen((v) => !v);
          }}
          disabled={isLoading || isSaving}
        >
          {addOpen ? "Cancel" : "Add Template"}
        </button>
      </div>

      <p className="pageText">Click “Edit” on a template to modify it.</p>

      {error ? <div className="errorBox">{error}</div> : null}
      {savedMessage ? <div className="successBox">{savedMessage}</div> : null}

      {addOpen && (
        <div className="dropPanel" role="region" aria-label="Add template">
          <div className="editForm">
            <h2 className="editFormTitle">Add Template</h2>
            <div className="editGrid">
              <div className="field">
                <label className="fieldLabel">Key *</label>
                <input
                  className="input"
                  value={addKey}
                  onChange={(e) => setAddKey(e.target.value)}
                  placeholder="e.g. offer_letter"
                  disabled={isSaving}
                />
                <div className="hintText">Allowed: lowercase letters, numbers, _ or -</div>
              </div>
              <div className="field">
                <label className="fieldLabel">Title *</label>
                <input
                  className="input"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="Template title"
                  disabled={isSaving}
                />
              </div>
              <div className="field fieldFull">
                <label className="fieldLabel">Description</label>
                <input
                  className="input"
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="Optional description"
                  disabled={isSaving}
                />
              </div>
              <div className="field fieldFull">
                <label className="fieldLabel">Subject *</label>
                <input
                  className="input"
                  value={addSubject}
                  onChange={(e) => setAddSubject(e.target.value)}
                  placeholder="Email subject"
                  disabled={isSaving}
                />
              </div>
              <div className="field fieldFull">
                <label className="fieldLabel">Body (plain text) *</label>
                <textarea
                  className="input textarea"
                  value={addBody}
                  onChange={(e) => setAddBody(e.target.value)}
                  placeholder="Type the email body without HTML tags"
                  rows={8}
                  disabled={isSaving}
                />
              </div>
              <div className="field fieldFull">
                <label className="fieldLabel">Placeholders</label>
                <input
                  className="input"
                  value={addPlaceholders}
                  onChange={(e) => setAddPlaceholders(e.target.value)}
                  placeholder="e.g. user_full_name, job_title"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="loginRow">
              <button
                className="btn btnPrimary"
                onClick={onCreate}
                disabled={!accessToken || isSaving}
                type="button"
              >
                {isSaving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? <p className="pageText">Loading…</p> : null}

      <div className="emailTemplatesList">
        {templates.map((t) => {
          const isEditing = editingKey === t.key;
          return (
            <div key={t.key} className="dropPanel">
              <div className="emailTemplateTop">
                <div>
                  <div className="emailTemplateTitle">{t.title}</div>
                </div>

                <div className="emailTemplateActions">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="btn btnGhost btnSm"
                        onClick={cancelEdit}
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btnPrimary btnSm"
                        onClick={onSave}
                        disabled={!accessToken || isSaving || !isDirty}
                      >
                        {isSaving ? "Saving…" : "Save"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btnGhost btnSm"
                      onClick={() => startEdit(t)}
                      disabled={isSaving}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {!isEditing ? (
                null
              ) : (
                <div className="editForm">
                  <div className="editGrid">
                    <div className="field">
                      <label className="fieldLabel">Title</label>
                      <input
                        className="input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        disabled={isSaving}
                      />
                      <div className="hintText">Key: {t.key}</div>
                      {t.updated_at ? (
                        <div className="hintText">Last updated: {formatUpdatedAt(t.updated_at)}</div>
                      ) : (
                        <div className="hintText">Last updated: (default)</div>
                      )}
                    </div>

                    <div className="field">
                      <label className="fieldLabel">Description</label>
                      <input
                        className="input"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        disabled={isSaving}
                        placeholder="Optional description"
                      />
                    </div>

                    <div className="field fieldFull">
                      <label className="fieldLabel">Subject</label>
                      <input
                        className="input"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="field fieldFull">
                      <label className="fieldLabel">Placeholders</label>
                      <input
                        className="input"
                        value={editPlaceholders}
                        onChange={(e) => setEditPlaceholders(e.target.value)}
                        placeholder="comma-separated, e.g. user_full_name, job_title"
                        disabled={isSaving}
                      />
                      {placeholders.length ? (
                        <div className="placeholderChips" aria-label="Placeholders">
                          {placeholders.map((p) => (
                            <button
                              key={p}
                              type="button"
                              className="placeholderChipBtn"
                              onClick={() => insertPlaceholder(p)}
                              disabled={isSaving}
                              title="Click to insert"
                            >
                              {`{{${p}}}`}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="hintText">Add placeholders above to show clickable chips.</div>
                      )}
                    </div>

                    <div className="field fieldFull">
                      <label className="fieldLabel">Body (plain text)</label>
                      <div
                        ref={editorRef}
                        className="emailBodyEditor"
                        contentEditable
                        role="textbox"
                        aria-multiline="true"
                        spellCheck
                        onInput={() => {
                          const v = editorRef.current?.innerText ?? "";
                          setEditBodyText(v);
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const text = e.clipboardData.getData("text/plain");
                          document.execCommand("insertText", false, text);
                        }}
                        suppressContentEditableWarning
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
