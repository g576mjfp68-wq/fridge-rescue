"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Native <dialog> kept in sync with `open`: showModal() gives focus trapping,
 * Esc to close and focus return to the opener. Clicking the backdrop closes it.
 */
export function Modal({ open, onClose, labelledBy, className = "", children }: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {/* Content mounts only while open, so forms start fresh each time. */}
      {open && <div className="modal-body">{children}</div>}
    </dialog>
  );
}
