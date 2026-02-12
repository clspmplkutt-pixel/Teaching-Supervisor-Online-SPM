import React from 'react';

/**
 * LoadingSpinner - Reusable loading component
 * @param {string} message - Custom loading message
 * @param {string} title - Page title (optional)
 * @param {boolean} fullPage - Whether to show full page wrapper with header
 * @param {string} size - Spinner size: 'sm', 'md', 'lg' (default: 'lg')
 */
const LoadingSpinner = ({
    message = 'กำลังโหลดข้อมูล กรุณารอสักครู่...',
    title = '',
    fullPage = true,
    size = 'lg'
}) => {
    const spinnerSizes = {
        sm: '2rem',
        md: '2.5rem',
        lg: '3rem'
    };

    const spinnerSize = spinnerSizes[size] || spinnerSizes.lg;

    const spinnerContent = (
        <div className="card">
            <div className="card-body">
                <div className="text-center p-5">
                    <div
                        className="spinner-border text-primary"
                        role="status"
                        style={{ width: spinnerSize, height: spinnerSize }}
                    >
                        <span className="sr-only">Loading...</span>
                    </div>
                    <p className="mt-3 text-muted">
                        <i className="fas fa-circle-notch fa-spin mr-2"></i>
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );

    if (!fullPage) {
        return spinnerContent;
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
                    {spinnerContent}
                </div>
            </section>
        </div>
    );
};

export default LoadingSpinner;
