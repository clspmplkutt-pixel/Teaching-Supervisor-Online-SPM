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
          <div
            className="card shadow-sm border-0 p-4 mx-auto"
            style={{ maxWidth: '560px', borderRadius: '16px' }}
          >
            <div className="mb-3">
              <span
                className="rounded-circle d-inline-flex align-items-center justify-content-center"
                style={{ width: '64px', height: '64px', backgroundColor: '#fef3c7', color: '#d97706' }}
              >
                <i className="fa-solid fa-triangle-exclamation fa-2x"></i>
              </span>
            </div>
            <h4 className="font-weight-bold text-dark mb-2">เกิดข้อผิดพลาดในการแสดงผลหน้าจอนี้</h4>
            <p className="text-muted mb-3 small">
              ระบบตรวจพบปัญหาชั่วคราว กรุณาลองโหลดหน้านี้ใหม่ หรือกลับไปที่หน้าหลักเพื่อทำงานต่อ
            </p>
            {this.state.error?.message && (
              <div className="alert bg-danger-subtle text-danger text-left small mb-3 p-2 rounded">
                <code>{String(this.state.error.message)}</code>
              </div>
            )}
            <div className="d-flex justify-content-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="btn btn-primary font-weight-bold px-3"
              >
                <i className="fa-solid fa-rotate-right mr-1"></i> โหลดหน้านี้ใหม่
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.assign('/');
                }}
                className="btn btn-outline-secondary px-3"
              >
                <i className="fa-solid fa-house mr-1"></i> กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
