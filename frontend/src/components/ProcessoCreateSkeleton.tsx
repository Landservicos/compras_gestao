import React from "react";
import { ArrowLeft } from "lucide-react";
import "../styles/processoCreateSkeleton.css";

const ProcessoCreateSkeleton: React.FC = () => {
  return (
    <div className="processo-create-page">
      <header className="create-header">
        <div className="skeleton-line skeleton-h1"></div>
        <div className="skeleton-back-link">
          <ArrowLeft size={18} />
          <div className="skeleton-line skeleton-back-link-text"></div>
        </div>
      </header>

      <div className="form-container">
        <div className="skeleton-form-group">
          <div className="skeleton-line skeleton-label"></div>
          <div className="skeleton-line skeleton-input"></div>
        </div>
        <div className="skeleton-form-group">
          <div className="skeleton-line skeleton-label"></div>
          <div className="skeleton-line skeleton-input"></div>
        </div>
        <div className="skeleton-form-group">
          <div className="skeleton-line skeleton-label"></div>
          <div className="skeleton-line skeleton-input"></div>
        </div>
        <div className="skeleton-line skeleton-button"></div>
      </div>
    </div>
  );
};

export default ProcessoCreateSkeleton;
