import React from 'react';

/**
 * LoadingSpinner - Standardized loading indicator
 * Defaults to `fullPage = false` to prevent nested `.content-wrapper` 250px layout shifts inside AppLayout.
 * Supports both `message` and legacy `text` props seamlessly.
 */
const LoadingSpinner = ({
  message,
  text,
  title = '',
  fullPage = false,
  size = 'md',
}) => {
  const displayMessage = message || text || 'กำลังโหลดข้อมูล กรุณารอสักครู่...';
  const spinnerSizes = {
    sm: '1.75rem',
    md: '2.4rem',
    lg: '3rem',
  };
  const spinnerSize = spinnerSizes[size] || spinnerSizes.md;

  const content = (
    <div className="card border-0 shadow-sm my-3" style={{ borderRadius: '14px' }}>
      <div className="card-body text-center py-5 px-4">
        {title && <h5 className="font-weight-bold text-dark mb-3">{title}</h5>}
        <div
          className="spinner-border text-primary"
          role="status"
          style={{ width: spinnerSize, height: spinnerSize, borderWidth: '0.22em' }}
        >
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-3 mb-0 text-muted font-weight-medium" style={{ fontSize: '0.95rem' }}>
          {displayMessage}
        </p>
      </div>
    </div>
  );

  if (!fullPage) return content;

  return <div className="container-fluid py-3">{content}</div>;
};

export default LoadingSpinner;
