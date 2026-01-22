import React from "react";
import "../styles/processoSkeletonCard.css";

const ProcessoSkeletonCard: React.FC = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-icon"></div>
        <div className="skeleton-status"></div>
      </div>
      <div className="skeleton-line skeleton-title"></div>
      <div className="skeleton-line skeleton-subtitle"></div>
      <div className="skeleton-footer">
        <div className="skeleton-line skeleton-footer-text"></div>
        <div className="skeleton-line skeleton-footer-text"></div>
      </div>
    </div>
  );
};

export default ProcessoSkeletonCard;
