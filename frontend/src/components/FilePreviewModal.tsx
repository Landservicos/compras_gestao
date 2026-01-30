import React, { useState } from "react";
import Modal from "./Modal";
import { Download, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"; // Added RotateCcw
import { Document, Page, pdfjs } from 'react-pdf';
import "../styles/filePreviewModal.css";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configuração do Worker do PDF.js para Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

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
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState(0); // Added rotation state

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

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) => Math.min(Math.max(1, prevPageNumber + offset), numPages));
  };

  const handleZoom = (delta: number) => {
    setScale((prevScale) => Math.max(0.5, Math.min(3.0, prevScale + delta)));
  };

  const handleRotate = () => { // Added rotation handler
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  };

  const renderContent = () => {
    switch (fileType) {
      case "image":
        return (
          <div className="image-preview-wrapper">
            <div className="image-controls">
                <button onClick={handleRotate} className="control-btn" title="Girar Imagem">
                    <RotateCcw size={18} />
                </button>
            </div>
            <div className="image-container">
              <img
                src={fileUrl}
                alt={fileName}
                className="file-preview-image"
                style={{ transform: `rotate(${rotation}deg)` }} // Apply rotation style
                onContextMenu={(e) => !canDownload && e.preventDefault()}
              />
            </div>
          </div>
        );
      case "pdf":
        return (
          <div className="pdf-wrapper">
            <div className="pdf-controls">
                <button 
                    disabled={pageNumber <= 1} 
                    onClick={() => changePage(-1)}
                    className="pdf-control-btn"
                    title="Página Anterior"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="pdf-page-info">
                    Página {pageNumber} de {numPages || '--'}
                </span>
                <button 
                    disabled={pageNumber >= numPages} 
                    onClick={() => changePage(1)}
                    className="pdf-control-btn"
                    title="Próxima Página"
                >
                    <ChevronRight size={20} />
                </button>
                <div className="pdf-zoom-controls">
                    <button onClick={() => handleZoom(-0.1)} className="pdf-control-btn" title="Diminuir Zoom">
                        <ZoomOut size={18} />
                    </button>
                    <span className="pdf-zoom-info">{Math.round(scale * 100)}%</span>
                    <button onClick={() => handleZoom(0.1)} className="pdf-control-btn" title="Aumentar Zoom">
                        <ZoomIn size={18} />
                    </button>
                </div>
                <button onClick={handleRotate} className="pdf-control-btn" title="Girar PDF" style={{ marginLeft: "0.5rem" }}>
                    <RotateCcw size={18} />
                </button>
            </div>
            
            <div className="pdf-document-container">
                <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div className="pdf-loading">Carregando PDF...</div>}
                    error={<div className="pdf-error">Erro ao carregar o arquivo PDF.</div>}
                    className="pdf-document"
                >
                    <Page 
                        pageNumber={pageNumber} 
                        scale={scale} 
                        rotate={rotation}
                        renderTextLayer={false} 
                        renderAnnotationLayer={false}
                    />
                </Document>
            </div>
          </div>
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

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={fileName}
      showFooter={false}
      resizable={true}
      closeOnOverlay={false}
    >
      <div className="file-preview-modal-content">
        <div className="file-preview-modal-body">{renderContent()}</div>
        
        <div className="file-preview-footer">
            <button className="btn btn-secondary" onClick={onClose}>
                Fechar
            </button>
            {canDownload && (
              <button className="btn btn-primary" onClick={handleDownload} title="Baixar Arquivo">
                <Download size={16} style={{ marginRight: "8px" }} />
                Baixar
              </button>
            )}
        </div>
      </div>
    </Modal>
  );
};

export default FilePreviewModal;