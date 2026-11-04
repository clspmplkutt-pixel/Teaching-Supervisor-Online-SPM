import React from 'react';

/**
 * EmptyState - Clean, non-alarmist empty or informational state component.
 * Defaults to `fullPage = false` so it never creates a duplicate `.content-wrapper` inside AppLayout.
 */
const EmptyState = ({
  message = 'ยังไม่มีรายการข้อมูลในขณะนี้',
  description = '',
  icon = 'fa-folder-open',
  type = 'info',
  title = '',
  fullPage = false,
  actionLabel = '',
  onAction = null,
  children,
}) => {
  const palette = {
    info: { bg: '#f8fafc', iconBg: '#eef2ff', iconColor: '#4f46e5', border: '#e2e8f0' },
    warning: { bg: '#fffbeb', iconBg: '#fef3c7', iconColor: '#d97706', border: '#fde68a' },
    danger: { bg: '#fef2f2', iconBg: '#fee2e2', iconColor: '#dc2626', border: '#fecaca' },
    success: { bg: '#ecfdf5', iconBg: '#d1fae5', iconColor: '#059669', border: '#a7f3d0' },
  };
  const theme = palette[type] || palette.info;

  const content = (
    <div
      className="text-center py-4 px-3 my-2 rounded"
      style={{
        backgroundColor: theme.bg,
        border: `1px dashed ${theme.border}`,
        borderRadius: '12px',
      }}
    >
      <div
        className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
        style={{
          width: '54px',
          height: '54px',
          backgroundColor: theme.iconBg,
          color: theme.iconColor,
          fontSize: '1.35rem',
        }}
      >
        <i className={`fa-solid ${icon}`}></i>
      </div>
      {title && <h5 className="font-weight-bold text-dark mb-1">{title}</h5>}
      <p className="font-weight-semibold text-dark mb-1" style={{ fontSize: '0.98rem' }}>
        {message}
      </p>
      {description && <p className="text-muted small mb-3">{description}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn btn-primary btn-sm px-3 mt-1">
          {actionLabel}
        </button>
      )}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );

  if (!fullPage) return content;

  return <div className="container-fluid py-2">{content}</div>;
};

export default EmptyState;
