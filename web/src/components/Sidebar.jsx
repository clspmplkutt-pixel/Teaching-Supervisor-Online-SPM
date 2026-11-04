import React from 'react';
import { Link } from 'react-router-dom';
import SidebarRole from './SidebarRole';

const Sidebar = () => {
  return (
    <aside className="main-sidebar sidebar-dark-primary elevation-4 main-sidebar-custom no-print">
      <Link to="/" className="brand-link d-flex align-items-center">
        <img
          src="/images/obec.png"
          alt="LMSS"
          className="brand-image img-circle elevation-2"
          style={{ opacity: 0.95 }}
        />
        <div className="brand-text d-flex flex-column" style={{ lineHeight: 1.15 }}>
          <span className="font-weight-bold text-white" style={{ fontSize: '1rem', letterSpacing: '0.3px' }}>
            LMSS Online
          </span>
          <small style={{ fontSize: '0.68rem', color: '#94a3b8' }}>สพม.พิษณุโลก อุตรดิตถ์</small>
        </div>
      </Link>

      <SidebarRole />
    </aside>
  );
};

export default Sidebar;
