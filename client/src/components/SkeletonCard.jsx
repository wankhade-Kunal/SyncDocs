import React from 'react';
import '../styles/SkeletonCard.css';

export const SkeletonCard = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-title"></div>
      <div className="skeleton-subtitle"></div>
      <div className="skeleton-meta">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-text"></div>
      </div>
    </div>
  );
};

export default SkeletonCard;
