import React from "react";
import Modal from "./Modal";
import { Download, FileText, AlertCircle } from "lucide-react";
import "../styles/filePreviewModal.css";
import { useAuth } from "../hooks/useAuth";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  documentType: string;
  canDownload: boolean;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  documentType,
  canDownload,
}) => {
  const getFileType = (url: string) => {
    const extension = url.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(extension || "")) {
      return "image";
    }
    if (extension === "pdf") {
      return "pdf";
    }
    return "other";
  };

  const fileType = getFileType(fileUrl);

  const renderContent = () => {
    switch (fileType) {
      case "image":
        return (
          <img
            src={fileUrl}
            alt={fileName}
            className="file-preview-image"
            onContextMenu={(e) => !canDownload && e.preventDefault()}
          />
        );
      case "pdf":
        // Tenta esconder a barra de ferramentas (download/print) se o usuário não tiver permissão
        const pdfUrl = canDownload ? fileUrl : `${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`;
        return (
          <iframe
            src={pdfUrl}
            title={fileName}
            className="file-preview-iframe"
          />
        );
      default:
        return (
          <div className="file-preview-error">
            <FileText size={64} className="file-preview-icon" />
            <p>Visualização não disponível para este tipo de arquivo.</p>
            {!canDownload && <p>Você não tem permissão para baixar este arquivo.</p>}
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={fileName}
      showFooter={false}
      resizable={true}
    >
      <div className="file-preview-modal-content">
        <div className="file-preview-modal-body">{renderContent()}</div>
        
        <div className="file-preview-footer">
            <button className="btn btn-secondary" onClick={onClose}>
                Fechar
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default FilePreviewModal;
