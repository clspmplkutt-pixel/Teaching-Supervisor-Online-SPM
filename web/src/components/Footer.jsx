import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="main-footer small text-muted no-print" style={{ borderTop: '1px solid #e2e8f0' }}>
      <strong>
        &copy; {new Date().getFullYear()}{' '}
        <Link to="/" className="text-primary">
          ระบบนิเทศการจัดการเรียนรู้ออนไลน์ (LMSS)
        </Link>
      </strong>{' '}
      • สพม.พิษณุโลก อุตรดิตถ์
      <div className="float-right d-none d-sm-inline-block">
        <span className="badge badge-light border text-muted">LMSS v3.0</span>
      </div>
    </footer>
  );
};

export default Footer;
