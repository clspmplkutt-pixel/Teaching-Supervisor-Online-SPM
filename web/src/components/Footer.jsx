
import React from 'react';

const Footer = () => {
    return (
        <footer className="main-footer">
            <strong>Copyright &copy; {new Date().getFullYear()} <a href="/">ระบบนิเทศการจัดการเรียนรู้ (LMSS)</a>.</strong>
            สงวนสิทธิ์ทุกประการ.
            <div className="float-right d-none d-sm-inline-block">
                <b>Version</b> 1.0.0
            </div>
        </footer>
    );
};

export default Footer;
