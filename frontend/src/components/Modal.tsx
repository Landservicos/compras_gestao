import ReactDOM from "react-dom";
import "../styles/modal.css";
import React, { useState, useRef } from "react";
import { ArrowDownRight } from "lucide-react";

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
  const modalRef = useRef<HTMLDivElement>(null);

  if (!isOpen && !closing) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 250);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevents clicking through to other elements

    const modal = modalRef.current;
    if (!modal) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = modal.offsetWidth;
    const startHeight = modal.offsetHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      const newHeight = startHeight + (moveEvent.clientY - startY);

      // Limites mínimos
      if (newWidth > 320) modal.style.width = `${newWidth}px`;
      if (newHeight > 300) modal.style.height = `${newHeight}px`;
      
      // Remove max-width/height limitations temporarily during resize if needed
      // but usually CSS handles max-width constraints nicely.
      // However, if we want to expand beyond max-width, we might need to override it.
      // For now, let's just set width/height.
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
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
        ref={modalRef}
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
        
        {resizable && (
          <div 
            className="modal-resize-handle-custom"
            onMouseDown={handleResizeMouseDown}
            title="Arraste para redimensionar"
          >
            <ArrowDownRight size={20} />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
