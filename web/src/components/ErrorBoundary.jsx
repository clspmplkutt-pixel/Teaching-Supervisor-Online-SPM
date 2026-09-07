import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-5 text-center">
          <div className="card shadow-sm border-0 p-4 mx-auto" style={{ maxWidth: '600px', borderRadius: '12px' }}>
            <div className="mb-3">
              <i className="fa-solid fa-triangle-exclamation text-warning fa-3x"></i>
            </div>
            <h4 className="font-weight-bold text-dark mb-2">เกิดข้อผิดพลาดในการแสดงผล</h4>
            <p className="text-muted mb-3">
              ระบบตรวจพบข้อผิดพลาดบางประการในการประมวลผล กรุณารีเฟรชหน้าเว็บ หรือกลับสู่หน้าหลัก
            </p>
            {this.state.error?.message && (
              <div className="alert alert-danger text-start small mb-3 p-2 font-monospace">
                {String(this.state.error.message)}
              </div>
            )}
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="btn btn-primary font-weight-bold px-3"
              >
                <i className="fa-solid fa-rotate-right me-1"></i> รีเฟรชหน้าเว็บ
              </button>
              <a href="/" className="btn btn-outline-secondary px-3">
                <i className="fa-solid fa-house me-1"></i> กลับหน้าหลัก
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
