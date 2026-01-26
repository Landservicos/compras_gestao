import React from "react";
import Modal from "./Modal";
import { Download, FileText, AlertCircle } from "lucide-react";
import "../styles/filePreviewModal.css";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  canDownload: boolean;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
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
          />
        );
      case "pdf":
        return (
          <iframe
            src={fileUrl}
            title={fileName}
            className="file-preview-iframe"
          />
        );
      default:
        return (
          <div className="file-preview-error">
            <FileText size={64} className="file-preview-icon" />
            <p>Visualização não disponível para este tipo de arquivo.</p>
            {canDownload ? (
              <p>Por favor, faça o download para visualizar.</p>
            ) : (
              <p>Você não tem permissão para baixar este arquivo.</p>
            )}
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
    >
      <div className="file-preview-modal-content">
        <div className="file-preview-modal-body">{renderContent()}</div>
        
        <div className="file-preview-footer">
            <button className="btn btn-secondary" onClick={onClose}>
                Fechar
            </button>
            
            {canDownload ? (
            <a
                href={fileUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-download"
            >
                <Download size={18} />
                Baixar Arquivo
            </a>
            ) : (
             <div title="Você não tem permissão para baixar arquivos.">
                 <button className="btn btn-secondary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    <Download size={18} style={{ marginRight: '0.5rem' }}/>
                    Download Bloqueado
                 </button>
             </div>
            )}
        </div>
      </div>
    </Modal>
  );
};

export default FilePreviewModal;
