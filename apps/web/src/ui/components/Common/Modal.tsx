import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
};

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null;

  return (
    <div className="ui-modal">
      <div className="ui-modal__content">
        <header className="ui-modal__header">
          <h2>{title ?? "Modal"}</h2>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="ui-modal__body">{children}</div>
      </div>
    </div>
  );
}
