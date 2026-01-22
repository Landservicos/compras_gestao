import React from "react";
import { ArrowLeft } from "lucide-react";
import "../styles/ProcessoDetail.css";
import "../styles/processoDetailSkeleton.css";

const ProcessoDetailSkeleton: React.FC = () => {
  return (
    <div className="processo-detail-page">
      <header className="detail-header">
        <div className="skeleton-line skeleton-h1"></div>
        <div className="skeleton-back-link">
          <ArrowLeft size={18} />
          <div className="skeleton-line skeleton-back-link-text"></div>
        </div>
      </header>

      <div className="processo-detail-content">
        <div className="detail-grid">
          <div className="skeleton-detail-item"></div>
          <div className="skeleton-detail-item"></div>
          <div className="skeleton-detail-item"></div>
        </div>

        <div className="skeleton-line skeleton-h4"></div>
        <div className="skeleton-file-item"></div>
        <div className="skeleton-file-item"></div>

        <div className="skeleton-upload-section">
          <div className="skeleton-line skeleton-h4"></div>
          <div className="skeleton-upload-form"></div>
        </div>
      </div>
    </div>
  );
};

export default ProcessoDetailSkeleton;
