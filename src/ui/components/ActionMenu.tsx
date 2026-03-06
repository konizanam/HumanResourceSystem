import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ActionMenuItem = {
  key: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
};

export function ActionMenu({
  label,
  items,
  disabled,
  menuLabel,
}: {
  label: string;
  disabled: boolean;
  items: ActionMenuItem[];
  menuLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const portalRoot = useMemo(() => {
    if (typeof document === "undefined") return null;
    return document.body;
  }, []);

  const updatePosition = () => {
    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;

    const rect = btn.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    const margin = 8;
    const gap = 6;

    // Prefer right-aligned to the button.
    let left = rect.right - menuRect.width;
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - menuRect.width));

    let top = rect.bottom + gap;
    const wouldOverflowBottom = top + menuRect.height > window.innerHeight - margin;
    if (wouldOverflowBottom) {
      const aboveTop = rect.top - gap - menuRect.height;
      if (aboveTop >= margin) top = aboveTop;
      else top = Math.max(margin, window.innerHeight - margin - menuRect.height);
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };

  useLayoutEffect(() => {
    if (!open) return;
    // Position twice: once immediately, once after layout settles.
    updatePosition();
    const id = window.requestAnimationFrame(() => updatePosition());
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onReflow = () => updatePosition();

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReflow);
    // Capture scrolls from scroll containers too.
    window.addEventListener("scroll", onReflow, true);

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <span className={"actionMenu" + (open ? " actionMenuOpen" : "")}>
        <button
          ref={btnRef}
          type="button"
          className={
            "btn btnGhost btnSm actionMenuBtn stepperSaveBtn" +
            (disabled ? " actionMenuBtnDisabled" : "")
          }
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setOpen((v) => !v);
          }}
        >
          {label}
        </button>
      </span>

      {open && portalRoot
        ? createPortal(
            <div
              ref={menuRef}
              className="actionMenuList"
              role="menu"
              aria-label={menuLabel ?? "Row actions"}
              style={{
                position: "fixed",
                right: "auto",
                bottom: "auto",
                left: 0,
                top: 0,
              }}
            >
              {items.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  className={
                    "actionMenuItem" + (it.danger ? " actionMenuItemDanger" : "")
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    it.onClick();
                  }}
                  disabled={disabled}
                  role="menuitem"
                >
                  {it.label}
                </button>
              ))}
            </div>,
            portalRoot
          )
        : null}
    </>
  );
}
