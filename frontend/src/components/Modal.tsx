import ReactDOM from "react-dom";
import "../styles/modal.css";
import { useState } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  children: React.ReactNode;
  showFooter?: boolean;
  footer?: React.ReactNode;
  closeOnOverlay?: boolean;
  size?: "small" | "medium" | "large";
  resizable?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  showFooter = true,
  footer,
  closeOnOverlay = true,
  size = "medium",
  resizable = false,
}) => {
  const [closing, setClosing] = useState(false);

  if (!isOpen && !closing) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 250);
  };

  return ReactDOM.createPortal(
    <div
      className={`modal-overlay ${closing ? "closing" : "open"}`}
      onClick={() => closeOnOverlay && handleClose()}
    >
      <div
        className={`modal-content modal-animate modal-${size} ${
          closing ? "closing-content" : ""
        } ${resizable ? "modal-resizable" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={handleClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {/* Preferência: footer custom vence o automático */}
        {footer ? (
          <div className="modal-footer">{footer}</div>
        ) : (
          showFooter && (
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleClose}>
                Cancelar
              </button>

              {onConfirm && (
                <button className="btn-confirm" onClick={onConfirm}>
                  Confirmar
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
