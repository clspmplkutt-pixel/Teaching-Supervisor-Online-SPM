import React from 'react';

/**
 * EmptyState - Reusable empty/error state component
 * @param {string} message - Message to display
 * @param {string} icon - Font Awesome icon class (default: fa-exclamation-triangle)
 * @param {string} type - Alert type: 'info', 'warning', 'danger', 'success' (default: 'warning')
 * @param {string} title - Page title (optional)
 * @param {boolean} fullPage - Whether to show full page wrapper with header
 * @param {node} children - Additional content to render below the message
 */
const EmptyState = ({
    message = 'ไม่พบข้อมูล',
    icon = 'fa-exclamation-triangle',
    type = 'warning',
    title = '',
    fullPage = true,
    children
}) => {
    const alertContent = (
        <div className={`alert alert-${type}`}>
            <i className={`icon fas ${icon}`}></i>
            {' '}{message}
            {children && <div className="mt-2">{children}</div>}
        </div>
    );

    if (!fullPage) {
        return alertContent;
    }

    return (
        <div className="content-wrapper">
            {title && (
                <div className="content-header">
                    <div className="container-fluid">
                        <div className="row mb-2">
                            <div className="col-sm-12">
                                <h1 className="m-0">{title}</h1>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <section className="content">
                <div className="container-fluid">
                    {alertContent}
                </div>
            </section>
        </div>
    );
};

export default EmptyState;
